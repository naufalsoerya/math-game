'use strict';
/* SQLite storage (Node's built-in node:sqlite, no extra packages). One file: DATA_DIR/math-farm.db */
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = [
  // v1
  `CREATE TABLE groups (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     code TEXT NOT NULL UNIQUE,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE players (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
     token_hash TEXT NOT NULL UNIQUE,
     pin_salt TEXT NOT NULL,
     pin_hash TEXT NOT NULL,
     pin_fails INTEGER NOT NULL DEFAULT 0,
     pin_lock_until INTEGER NOT NULL DEFAULT 0,
     name TEXT NOT NULL,
     name_key TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('host','member','pending','gone')),
     perm_board INTEGER NOT NULL DEFAULT 1,
     perm_visit INTEGER NOT NULL DEFAULT 1,
     perm_chat INTEGER NOT NULL DEFAULT 1,
     level INTEGER NOT NULL DEFAULT 1,
     stars INTEGER NOT NULL DEFAULT 0,
     coins INTEGER NOT NULL DEFAULT 0,
     trophies INTEGER NOT NULL DEFAULT 0,
     medals INTEGER NOT NULL DEFAULT 0,
     legend INTEGER NOT NULL DEFAULT 0,
     farms INTEGER NOT NULL DEFAULT 0,
     best_streak INTEGER NOT NULL DEFAULT 0,
     week_key TEXT NOT NULL DEFAULT '',
     week_base INTEGER NOT NULL DEFAULT 0,
     snapshot TEXT NOT NULL DEFAULT '{}',
     created_at INTEGER NOT NULL,
     approved_at INTEGER,
     left_at INTEGER,
     last_seen INTEGER NOT NULL DEFAULT 0,
     last_sync INTEGER NOT NULL DEFAULT 0
   );
   CREATE UNIQUE INDEX players_name ON players(group_id, name_key);
   CREATE INDEX players_group ON players(group_id, status);
   CREATE TABLE messages (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
     player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
     text TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     blocked TEXT,
     digits INTEGER NOT NULL DEFAULT 0,
     short_digits INTEGER NOT NULL DEFAULT 0,
     marker INTEGER NOT NULL DEFAULT 0,
     deleted INTEGER NOT NULL DEFAULT 0,
     deleted_at INTEGER
   );
   CREATE INDEX messages_group ON messages(group_id, id);
   CREATE INDEX messages_player ON messages(player_id, id);
   CREATE TABLE events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
     to_player INTEGER REFERENCES players(id) ON DELETE CASCADE,
     from_player INTEGER REFERENCES players(id) ON DELETE CASCADE,
     type TEXT NOT NULL,
     emoji TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX events_to ON events(to_player, id);`
];

