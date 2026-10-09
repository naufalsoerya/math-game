'use strict';
/*
 * Adley's Math Farm — website + friends server.
 * Serves the game files from SITE_DIR and a small JSON API under /api for friend groups:
 * invite codes, host approval, leaderboard, island visits with cheers, and a filtered group chat.
 * Grown-up actions (permissions, approving, removing, chat history) need the grown-up PIN chosen when joining.
 * No npm packages are needed: Node.js 22.13+ (or 24 LTS) with its built-in SQLite.
 */
// SQLite in Node 22/24 prints an "experimental" notice; it is stable for this use, so hide just that notice.
const _emit = process.emitWarning;
process.emitWarning = function (w, ...rest) { if (String(w && w.message || w).includes('SQLite')) return; return _emit.call(process, w, ...rest); };

const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const filter = require('./filter');
const store = require('./db');

const VERSION = '2.1.0';

/* ---------------------------------------------------------------- config */
function loadDotEnv(file) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || line.trim().startsWith('#')) continue;
      let v = m[2]; if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch (e) { /* no .env file */ }
}
loadDotEnv(path.join(__dirname, '.env'));
const env = process.env;
const bool = (v, d) => v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v);
const rawKey = env.HOST_KEY || '';
const CFG = {
  port: +env.PORT || 8080,
  host: env.HOST || '127.0.0.1',
  dataDir: path.resolve(__dirname, env.DATA_DIR || 'data'),
  siteDir: path.resolve(__dirname, env.SITE_DIR || '../site'),
  // a placeholder or short key never works, so a forgotten setting cannot leave group creation open
  hostKey: rawKey.length >= 12 && !/change[-_ ]?me/i.test(rawKey) ? rawKey : '',
  // number of proxies in front of this server (nginx = 1, Cloudflare + nginx = 2); 0 = clients connect directly
  proxyHops: /^\d+$/.test(env.TRUST_PROXY || '') ? +env.TRUST_PROXY : bool(env.TRUST_PROXY, false) ? 1 : 0,
  // X-Forwarded-For is only believed when the connection comes from one of these (default: this machine or a private network)
  trustedProxies: (env.TRUSTED_PROXIES || '').split(',').map(x => x.trim()).filter(Boolean),
  retentionDays: Math.max(1, +env.CHAT_RETENTION_DAYS || 180),
  weekTz: env.WEEK_TZ_OFFSET_MINUTES !== undefined && env.WEEK_TZ_OFFSET_MINUTES !== '' ? +env.WEEK_TZ_OFFSET_MINUTES : 420,
  maxGroup: Math.max(2, +env.MAX_GROUP_SIZE || 40),
  maxPending: Math.max(1, +env.MAX_WAITING || 10),
  // per visitor address (a whole school or office behind one internet address counts as one visitor)
  ratePerMinute: Math.max(60, +env.RATE_LIMIT_PER_MINUTE || 600),
  wrongCodesPer15Min: Math.max(3, +env.WRONG_CODE_LIMIT || 12),
  noindex: bool(env.NOINDEX, true),
  hsts: bool(env.HSTS, false),
  logRequests: bool(env.LOG_REQUESTS, false)
};
if (CFG.dataDir === CFG.siteDir || CFG.dataDir.startsWith(CFG.siteDir + path.sep)) {
  console.error('DATA_DIR must not be inside SITE_DIR (the database would be downloadable). Please change DATA_DIR.'); process.exit(1);
}
const MAX_MSG = 120, MAX_NAME = 14, MAX_GROUP_NAME = 30;
const PETS = ['🐶', '🐱', '🐰', '🐷', '🦆', '🐴', '🦊', '🐼', '🦄', '🐉'];
const CHEERS = ['❤️', '⭐', '👏', '🌻', '🎉'];
const ONLINE_MS = 3 * 60 * 1000;

/* ---------------------------------------------------------------- storage */
const { db, q, close: closeDb } = store.open(CFG.dataDir);
const extraWords = filter.loadExtra(CFG.dataDir);

