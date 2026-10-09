'use strict';
/* PostgreSQL storage using the 'pg' package. */
const { Pool } = require('pg');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  password_salt VARCHAR(64) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  created_at BIGINT NOT NULL,
  last_login BIGINT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  last_seen BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(16) NOT NULL UNIQUE,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pin_salt VARCHAR(64) NOT NULL,
  pin_hash VARCHAR(128) NOT NULL,
  pin_fails INTEGER NOT NULL DEFAULT 0,
  pin_lock_until BIGINT NOT NULL DEFAULT 0,
  name VARCHAR(30) NOT NULL,
  name_key VARCHAR(30) NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('host','member','pending','gone')),
  perm_board SMALLINT NOT NULL DEFAULT 1,
  perm_visit SMALLINT NOT NULL DEFAULT 1,
  perm_chat SMALLINT NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 1,
  stars INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  trophies INTEGER NOT NULL DEFAULT 0,
  medals INTEGER NOT NULL DEFAULT 0,
  legend INTEGER NOT NULL DEFAULT 0,
  farms INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  week_key VARCHAR(10) NOT NULL DEFAULT '',
  week_base INTEGER NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL,
  approved_at BIGINT,
  left_at BIGINT,
  last_seen BIGINT NOT NULL DEFAULT 0,
  last_sync BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS players_name ON players(group_id, name_key);
