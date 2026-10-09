'use strict';
/*
 * Adley's Math Farm — website + friends server (PostgreSQL version).
 * User accounts (username + password), cloud-saved game progress,
 * and friend groups with leaderboard, island visits, and filtered chat.
 */
const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const filter = require('./filter');
const store = require('./db');

const VERSION = '2.2.0';

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
  databaseUrl: env.DATABASE_URL || '',
  siteDir: path.resolve(__dirname, env.SITE_DIR || '../site'),
  hostKey: rawKey.length >= 12 && !/change[-_ ]?me/i.test(rawKey) ? rawKey : '',
  proxyHops: /^\d+$/.test(env.TRUST_PROXY || '') ? +env.TRUST_PROXY : bool(env.TRUST_PROXY, false) ? 1 : 0,
  trustedProxies: (env.TRUSTED_PROXIES || '').split(',').map(x => x.trim()).filter(Boolean),
  retentionDays: Math.max(1, +env.CHAT_RETENTION_DAYS || 180),
  weekTz: env.WEEK_TZ_OFFSET_MINUTES !== undefined && env.WEEK_TZ_OFFSET_MINUTES !== '' ? +env.WEEK_TZ_OFFSET_MINUTES : 420,
  maxGroup: Math.max(2, +env.MAX_GROUP_SIZE || 40),
  maxPending: Math.max(1, +env.MAX_WAITING || 10),
  ratePerMinute: Math.max(60, +env.RATE_LIMIT_PER_MINUTE || 600),
  wrongCodesPer15Min: Math.max(3, +env.WRONG_CODE_LIMIT || 12),
  noindex: bool(env.NOINDEX, true),
  hsts: bool(env.HSTS, false),
  logRequests: bool(env.LOG_REQUESTS, false)
};

const MAX_MSG = 120, MAX_NAME = 14, MAX_GROUP_NAME = 30;
const MAX_USERNAME = 30, MIN_USERNAME = 3, MIN_PASSWORD = 6;
const PETS = ['🐶', '🐱', '🐰', '🐷', '🦆', '🐴', '🦊', '🐼', '🦄', '🐉'];
const CHEERS = ['❤️', '⭐', '👏', '🌻', '🎉'];
const ONLINE_MS = 3 * 60 * 1000;

/* ---------------------------------------------------------------- storage (async init) */
let q, closeDb;