/* ---------------------------------------------------------------- helpers */
const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 8 }, () => CODE_ABC[crypto.randomInt(CODE_ABC.length)]).join('');
const showCode = c => c.slice(0, 4) + '-' + c.slice(4);
// codes never use I, L, O, 0 or 1, so they cannot be misread; spaces, dashes and lower case are ignored when typed
const fixCode = c => (typeof c === 'string' ? c : '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
const int = (v, lo, hi, d = 0) => { v = typeof v === 'number' || typeof v === 'string' ? Math.floor(Number(v)) : NaN; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
const ints = (a, lo, hi, max) => Array.isArray(a) ? [...new Set(a.map(v => int(v, lo, hi, -1)).filter(v => v >= lo))].slice(0, max) : [];
const strOf = v => typeof v === 'string' ? v : '';
// PIN hashing runs off the main thread so it never pauses other players' requests
const pinHash = (pin, salt) => new Promise((ok, no) => crypto.pbkdf2(pin, salt, 60000, 32, 'sha256', (e, k) => e ? no(e) : ok(k.toString('hex'))));
const active = p => p.status === 'host' || p.status === 'member';

function weekKey(ms) {
  const d = new Date(ms + CFG.weekTz * 60000);
  const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
  const y = d.getUTCFullYear(); const jan4 = new Date(Date.UTC(y, 0, 4));
  const wk = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}
function seenBucket(ms, t) {
  if (!ms) return 'not seen yet'; const d = t - ms;
  return d < ONLINE_MS ? 'online now' : d < 24 * 3600e3 ? 'seen today' : d < 7 * 24 * 3600e3 ? 'seen this week' : 'seen more than a week ago';
}

function cleanProgress(p) {
  p = p && typeof p === 'object' ? p : {};
  const plots = Array.isArray(p.plots) && p.plots.length === 18 ? p.plots.map(x => ({ done: !!(x && x.done), stars: int(x && x.stars, 0, 3) })) : null;
  let world = null; const w = p.world;
  if (w && typeof w === 'object' && typeof w.expl === 'string' && /^[01]{625}$/.test(w.expl) && typeof w.disc === 'string' && /^[01]{18}$/.test(w.disc)) {
    world = { level: int(w.level, 1, 99999, 1), coins: ints(w.coins, 0, 400, 400), chests: ints(w.chests, 0, 60, 60), expl: w.expl, disc: w.disc };
  }
  const wear = {}; for (const k of ['shirt', 'pants', 'hat', 'skin']) wear[k] = int(p.wear && p.wear[k], 0, 30);
  const follow = Array.isArray(p.follow) ? p.follow.filter(e => PETS.includes(e)).slice(0, 4) : [];
  return {
    level: int(p.level, 1, 99999, 1), stars: int(p.stars, 0, 1e7), coins: int(p.coins, 0, 1e8), trophies: int(p.trophies, 0, 200),
    medals: int(p.medals, 0, 10), legend: int(p.legend, 0, 1e5), farms: plots ? plots.filter(x => x.done).length : int(p.farms, 0, 18),
    bestStreak: int(p.bestStreak, 0, 1e5), plots, world, wear, follow
  };
}
function cleanPerms(p, d) {
  p = p && typeof p === 'object' ? p : {};
  const b = (v, x) => typeof v === 'boolean' ? v : x;
  return { board: b(p.board, d.board), visit: b(p.visit, d.visit), chat: b(p.chat, d.chat) };
}
function saveProgress(pl, raw) {
  const pr = cleanProgress(raw); const t = now(); const wk = weekKey(t);
  let base = pl.week_base;
  if (!pl.last_sync) base = pr.stars;            // first sync: this week starts now
  else if (pl.week_key !== wk) base = pl.stars;  // new week: start from last week's total
  if (pr.stars < base) base = pr.stars;          // progress was reset on the device
  const old = safeJSON(pl.snapshot);
  const snap = { plots: pr.plots || old.plots || null, world: pr.world, wear: pr.wear, follow: pr.follow };
  q.saveProgress.run(pr.level, pr.stars, pr.coins, pr.trophies, pr.medals, pr.legend, pr.farms, pr.bestStreak, wk, base, JSON.stringify(snap), t, t, pl.id);
  return Math.max(0, pr.stars - base);
}
const safeJSON = s => { try { return JSON.parse(s) || {}; } catch (e) { return {}; } };
const weekStars = pl => pl.week_key === weekKey(now()) ? Math.max(0, pl.stars - pl.week_base) : 0;

function state(pl) {
  const g = q.groupById.get(pl.group_id);
  return {
    me: { id: pl.id, name: pl.name, status: pl.status, isHost: pl.status === 'host', perms: { board: !!pl.perm_board, visit: !!pl.perm_visit, chat: !!pl.perm_chat } },
    group: { name: g.name, members: q.countActive.get(pl.group_id).n, max: CFG.maxGroup, code: pl.status === 'host' ? showCode(g.code) : undefined }
  };
}

/* ---------------------------------------------------------------- rate limits (in memory, bounded) */
const hits = new Map(), guard = new Map(); const MAX_KEYS = 50000;
// join/create guesses are counted in "guard", which general traffic can never push out
function allow(key, max, windowMs) {
  const t = now(); const map = /^(join|create|joinfail|createfail):/.test(key) ? guard : hits; let e = map.get(key);
  if (!e) { if (map.size >= MAX_KEYS) { let n = 0; for (const k of map.keys()) { map.delete(k); if (++n >= MAX_KEYS / 10) break; } } e = { w: windowMs, t: [] }; map.set(key, e); }
  e.t = e.t.filter(x => t - x < windowMs); e.w = Math.max(e.w, windowMs);
  if (e.t.length >= max) return false;
  e.t.push(t); return true;
}
// how many hits a key has in its window, without adding one
const peek = (key, windowMs) => { const e = guard.get(key) || hits.get(key); return e ? e.t.filter(x => now() - x < windowMs).length : 0; };
setInterval(() => { const t = now(); for (const map of [hits, guard]) for (const [k, e] of map) if (!e.t.length || t - e.t[e.t.length - 1] > e.w) map.delete(k); }, 60e3).unref();

/* ---------------------------------------------------------------- http helpers */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
function baseHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (CFG.noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (CFG.hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
class ApiError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
// Behind N proxies, the real visitor is the N-th address from the right of X-Forwarded-For (proxies append; visitors can only prepend).
// The header is ignored when the connection itself does not come from a trusted proxy, so it cannot be faked from outside.
const privateIp = ip => /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i.test(ip);
const fromProxy = ip => CFG.trustedProxies.length ? CFG.trustedProxies.includes(ip) : privateIp(ip);
// IPv6 visitors are counted per /64 network, since one device can use many addresses inside it
function expand6(ip) { const [h, t = ''] = ip.split('::'); const a = h ? h.split(':') : [], b = t ? t.split(':') : []; const mid = ip.includes('::') ? Array(8 - a.length - b.length).fill('0') : []; return a.concat(mid, b).map(x => x.padStart(4, '0')); }
const limitKey = ip => net.isIPv6(ip) ? expand6(ip.replace(/%.*$/, '')).slice(0, 4).join(':') + '::/64' : ip;
function clientIp(req) {
  const sock = (req.socket.remoteAddress || '?').replace(/^::ffff:/, '');
  if (!CFG.proxyHops || !fromProxy(sock)) return sock;
  const list = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean).slice(-64);
  const ip = list.length >= CFG.proxyHops ? list[list.length - CFG.proxyHops].replace(/^::ffff:/, '') : '';
  return net.isIP(ip) ? ip : sock;
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0, over = false; const chunks = [];
    req.on('data', c => { if (over) return; size += c.length; if (size > limit) { over = true; chunks.length = 0; reject(new ApiError(413, 'tooBig', 'That request is too big.')); } else chunks.push(c); });
    req.on('end', () => {
      if (over) return;
      if (!size) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {}); }
      catch (e) { reject(new ApiError(400, 'badJson', 'The request could not be read.')); }
    });
    req.on('error', reject);
  });
}
function authed(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{20,100})$/);
  const pl = m ? q.playerByToken.get(sha(m[1])) : null;
  if (!pl) fail(401, 'auth', 'This device is not in a friend group.');
  return pl;
}
const approved = pl => { if (pl.status === 'pending') fail(403, 'pending', 'Waiting for the group host to say yes.'); return pl; };
const host = pl => { if (pl.status !== 'host') fail(403, 'notHost', 'Only the grown-up who started the group can do this.'); return pl; };
// grown-up actions need the PIN chosen when the device joined (sent in the X-Parent-Pin header)
const pinBusy = new Set();
async function grownUp(req, pl) {
  const t = now(); const st0 = q.pinState.get(pl.id);
  if (st0.pin_lock_until > t) fail(429, 'pinLocked', 'Too many wrong PIN tries. Please wait 15 minutes and try again.');
  const pin = String(req.headers['x-parent-pin'] || '');
  if (!pin) fail(403, 'pin', 'Please type the grown-up PIN.');
  if (pinBusy.has(pl.id)) fail(429, 'busy', 'Please wait a moment and try again.');      // one PIN check at a time per device
  q.pinAttempt.run(t, t, pl.id); const tries = q.pinState.get(pl.id).pin_fails;           // counted before checking
  if (tries > 5) { q.pinLock.run(t + 15 * 60e3, pl.id); fail(429, 'pinLocked', 'Too many wrong PIN tries. Please wait 15 minutes and try again.'); }
  pinBusy.add(pl.id);
  let ok = false;
  try { ok = /^\d{4,6}$/.test(pin) && crypto.timingSafeEqual(Buffer.from(await pinHash(pin, pl.pin_salt), 'hex'), Buffer.from(pl.pin_hash, 'hex')); }
  finally { pinBusy.delete(pl.id); }
  if (!ok) { if (tries >= 5) q.pinLock.run(t + 15 * 60e3, pl.id); fail(403, 'pin', 'That grown-up PIN is not right.'); }
  q.pinReset.run(pl.id); return pl;
}
const pinOk = v => { const pin = strOf(v); if (!/^\d{4,6}$/.test(pin)) fail(400, 'pin', 'Please choose a grown-up PIN of 4 to 6 numbers.'); return pin; };
async function newPin(pin) { const salt = crypto.randomBytes(16).toString('hex'); return { salt, hash: await pinHash(pin, salt) }; }
const NAME_MSG = {
  empty: 'Please type a name.', long: 'That name is too long.', chars: 'Please use English letters, numbers and spaces only.',
  digits: 'Please use at most 3 numbers in a name.', contact: 'A name cannot hold contact details or a web address.', kind: 'Please choose a kind name.'
};
function checkName(v, max, what, maxDigits) {
  const r = filter.checkName(v, max, maxDigits); if (!r.ok) fail(400, 'name', `${what}: ${NAME_MSG[r.reason] || 'Please choose another name.'}`); return r;
}
function uniqueName(groupId, r, selfId) {
  const hit = q.playerByName.get(groupId, r.key);
  if (hit && hit.id !== selfId) fail(409, 'nameTaken', `Someone in this group already uses the name "${r.name}". Try adding a letter, like "${r.name} B".`);
}
const CHAT_MSG = {
  empty: 'Type a message first.', long: `That message is too long. Please keep it under ${MAX_MSG} letters.`,
  kind: "Oops! Let's use kind words. Try saying it a nicer way. 💛", link: "Links can't be shared in chat.",
  contact: 'To stay safe, please don’t share or ask for phone numbers, emails, usernames, photos, where someone lives or their school in chat.',
  repeat: 'You already said that! Try something new.', fast: 'Slow down a little! Wait a moment, then send again.'
};
function leave(pl) { q.goPlayer.run(crypto.randomBytes(9).toString('hex'), now(), pl.id); }