CREATE INDEX IF NOT EXISTS players_group ON players(group_id, status);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  blocked VARCHAR(20),
  digits INTEGER NOT NULL DEFAULT 0,
  short_digits INTEGER NOT NULL DEFAULT 0,
  marker INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at BIGINT
);
CREATE INDEX IF NOT EXISTS messages_group ON messages(group_id, id);
CREATE INDEX IF NOT EXISTS messages_player ON messages(player_id, id);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  to_player INTEGER REFERENCES players(id) ON DELETE CASCADE,
  from_player INTEGER REFERENCES players(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  emoji VARCHAR(10),
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_to ON events(to_player, id);
`;

async function open(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl, max: 20 });
  await pool.query(SCHEMA);

  /* helper: first row or null */
  const one = async (sql, params) => { const r = await pool.query(sql, params); return r.rows[0] || null; };
  const all = async (sql, params) => { const r = await pool.query(sql, params); return r.rows; };
  const run = async (sql, params) => { const r = await pool.query(sql, params); return r; };

  const q = {};

  /* ---- auth ---- */
  q.userByUsername = (u) => one('SELECT * FROM users WHERE username = $1', [u]);
  q.userById = (id) => one('SELECT * FROM users WHERE id = $1', [id]);
  q.insertUser = async (username, salt, hash, t) => {
    const r = await pool.query('INSERT INTO users (username, password_salt, password_hash, created_at) VALUES ($1,$2,$3,$4) RETURNING id', [username, salt, hash, t]);
    return r.rows[0].id;
  };
  q.updateLastLogin = (id, t) => run('UPDATE users SET last_login = $1 WHERE id = $2', [t, id]);

  q.sessionByToken = (hash) => one('SELECT s.*, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1', [hash]);
  q.insertSession = (hash, userId, t) => run('INSERT INTO sessions (token_hash, user_id, created_at, last_seen) VALUES ($1,$2,$3,$3)', [hash, userId, t]);
  q.touchSession = (hash, t) => run('UPDATE sessions SET last_seen = $1 WHERE token_hash = $2', [t, hash]);
  q.deleteSession = (hash) => run('DELETE FROM sessions WHERE token_hash = $1', [hash]);
  q.deleteSessions = (userId) => run('DELETE FROM sessions WHERE user_id = $1', [userId]);

  q.getProgress = (userId) => one('SELECT data FROM user_progress WHERE user_id = $1', [userId]);
  q.upsertProgress = (userId, data, t) => run(
    `INSERT INTO user_progress (user_id, data, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = $3`,
    [userId, JSON.stringify(data), t]
  );

  /* ---- groups ---- */
  q.groupById = (id) => one('SELECT * FROM groups WHERE id = $1', [id]);
  q.groupByCode = (code) => one('SELECT * FROM groups WHERE code = $1', [code]);
  q.insertGroup = async (name, code, t) => {
    const r = await pool.query('INSERT INTO groups (name, code, created_at) VALUES ($1,$2,$3) RETURNING id', [name, code, t]);
    return r.rows[0].id;
  };
  q.setGroupCode = (code, id) => run('UPDATE groups SET code = $1 WHERE id = $2', [code, id]);
  q.setGroupName = (name, id) => run('UPDATE groups SET name = $1 WHERE id = $2', [name, id]);
  q.deleteGroup = (id) => run('DELETE FROM groups WHERE id = $1', [id]);
  q.allGroups = () => all(
    `SELECT g.*, (SELECT COUNT(*) FROM players p WHERE p.group_id = g.id AND p.status IN ('host','member'))::int AS members,
     (SELECT COUNT(*) FROM players p WHERE p.group_id = g.id AND p.status = 'pending')::int AS pending,
     (SELECT name FROM players p WHERE p.group_id = g.id AND p.status = 'host') AS host FROM groups g ORDER BY g.id`
  );

  /* ---- players ---- */
  q.playerByUserId = (userId) => one("SELECT * FROM players WHERE user_id = $1 AND status != 'gone' ORDER BY id DESC LIMIT 1", [userId]);
  q.playerById = (id) => one('SELECT * FROM players WHERE id = $1', [id]);
  q.playerByName = (groupId, nameKey) => one('SELECT id FROM players WHERE group_id = $1 AND name_key = $2', [groupId, nameKey]);
  q.countActive = async (groupId) => { const r = await one("SELECT COUNT(*)::int AS n FROM players WHERE group_id = $1 AND status IN ('host','member')", [groupId]); return r; };
  q.countPending = async (groupId) => { const r = await one("SELECT COUNT(*)::int AS n FROM players WHERE group_id = $1 AND status = 'pending'", [groupId]); return r; };
  q.insertPlayer = async (groupId, userId, pinSalt, pinHash, name, nameKey, status, permBoard, permVisit, permChat, createdAt, approvedAt, lastSeen) => {
    const r = await pool.query(
      `INSERT INTO players (group_id, user_id, pin_salt, pin_hash, name, name_key, status, perm_board, perm_visit, perm_chat, created_at, approved_at, last_seen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [groupId, userId, pinSalt, pinHash, name, nameKey, status, permBoard, permVisit, permChat, createdAt, approvedAt, lastSeen]
    );
    return r.rows[0].id;
  };
  q.groupPlayers = (groupId) => all("SELECT * FROM players WHERE group_id = $1 AND status != 'gone' ORDER BY id", [groupId]);
  q.setName = (name, nameKey, id) => run('UPDATE players SET name = $1, name_key = $2 WHERE id = $3', [name, nameKey, id]);
  q.setPerms = (board, visit, chat, id) => run('UPDATE players SET perm_board = $1, perm_visit = $2, perm_chat = $3 WHERE id = $4', [board, visit, chat, id]);
  q.setStatus = (status, approvedAt, id) => run('UPDATE players SET status = $1, approved_at = $2 WHERE id = $3', [status, approvedAt, id]);
  q.setPin = (salt, hash, id) => run('UPDATE players SET pin_salt = $1, pin_hash = $2, pin_fails = 0, pin_lock_until = 0 WHERE id = $3', [salt, hash, id]);
  q.pinState = (id) => one('SELECT pin_fails, pin_lock_until FROM players WHERE id = $1', [id]);
  q.pinAttempt = (t, id) => run(
    `UPDATE players SET pin_fails = CASE WHEN pin_lock_until != 0 AND pin_lock_until <= $1 THEN 1 ELSE pin_fails + 1 END,
     pin_lock_until = CASE WHEN pin_lock_until != 0 AND pin_lock_until <= $1 THEN 0 ELSE pin_lock_until END WHERE id = $2`,
    [t, id]
  );
  q.pinLock = (lockUntil, id) => run('UPDATE players SET pin_lock_until = $1, pin_fails = 0 WHERE id = $2', [lockUntil, id]);
  q.pinReset = (id) => run('UPDATE players SET pin_fails = 0, pin_lock_until = 0 WHERE id = $1', [id]);
  q.touch = (t, id) => run('UPDATE players SET last_seen = $1 WHERE id = $2', [t, id]);
  q.saveProgress = (level, stars, coins, trophies, medals, legend, farms, bestStreak, weekKey, weekBase, snapshot, lastSync, lastSeen, id) =>
    run(`UPDATE players SET level=$1, stars=$2, coins=$3, trophies=$4, medals=$5, legend=$6, farms=$7, best_streak=$8,
         week_key=$9, week_base=$10, snapshot=$11, last_sync=$12, last_seen=$13 WHERE id=$14`,
      [level, stars, coins, trophies, medals, legend, farms, bestStreak, weekKey, weekBase, JSON.stringify(snapshot), lastSync, lastSeen, id]);
  q.goPlayer = (hex, t, id) => run(
    `UPDATE players SET status='gone', name_key='~gone~' || id, perm_board=0, perm_visit=0, perm_chat=0, snapshot='{}'::jsonb, left_at=$1 WHERE id=$2`,
    [t, id]
  );
  q.deletePlayer = (id) => run('DELETE FROM players WHERE id = $1', [id]);
  q.oldPending = (t) => run("DELETE FROM players WHERE status = 'pending' AND created_at < $1", [t]);
  q.oldGone = (t) => run("DELETE FROM players WHERE status = 'gone' AND left_at < $1 AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.player_id = players.id)", [t]);

  /* ---- messages ---- */
  q.insertMsg = async (groupId, playerId, text, createdAt, blocked, digits, shortDigits, marker) => {
    const r = await pool.query(
      'INSERT INTO messages (group_id, player_id, text, created_at, blocked, digits, short_digits, marker) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [groupId, playerId, text, createdAt, blocked, digits, shortDigits, marker]
    );
    return r.rows[0].id;
  };
  q.msgById = (id) => one('SELECT * FROM messages WHERE id = $1', [id]);
  q.chatAfter = (groupId, after, limit) => all(
    `SELECT m.id, m.player_id, m.text, m.created_at, p.name FROM messages m JOIN players p ON p.id = m.player_id
     WHERE m.group_id = $1 AND m.id > $2 AND m.blocked IS NULL AND m.deleted = 0 ORDER BY m.id LIMIT $3`,
    [groupId, after, limit]
  );
  q.chatLatest = (groupId, limit) => all(
    `SELECT * FROM (SELECT m.id, m.player_id, m.text, m.created_at, p.name FROM messages m JOIN players p ON p.id = m.player_id
     WHERE m.group_id = $1 AND m.blocked IS NULL AND m.deleted = 0 ORDER BY m.id DESC LIMIT $2) sub ORDER BY id`,
    [groupId, limit]
  );
  q.chatMaxId = async (groupId) => { const r = await one('SELECT COALESCE(MAX(id),0) AS id FROM messages WHERE group_id = $1 AND blocked IS NULL AND deleted = 0', [groupId]); return r; };
  q.chatUnread = async (groupId, after, playerId) => { const r = await one('SELECT COUNT(*)::int AS n FROM messages WHERE group_id = $1 AND id > $2 AND blocked IS NULL AND deleted = 0 AND player_id != $3', [groupId, after, playerId]); return r; };
  q.removedSince = (groupId, since) => all('SELECT id FROM messages WHERE group_id = $1 AND deleted = 1 AND deleted_at > $2 AND blocked IS NULL', [groupId, since]);
  q.history = (groupId, before, playerId, limit) => all(
    `SELECT m.id, m.player_id, m.text, m.created_at, m.blocked, m.deleted, p.name FROM messages m JOIN players p ON p.id = m.player_id
     WHERE m.group_id = $1 AND m.id < $2 AND (m.blocked IS NULL OR m.player_id = $3) ORDER BY m.id DESC LIMIT $4`,
    [groupId, before, playerId, limit]
  );
  q.recentOwn = (playerId) => all('SELECT text, created_at, blocked, digits, short_digits, marker FROM messages WHERE player_id = $1 ORDER BY id DESC LIMIT 8', [playerId]);
  q.deleteMsg = (t, id) => run('UPDATE messages SET deleted = 1, deleted_at = $1 WHERE id = $2', [t, id]);
  q.oldMsgs = (t) => run('DELETE FROM messages WHERE created_at < $1', [t]);

  /* ---- events ---- */
  q.insertEvent = (groupId, toPlayer, fromPlayer, type, emoji, t) => run(
    'INSERT INTO events (group_id, to_player, from_player, type, emoji, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [groupId, toPlayer, fromPlayer, type, emoji, t]
  );
  q.eventsFor = (toPlayer, after) => all(
    `SELECT e.id, e.type, e.emoji, e.created_at, e.from_player, p.name AS from_name FROM events e LEFT JOIN players p ON p.id = e.from_player
     WHERE e.to_player = $1 AND e.id > $2 ORDER BY e.id LIMIT 30`,
    [toPlayer, after]
  );
  q.maxEvent = async (toPlayer) => { const r = await one('SELECT COALESCE(MAX(id),0) AS id FROM events WHERE to_player = $1', [toPlayer]); return r; };
  q.countEventsSince = async (toPlayer, fromPlayer, type, since) => {
    const r = await one('SELECT COUNT(*)::int AS n FROM events WHERE to_player = $1 AND from_player = $2 AND type = $3 AND created_at > $4', [toPlayer, fromPlayer, type, since]);
    return r;
  };
  q.oldEvents = (t) => run('DELETE FROM events WHERE created_at < $1', [t]);

  /* ---- cleanup old sessions ---- */
  q.oldSessions = (t) => run('DELETE FROM sessions WHERE last_seen < $1', [t]);

  return { pool, q, close: () => pool.end() };
}

module.exports = { open };
