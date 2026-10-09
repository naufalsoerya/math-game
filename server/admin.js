#!/usr/bin/env node
'use strict';
/*
 * Admin tool for the IT team. Run on the server, in this folder:
 *   node admin.js groups                    list friend groups
 *   node admin.js members <CODE>            list players of a group (CODE = invite code, e.g. ABCD-2345)
 *   node admin.js approve <PLAYER_ID>       approve a waiting player
 *   node admin.js remove <PLAYER_ID>        remove a player from the group
 *   node admin.js purge <PLAYER_ID>         delete a player and ALL their messages for good (data deletion request)
 *   node admin.js reset-pin <PLAYER_ID> <PIN>   set a new grown-up PIN (4 to 6 numbers) for a player's device
 *   node admin.js rename <PLAYER_ID> <NAME>  change a player's game name
 *   node admin.js make-host <PLAYER_ID>     make a player the group host (e.g. when the host's iPad was lost)
 *   node admin.js chat <CODE> [DAYS]        print the group chat of the last DAYS days (default 7), incl. blocked attempts
 *   node admin.js new-code <CODE>           give a group a new invite code
 *   node admin.js delete-group <CODE>       delete a group with all its players and messages
 *   node admin.js backup [FILE]             write a safe copy of the database (default: DATA_DIR/backups/math-farm-<date>.db)
 * Uses the same DATA_DIR setting as the server (.env or environment).
 */
const _emit = process.emitWarning;
process.emitWarning = function (w, ...rest) { if (String(w && w.message || w).includes('SQLite')) return; return _emit.call(process, w, ...rest); };
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
try { for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); } } catch (e) { }
const { q, db, close } = require('./db').open(path.resolve(__dirname, process.env.DATA_DIR || 'data'));

const [cmd, a1, ...rest] = process.argv.slice(2); const a2 = rest.join(' ');
const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, ' ');
const code = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const show = c => c.slice(0, 4) + '-' + c.slice(4);
const when = t => t ? new Date(t).toISOString().replace('T', ' ').slice(0, 16) : '-';
const group = c => { const g = q.groupByCode.get(code(c)); if (!g) { console.error('No group with code', c); process.exit(1); } return g; };
const player = id => { const p = q.playerById.get(+id); if (!p) { console.error('No player with id', id); process.exit(1); } return p; };

switch (cmd) {
  case 'groups':
    console.table(q.allGroups.all().map(g => ({ id: g.id, name: clean(g.name), code: show(g.code), host: g.host || '-', members: g.members, waiting: g.pending, created: when(g.created_at) })));
    break;
  case 'members': {
    const g = group(a1);
    console.log(`${clean(g.name)} (${show(g.code)})`);
    console.table(q.groupPlayers.all(g.id).map(p => ({ id: p.id, name: clean(p.name), status: p.status, level: p.level, stars: p.stars, board: !!p.perm_board, visit: !!p.perm_visit, chat: !!p.perm_chat, lastSeen: when(p.last_seen) })));
    break;
  }
  case 'approve': { const p = player(a1); if (p.status !== 'pending') { console.log(clean(p.name), 'is already', p.status); break; } q.setStatus.run('member', Date.now(), p.id); console.log('Approved', clean(p.name)); break; }
  case 'remove': { const p = player(a1); if (p.status === 'host') { console.error('This is the host. Use make-host on another player first, or delete-group.'); process.exit(1); } if (p.status === 'pending') q.deletePlayer.run(p.id); else q.goPlayer.run(crypto.randomBytes(9).toString('hex'), Date.now(), p.id); console.log('Removed', clean(p.name)); break; }
  case 'purge': {
    const p = player(a1); if (p.status === 'host') { console.error('This is the host. Use make-host on another player first, or delete-group.'); process.exit(1); }
    const n = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE player_id = ?').get(p.id).n;
    q.deletePlayer.run(p.id); console.log(`Deleted ${clean(p.name)} with ${n} messages and all their events.`); break;
  }
  case 'reset-pin': {
    const p = player(a1); if (!/^\d{4,6}$/.test(a2)) { console.error('The PIN must be 4 to 6 numbers.'); process.exit(1); }
    const salt = crypto.randomBytes(16).toString('hex'); q.setPin.run(salt, crypto.pbkdf2Sync(a2, salt, 60000, 32, 'sha256').toString('hex'), p.id); console.log('New grown-up PIN set for', clean(p.name)); break;
  }
  case 'rename': {
    const p = player(a1); const r = require('./filter').checkName(a2, 14, 3); if (!r.ok) { console.error('Name not allowed:', r.reason); process.exit(1); }
    if (q.playerByName.get(p.group_id, r.key)) { console.error('That name is already used in the group.'); process.exit(1); } q.setName.run(r.name, r.key, p.id); console.log('Renamed to', r.name); break;
  }
  case 'make-host': {
    const p = player(a1); if (p.status !== 'member' && p.status !== 'host') { console.error(clean(p.name), 'is', p.status, '- only a player who is in the group can become the host.'); process.exit(1); }
    db.exec('BEGIN');
    q.groupPlayers.all(p.group_id).filter(x => x.status === 'host').forEach(x => q.setStatus.run('member', x.approved_at || Date.now(), x.id));
    q.setStatus.run('host', p.approved_at || Date.now(), p.id); db.exec('COMMIT'); console.log(p.name, 'is now the host'); break;
  }
  case 'chat': {
    const g = group(a1); const since = Date.now() - (+a2 || 7) * 864e5;
    const rows = db.prepare(`SELECT m.*, p.name, p.status FROM messages m LEFT JOIN players p ON p.id = m.player_id WHERE m.group_id = ? AND m.created_at >= ? ORDER BY m.id`).all(g.id, since);
    rows.forEach(r => console.log(`${when(r.created_at)}  ${clean(r.name)}${r.status === 'gone' ? ' (left)' : ''}: ${clean(r.text)}${r.blocked ? `   [blocked: ${r.blocked}]` : ''}${r.deleted ? '   [removed]' : ''}`));
    if (!rows.length) console.log('No messages.');
    break;
  }
  case 'new-code': { const g = group(a1); const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c; do c = Array.from({ length: 8 }, () => A[crypto.randomInt(A.length)]).join(''); while (q.groupByCode.get(c)); q.setGroupCode.run(c, g.id); console.log('New code for', g.name + ':', show(c)); break; }
  case 'backup': {
    // VACUUM INTO makes a consistent copy even while the server is running
    const dataDir = path.resolve(__dirname, process.env.DATA_DIR || 'data');
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const out = path.resolve(a1 || path.join(dataDir, 'backups', `math-farm-${stamp}.db`));
    if (fs.existsSync(out)) { console.error('That file already exists:', out); process.exit(1); }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
    console.log('Backup written:', out, `(${Math.round(fs.statSync(out).size / 1024)} KB)`); break;
  }
  case 'delete-group': { const g = group(a1); q.deleteGroup.run(g.id); console.log('Deleted group', g.name); break; }
  default:
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(3, 17).map(l => l.replace(/^ \* ?/, '')).join('\n'));
}
close();