/* ---------------------------------------------------------------- helpers */
const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 8 }, () => CODE_ABC[crypto.randomInt(CODE_ABC.length)]).join('');
const showCode = c => c.slice(0, 4) + '-' + c.slice(4);
const fixCode = c => (typeof c === 'string' ? c : '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
const int = (v, lo, hi, d = 0) => { v = typeof v === 'number' || typeof v === 'string' ? Math.floor(Number(v)) : NaN; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
const ints = (a, lo, hi, max) => Array.isArray(a) ? [...new Set(a.map(v => int(v, lo, hi, -1)).filter(v => v >= lo))].slice(0, max) : [];
const strOf = v => typeof v === 'string' ? v : '';
const pinHash = (pin, salt) => new Promise((ok, no) => crypto.pbkdf2(pin, salt, 60000, 32, 'sha256', (e, k) => e ? no(e) : ok(k.toString('hex'))));
const passHash = (pass, salt) => new Promise((ok, no) => crypto.pbkdf2(pass, salt, 100000, 64, 'sha512', (e, k) => e ? no(e) : ok(k.toString('hex'))));
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
async function savePlayerProgress(pl, raw) {
  const pr = cleanProgress(raw); const t = now(); const wk = weekKey(t);
  let base = pl.week_base;
  if (!pl.last_sync) base = pr.stars;
  else if (pl.week_key !== wk) base = pl.stars;
  if (pr.stars < base) base = pr.stars;
  const old = typeof pl.snapshot === 'object' ? pl.snapshot : safeJSON(pl.snapshot);
  const snap = { plots: pr.plots || old.plots || null, world: pr.world, wear: pr.wear, follow: pr.follow };
  await q.saveProgress(pr.level, pr.stars, pr.coins, pr.trophies, pr.medals, pr.legend, pr.farms, pr.bestStreak, wk, base, snap, t, t, pl.id);
  return Math.max(0, pr.stars - base);
}
const safeJSON = s => { try { return JSON.parse(s) || {}; } catch (e) { return {}; } };
const weekStars = pl => pl.week_key === weekKey(now()) ? Math.max(0, pl.stars - pl.week_base) : 0;

async function state(pl) {
  const g = await q.groupById(pl.group_id);
  return {
    me: { id: pl.id, name: pl.name, status: pl.status, isHost: pl.status === 'host', perms: { board: !!pl.perm_board, visit: !!pl.perm_visit, chat: !!pl.perm_chat } },
    group: { name: g.name, members: (await q.countActive(pl.group_id)).n, max: CFG.maxGroup, code: pl.status === 'host' ? showCode(g.code) : undefined }
  };
}

/* ---------------------------------------------------------------- rate limits (in memory, bounded) */
const hits = new Map(), guard = new Map(); const MAX_KEYS = 50000;
function allow(key, max, windowMs) {
  const t = now(); const map = /^(join|create|joinfail|createfail|authfail):/.test(key) ? guard : hits; let e = map.get(key);
  if (!e) { if (map.size >= MAX_KEYS) { let n = 0; for (const k of map.keys()) { map.delete(k); if (++n >= MAX_KEYS / 10) break; } } e = { w: windowMs, t: [] }; map.set(key, e); }
  e.t = e.t.filter(x => t - x < windowMs); e.w = Math.max(e.w, windowMs);
  if (e.t.length >= max) return false;
  e.t.push(t); return true;
}
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
const privateIp = ip => /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i.test(ip);
const fromProxy = ip => CFG.trustedProxies.length ? CFG.trustedProxies.includes(ip) : privateIp(ip);
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

/* ---------------------------------------------------------------- auth helpers */
async function authed(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{20,100})$/);
  if (!m) fail(401, 'auth', 'Please log in first.');
  const session = await q.sessionByToken(sha(m[1]));
  if (!session) fail(401, 'auth', 'Session expired. Please log in again.');
  await q.touchSession(sha(m[1]), now());
  return session; // { token_hash, user_id, username, ... }
}

async function authedPlayer(req) {
  const session = await authed(req);
  const pl = await q.playerByUserId(session.user_id);
  if (!pl) fail(403, 'noGroup', 'You are not in a friend group.');
  return { session, pl };
}

