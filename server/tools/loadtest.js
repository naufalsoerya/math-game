#!/usr/bin/env node
'use strict';
/*
 * Load test for the friends server: simulates many children playing at the same time.
 * Run it ONLY against a test instance (it creates groups and players in that server's database).
 *
 *   node tools/loadtest.js --url http://127.0.0.1:8080 --host-key <HOST_KEY> --players 500 --minutes 3
 *
 * Options:
 *   --players N       children playing at the same time (default 300)
 *   --group-size N    children per friend group (default 30)
 *   --chat-share F    share of children with the chat open (default 0.2)
 *   --minutes M       how long to run after set-up (default 2)
 *   --pid P           server process id, to report its CPU and memory (Linux only)
 *   --static N        also test N parallel downloads of the game files for 15 seconds
 * The server must trust X-Forwarded-For from this machine (TRUST_PROXY=1, TRUSTED_PROXIES=127.0.0.1),
 * because every simulated child gets its own made-up address.
 *
 * What one simulated child does (the same as the real game): asks for news every 25 s, saves progress
 * every 60 s, opens the leaderboard now and then; with the chat open it checks for messages every 4 s
 * and sends a message about every 45 s.
 */
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => { const [k, ...v] = a.trim().split(/\s+/); return [k, v.join(' ') || 'true']; }));
const URL0 = new URL(args.url || 'http://127.0.0.1:8080');
const KEY = args['host-key'] || process.env.HOST_KEY || '';
const N = +(args.players || 300), GS = +(args['group-size'] || 30), CHAT = +(args['chat-share'] || 0.2), MIN = +(args.minutes || 2);
const PID = args.pid ? +args.pid : 0;
const lib = URL0.protocol === 'https:' ? https : http;
const agent = new lib.Agent({ keepAlive: true, maxSockets: 512 });

const stats = { n: 0, byKey: {}, codes: {}, lat: [], errors: 0 };
function req(method, path, { body, token, pin, ip } = {}) {
  return new Promise(resolve => {
    const t0 = process.hrtime.bigint(); const data = body ? JSON.stringify(body) : null;
    const h = { 'X-Forwarded-For': ip || '10.0.0.1', Accept: 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token; if (pin) h['X-Parent-Pin'] = pin; if (data) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(data); }
    const r = lib.request({ hostname: URL0.hostname, port: URL0.port || (URL0.protocol === 'https:' ? 443 : 80), path: (URL0.pathname.replace(/\/$/, '')) + path, method, headers: h, agent, rejectUnauthorized: false }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - t0) / 1e6; let j = null; try { j = JSON.parse(Buffer.concat(chunks)); } catch (e) { }
        resolve({ status: res.statusCode, json: j, ms });
      });
    });
    r.on('error', () => resolve({ status: 0, json: null, ms: Number(process.hrtime.bigint() - t0) / 1e6 }));
    r.setTimeout(20000, () => r.destroy()); if (data) r.write(data); r.end();
  });
}
function note(key, r) { if (!measuring) return; stats.n++; stats.lat.push(r.ms); stats.byKey[key] = (stats.byKey[key] || 0) + 1; stats.codes[r.status] = (stats.codes[r.status] || 0) + 1; if (r.status === 0 || r.status >= 500) stats.errors++; }
// made-up names: a first name plus consonant initials, so no generated name can spell a word
const filter = require('../filter');
const FIRST = ['Ana', 'Budi', 'Cici', 'Dodo', 'Eka', 'Fani', 'Gita', 'Hana', 'Ika', 'Joko'], CONS = 'BCDFGHJLMNPRSTVWZ';
const raw = i => { const f = FIRST[i % FIRST.length]; let k = Math.floor(i / FIRST.length), s = ''; do { s += CONS[k % CONS.length]; k = Math.floor(k / CONS.length); } while (k > 0); return `${f} ${s}`; };
// skip the rare generated initials the name filter would refuse (they jump far past the other numbers, so names stay unique)
const letters = i => { let j = i; while (!filter.checkName(raw(j), 14).ok) j += 100003; return raw(j); };
const ipOf = i => `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${(i & 255) + 1}`;
const plots = n => Array.from({ length: 18 }, (_, i) => ({ done: i < n, stars: i < n ? 3 : 0 }));
const prog = (lvl, n) => ({ level: lvl, stars: lvl * 40 + n * 3, coins: 100 + n * 10, trophies: 3, medals: 0, plots: plots(n), world: { level: lvl, coins: [1, 2], chests: [], expl: '1'.repeat(200) + '0'.repeat(425), disc: '1'.repeat(n) + '0'.repeat(18 - n) }, wear: { shirt: 1, pants: 0, hat: 2, skin: 1 }, follow: ['🐶'] });
const LINES = ['Hi! 👋', 'Great job! 🌟', 'What level are you on?', 'I fixed a bridge! 🌉', 'Come and visit my island! 🏝️', 'I got 3 stars! ⭐', 'This puzzle is fun', 'Yay I found a chest', 'Good luck!', 'See you tomorrow! 👋'];
let measuring = false;