/* ---------------------------------------------------------------- API */
async function api(req, res, url) {
  const ip = limitKey(clientIp(req)); const M = req.method; const p = url.pathname.replace(/\/+$/, '') || '/';
  if (!allow('ip:' + ip, CFG.ratePerMinute, 60e3)) fail(429, 'busy', 'Too many requests. Please wait a minute.');
  let m;

  if (p === '/api/health' && M === 'GET') return sendJSON(res, 200, { ok: true, app: 'adley-math-farm', version: VERSION, friends: true, canCreate: !!CFG.hostKey });

  if (p === '/api/groups' && M === 'POST') {
    // wrong host keys are limited strictly (10 an hour); right ones less so, so many teachers in one school can start groups
    if (peek('createfail:' + ip, 3600e3) >= 10 || !allow('create:' + ip, 60, 3600e3)) fail(429, 'busy', 'Too many tries. Please wait a while and try again.');
    const b = await readBody(req, 64 * 1024);
    if (!CFG.hostKey) fail(403, 'noHostKey', 'Starting a new friend group is switched off on this server. Ask your IT team to set HOST_KEY.');
    const ok = crypto.timingSafeEqual(Buffer.from(sha(strOf(b.hostKey)), 'hex'), Buffer.from(sha(CFG.hostKey), 'hex'));
    if (!ok) { allow('createfail:' + ip, 1000, 3600e3); fail(403, 'hostKey', 'That host key is not right. Ask your IT team for the host key.'); }
    const g = checkName(b.groupName, MAX_GROUP_NAME, 'Group name', 4); const n = checkName(b.playerName, MAX_NAME, "Child's name");
    const pin = await newPin(pinOk(b.pin));
    let code; do code = newCode(); while (q.groupByCode.get(code));
    const t = now(); const token = newToken(); const perms = cleanPerms(b.perms, { board: true, visit: true, chat: true });
    db.exec('BEGIN');
    try {
      const gid = Number(q.insertGroup.run(g.name, code, t).lastInsertRowid);
      const pid = Number(q.insertPlayer.run(gid, sha(token), pin.salt, pin.hash, n.name, n.key, 'host', +perms.board, +perms.visit, +perms.chat, t, t, t).lastInsertRowid);
      saveProgress(q.playerById.get(pid), b.progress); db.exec('COMMIT');
      return sendJSON(res, 201, { token, ...state(q.playerById.get(pid)) });
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  if (p === '/api/join' && M === 'POST') {
    // wrong invite codes are limited strictly (guessing); right ones less so, so a whole class can join from one school network
    if (peek('joinfail:' + ip, 15 * 60e3) >= CFG.wrongCodesPer15Min || !allow('join:' + ip, 200, 3600e3)) fail(429, 'busy', 'Too many tries. Please wait 15 minutes and try again.');
    const b = await readBody(req, 64 * 1024);
    const g = q.groupByCode.get(fixCode(b.code));
    if (!g) { allow('joinfail:' + ip, 1000, 15 * 60e3); fail(404, 'code', 'That invite code did not work. Check the letters and numbers and try again.'); }
    const n = checkName(b.playerName, MAX_NAME, "Child's name"); uniqueName(g.id, n, -1); const pinText = pinOk(b.pin);
    if (q.countActive.get(g.id).n >= CFG.maxGroup) fail(409, 'full', `This friend group is full (${CFG.maxGroup} players).`);
    if (q.countPending.get(g.id).n >= CFG.maxPending) fail(429, 'manyWaiting', 'Many children are already waiting to join this group. Please try again later.');
    const pin = await newPin(pinText);
    if (q.playerByName.get(g.id, n.key)) fail(409, 'nameTaken', `Someone in this group already uses the name "${n.name}". Try adding a letter, like "${n.name} B".`);
    const t = now(); const token = newToken(); const perms = cleanPerms(b.perms, { board: true, visit: true, chat: true });
    const pid = Number(q.insertPlayer.run(g.id, sha(token), pin.salt, pin.hash, n.name, n.key, 'pending', +perms.board, +perms.visit, +perms.chat, t, null, t).lastInsertRowid);
    saveProgress(q.playerById.get(pid), b.progress);
    const h = q.groupPlayers.all(g.id).find(x => x.status === 'host');
    if (h) q.insertEvent.run(g.id, h.id, pid, 'request', null, t);
    return sendJSON(res, 201, { token, ...state(q.playerById.get(pid)) });
  }

  // everything below needs a device token
  const me = authed(req);
  if (!allow('pl:' + me.id, 180, 60e3)) fail(429, 'busy', 'Too many requests. Please wait a minute.');

  if (p === '/api/me' && M === 'GET') { q.touch.run(now(), me.id); return sendJSON(res, 200, state(me)); }
  if (p === '/api/parent' && M === 'GET') { await grownUp(req, me); return sendJSON(res, 200, { ok: true }); }
  if (p === '/api/me' && M === 'PUT') {
    await grownUp(req, me); const b = await readBody(req, 8 * 1024);
    if (b.name !== undefined) {
      if (me.status === 'member') fail(403, 'nameLocked', 'Only the group host can change a name once a child is in the group.');
      const n = checkName(b.name, MAX_NAME, "Child's name"); uniqueName(me.group_id, n, me.id); q.setName.run(n.name, n.key, me.id);
    }
    if (b.perms !== undefined) { const pr = cleanPerms(b.perms, { board: !!me.perm_board, visit: !!me.perm_visit, chat: !!me.perm_chat }); q.setPerms.run(+pr.board, +pr.visit, +pr.chat, me.id); }
    if (b.newPin !== undefined) { const pin = await newPin(pinOk(b.newPin)); q.setPin.run(pin.salt, pin.hash, me.id); }
    return sendJSON(res, 200, state(q.playerById.get(me.id)));
  }
  if (p === '/api/me' && M === 'DELETE') {
    await grownUp(req, me);
    if (me.status === 'host') { q.deleteGroup.run(me.group_id); return sendJSON(res, 200, { ok: true, groupDeleted: true }); }
    if (me.status === 'pending') q.deletePlayer.run(me.id); else leave(me);
    return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/progress' && M === 'POST') {
    if (!allow('sync:' + me.id, 30, 60e3)) fail(429, 'busy', 'Saving too often.');
    const b = await readBody(req, 64 * 1024);
    const ws = saveProgress(me, b.progress); return sendJSON(res, 200, { ok: true, weekStars: ws });
  }

  if (p === '/api/poll' && M === 'GET') {
    const t = now(); q.touch.run(t, me.id);
    const ev = int(url.searchParams.get('event'), 0, 1e12), ch = int(url.searchParams.get('chat'), 0, 1e12);
    const out = { status: me.status, perms: { board: !!me.perm_board, visit: !!me.perm_visit, chat: !!me.perm_chat } };
    out.events = q.eventsFor.all(me.id, ev).map(e => ({ id: e.id, type: e.type, emoji: e.emoji, from: e.from_name || 'A friend', at: e.created_at }));
    out.lastEvent = (q.maxEvent.get(me.id).id) || 0;
    if (active(me) && me.perm_chat) { out.chatLatest = q.chatMaxId.get(me.group_id).id || 0; out.unread = ch ? q.chatUnread.get(me.group_id, ch, me.id).n : 0; }
    if (me.status === 'host') out.requests = q.countPending.get(me.group_id).n;
    return sendJSON(res, 200, out);
  }

  if (p === '/api/board' && M === 'GET') {
    approved(me); const t = now();
    const rows = q.groupPlayers.all(me.group_id).filter(x => active(x) && (x.perm_board || x.id === me.id)).map(x => {
      const s = safeJSON(x.snapshot);
      return {
        id: x.id, name: x.name, me: x.id === me.id, host: x.status === 'host', level: x.level, stars: x.stars, weekStars: weekStars(x),
        trophies: x.trophies, medals: x.medals, legend: x.legend, farms: x.farms, wear: s.wear || {}, follow: s.follow || [],
        online: t - x.last_seen < ONLINE_MS, canVisit: x.id !== me.id && !!x.perm_visit, hidden: !x.perm_board
      };
    });
    return sendJSON(res, 200, { members: rows, week: weekKey(t) });
  }

  if ((m = p.match(/^\/api\/visit\/(\d+)$/)) && M === 'GET') {
    approved(me); const f = q.playerById.get(+m[1]);
    if (!f || f.group_id !== me.group_id || !active(f)) fail(404, 'missing', 'That friend could not be found.');
    if (f.id === me.id) fail(400, 'self', 'That is your own island!');
    if (!f.perm_visit) fail(403, 'private', 'This island is private right now.');
    const t = now(); if (!q.countEventsSince.get(f.id, me.id, 'visit', t - 3600e3).n) q.insertEvent.run(me.group_id, f.id, me.id, 'visit', null, t);
    const s = safeJSON(f.snapshot);
    return sendJSON(res, 200, { id: f.id, name: f.name, level: f.level, stars: f.stars, trophies: f.trophies, farms: f.farms, legend: f.legend, plots: s.plots || null, world: s.world || null, wear: s.wear || {}, follow: s.follow || [] });
  }

  if ((m = p.match(/^\/api\/cheer\/(\d+)$/)) && M === 'POST') {
    approved(me); const b = await readBody(req, 4 * 1024); const f = q.playerById.get(+m[1]);
    if (!f || f.group_id !== me.group_id || !active(f) || f.id === me.id) fail(404, 'missing', 'That friend could not be found.');
    if (!f.perm_visit) fail(403, 'private', 'This island is private right now.');
    if (!CHEERS.includes(b.emoji)) fail(400, 'emoji', 'Please pick one of the cheer stickers.');
    const t = now(); if (q.countEventsSince.get(f.id, me.id, 'cheer', t - 24 * 3600e3).n >= 5) fail(429, 'cheerLimit', `You sent lots of cheers to ${f.name} today! Try again tomorrow.`);
    q.insertEvent.run(me.group_id, f.id, me.id, 'cheer', b.emoji, t); return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/chat' && M === 'GET') {
    approved(me); if (!me.perm_chat) fail(403, 'chatOff', 'A grown-up has turned chat off.');
    const after = int(url.searchParams.get('after'), 0, 1e12); const t = now();
    const rows = after ? q.chatAfter.all(me.group_id, after, 100) : q.chatLatest.all(me.group_id, 50);
    return sendJSON(res, 200, {
      messages: rows.map(r => ({ id: r.id, from: r.player_id, name: r.name, text: r.text, at: r.created_at, mine: r.player_id === me.id })),
      latest: q.chatMaxId.get(me.group_id).id || 0, removed: q.removedSince.all(me.group_id, t - 15 * 60e3).map(r => r.id)
    });
  }
  if (p === '/api/chat' && M === 'POST') {
    approved(me); if (!me.perm_chat) fail(403, 'chatOff', 'A grown-up has turned chat off.');
    const b = await readBody(req, 4 * 1024); const t = now();
    if (!allow('gap:' + me.id, 1, 1500) || !allow('chat:' + me.id, 15, 60e3) || !allow('chatday:' + me.id, 300, 24 * 3600e3)) fail(429, 'fast', CHAT_MSG.fast);
    const names = new Set(q.groupPlayers.all(me.group_id).filter(active).map(x => filter.nameKey(x.name)));
    let r = filter.checkMessage(b.text, MAX_MSG, { names });
    const pc = r.ok ? filter.pieceInfo(r.text) : { digits: 0, short: 0, marker: false };
    // a phone number sent in pieces ("08" … "12" … "terus 3456" …) within 3 minutes. Short number-only messages count once a piece
    // that starts like a phone number ("08…", "+62…", "8 1 2") was sent, so a row of maths answers ("12", "15", "18") stays fine.
    // Refused messages never reached anyone, so they don't count.
    if (r.ok && (pc.digits || pc.short)) {
      const recent = q.recentOwn.all(me.id).filter(x => !x.blocked && t - x.created_at < 180e3);
      const markerSeen = pc.marker || recent.some(x => x.marker);
      const val = (d, sh) => markerSeen ? Math.max(d, sh) : d;
      const sum = recent.reduce((a, x) => a + val(x.digits, x.short_digits), val(pc.digits, pc.short));
      if (sum >= 7) r = { ok: false, reason: 'contact', text: r.text };
    }
    if (!r.ok) {
      // kept only for this child's grown-up; digits and usernames are masked
      if (r.text && r.reason !== 'long') q.insertMsg.run(me.group_id, me.id, (r.reason === 'kind' ? r.text : filter.mask(r.text)).slice(0, 300), t, r.reason, pc.digits, pc.short, +pc.marker);
      fail(422, r.reason, CHAT_MSG[r.reason] || 'That message cannot be sent.');
    }
    if (q.recentOwn.all(me.id).some(x => !x.blocked && x.text.toLowerCase() === r.text.toLowerCase() && t - x.created_at < 60e3)) fail(422, 'repeat', CHAT_MSG.repeat);
    const id = Number(q.insertMsg.run(me.group_id, me.id, r.text, t, null, pc.digits, pc.short, +pc.marker).lastInsertRowid);
    return sendJSON(res, 201, { ok: true, message: { id, from: me.id, name: me.name, text: r.text, at: t, mine: true } });
  }
  if (p === '/api/chat/history' && M === 'GET') {
    approved(me); await grownUp(req, me); const before = int(url.searchParams.get('before'), 0, 1e12) || 1e12; const isHost = me.status === 'host';
    const rows = q.history.all(me.group_id, before, me.id, 100);
    return sendJSON(res, 200, {
      messages: rows.map(r => {
        const mine = r.player_id === me.id;
        return { id: r.id, from: r.player_id, name: r.name, text: r.deleted && !mine && !isHost ? '' : r.text, at: r.created_at, mine, blocked: r.blocked || null, removed: !!r.deleted, canRemove: !r.deleted && !r.blocked && (mine || isHost) };
      })
    });
  }
  if ((m = p.match(/^\/api\/chat\/(\d+)$/)) && M === 'DELETE') {
    approved(me); await grownUp(req, me); const msg = q.msgById.get(+m[1]);
    if (!msg || msg.group_id !== me.group_id) fail(404, 'missing', 'That message could not be found.');
    if (msg.player_id !== me.id && me.status !== 'host') fail(403, 'notYours', "Only your child's own messages can be removed. The group host can remove any message.");
    q.deleteMsg.run(now(), msg.id); return sendJSON(res, 200, { ok: true });
  }

  // host (the grown-up who started the group)
  if (p.startsWith('/api/host/')) { host(me); await grownUp(req, me); }
  if (p === '/api/host/members' && M === 'GET') {
    const t = now();
    return sendJSON(res, 200, { members: q.groupPlayers.all(me.group_id).map(x => ({ id: x.id, name: x.name, status: x.status, me: x.id === me.id, level: x.level, stars: x.stars, joined: x.created_at, seen: seenBucket(x.last_seen, t) })) });
  }
  if ((m = p.match(/^\/api\/host\/members\/(\d+)\/(approve|decline|remove)$/)) && M === 'POST') {
    const f = q.playerById.get(+m[1]); const act = m[2];
    if (!f || f.group_id !== me.group_id || f.status === 'gone') fail(404, 'missing', 'That player could not be found.');
    if (f.id === me.id) fail(400, 'self', 'You cannot do that to yourself. Use "Close the group" instead.');
    if (act === 'approve') {
      if (f.status !== 'pending') fail(400, 'state', `${f.name} is already in the group.`);
      if (q.countActive.get(me.group_id).n >= CFG.maxGroup) fail(409, 'full', `The group is full (${CFG.maxGroup} players).`);
      q.setStatus.run('member', now(), f.id); q.insertEvent.run(me.group_id, f.id, me.id, 'approved', null, now());
    } else if (act === 'decline') { if (f.status !== 'pending') fail(400, 'state', `${f.name} is already in the group. Use Remove instead.`); q.deletePlayer.run(f.id); }
    else { if (f.status === 'pending') q.deletePlayer.run(f.id); else leave(f); }
    return sendJSON(res, 200, { ok: true });
  }
  if ((m = p.match(/^\/api\/host\/members\/(\d+)$/)) && M === 'PUT') {
    const f = q.playerById.get(+m[1]); const b = await readBody(req, 4 * 1024);
    if (!f || f.group_id !== me.group_id || f.status === 'gone') fail(404, 'missing', 'That player could not be found.');
    const n = checkName(b.name, MAX_NAME, "Child's name"); uniqueName(me.group_id, n, f.id); q.setName.run(n.name, n.key, f.id);
    return sendJSON(res, 200, { ok: true, name: n.name });
  }
  if (p === '/api/host/code' && M === 'POST') {
    let code; do code = newCode(); while (q.groupByCode.get(code));
    q.setGroupCode.run(code, me.group_id); return sendJSON(res, 200, state(q.playerById.get(me.id)));
  }
  if (p === '/api/host/group' && M === 'PUT') {
    const b = await readBody(req, 4 * 1024); q.setGroupName.run(checkName(b.name, MAX_GROUP_NAME, 'Group name', 4).name, me.group_id);
    return sendJSON(res, 200, state(q.playerById.get(me.id)));
  }
  fail(404, 'notFound', 'Unknown request.');
}

/* ---------------------------------------------------------------- static files */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const fileCache = new Map();
function getFile(rel) {
  const full = path.resolve(CFG.siteDir, '.' + rel);
  if (!full.startsWith(CFG.siteDir + path.sep)) return null;
  if (rel.split('/').some(seg => seg.startsWith('.'))) return null;
  let st; try { st = fs.statSync(full); } catch (e) { return null; }
  if (!st.isFile()) return null;
  const hit = fileCache.get(full); if (hit && hit.mtime === st.mtimeMs) return hit;
  const buf = fs.readFileSync(full); const ext = path.extname(full).toLowerCase(); const type = TYPES[ext] || 'application/octet-stream';
  const f = { buf, type, mtime: st.mtimeMs, etag: '"' + crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 20) + '"', ext };
  if (/^(text|application\/(javascript|json|manifest))|svg/.test(type) && buf.length > 1024) f.gz = zlib.gzipSync(buf, { level: 9 });
  fileCache.set(full, f); return f;
}
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Method not allowed'); }
  let rel; try { rel = decodeURIComponent(url.pathname); } catch (e) { rel = '/'; }
  if (rel.includes('\0') || rel.includes('\\')) rel = '/__bad__';
  if (rel.endsWith('/')) rel += 'index.html';
  const f = getFile(rel);
  if (!f) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }); return res.end('Not found'); }
  const cache = f.ext === '.html' || f.ext === '.webmanifest' ? 'no-cache' : f.ext === '.png' || f.ext === '.ico' ? 'public, max-age=86400' : /\.(js|css|woff2)$/.test(f.ext) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  const h = { 'Content-Type': f.type, 'Cache-Control': cache, ETag: f.etag, Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === f.etag) { res.writeHead(304, h); return res.end(); }
  const gz = f.gz && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  const body = gz ? f.gz : f.buf; if (gz) h['Content-Encoding'] = 'gzip'; h['Content-Length'] = body.length;
  res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : body);
}