function open(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'math-farm.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000; PRAGMA synchronous = NORMAL;');
  const ver = db.prepare('PRAGMA user_version').get().user_version;
  // a database made by an early test build (before grown-up PINs) cannot be used; say so clearly instead of failing later
  if (ver >= 1 && (!db.prepare("SELECT 1 FROM pragma_table_info('players') WHERE name = 'pin_lock_until'").get() || !db.prepare("SELECT 1 FROM pragma_table_info('messages') WHERE name = 'marker'").get())) {
    db.close(); throw new Error(`The database in ${dataDir} was made by an early test version. Move or delete math-farm.db there and start again.`);
  }
  for (let v = ver; v < SCHEMA.length; v++) {
    db.exec('BEGIN'); try { db.exec(SCHEMA[v]); db.exec(`PRAGMA user_version = ${v + 1}`); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  const q = {};
  const P = sql => db.prepare(sql);
  // groups
  q.groupById = P('SELECT * FROM groups WHERE id = ?');
  q.groupByCode = P('SELECT * FROM groups WHERE code = ?');
  q.insertGroup = P('INSERT INTO groups (name, code, created_at) VALUES (?, ?, ?)');
  q.setGroupCode = P('UPDATE groups SET code = ? WHERE id = ?');
  q.setGroupName = P('UPDATE groups SET name = ? WHERE id = ?');
  q.deleteGroup = P('DELETE FROM groups WHERE id = ?');
  q.allGroups = P(`SELECT g.*, (SELECT COUNT(*) FROM players p WHERE p.group_id = g.id AND p.status IN ('host','member')) AS members,
                   (SELECT COUNT(*) FROM players p WHERE p.group_id = g.id AND p.status = 'pending') AS pending,
                   (SELECT name FROM players p WHERE p.group_id = g.id AND p.status = 'host') AS host FROM groups g ORDER BY g.id`);
  // players (status 'gone' = left or removed: kept so their past messages still show a name)
  q.playerByToken = P(`SELECT * FROM players WHERE token_hash = ? AND status != 'gone'`);
  q.playerById = P('SELECT * FROM players WHERE id = ?');
  q.playerByName = P('SELECT id FROM players WHERE group_id = ? AND name_key = ?');
  q.countActive = P(`SELECT COUNT(*) AS n FROM players WHERE group_id = ? AND status IN ('host','member')`);
  q.countPending = P(`SELECT COUNT(*) AS n FROM players WHERE group_id = ? AND status = 'pending'`);
  q.insertPlayer = P(`INSERT INTO players (group_id, token_hash, pin_salt, pin_hash, name, name_key, status, perm_board, perm_visit, perm_chat, created_at, approved_at, last_seen)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  q.groupPlayers = P(`SELECT * FROM players WHERE group_id = ? AND status != 'gone' ORDER BY id`);
  q.setName = P('UPDATE players SET name = ?, name_key = ? WHERE id = ?');
  q.setPerms = P('UPDATE players SET perm_board = ?, perm_visit = ?, perm_chat = ? WHERE id = ?');
  q.setStatus = P('UPDATE players SET status = ?, approved_at = ? WHERE id = ?');
  q.setPin = P('UPDATE players SET pin_salt = ?, pin_hash = ?, pin_fails = 0, pin_lock_until = 0 WHERE id = ?');
  // PIN attempts are counted before the (slow) check, in one step, so parallel guesses cannot slip past the limit
  q.pinState = P('SELECT pin_fails, pin_lock_until FROM players WHERE id = ?');
  q.pinAttempt = P('UPDATE players SET pin_fails = CASE WHEN pin_lock_until != 0 AND pin_lock_until <= ? THEN 1 ELSE pin_fails + 1 END, pin_lock_until = CASE WHEN pin_lock_until != 0 AND pin_lock_until <= ? THEN 0 ELSE pin_lock_until END WHERE id = ?');
  q.pinLock = P('UPDATE players SET pin_lock_until = ?, pin_fails = 0 WHERE id = ?');
  q.pinReset = P('UPDATE players SET pin_fails = 0, pin_lock_until = 0 WHERE id = ?');
  q.touch = P('UPDATE players SET last_seen = ? WHERE id = ?');
  q.saveProgress = P(`UPDATE players SET level = ?, stars = ?, coins = ?, trophies = ?, medals = ?, legend = ?, farms = ?, best_streak = ?,
                      week_key = ?, week_base = ?, snapshot = ?, last_sync = ?, last_seen = ? WHERE id = ?`);
  q.goPlayer = P(`UPDATE players SET status = 'gone', token_hash = 'gone:' || id || ':' || ?, name_key = '~gone~' || id, perm_board = 0, perm_visit = 0,
                  perm_chat = 0, snapshot = '{}', left_at = ? WHERE id = ?`);
  q.deletePlayer = P('DELETE FROM players WHERE id = ?');
  q.oldPending = P(`DELETE FROM players WHERE status = 'pending' AND created_at < ?`);
  q.oldGone = P(`DELETE FROM players WHERE status = 'gone' AND left_at < ? AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.player_id = players.id)`);
  // messages
  q.insertMsg = P('INSERT INTO messages (group_id, player_id, text, created_at, blocked, digits, short_digits, marker) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  q.msgById = P('SELECT * FROM messages WHERE id = ?');
  q.chatAfter = P(`SELECT m.id, m.player_id, m.text, m.created_at, p.name FROM messages m JOIN players p ON p.id = m.player_id
                   WHERE m.group_id = ? AND m.id > ? AND m.blocked IS NULL AND m.deleted = 0 ORDER BY m.id LIMIT ?`);
  q.chatLatest = P(`SELECT * FROM (SELECT m.id, m.player_id, m.text, m.created_at, p.name FROM messages m JOIN players p ON p.id = m.player_id
                   WHERE m.group_id = ? AND m.blocked IS NULL AND m.deleted = 0 ORDER BY m.id DESC LIMIT ?) ORDER BY id`);
  q.chatMaxId = P('SELECT MAX(id) AS id FROM messages WHERE group_id = ? AND blocked IS NULL AND deleted = 0');
  q.chatUnread = P('SELECT COUNT(*) AS n FROM messages WHERE group_id = ? AND id > ? AND blocked IS NULL AND deleted = 0 AND player_id != ?');
  q.removedSince = P('SELECT id FROM messages WHERE group_id = ? AND deleted = 1 AND deleted_at > ? AND blocked IS NULL');
  q.history = P(`SELECT m.id, m.player_id, m.text, m.created_at, m.blocked, m.deleted, p.name FROM messages m JOIN players p ON p.id = m.player_id
                 WHERE m.group_id = ? AND m.id < ? AND (m.blocked IS NULL OR m.player_id = ?) ORDER BY m.id DESC LIMIT ?`);
  q.recentOwn = P('SELECT text, created_at, blocked, digits, short_digits, marker FROM messages WHERE player_id = ? ORDER BY id DESC LIMIT 8');
  q.deleteMsg = P('UPDATE messages SET deleted = 1, deleted_at = ? WHERE id = ?');
  q.oldMsgs = P('DELETE FROM messages WHERE created_at < ?');
  // events
  q.insertEvent = P('INSERT INTO events (group_id, to_player, from_player, type, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  q.eventsFor = P(`SELECT e.id, e.type, e.emoji, e.created_at, e.from_player, p.name AS from_name FROM events e LEFT JOIN players p ON p.id = e.from_player
                   WHERE e.to_player = ? AND e.id > ? ORDER BY e.id LIMIT 30`);
  q.maxEvent = P('SELECT MAX(id) AS id FROM events WHERE to_player = ?');
  q.countEventsSince = P('SELECT COUNT(*) AS n FROM events WHERE to_player = ? AND from_player = ? AND type = ? AND created_at > ?');
  q.oldEvents = P('DELETE FROM events WHERE created_at < ?');
  return { db, q, close: () => db.close() };
}

module.exports = { open };