async function setup() {
  const players = []; const groups = Math.ceil(N / GS);
  process.stdout.write(`Setting up ${groups} groups and ${N} players… `);
  for (let g = 0; g < groups; g++) {
    const ip = `172.16.${g >> 8}.${(g & 255) + 1}`;
    const h = await req('POST', '/api/groups', { ip, body: { hostKey: KEY, groupName: `Load Test ${g + 1}`, playerName: letters(5000000 + g), pin: '2468', progress: prog(3, 5) } });
    if (h.status !== 201) { console.error('\nCould not create a group:', h.status, h.json && h.json.message); process.exit(1); }
    players.push({ token: h.json.token, id: h.json.me.id, ip, chat: false });
    const host = players[players.length - 1];
    for (let k = 1; k < GS && players.length < N; k++) {
      const i = players.length; const pip = ipOf(i);
      const j = await req('POST', '/api/join', { ip: pip, body: { code: h.json.group.code, playerName: letters(i), pin: '1357', progress: prog(1 + (i % 9), i % 18) } });
      if (j.status !== 201) { console.error('\nCould not join:', j.status, j.json && j.json.message); process.exit(1); }
      const a = await req('POST', `/api/host/members/${j.json.me.id}/approve`, { ip, token: host.token, pin: '2468' });
      if (a.status !== 200) { console.error('\nCould not approve:', a.status, a.json && a.json.message); process.exit(1); }
      players.push({ token: j.json.token, id: j.json.me.id, ip: pip, chat: Math.random() < CHAT });
    }
  }
  console.log('done.'); return players;
}

function cpuOf(pid) { try { const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' '); return (+f[11] + +f[12]) / 100; } catch (e) { return null; } }
function rssOf(pid) { try { return +(fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)[1]) / 1024; } catch (e) { return null; } }
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

