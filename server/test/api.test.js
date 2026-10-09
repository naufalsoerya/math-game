'use strict';
// End-to-end tests of the friends API and the static file server (positive and negative cases).
// Run: npm test   (uses a temporary database and a temporary site folder)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-test-'));
const site = path.join(tmp, 'site'); fs.mkdirSync(path.join(site, 'js'), { recursive: true });
fs.writeFileSync(path.join(site, 'index.html'), '<!doctype html><title>t</title>' + 'x'.repeat(3000));
fs.writeFileSync(path.join(site, 'js', 'a.js'), 'console.log(1);' + ' '.repeat(3000));
fs.writeFileSync(path.join(site, '.htaccess'), 'secret');
fs.writeFileSync(path.join(tmp, 'outside.txt'), 'outside');
const KEY = 'test-host-key-123';
Object.assign(process.env, { HOST_KEY: KEY, DATA_DIR: path.join(tmp, 'data'), SITE_DIR: site, MAX_GROUP_SIZE: '6', TRUST_PROXY: '1' });
const { server, weekKey, limitKey } = require('../server');

let base;
test.before(() => new Promise(r => server.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

// each "device" can use its own fake address so per-address limits do not mix between tests
async function call(method, p, { token, body, ip, raw, headers, pin } = {}) {
  const h = { 'X-Forwarded-For': ip || '10.0.0.2', ...(headers || {}) };
  if (token) h.Authorization = 'Bearer ' + token;
  if (pin) h['X-Parent-Pin'] = pin;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const res = await fetch(base + p, { method, headers: h, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
  const txt = await res.text(); let json = null; try { json = JSON.parse(txt); } catch (e) { }
  return { status: res.status, json, text: txt, headers: res.headers };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const plots = (n, stars = 3) => Array.from({ length: 18 }, (_, i) => ({ done: i < n, stars: i < n ? stars : 0 }));
const world = level => ({ level, pos: [1, 2], coins: [1, 2], chests: [0], expl: '1'.repeat(100) + '0'.repeat(525), disc: '1'.repeat(9) + '0'.repeat(9) });
const prog = (o = {}) => ({ level: 3, stars: 40, coins: 120, trophies: 4, medals: 0, plots: plots(5), world: world(3), wear: { shirt: 2, pants: 1, hat: 0, skin: 1 }, follow: ['🐶', '<script>'], ...o });
const HP = '2468', RP = '1357', BP = '9999';

let host, hostTok, code, rina, rinaTok, budiTok, budi;

test('health reports friends support', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200); assert.equal(r.json.friends, true); assert.equal(r.json.canCreate, true);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('starting a group needs the right host key, kind names and a grown-up PIN', async () => {
  let r = await call('POST', '/api/groups', { body: { hostKey: 'wrong', groupName: 'Farm Friends', playerName: 'Adley', pin: HP } });
  assert.equal(r.status, 403); assert.equal(r.json.error, 'hostKey');
  r = await call('POST', '/api/groups', { body: { hostKey: KEY, groupName: 'Stupid group', playerName: 'Adley', pin: HP } });
  assert.equal(r.status, 400); assert.equal(r.json.error, 'name');
  r = await call('POST', '/api/groups', { body: { hostKey: KEY, groupName: 'Farm Friends', playerName: '<b>Adley</b>', pin: HP } });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/groups', { body: { hostKey: KEY, groupName: 'Farm Friends', playerName: 'Adley', pin: '12' } });
  assert.equal(r.status, 400); assert.equal(r.json.error, 'pin');
  r = await call('POST', '/api/groups', { body: { hostKey: { toString: 1 }, groupName: ['x'], playerName: 5, pin: HP } });
  assert.equal(r.status, 403, 'odd JSON types are refused cleanly, not a server error');
  r = await call('POST', '/api/groups', { body: { hostKey: KEY, groupName: 'Farm Friends', playerName: 'Adley', pin: HP, progress: prog({ stars: 100 }) } });
  assert.equal(r.status, 201); assert.ok(r.json.token.length > 30); assert.equal(r.json.me.status, 'host'); assert.match(r.json.group.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.doesNotMatch(r.json.group.code, /[ILO01]/);
  hostTok = r.json.token; host = r.json.me; code = r.json.group.code;
});

test('joining: wrong code, taken or look-alike names, unkind names and missing PIN are refused; a good join waits', async () => {
  let r = await call('POST', '/api/join', { body: { code: 'ZZZZ-9999', playerName: 'Rina', pin: RP } });
  assert.equal(r.status, 404); assert.equal(r.json.error, 'code');
  r = await call('POST', '/api/join', { body: { code, playerName: 'adley', pin: RP } });
  assert.equal(r.status, 409); assert.equal(r.json.error, 'nameTaken');
  r = await call('POST', '/api/join', { body: { code, playerName: 'A.dley', pin: RP } });
  assert.equal(r.status, 409, 'punctuation does not make a copy of a name');
  r = await call('POST', '/api/join', { body: { code, playerName: 'Аdley', pin: RP } });
  assert.equal(r.status, 400, 'Cyrillic look-alike names are refused');
  r = await call('POST', '/api/join', { body: { code, playerName: 'loser', pin: RP } });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/join', { body: { code, playerName: 'Rina 08123456', pin: RP } });
  assert.equal(r.status, 400, 'names cannot carry a phone number');
  r = await call('POST', '/api/join', { body: { code, playerName: 'Rina' } });
  assert.equal(r.status, 400); assert.equal(r.json.error, 'pin');
  r = await call('POST', '/api/join', { body: { code: code.toLowerCase().replace('-', ' '), playerName: 'Rina', pin: RP, progress: prog({ stars: 60, level: 4, world: world(4) }) } });
  assert.equal(r.status, 201); assert.equal(r.json.me.status, 'pending'); assert.equal(r.json.group.code, undefined, 'members never see the code');
  rinaTok = r.json.token; rina = r.json.me;
  r = await call('POST', '/api/join', { body: { code, playerName: 'Budi', pin: BP, perms: { visit: false, board: true, chat: true }, progress: prog({ stars: 10, level: 2, world: world(2) }) } });
  budiTok = r.json.token; budi = r.json.me;
});

test('a waiting player cannot see the board, chat or visit', async () => {
  for (const [m, p] of [['GET', '/api/board'], ['GET', '/api/chat'], ['GET', `/api/visit/${host.id}`], ['POST', '/api/chat']]) {
    const r = await call(m, p, { token: rinaTok, body: m === 'POST' ? { text: 'hi' } : undefined });
    assert.equal(r.status, 403, p); assert.equal(r.json.error, 'pending');
  }
});

test('host actions need the host and the grown-up PIN; wrong PINs lock after 5 tries', async () => {
  let r = await call('POST', `/api/host/members/${rina.id}/approve`, { token: budiTok, pin: BP });
  assert.equal(r.status, 403); assert.equal(r.json.error, 'notHost');
  r = await call('POST', `/api/host/members/${rina.id}/approve`, { token: hostTok });
  assert.equal(r.status, 403); assert.equal(r.json.error, 'pin', 'no PIN, no approval');
  r = await call('GET', '/api/poll?event=0', { token: hostTok });
  assert.equal(r.json.requests, 2); assert.ok(r.json.events.some(e => e.type === 'request' && e.from === 'Rina'));
  r = await call('GET', '/api/host/members', { token: hostTok, pin: HP });
  assert.equal(r.json.members.length, 3); assert.equal(r.json.members[0].seen, 'online now'); assert.equal(r.json.members[0].lastSeen, undefined, 'no exact times');
  for (const id of [rina.id, budi.id]) { r = await call('POST', `/api/host/members/${id}/approve`, { token: hostTok, pin: HP }); assert.equal(r.status, 200); }
  r = await call('POST', `/api/host/members/${rina.id}/approve`, { token: hostTok, pin: HP });
  assert.equal(r.status, 400, 'cannot approve twice');
  r = await call('GET', '/api/poll?event=0', { token: rinaTok });
  assert.equal(r.json.status, 'member'); assert.ok(r.json.events.some(e => e.type === 'approved'));
  for (let i = 0; i < 5; i++) { r = await call('GET', '/api/parent', { token: budiTok, pin: '0000' }); assert.equal(r.status, 403); }
  r = await call('GET', '/api/parent', { token: budiTok, pin: BP });
  assert.equal(r.status, 429, 'even the right PIN waits after 5 wrong tries'); assert.equal(r.json.error, 'pinLocked');
  r = await call('GET', '/api/parent', { token: rinaTok, pin: RP }); assert.equal(r.status, 200);
});

test('parallel PIN guesses cannot get past the lock', async () => {
  const j = await call('POST', '/api/join', { body: { code, playerName: 'Gita', pin: '8642' }, ip: '10.8.8.8' });
  const tok = j.json.token;
  const res = await Promise.all(Array.from({ length: 24 }, (_, i) => call('GET', '/api/parent', { token: tok, pin: String(1000 + i) })));
  assert.ok(res.every(r => r.status === 403 || r.status === 429), 'no guess succeeds');
  assert.ok(res.filter(r => r.status === 403).length <= 5, 'at most 5 guesses are checked');
  for (let i = 0; i < 5; i++) await call('GET', '/api/parent', { token: tok, pin: '1111' });
  const r = await call('GET', '/api/parent', { token: tok, pin: '8642' }); assert.equal(r.status, 429, 'locked even for the right PIN');
  await call('POST', `/api/host/members/${j.json.me.id}/decline`, { token: hostTok, pin: HP });
});

test('leaderboard shows approved friends with weekly stars; hidden players only see themselves', async () => {
  let r = await call('POST', '/api/progress', { token: rinaTok, body: { progress: prog({ stars: 75, level: 4, world: world(4) }) } });
  assert.equal(r.status, 200); assert.equal(r.json.weekStars, 15, 'stars won since joining this week');
  r = await call('GET', '/api/board', { token: hostTok });
  assert.equal(r.status, 200); assert.equal(r.json.members.length, 3);
  const rr = r.json.members.find(m => m.name === 'Rina'); assert.equal(rr.stars, 75); assert.equal(rr.level, 4); assert.equal(rr.canVisit, true); assert.equal(rr.online, true);
  assert.deepEqual(rr.follow, ['🐶'], 'unknown pets are dropped');
  assert.equal(r.json.members.find(m => m.name === 'Budi').canVisit, false);
  r = await call('PUT', '/api/me', { token: rinaTok, body: { perms: { board: false } } });
  assert.equal(r.status, 403, 'a child cannot change permissions without the PIN');
  await call('PUT', '/api/me', { token: rinaTok, pin: RP, body: { perms: { board: false } } });
  r = await call('GET', '/api/board', { token: hostTok }); assert.ok(!r.json.members.some(m => m.name === 'Rina'));
  r = await call('GET', '/api/board', { token: rinaTok }); assert.ok(r.json.members.find(m => m.name === 'Rina').hidden);
  await call('PUT', '/api/me', { token: rinaTok, pin: RP, body: { perms: { board: true } } });
  assert.equal(weekKey(Date.UTC(2026, 9, 9, 3)), '2026-W41');
  assert.equal(weekKey(Date.UTC(2026, 9, 11, 18)), '2026-W42', 'Monday 01:00 in Jakarta is already the new week');
});

test('names: members cannot rename themselves; the host can rename anyone', async () => {
  let r = await call('PUT', '/api/me', { token: rinaTok, pin: RP, body: { name: 'Adley' } });
  assert.equal(r.status, 403); assert.equal(r.json.error, 'nameLocked');
  r = await call('PUT', `/api/host/members/${rina.id}`, { token: hostTok, pin: HP, body: { name: 'Rina S' } });
  assert.equal(r.status, 200);
  r = await call('PUT', `/api/host/members/${rina.id}`, { token: hostTok, pin: HP, body: { name: 'Budi' } });
  assert.equal(r.status, 409);
  await call('PUT', `/api/host/members/${rina.id}`, { token: hostTok, pin: HP, body: { name: 'Rina' } });
});

test('progress data is cleaned before it is stored', async () => {
  const r = await call('POST', '/api/progress', { token: budiTok, body: { progress: { level: -5, stars: 'x', plots: [1, 2], world: { expl: 'zzz' }, wear: { shirt: 999 }, follow: 'no' } } });
  assert.equal(r.status, 200);
  const b = await call('GET', '/api/board', { token: hostTok }); const bu = b.json.members.find(m => m.name === 'Budi');
  assert.equal(bu.level, 1); assert.equal(bu.stars, 0); assert.equal(bu.wear.shirt, 30); assert.deepEqual(bu.follow, []);
});

test('island visits respect the owner’s permission and notify once per hour', async () => {
  let r = await call('GET', `/api/visit/${rina.id}`, { token: hostTok });
  assert.equal(r.status, 200); assert.equal(r.json.name, 'Rina'); assert.equal(r.json.level, 4); assert.equal(r.json.plots.length, 18); assert.equal(r.json.world.expl.length, 625);
  assert.equal(r.json.world.pos, undefined, 'position is not shared');
  await call('GET', `/api/visit/${rina.id}`, { token: hostTok });
  r = await call('GET', '/api/poll?event=0', { token: rinaTok });
  assert.equal(r.json.events.filter(e => e.type === 'visit').length, 1);
  r = await call('GET', `/api/visit/${budi.id}`, { token: hostTok });
  assert.equal(r.status, 403); assert.equal(r.json.error, 'private'); assert.doesNotMatch(r.json.message, /Budi/);
  r = await call('GET', `/api/visit/${host.id}`, { token: hostTok }); assert.equal(r.status, 400);
  r = await call('GET', '/api/visit/99999', { token: hostTok }); assert.equal(r.status, 404);
});

test('cheers: only stickers from the list, only to open islands, at most 5 a day to one friend', async () => {
  let r = await call('POST', `/api/cheer/${rina.id}`, { token: hostTok, body: { emoji: '💩' } });
  assert.equal(r.status, 400);
  r = await call('POST', `/api/cheer/${budi.id}`, { token: hostTok, body: { emoji: '❤️' } });
  assert.equal(r.status, 403, 'no cheers to a private island');
  for (let i = 0; i < 5; i++) { r = await call('POST', `/api/cheer/${rina.id}`, { token: hostTok, body: { emoji: '❤️' } }); assert.equal(r.status, 200); }
  r = await call('POST', `/api/cheer/${rina.id}`, { token: hostTok, body: { emoji: '⭐' } });
  assert.equal(r.status, 429); assert.equal(r.json.error, 'cheerLimit');
  r = await call('GET', '/api/poll?event=0', { token: rinaTok });
  assert.equal(r.json.events.filter(e => e.type === 'cheer' && e.from === 'Adley').length, 5);
});

test('chat: kind messages go through; unkind words, links and personal details are blocked with a friendly reason', async () => {
  let r = await call('POST', '/api/chat', { token: rinaTok, body: { text: 'Hi Adley! 👋 I am on level 4' } });
  assert.equal(r.status, 201); assert.equal(r.json.message.text, 'Hi Adley! 👋 I am on level 4');
  const cases = [['you are stup1d', 'kind'], ['loser!', 'kind'], ['kamu goblok', 'kind'], ['play at www.roblox.com', 'link'], ['call 0812 3456 7890', 'contact'],
    ['rina@mail.com', 'contact'], ['I live at 12 Oak Street', 'contact'], ['x'.repeat(121), 'long'], ['   ', 'empty'], [{ toString: 1 }, 'empty']];
  for (const [text, why] of cases) {
    await wait(1600);
    r = await call('POST', '/api/chat', { token: rinaTok, body: { text } });
    assert.equal(r.status, 422, JSON.stringify(text)); assert.equal(r.json.error, why, JSON.stringify(text)); assert.ok(r.json.message.length > 5);
  }
  r = await call('GET', '/api/chat', { token: hostTok });
  assert.equal(r.json.messages.length, 1, 'blocked messages never reach other children');
  assert.equal(r.json.messages[0].mine, false);
  r = await call('GET', '/api/chat/history', { token: rinaTok });
  assert.equal(r.status, 403, 'history needs the grown-up PIN');
  r = await call('GET', '/api/chat/history', { token: rinaTok, pin: RP });
  const blocked = r.json.messages.filter(m => m.blocked);
  assert.equal(blocked.length, 7, "Rina's grown-up sees her blocked attempts");
  assert.ok(blocked.some(m => m.text.includes('••••')) && !blocked.some(m => /0812/.test(m.text)), 'phone digits are masked when kept');
  r = await call('GET', '/api/chat/history', { token: hostTok, pin: HP });
  assert.equal(r.json.messages.filter(m => m.blocked).length, 0, "other grown-ups do not see Rina's blocked attempts");
});

test('chat: a phone number sent in pieces is caught, even with other words between; sums and @mentions are fine', async () => {
  await wait(1600); let r = await call('POST', '/api/chat', { token: budiTok, body: { text: '0812' } }); assert.equal(r.status, 201);
  await wait(1600); r = await call('POST', '/api/chat', { token: budiTok, body: { text: 'hi' } }); assert.equal(r.status, 201);
  await wait(1600); r = await call('POST', '/api/chat', { token: budiTok, body: { text: 'terus 3456' } }); assert.equal(r.status, 422); assert.equal(r.json.error, 'contact');
  await wait(1600); r = await call('POST', '/api/chat', { token: budiTok, body: { text: '6 + 6 = 12, 7 + 7 = 14' } }); assert.equal(r.status, 201, 'maths is fine');
  await wait(1600); r = await call('POST', '/api/chat', { token: budiTok, body: { text: 'I have 340 stars and 1250 coins' } }); assert.equal(r.status, 201, 'scores are fine');
  const h = await call('POST', '/api/join', { body: { code, playerName: 'Hana', pin: '7777' }, ip: '10.8.8.9' });
  await call('POST', `/api/host/members/${h.json.me.id}/approve`, { token: hostTok, pin: HP });
  for (const ans of ['12', '15', '18', '21', '24']) { await wait(1600); r = await call('POST', '/api/chat', { token: h.json.token, body: { text: ans } }); assert.equal(r.status, 201, 'a row of maths answers is fine: ' + ans); }
  await call('POST', `/api/host/members/${h.json.me.id}/remove`, { token: hostTok, pin: HP });
  await wait(1600); r = await call('POST', '/api/chat', { token: budiTok, body: { text: 'hi @Rina great job' } }); assert.equal(r.status, 201);
  await wait(1600); r = await call('POST', '/api/chat', { token: budiTok, body: { text: 'add me @budi_cool' } }); assert.equal(r.status, 422);
});

test('chat: a number in two-digit pieces after "08" is caught', async () => {
  const pieces = ['08', '12', '34', '56']; let r;
  for (const [i, p] of pieces.entries()) { await wait(1600); r = await call('POST', '/api/chat', { token: hostTok, body: { text: p } }); if (i < 2) assert.equal(r.status, 201, p); }
  assert.equal(r.status, 422); assert.equal(r.json.error, 'contact');
  assert.equal(limitKey('2a01:db8::1:0:0:1'), limitKey('2a01:db8:0:0:2::1'), 'IPv6 addresses in one /64 share a limit');
  assert.notEqual(limitKey('2a01:db8:0:1::1'), limitKey('2a01:db8:0:2::1'));
});

test('chat: sending too fast and repeating are refused', async () => {
  await wait(1600);
  let r = await call('POST', '/api/chat', { token: hostTok, body: { text: 'Great job Rina! 🌟' } }); assert.equal(r.status, 201);
  r = await call('POST', '/api/chat', { token: hostTok, body: { text: 'Want to race?' } }); assert.equal(r.status, 429); assert.equal(r.json.error, 'fast');
  await wait(1600);
  r = await call('POST', '/api/chat', { token: hostTok, body: { text: 'great job rina! 🌟' } }); assert.equal(r.status, 422); assert.equal(r.json.error, 'repeat');
  r = await call('GET', '/api/chat?after=1', { token: rinaTok }); assert.ok(r.json.messages.some(m => m.name === 'Adley'));
  r = await call('GET', '/api/poll?chat=1', { token: rinaTok }); assert.ok(r.json.unread >= 1);
});

test('chat can be turned off by a grown-up; removing needs the PIN; removed messages disappear from open chats', async () => {
  let r = await call('PUT', '/api/me', { token: rinaTok, pin: RP, body: { perms: { chat: false } } }); assert.equal(r.status, 200);
  r = await call('GET', '/api/chat', { token: rinaTok }); assert.equal(r.status, 403); assert.equal(r.json.error, 'chatOff');
  r = await call('POST', '/api/chat', { token: rinaTok, body: { text: 'hello' } }); assert.equal(r.status, 403);
  await call('PUT', '/api/me', { token: rinaTok, pin: RP, body: { perms: { chat: true } } });
  const list = (await call('GET', '/api/chat', { token: rinaTok })).json.messages;
  const rinaMsg = list.find(m => m.name === 'Rina'), adleyMsg = list.find(m => m.name === 'Adley');
  r = await call('DELETE', `/api/chat/${adleyMsg.id}`, { token: rinaTok, pin: RP }); assert.equal(r.status, 403, 'not your message');
  r = await call('DELETE', `/api/chat/${rinaMsg.id}`, { token: rinaTok }); assert.equal(r.status, 403, 'removing needs the PIN');
  r = await call('DELETE', `/api/chat/${rinaMsg.id}`, { token: hostTok, pin: HP }); assert.equal(r.status, 200, 'host can remove any message');
  r = await call('GET', `/api/chat?after=${rinaMsg.id}`, { token: rinaTok }); assert.ok(r.json.removed.includes(rinaMsg.id), 'open chats learn which messages were removed');
  r = await call('GET', '/api/chat/history', { token: rinaTok, pin: RP }); assert.equal(r.json.messages.find(m => m.id === rinaMsg.id).text, 'Hi Adley! 👋 I am on level 4', 'the sender’s grown-up still sees it');
  await call('DELETE', `/api/chat/${adleyMsg.id}`, { token: hostTok, pin: HP });
  r = await call('GET', '/api/chat/history', { token: rinaTok, pin: RP }); assert.equal(r.json.messages.find(m => m.id === adleyMsg.id).text, '', 'others do not see removed text');
});

test('groups are sealed from each other', async () => {
  const g2 = await call('POST', '/api/groups', { body: { hostKey: KEY, groupName: 'Other Class', playerName: 'Zara', pin: '5555' }, ip: '10.3.3.3' });
  const zt = g2.json.token;
  let r = await call('GET', `/api/visit/${rina.id}`, { token: zt }); assert.equal(r.status, 404);
  r = await call('POST', `/api/cheer/${rina.id}`, { token: zt, body: { emoji: '❤️' } }); assert.equal(r.status, 404);
  r = await call('GET', '/api/board', { token: zt }); assert.deepEqual(r.json.members.map(m => m.name), ['Zara']);
  r = await call('POST', `/api/host/members/${rina.id}/remove`, { token: zt, pin: '5555' }); assert.equal(r.status, 404);
  const msg = (await call('GET', '/api/chat/history', { token: hostTok, pin: HP })).json.messages[0];
  r = await call('DELETE', `/api/chat/${msg.id}`, { token: zt, pin: '5555' }); assert.equal(r.status, 404);
});

test('odd value types never cause a server error', async () => {
  for (const body of [{ progress: { coins: { toString: 1 }, level: [], plots: 'x' } }, { progress: null }, { progress: 5 }]) {
    const r = await call('POST', '/api/progress', { token: hostTok, body }); assert.equal(r.status, 200, JSON.stringify(body));
  }
  const r = await call('POST', '/api/join', { body: { code: { a: 1 }, playerName: { toString: 1 }, pin: 1234 }, ip: '10.4.4.4' }); assert.ok(r.status >= 400 && r.status < 500);
});

test('bad tokens, bad JSON and huge bodies are refused', async () => {
  let r = await call('GET', '/api/board'); assert.equal(r.status, 401);
  r = await call('GET', '/api/board', { token: 'A'.repeat(43) }); assert.equal(r.status, 401);
  r = await call('POST', '/api/progress', { token: hostTok, raw: '{bad json', headers: { 'Content-Type': 'application/json' } }); assert.equal(r.status, 400);
  r = await call('POST', '/api/progress', { token: hostTok, raw: JSON.stringify({ progress: { pad: 'x'.repeat(70000) } }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 413);
  r = await call('GET', '/api/nothing', { token: hostTok }); assert.equal(r.status, 404);
});

test('a full group refuses new players; waiting players do not fill it', async () => {
  for (const n of ['Cici', 'Dodo', 'Eka']) {
    const r = await call('POST', '/api/join', { body: { code, playerName: n, pin: '4321' }, ip: '10.9.9.' + n.charCodeAt(0) }); assert.equal(r.status, 201, n);
    const a = await call('POST', `/api/host/members/${r.json.me.id}/approve`, { token: hostTok, pin: HP }); assert.equal(a.status, 200);
  }
  let r = await call('POST', '/api/join', { body: { code, playerName: 'Fafa', pin: '4321' }, ip: '10.9.8.1' });
  assert.equal(r.status, 409); assert.equal(r.json.error, 'full');
});

test('join attempts are rate limited per visitor, and a faked X-Forwarded-For does not get around it', async () => {
  let last;
  for (let i = 0; i < 13; i++) last = await call('POST', '/api/join', { body: { code: 'AAAA-AAAA', playerName: 'Guess', pin: '1111' }, headers: { 'X-Forwarded-For': `203.0.113.${i}, 10.7.7.7` } });
  assert.equal(last.status, 429);
});

test('a whole class can join from one school network; only wrong codes are limited', async () => {
  const g = await call('POST', '/api/groups', { body: { hostKey: KEY, groupName: 'Class One', playerName: 'Teacher Kid', pin: '6666' }, ip: '10.20.0.1' });
  const c = g.json.group.code; let r;
  for (let i = 0; i < 10; i++) { r = await call('POST', '/api/join', { body: { code: c, playerName: 'Kid ' + 'ABCDEFGHIJ'[i], pin: '1212' }, ip: '10.20.0.99' }); assert.equal(r.status, 201, 'kid ' + i); }
  r = await call('POST', '/api/join', { body: { code: c, playerName: 'Kid K', pin: '1212' }, ip: '10.20.0.99' });
  assert.equal(r.status, 429); assert.equal(r.json.error, 'manyWaiting', 'the waiting list is full, not the address');
  const out = path.join(tmp, 'backup-test.db');
  const msg = execFileSync(process.execPath, ['admin.js', 'backup', out], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.match(msg, /Backup written/); const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(out);
  assert.ok(d.prepare("SELECT COUNT(*) AS n FROM groups WHERE name = 'Class One'").get().n === 1, 'the backup holds the data'); d.close();
  await call('DELETE', '/api/me', { token: g.json.token, pin: '6666' });
});

test('the host can change the invite code; the old one stops working', async () => {
  const r = await call('POST', '/api/host/code', { token: hostTok, pin: HP }); assert.notEqual(r.json.group.code, code);
  const j = await call('POST', '/api/join', { body: { code, playerName: 'Late', pin: '1111' }, ip: '10.6.6.6' }); assert.equal(j.status, 404);
  code = r.json.group.code;
});

test('leaving keeps past messages with the name; new messages never reuse an old number', async () => {
  const before = (await call('GET', '/api/chat/history', { token: hostTok, pin: HP })).json.messages.map(m => m.id);
  let r = await call('DELETE', '/api/me', { token: rinaTok }); assert.equal(r.status, 403, 'leaving needs the PIN');
  r = await call('DELETE', '/api/me', { token: rinaTok, pin: RP }); assert.equal(r.status, 200);
  r = await call('GET', '/api/me', { token: rinaTok }); assert.equal(r.status, 401);
  const hist = (await call('GET', '/api/chat/history', { token: hostTok, pin: HP })).json.messages;
  assert.ok(hist.some(m => m.name === 'Rina'), "Rina's past messages still show her name");
  await wait(1600); r = await call('POST', '/api/chat', { token: hostTok, body: { text: 'Bye Rina, see you!' } });
  assert.ok(r.json.message.id > Math.max(...before), 'message numbers keep going up');
  r = await call('GET', '/api/board', { token: hostTok }); assert.ok(!r.json.members.some(m => m.name === 'Rina'));
  r = await call('POST', '/api/join', { body: { code, playerName: 'Rina', pin: RP }, ip: '10.5.5.5' }); assert.equal(r.status, 201, 'the name is free again after leaving');
});

test('the host closing the group removes everyone', async () => {
  let r = await call('DELETE', '/api/me', { token: hostTok, pin: HP }); assert.equal(r.json.groupDeleted, true);
  r = await call('GET', '/api/me', { token: budiTok }); assert.equal(r.status, 401);
});

test('static files: security headers, gzip, caching, no path tricks', async () => {
  let r = await call('GET', '/'); assert.equal(r.status, 200); assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('cache-control'), 'no-cache'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  const et = r.headers.get('etag');
  r = await call('GET', '/', { headers: { 'If-None-Match': et } }); assert.equal(r.status, 304);
  r = await call('GET', '/js/a.js'); assert.match(r.headers.get('cache-control'), /immutable/);
  const raw = await new Promise((res, rej) => require('node:http').get(base + '/js/a.js', { headers: { 'Accept-Encoding': 'gzip' } }, rs => { const c = []; rs.on('data', d => c.push(d)); rs.on('end', () => res({ h: rs.headers, b: Buffer.concat(c) })); }).on('error', rej));
  assert.equal(raw.h['content-encoding'], 'gzip'); assert.match(zlib.gunzipSync(raw.b).toString(), /console\.log/);
  for (const bad of ['/.htaccess', '/../outside.txt', '/%2e%2e/outside.txt', '/js/../../outside.txt', '/nope.html', '/js%5c..%5c..%5coutside.txt']) { r = await call('GET', bad); assert.equal(r.status, 404, bad); }
  r = await call('POST', '/index.html', { body: {} }); assert.equal(r.status, 405);
});

test('unsafe settings are refused at start-up', () => {
  const run = (envx) => { try { return execFileSync(process.execPath, ['-e', "const s=require('./server'); console.log(JSON.stringify({key: s.CFG.hostKey}))"], { cwd: path.join(__dirname, '..'), env: { ...process.env, ...envx }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return 'EXIT ' + e.status + ' ' + e.stderr; } };
  assert.match(run({ HOST_KEY: 'change-me-to-a-long-secret', DATA_DIR: path.join(tmp, 'd2') }), /"key":""/, 'placeholder host key is ignored');
  assert.match(run({ HOST_KEY: 'short', DATA_DIR: path.join(tmp, 'd3') }), /"key":""/, 'short host key is ignored');
  assert.match(run({ DATA_DIR: path.join(site, 'db') }), /EXIT 1 .*DATA_DIR must not be inside SITE_DIR/s);
  // a database from an early test build is refused with a clear message
  const old = path.join(tmp, 'old'); fs.mkdirSync(old);
  const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(path.join(old, 'math-farm.db'));
  d.exec("CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT); PRAGMA user_version = 1;"); d.close();
  assert.match(run({ DATA_DIR: old }), /early test version/);
});