const approved = pl => { if (pl.status === 'pending') fail(403, 'pending', 'Waiting for the group host to say yes.'); return pl; };
const host = pl => { if (pl.status !== 'host') fail(403, 'notHost', 'Only the grown-up who started the group can do this.'); return pl; };
const pinBusy = new Set();
async function grownUp(req, pl) {
  const t = now(); const st0 = await q.pinState(pl.id);
  if (st0.pin_lock_until > t) fail(429, 'pinLocked', 'Too many wrong PIN tries. Please wait 15 minutes and try again.');
  const pin = String(req.headers['x-parent-pin'] || '');
  if (!pin) fail(403, 'pin', 'Please type the grown-up PIN.');
  if (pinBusy.has(pl.id)) fail(429, 'busy', 'Please wait a moment and try again.');
  await q.pinAttempt(t, pl.id); const tries = (await q.pinState(pl.id)).pin_fails;
  if (tries > 5) { await q.pinLock(t + 15 * 60e3, pl.id); fail(429, 'pinLocked', 'Too many wrong PIN tries. Please wait 15 minutes and try again.'); }
  pinBusy.add(pl.id);
  let ok = false;
  try { ok = /^\d{4,6}$/.test(pin) && crypto.timingSafeEqual(Buffer.from(await pinHash(pin, pl.pin_salt), 'hex'), Buffer.from(pl.pin_hash, 'hex')); }
  finally { pinBusy.delete(pl.id); }
  if (!ok) { if (tries >= 5) await q.pinLock(t + 15 * 60e3, pl.id); fail(403, 'pin', 'That grown-up PIN is not right.'); }
  await q.pinReset(pl.id); return pl;
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
async function uniqueName(groupId, r, selfId) {
  const hit = await q.playerByName(groupId, r.key);
  if (hit && hit.id !== selfId) fail(409, 'nameTaken', `Someone in this group already uses the name "${r.name}". Try adding a letter, like "${r.name} B".`);
}
const CHAT_MSG = {
  empty: 'Type a message first.', long: `That message is too long. Please keep it under ${MAX_MSG} letters.`,
  kind: "Oops! Let's use kind words. Try saying it a nicer way. 💛", link: "Links can't be shared in chat.",
  contact: 'To stay safe, please don\'t share or ask for phone numbers, emails, usernames, photos, where someone lives or their school in chat.',
  repeat: 'You already said that! Try something new.', fast: 'Slow down a little! Wait a moment, then send again.'
};
function leave(pl) { return q.goPlayer(crypto.randomBytes(9).toString('hex'), now(), pl.id); }

/* ---------------------------------------------------------------- API */
async function api(req, res, url) {
  const ip = limitKey(clientIp(req)); const M = req.method; const p = url.pathname.replace(/\/+$/, '') || '/';
  if (!allow('ip:' + ip, CFG.ratePerMinute, 60e3)) fail(429, 'busy', 'Too many requests. Please wait a minute.');
  let m;

  if (p === '/api/health' && M === 'GET') return sendJSON(res, 200, { ok: true, app: 'adley-math-farm', version: VERSION, friends: true, canCreate: !!CFG.hostKey });

  /* ---- auth: register ---- */
  if (p === '/api/auth/register' && M === 'POST') {
    if (!allow('authfail:' + ip, 30, 3600e3)) fail(429, 'busy', 'Too many attempts. Please wait a while.');
    const b = await readBody(req, 16 * 1024);
    const username = strOf(b.username).trim().toLowerCase();
    const password = strOf(b.password);
    if (username.length < MIN_USERNAME || username.length > MAX_USERNAME) fail(400, 'username', `Username must be ${MIN_USERNAME}–${MAX_USERNAME} characters.`);
    if (!/^[a-z0-9_]+$/.test(username)) fail(400, 'username', 'Username can only contain letters, numbers, and underscores.');
    if (password.length < MIN_PASSWORD) fail(400, 'password', `Password must be at least ${MIN_PASSWORD} characters.`);
    const existing = await q.userByUsername(username);
    if (existing) fail(409, 'usernameTaken', 'That username is already taken. Please choose another one.');
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = await passHash(password, salt);
    const t = now();
    const userId = await q.insertUser(username, salt, hash, t);
    await q.upsertProgress(userId, {}, t);
    const token = newToken();
    await q.insertSession(sha(token), userId, t);
    return sendJSON(res, 201, { token, user: { id: userId, username } });
  }

  /* ---- auth: login ---- */
  if (p === '/api/auth/login' && M === 'POST') {
    if (!allow('authfail:' + ip, 30, 3600e3)) fail(429, 'busy', 'Too many attempts. Please wait a while.');
    const b = await readBody(req, 16 * 1024);
    const username = strOf(b.username).trim().toLowerCase();
    const password = strOf(b.password);
    const user = await q.userByUsername(username);
    if (!user) { allow('authfail:' + ip, 1000, 3600e3); fail(401, 'invalid', 'Wrong username or password.'); }
    const hash = await passHash(password, user.password_salt);
    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'))) {
      allow('authfail:' + ip, 1000, 3600e3); fail(401, 'invalid', 'Wrong username or password.');
    }
    const t = now();
    await q.updateLastLogin(user.id, t);
    const token = newToken();
    await q.insertSession(sha(token), user.id, t);
    const prog = await q.getProgress(user.id);
    return sendJSON(res, 200, { token, user: { id: user.id, username: user.username }, progress: prog ? prog.data : {} });
  }

  /* ---- auth: me (check session + load progress) ---- */
  if (p === '/api/auth/me' && M === 'GET') {
    const session = await authed(req);
    const prog = await q.getProgress(session.user_id);
    return sendJSON(res, 200, { user: { id: session.user_id, username: session.username }, progress: prog ? prog.data : {} });
  }

  /* ---- auth: logout ---- */
  if (p === '/api/auth/logout' && M === 'POST') {
    const m2 = String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{20,100})$/);
    if (m2) await q.deleteSession(sha(m2[1]));
    return sendJSON(res, 200, { ok: true });
  }

  /* ---- game progress: save ---- */
  if (p === '/api/game/progress' && M === 'POST') {
    const session = await authed(req);
    if (!allow('save:' + session.user_id, 30, 60e3)) fail(429, 'busy', 'Saving too often.');
    const b = await readBody(req, 256 * 1024);
    const t = now();
    await q.upsertProgress(session.user_id, b.state || {}, t);
    // also update player summary for leaderboard if in a group
    const pl = await q.playerByUserId(session.user_id);
    if (pl && active(pl) && b.progress) await savePlayerProgress(pl, b.progress);
    return sendJSON(res, 200, { ok: true });
  }

  /* ---- game progress: load ---- */
  if (p === '/api/game/progress' && M === 'GET') {
    const session = await authed(req);
    const prog = await q.getProgress(session.user_id);
    return sendJSON(res, 200, { progress: prog ? prog.data : {} });
  }

  /* ---- friends: create group ---- */
  if (p === '/api/groups' && M === 'POST') {
    if (peek('createfail:' + ip, 3600e3) >= 10 || !allow('create:' + ip, 60, 3600e3)) fail(429, 'busy', 'Too many tries. Please wait a while and try again.');
    const session = await authed(req);
    const b = await readBody(req, 64 * 1024);
    if (!CFG.hostKey) fail(403, 'noHostKey', 'Starting a new friend group is switched off on this server.');
    const ok = crypto.timingSafeEqual(Buffer.from(sha(strOf(b.hostKey)), 'hex'), Buffer.from(sha(CFG.hostKey), 'hex'));
    if (!ok) { allow('createfail:' + ip, 1000, 3600e3); fail(403, 'hostKey', 'That host key is not right.'); }
    // check if already in a group
    const existing = await q.playerByUserId(session.user_id);
    if (existing) fail(409, 'alreadyInGroup', 'You are already in a friend group. Leave it first to start a new one.');
    const g = checkName(b.groupName, MAX_GROUP_NAME, 'Group name', 4); const n = checkName(b.playerName, MAX_NAME, "Child's name");
    const pin = await newPin(pinOk(b.pin));
    let code; do code = newCode(); while (await q.groupByCode(code));
    const t = now(); const perms = cleanPerms(b.perms, { board: true, visit: true, chat: true });
    const gid = await q.insertGroup(g.name, code, t);
    const pid = await q.insertPlayer(gid, session.user_id, pin.salt, pin.hash, n.name, n.key, 'host', +perms.board, +perms.visit, +perms.chat, t, t, t);
    const pl = await q.playerById(pid);
    if (b.progress) await savePlayerProgress(pl, b.progress);
    return sendJSON(res, 201, await state(await q.playerById(pid)));
  }

  /* ---- friends: join group ---- */
  if (p === '/api/join' && M === 'POST') {
    if (peek('joinfail:' + ip, 15 * 60e3) >= CFG.wrongCodesPer15Min || !allow('join:' + ip, 200, 3600e3)) fail(429, 'busy', 'Too many tries. Please wait 15 minutes and try again.');
    const session = await authed(req);
    const b = await readBody(req, 64 * 1024);
    const existing = await q.playerByUserId(session.user_id);
    if (existing) fail(409, 'alreadyInGroup', 'You are already in a friend group. Leave it first to join another one.');
    const g = await q.groupByCode(fixCode(b.code));
    if (!g) { allow('joinfail:' + ip, 1000, 15 * 60e3); fail(404, 'code', 'That invite code did not work.'); }
    const n = checkName(b.playerName, MAX_NAME, "Child's name"); await uniqueName(g.id, n, -1); const pinText = pinOk(b.pin);
    if ((await q.countActive(g.id)).n >= CFG.maxGroup) fail(409, 'full', `This friend group is full (${CFG.maxGroup} players).`);
    if ((await q.countPending(g.id)).n >= CFG.maxPending) fail(429, 'manyWaiting', 'Many children are already waiting to join this group.');
    const pin = await newPin(pinText);
    const dupName = await q.playerByName(g.id, n.key);
    if (dupName) fail(409, 'nameTaken', `Someone in this group already uses the name "${n.name}".`);
    const t = now(); const perms = cleanPerms(b.perms, { board: true, visit: true, chat: true });
    const pid = await q.insertPlayer(g.id, session.user_id, pin.salt, pin.hash, n.name, n.key, 'pending', +perms.board, +perms.visit, +perms.chat, t, null, t);
    const pl = await q.playerById(pid);
    if (b.progress) await savePlayerProgress(pl, b.progress);
    const h = (await q.groupPlayers(g.id)).find(x => x.status === 'host');
    if (h) await q.insertEvent(g.id, h.id, pid, 'request', null, t);
    return sendJSON(res, 201, await state(await q.playerById(pid)));
  }

  /* ---- everything below needs auth + group membership ---- */
  if (p === '/api/me' && M === 'GET') {
    const { pl } = await authedPlayer(req);
    await q.touch(now(), pl.id); return sendJSON(res, 200, await state(pl));
  }
  if (p === '/api/parent' && M === 'GET') { const { pl } = await authedPlayer(req); await grownUp(req, pl); return sendJSON(res, 200, { ok: true }); }
  if (p === '/api/me' && M === 'PUT') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    await grownUp(req, me); const b = await readBody(req, 8 * 1024);
    if (b.name !== undefined) {
      if (me.status === 'member') fail(403, 'nameLocked', 'Only the group host can change a name once a child is in the group.');
      const n = checkName(b.name, MAX_NAME, "Child's name"); await uniqueName(me.group_id, n, me.id); await q.setName(n.name, n.key, me.id);
    }
    if (b.perms !== undefined) { const pr = cleanPerms(b.perms, { board: !!me.perm_board, visit: !!me.perm_visit, chat: !!me.perm_chat }); await q.setPerms(+pr.board, +pr.visit, +pr.chat, me.id); }
    if (b.newPin !== undefined) { const pin = await newPin(pinOk(b.newPin)); await q.setPin(pin.salt, pin.hash, me.id); }
    return sendJSON(res, 200, await state(await q.playerById(me.id)));
  }
  if (p === '/api/me' && M === 'DELETE') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    await grownUp(req, me);
    if (me.status === 'host') { await q.deleteGroup(me.group_id); return sendJSON(res, 200, { ok: true, groupDeleted: true }); }
    if (me.status === 'pending') await q.deletePlayer(me.id); else await leave(me);
    return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/progress' && M === 'POST') {
    const { pl } = await authedPlayer(req);
    if (!allow('sync:' + pl.id, 30, 60e3)) fail(429, 'busy', 'Saving too often.');
    const b = await readBody(req, 64 * 1024);
    const ws = await savePlayerProgress(pl, b.progress); return sendJSON(res, 200, { ok: true, weekStars: ws });
  }

  if (p === '/api/poll' && M === 'GET') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    const t = now(); await q.touch(t, me.id);
    const ev = int(url.searchParams.get('event'), 0, 1e12), ch = int(url.searchParams.get('chat'), 0, 1e12);
    const out = { status: me.status, perms: { board: !!me.perm_board, visit: !!me.perm_visit, chat: !!me.perm_chat } };
    out.events = (await q.eventsFor(me.id, ev)).map(e => ({ id: e.id, type: e.type, emoji: e.emoji, from: e.from_name || 'A friend', at: e.created_at }));
    out.lastEvent = (await q.maxEvent(me.id)).id || 0;
    if (active(me) && me.perm_chat) { out.chatLatest = (await q.chatMaxId(me.group_id)).id || 0; out.unread = ch ? (await q.chatUnread(me.group_id, ch, me.id)).n : 0; }
    if (me.status === 'host') out.requests = (await q.countPending(me.group_id)).n;
    return sendJSON(res, 200, out);
  }

  if (p === '/api/board' && M === 'GET') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); const t = now();
    const rows = (await q.groupPlayers(me.group_id)).filter(x => active(x) && (x.perm_board || x.id === me.id)).map(x => {
      const s = typeof x.snapshot === 'object' ? x.snapshot : safeJSON(x.snapshot);
      return {
        id: x.id, name: x.name, me: x.id === me.id, host: x.status === 'host', level: x.level, stars: x.stars, weekStars: weekStars(x),
        trophies: x.trophies, medals: x.medals, legend: x.legend, farms: x.farms, wear: s.wear || {}, follow: s.follow || [],
        online: t - x.last_seen < ONLINE_MS, canVisit: x.id !== me.id && !!x.perm_visit, hidden: !x.perm_board
      };
    });
    return sendJSON(res, 200, { members: rows, week: weekKey(t) });
  }

  if ((m = p.match(/^\/api\/visit\/(\d+)$/)) && M === 'GET') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); const f = await q.playerById(+m[1]);
    if (!f || f.group_id !== me.group_id || !active(f)) fail(404, 'missing', 'That friend could not be found.');
    if (f.id === me.id) fail(400, 'self', 'That is your own island!');
    if (!f.perm_visit) fail(403, 'private', 'This island is private right now.');
    const t = now(); if (!(await q.countEventsSince(f.id, me.id, 'visit', t - 3600e3)).n) await q.insertEvent(me.group_id, f.id, me.id, 'visit', null, t);
    const s = typeof f.snapshot === 'object' ? f.snapshot : safeJSON(f.snapshot);
    return sendJSON(res, 200, { id: f.id, name: f.name, level: f.level, stars: f.stars, trophies: f.trophies, farms: f.farms, legend: f.legend, plots: s.plots || null, world: s.world || null, wear: s.wear || {}, follow: s.follow || [] });
  }

  if ((m = p.match(/^\/api\/cheer\/(\d+)$/)) && M === 'POST') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); const b = await readBody(req, 4 * 1024); const f = await q.playerById(+m[1]);
    if (!f || f.group_id !== me.group_id || !active(f) || f.id === me.id) fail(404, 'missing', 'That friend could not be found.');
    if (!f.perm_visit) fail(403, 'private', 'This island is private right now.');
    if (!CHEERS.includes(b.emoji)) fail(400, 'emoji', 'Please pick one of the cheer stickers.');
    const t = now(); if ((await q.countEventsSince(f.id, me.id, 'cheer', t - 24 * 3600e3)).n >= 5) fail(429, 'cheerLimit', `You sent lots of cheers to ${f.name} today!`);
    await q.insertEvent(me.group_id, f.id, me.id, 'cheer', b.emoji, t); return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/chat' && M === 'GET') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); if (!me.perm_chat) fail(403, 'chatOff', 'A grown-up has turned chat off.');
    const after = int(url.searchParams.get('after'), 0, 1e12); const t = now();
    const rows = after ? await q.chatAfter(me.group_id, after, 100) : await q.chatLatest(me.group_id, 50);
    return sendJSON(res, 200, {
      messages: rows.map(r => ({ id: r.id, from: r.player_id, name: r.name, text: r.text, at: r.created_at, mine: r.player_id === me.id })),
      latest: (await q.chatMaxId(me.group_id)).id || 0, removed: (await q.removedSince(me.group_id, t - 15 * 60e3)).map(r => r.id)
    });
  }
  if (p === '/api/chat' && M === 'POST') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); if (!me.perm_chat) fail(403, 'chatOff', 'A grown-up has turned chat off.');
    const b = await readBody(req, 4 * 1024); const t = now();
    if (!allow('gap:' + me.id, 1, 1500) || !allow('chat:' + me.id, 15, 60e3) || !allow('chatday:' + me.id, 300, 24 * 3600e3)) fail(429, 'fast', CHAT_MSG.fast);
    const names = new Set((await q.groupPlayers(me.group_id)).filter(active).map(x => filter.nameKey(x.name)));
    let r = filter.checkMessage(b.text, MAX_MSG, { names });
    const pc = r.ok ? filter.pieceInfo(r.text) : { digits: 0, short: 0, marker: false };
    if (r.ok && (pc.digits || pc.short)) {
      const recent = (await q.recentOwn(me.id)).filter(x => !x.blocked && t - x.created_at < 180e3);
      const markerSeen = pc.marker || recent.some(x => x.marker);
      const val = (d, sh) => markerSeen ? Math.max(d, sh) : d;
      const sum = recent.reduce((a, x) => a + val(x.digits, x.short_digits), val(pc.digits, pc.short));
      if (sum >= 7) r = { ok: false, reason: 'contact', text: r.text };
    }
    if (!r.ok) {
      if (r.text && r.reason !== 'long') await q.insertMsg(me.group_id, me.id, (r.reason === 'kind' ? r.text : filter.mask(r.text)).slice(0, 300), t, r.reason, pc.digits, pc.short, +pc.marker);
      fail(422, r.reason, CHAT_MSG[r.reason] || 'That message cannot be sent.');
    }
    if ((await q.recentOwn(me.id)).some(x => !x.blocked && x.text.toLowerCase() === r.text.toLowerCase() && t - x.created_at < 60e3)) fail(422, 'repeat', CHAT_MSG.repeat);
    const id = await q.insertMsg(me.group_id, me.id, r.text, t, null, pc.digits, pc.short, +pc.marker);
    return sendJSON(res, 201, { ok: true, message: { id, from: me.id, name: me.name, text: r.text, at: t, mine: true } });
  }
  if (p === '/api/chat/history' && M === 'GET') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); await grownUp(req, me); const before = int(url.searchParams.get('before'), 0, 1e12) || 1e12; const isHost = me.status === 'host';
    const rows = await q.history(me.group_id, before, me.id, 100);
    return sendJSON(res, 200, {
      messages: rows.map(r => {
        const mine = r.player_id === me.id;
        return { id: r.id, from: r.player_id, name: r.name, text: r.deleted && !mine && !isHost ? '' : r.text, at: r.created_at, mine, blocked: r.blocked || null, removed: !!r.deleted, canRemove: !r.deleted && !r.blocked && (mine || isHost) };
      })
    });
  }
  if ((m = p.match(/^\/api\/chat\/(\d+)$/)) && M === 'DELETE') {
    const { pl } = await authedPlayer(req);
    const me = pl;
    approved(me); await grownUp(req, me); const msg = await q.msgById(+m[1]);
    if (!msg || msg.group_id !== me.group_id) fail(404, 'missing', 'That message could not be found.');
    if (msg.player_id !== me.id && me.status !== 'host') fail(403, 'notYours', "Only your child's own messages can be removed.");
    await q.deleteMsg(now(), msg.id); return sendJSON(res, 200, { ok: true });
  }

  // host actions
  if (p.startsWith('/api/host/')) {
    const { pl } = await authedPlayer(req);
    const me = pl;
    host(me); await grownUp(req, me);
    if (p === '/api/host/members' && M === 'GET') {
      const t = now();
      return sendJSON(res, 200, { members: (await q.groupPlayers(me.group_id)).map(x => ({ id: x.id, name: x.name, status: x.status, me: x.id === me.id, level: x.level, stars: x.stars, joined: x.created_at, seen: seenBucket(x.last_seen, t) })) });
    }
    if ((m = p.match(/^\/api\/host\/members\/(\d+)\/(approve|decline|remove)$/)) && M === 'POST') {
      const f = await q.playerById(+m[1]); const act = m[2];
      if (!f || f.group_id !== me.group_id || f.status === 'gone') fail(404, 'missing', 'That player could not be found.');
      if (f.id === me.id) fail(400, 'self', 'You cannot do that to yourself.');
      if (act === 'approve') {
        if (f.status !== 'pending') fail(400, 'state', `${f.name} is already in the group.`);
        if ((await q.countActive(me.group_id)).n >= CFG.maxGroup) fail(409, 'full', `The group is full (${CFG.maxGroup} players).`);
        await q.setStatus('member', now(), f.id); await q.insertEvent(me.group_id, f.id, me.id, 'approved', null, now());
      } else if (act === 'decline') { if (f.status !== 'pending') fail(400, 'state', `${f.name} is already in the group.`); await q.deletePlayer(f.id); }
      else { if (f.status === 'pending') await q.deletePlayer(f.id); else await leave(f); }
      return sendJSON(res, 200, { ok: true });
    }
    if ((m = p.match(/^\/api\/host\/members\/(\d+)$/)) && M === 'PUT') {
      const f = await q.playerById(+m[1]); const b = await readBody(req, 4 * 1024);
      if (!f || f.group_id !== me.group_id || f.status === 'gone') fail(404, 'missing', 'That player could not be found.');
      const n = checkName(b.name, MAX_NAME, "Child's name"); await uniqueName(me.group_id, n, f.id); await q.setName(n.name, n.key, f.id);
      return sendJSON(res, 200, { ok: true, name: n.name });
    }
    if (p === '/api/host/code' && M === 'POST') {
      let code; do code = newCode(); while (await q.groupByCode(code));
      await q.setGroupCode(code, me.group_id); return sendJSON(res, 200, await state(await q.playerById(me.id)));
    }
    if (p === '/api/host/group' && M === 'PUT') {
      const b = await readBody(req, 4 * 1024); await q.setGroupName(checkName(b.name, MAX_GROUP_NAME, 'Group name', 4).name, me.group_id);
      return sendJSON(res, 200, await state(await q.playerById(me.id)));
    }
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

async function cleanup() {
  const t = now();
  try {
    await q.oldMsgs(t - CFG.retentionDays * 864e5);
    await q.oldEvents(t - 30 * 864e5);
    await q.oldPending(t - 14 * 864e5);
    await q.oldGone(t - 7 * 864e5);
    await q.oldSessions(t - 30 * 864e5);
  } catch (e) { console.error('cleanup failed', e); }
}

async function start() {
  if (!CFG.databaseUrl) { console.error('DATABASE_URL is required. Set it in server/.env or as an environment variable.'); process.exit(1); }
  const extraWords = filter.loadExtra(path.dirname(CFG.siteDir));
  const db = await store.open(CFG.databaseUrl);
  q = db.q; closeDb = db.close;
  console.log('Connected to PostgreSQL');

  await cleanup(); setInterval(cleanup, 3600e3).unref();

  server.listen(CFG.port, CFG.host, () => {
    console.log(`Adley's Math Farm server ${VERSION} on http://${CFG.host}:${CFG.port}`);
    console.log(`  site: ${CFG.siteDir}${fs.existsSync(path.join(CFG.siteDir, 'index.html')) ? '' : '  (WARNING: index.html not found)'}`);
    console.log(`  database: PostgreSQL`);
    console.log(`  new friend groups: ${CFG.hostKey ? 'allowed with HOST_KEY' : 'OFF (set HOST_KEY)'}`);
    console.log(`  proxies: ${CFG.proxyHops}`);
  });
  const stop = () => { server.close(() => { closeDb(); process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}

if (require.main === module) start();
module.exports = { server, CFG, weekKey, cleanProgress, limitKey };