async function run(players) {
  const end = Date.now() + MIN * 60e3; const timers = [];
  const every = (ms, fn) => { const start = Math.random() * ms; timers.push(setTimeout(function tick() { if (Date.now() > end) return; fn(); timers.push(setTimeout(tick, ms * (0.9 + Math.random() * 0.2))); }, start)); };
  players.forEach((p, i) => {
    let ev = 0, ch = 0, line = i;
    every(25e3, async () => { const r = await req('GET', `/api/poll?event=${ev}&chat=${ch}`, { token: p.token, ip: p.ip }); note('poll', r); if (r.json) { ev = r.json.lastEvent || ev; ch = r.json.chatLatest || ch; } });
    every(60e3, async () => note('progress', await req('POST', '/api/progress', { token: p.token, ip: p.ip, body: { progress: prog(1 + (i % 9), Math.floor(Math.random() * 18)) } })));
    if (i % 3 === 0) every(60e3, async () => note('board', await req('GET', '/api/board', { token: p.token, ip: p.ip })));
    if (p.chat) {
      every(4e3, async () => { const r = await req('GET', ch ? `/api/chat?after=${ch}` : '/api/chat', { token: p.token, ip: p.ip }); note('chat-read', r); if (r.json && r.json.latest) ch = r.json.latest; });
      every(45e3, async () => note('chat-send', await req('POST', '/api/chat', { token: p.token, ip: p.ip, body: { text: LINES[line++ % LINES.length] + ' ' + (line % 7 ? '' : '😀') } })));
    }
  });
  const c0 = PID ? cpuOf(PID) : null; const t0 = Date.now(); measuring = true;
  let peakRss = PID ? rssOf(PID) : null;
  const iv = setInterval(() => { if (PID) peakRss = Math.max(peakRss || 0, rssOf(PID) || 0); process.stdout.write(`\r  ${Math.round((Date.now() - t0) / 1000)} s · ${stats.n} requests · ${stats.errors} errors   `); }, 2000);
  await new Promise(r => setTimeout(r, MIN * 60e3 + 500));
  measuring = false; clearInterval(iv); timers.forEach(clearTimeout);
  const secs = (Date.now() - t0) / 1000; const c1 = PID ? cpuOf(PID) : null;
  console.log(`\n\nPlayers: ${players.length} (${players.filter(p => p.chat).length} with the chat open) · ${MIN} min`);
  console.log(`Requests: ${stats.n} = ${(stats.n / secs).toFixed(1)} per second · errors (no answer or 5xx): ${stats.errors}`);
  console.log('By type:', Object.entries(stats.byKey).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log('Answers:', Object.entries(stats.codes).map(([k, v]) => `${k}×${v}`).join(', '));
  console.log(`Response time: median ${pct(stats.lat, 50).toFixed(1)} ms · 95% ${pct(stats.lat, 95).toFixed(1)} ms · 99% ${pct(stats.lat, 99).toFixed(1)} ms · slowest ${pct(stats.lat, 100).toFixed(0)} ms`);
  if (PID && c0 != null) console.log(`Server CPU: ${((c1 - c0) / secs * 100).toFixed(1)}% of one core on average · memory (RSS) peak ${Math.round(peakRss)} MB`);
}

async function staticTest(conc) {
  const files = ['/', '/js/questions.js', '/vendor/three.min.js', '/js/game.js', '/css/game.css'];
  let n = 0, bytes = 0; const lat = []; const end = Date.now() + 15e3;
  await Promise.all(Array.from({ length: conc }, async (_, w) => {
    while (Date.now() < end) {
      const f = files[n % files.length]; const t0 = process.hrtime.bigint();
      await new Promise(res => { const r = lib.get({ hostname: URL0.hostname, port: URL0.port, path: f, agent, headers: { 'Accept-Encoding': 'gzip', 'X-Forwarded-For': ipOf(9000 + w) }, rejectUnauthorized: false }, rs => { rs.on('data', c => { bytes += c.length; }); rs.on('end', res); }); r.on('error', res); });
      lat.push(Number(process.hrtime.bigint() - t0) / 1e6); n++;
    }
  }));
  console.log(`\nGame files: ${conc} parallel downloads for 15 s: ${(n / 15).toFixed(0)} files per second, ${(bytes / 15 / 1048576).toFixed(1)} MB/s (gzip), median ${pct(lat, 50).toFixed(1)} ms, 95% ${pct(lat, 95).toFixed(1)} ms`);
}

(async () => {
  const h = await req('GET', '/api/health'); if (h.status !== 200) { console.error('The server does not answer at', URL0.href); process.exit(1); }
  if (!KEY) { console.error('Please pass --host-key'); process.exit(1); }
  const players = await setup(); await run(players);
  if (args.static) await staticTest(+args.static);
  agent.destroy(); process.exit(0);
})();