/* ---------------------------------------------------------------- server */
const server = http.createServer(async (req, res) => {
  const t0 = now(); baseHeaders(res);
  let url; try { url = new URL(req.url, 'http://local'); } catch (e) { res.writeHead(400); return res.end(); }
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    try { await api(req, res, url); }
    catch (e) {
      if (e instanceof ApiError) { if (e.status === 413) res.setHeader('Connection', 'close'); sendJSON(res, e.status, { error: e.code, message: e.message }); }
      else { console.error(new Date().toISOString(), 'API error', req.method, url.pathname, e && e.stack || e); if (!res.headersSent) sendJSON(res, 500, { error: 'server', message: 'Something went wrong on the server.' }); }
    }
    if (CFG.logRequests) console.log(new Date().toISOString(), req.method, url.pathname, res.statusCode, now() - t0 + 'ms');
    return;
  }
  serveStatic(req, res, url);
});
server.headersTimeout = 15000; server.requestTimeout = 20000; server.keepAliveTimeout = 5000;

function cleanup() {
  const t = now();
  try { q.oldMsgs.run(t - CFG.retentionDays * 864e5); q.oldEvents.run(t - 30 * 864e5); q.oldPending.run(t - 14 * 864e5); q.oldGone.run(t - 7 * 864e5); } catch (e) { console.error('cleanup failed', e); }
}
cleanup(); setInterval(cleanup, 3600e3).unref();

if (require.main === module) {
  server.listen(CFG.port, CFG.host, () => {
    console.log(`Adley's Math Farm server ${VERSION} on http://${CFG.host}:${CFG.port}`);
    console.log(`  site: ${CFG.siteDir}${fs.existsSync(path.join(CFG.siteDir, 'index.html')) ? '' : '  (WARNING: index.html not found)'}`);
    console.log(`  data: ${CFG.dataDir}  ·  chat kept ${CFG.retentionDays} days  ·  max ${CFG.maxGroup} players per group`);
    console.log(`  new friend groups: ${CFG.hostKey ? 'allowed with HOST_KEY' : 'OFF (set HOST_KEY to a secret of at least 12 characters)'}${extraWords ? `  ·  ${extraWords} extra blocked words` : ''}`);
    console.log(`  proxies trusted in front of this server: ${CFG.proxyHops}${CFG.proxyHops ? '' : ' (set TRUST_PROXY=1 when running behind nginx or another proxy)'}`);
  });
  const stop = () => { server.close(() => { closeDb(); process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
module.exports = { server, CFG, weekKey, cleanProgress, limitKey };
