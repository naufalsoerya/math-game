/* =====================================================================
   Friends online: friend groups, leaderboard, island visits and chat.
   It only switches on when the game is served by its friends server
   (server/server.js answers /api/health). Anywhere else it stays hidden
   and the game plays exactly as before.
   ===================================================================== */
const Friends = (() => {
  'use strict';
  const KEY = 'adley-math-farm-friends';
  const $ = s => document.querySelector(s);
  const CHEERS = ['❤️', '⭐', '👏', '🌻', '🎉'];
  const QUICK = ['Hi! 👋', 'Great job! 🌟', 'What level are you on?', 'I fixed a bridge! 🌉', 'Come and visit my island! 🏝️', 'I got 3 stars! ⭐', 'See you tomorrow! 👋'];
  const METRICS = [
    { k: 'level', icon: '🏝️', label: 'Level', val: m => m.level, show: m => `Level ${m.level}` },
    { k: 'stars', icon: '⭐', label: 'Stars', val: m => m.stars, show: m => `${m.stars} ⭐` },
    { k: 'week', icon: '📅', label: 'This week', val: m => m.weekStars, show: m => `${m.weekStars} ⭐` },
    { k: 'trophies', icon: '🏆', label: 'Trophies', val: m => m.trophies, show: m => `${m.trophies} 🏆` }
  ];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let G = null;
  let st = { ev: 0, chatSeen: 0 };
  let health = null;
  let me = null, group = null, board = null, boardErr = '', chat = [], chatErr = '', chatLatest = 0, unread = 0, requests = 0, netDown = false;
  let tab = 'board', metric = 'level', gfView = 'main', confirm = '', hostList = null, hist = null, gfMsg = '', gfBusy = false;
  let form = { board: true, visit: true, chat: true };
  let pollT = 0, chatT = 0, lastSync = 0, lastHash = '', syncing = false, lastChatToast = 0, sending = false, visitData = null;
  let pin = '', chatServerId = 0, renaming = 0;   // pin: the grown-up PIN, kept in memory only while the settings are open

  const esc = s => G.esc(s == null ? '' : s);
  const getToken = () => G.authToken ? G.authToken() : null;
  const load = () => st;
  const store = () => {};
  const shown = id => !$(id).hidden;
  function when(ms) {
    const d = new Date(ms), diff = Date.now() - ms;
    if (diff < 60e3) return 'just now'; if (diff < 3600e3) return `${Math.floor(diff / 60e3)} min ago`;
    const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), t = `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
    return diff < 20 * 3600e3 ? t : `${MON[d.getMonth()]} ${d.getDate()}, ${t}`;
  }

  /* ---------------------------------------------------------------- server calls */
  async function req(method, path, body, opts) {
    opts = opts || {}; const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = setTimeout(() => ctrl && ctrl.abort(), opts.timeout || 10000);
    try {
      const h = { Accept: 'application/json' };
      const token = getToken();
      if (token && !opts.noAuth) h.Authorization = 'Bearer ' + token;
      if (body !== undefined) h['Content-Type'] = 'application/json'; if (opts.pin) h['X-Parent-Pin'] = opts.pin;
      const r = await fetch('api/' + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctrl ? ctrl.signal : undefined, cache: 'no-store', keepalive: !!opts.keepalive, credentials: 'omit' });
      let j = null; try { j = await r.json(); } catch (e) { }
      netDown = false;
      if (r.status === 401 && token && !opts.noAuth) lost();
      if (opts.pin && j && (j.error === 'pin' || j.error === 'pinLocked')) pin = '';
      return { ok: r.ok, status: r.status, data: j || {} };
    } catch (e) {
      netDown = true; return { ok: false, status: 0, data: { message: 'The friends server cannot be reached right now. Please try again in a moment.' } };
    } finally { clearTimeout(to); }
  }
  const msgOf = r => (r.data && r.data.message) || 'Something went wrong. Please try again.';

  function lost() {
    const had = !!me; st = { ev: 0, chatSeen: 0 }; me = null; group = null; board = null; chat = []; unread = 0; requests = 0;
    if (G.visiting()) { G.goHome(); hideVisitBar(); }
    if (had) G.toast('👫', 'This device left the friend group', 'A grown-up can join again in 👪 For Grown-ups.');
    updButton(); if (shown('#friends')) render(); if (shown('#gfriends')) renderGF();
  }

  /* ---------------------------------------------------------------- start-up */
  async function checkHealth(tries) {
    if (location.protocol === 'file:') return;
    const r = await req('GET', 'health', undefined, { noAuth: true, timeout: 6000 });
    if (r.ok && r.data && r.data.friends) { health = r.data; updButton(); await refreshMe(); if (me) poll(); return; }
    if (r.status === 0 || r.status === 429 || r.status >= 500) setTimeout(() => checkHealth((tries || 0) + 1), Math.min(300e3, 30e3 * Math.pow(2, tries || 0)));
  }
  async function refreshMe() {
    const r = await req('GET', 'me'); if (r.ok) { me = r.data.me; group = r.data.group; } updButton(); return r;
  }
  function init(api) {
    G = api; st = { ev: 0, chatSeen: 0 };
    $('#friendsBtn').onclick = () => { G.sfx('tap'); openSheet(); };
    $('#friendsX').onclick = closeSheet;
    $('#tabBoard').onclick = () => { G.sfx('tap'); tab = 'board'; render(); loadBoard(); };
    $('#tabChat').onclick = () => { G.sfx('tap'); tab = 'chat'; render(); loadChat(true); };
    $('#fBody').addEventListener('click', onSheetClick);
    $('#chatChips').innerHTML = QUICK.map((q, i) => `<button class="chip2" data-q="${i}">${esc(q)}</button>`).join('');
    $('#chatChips').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) send(QUICK[+b.dataset.q]); });
    $('#chatForm').addEventListener('submit', e => { e.preventDefault(); send($('#chatIn').value); });
    $('#chatIn').addEventListener('input', () => { $('#chatWarn').hidden = true; });
    $('#gfX').onclick = closeGF;
    $('#gfBody').addEventListener('click', onGFClick);
    // Enter in a field "clicks" the form's main button (the click handler does the work), so the submit itself is only cancelled
    $('#gfBody').addEventListener('submit', e => e.preventDefault());
    $('#vbHome').onclick = () => { G.sfx('tap'); hideVisitBar(); G.goHome(); };
    $('#vbCheer').onclick = () => { G.sfx('tap'); const box = $('#vbCheers'); box.hidden = !box.hidden; $('#vbCheer').setAttribute('aria-expanded', String(!box.hidden)); };
    $('#vbCheers').innerHTML = CHEERS.map(c => `<button class="vbc" data-c="${c}" aria-label="Send ${c}">${c}</button>`).join('');
    $('#vbCheers').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) cheer(b.dataset.c); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (shown('#gfriends')) closeGF(); else if (shown('#friends')) closeSheet();
    });
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (!health || !getToken()) return;
      poll(); if (shown('#friends') && tab === 'chat') loadChat(Date.now() - hiddenAt > 10 * 60e3); // after a long sleep, reload the whole chat
    });
    checkHealth(0);
  }

  /* ---------------------------------------------------------------- HUD button + polling */
  function updButton() {
    const b = $('#friendsBtn'); const was = b.hidden; b.hidden = !health;
    $('#friendsDot').hidden = !(unread > 0 || (me && me.isHost && requests > 0));
    $('#chatDot').hidden = !(unread > 0);
    if (was !== b.hidden) G.layout();
  }
  async function poll() {
    clearTimeout(pollT);
    if (!health || !getToken()) return;
    if (document.hidden) { pollT = setTimeout(poll, 30e3); return; }
    const r = await req('GET', `poll?event=${st.ev || 0}&chat=${st.chatSeen || 0}`);
    if (r.ok) {
      const d = r.data;
      if (me) { me.status = d.status; me.isHost = d.status === 'host'; me.perms = d.perms; }
      (d.events || []).filter(e => e.id > (st.ev || 0)).forEach(e => {
        if (e.type === 'visit') G.toast('🏝️', `${e.from} visited your island!`, 'Friends can look at your farms.');
        else if (e.type === 'cheer') G.toast(CHEERS.includes(e.emoji) ? e.emoji : '❤️', `${e.from} sent you a cheer!`, 'Keep going, super farmer!');
        else if (e.type === 'approved') { G.toast('🎉', 'You are in the friend group!', 'Tap 👫 to see your friends.'); G.sfx('level'); refreshMe(); }
        else if (e.type === 'request') G.toast('👪', `${e.from} wants to join your friend group`, 'A grown-up can say yes in 👪 For Grown-ups.');
      });
      st.ev = Math.max(st.ev || 0, d.lastEvent || 0);
      if (d.chatLatest !== undefined) {
        if (!st.chatSeen) st.chatSeen = d.chatLatest;
        const before = unread; unread = d.unread || 0;
        if (unread > before && !(shown('#friends') && tab === 'chat') && Date.now() - lastChatToast > 120e3) { lastChatToast = Date.now(); G.toast('💬', 'New message from a friend', 'Tap 👫 to read it.'); }
      } else unread = 0;
      requests = d.requests || 0; store(); updButton();
      if (shown('#gfriends') && gfView === 'main' && me && me.isHost && hostList && hostList.filter(x => x.status === 'pending').length !== requests) loadHostList();
    }
    pollT = setTimeout(poll, r.ok ? 25e3 : 60e3);
  }

  /* ---------------------------------------------------------------- progress sync */
  function snapshot() {
    const p = G.progress(); const w = p.world;
    return Object.assign({}, p, { world: w ? { level: w.level, coins: w.coins, chests: w.chests, expl: w.expl, disc: w.disc } : null });
  }
  function touch(important) {
    if (!health || !getToken() || syncing) return;
    const p = snapshot(); const h = JSON.stringify(p);
    if (h === lastHash) return;
    if (!important && Date.now() - lastSync < 60e3) return;
    sync(p, h, document.hidden);
  }
  async function sync(p, h, keepalive) {
    syncing = true; lastSync = Date.now();
    const r = await req('POST', 'progress', { progress: p }, { keepalive: !!keepalive });
    syncing = false; if (r.ok) lastHash = h;
  }

  /* ---------------------------------------------------------------- kids' Friends sheet */
  function openSheet() { $('#friends').hidden = false; render(); if (me && me.status !== 'pending') { if (tab === 'board') loadBoard(); else loadChat(true); } else refreshMe().then(render); }
  function closeSheet() { $('#friends').hidden = true; clearTimeout(chatT); }
  function render() {
    const body = $('#fBody'); const member = me && me.status !== 'pending';
    $('#fGroup').textContent = group && member ? group.name : '';
    $('#fTabs').hidden = !member; $('#chatBar').hidden = !(member && tab === 'chat' && me.perms && me.perms.chat && !chatErr);
    $('#tabBoard').classList.toggle('sel', tab === 'board'); $('#tabChat').classList.toggle('sel', tab === 'chat');
    $('#tabBoard').setAttribute('aria-selected', String(tab === 'board')); $('#tabChat').setAttribute('aria-selected', String(tab === 'chat'));
    if (!me) {
      body.innerHTML = `<div class="fhero"><div class="fart" aria-hidden="true"><span>🧑‍🌾</span><span>👫</span><span>🧑‍🌾</span></div>
        <h3>Play with your friends!</h3><p class="pnote">See who has the most stars, send kind messages and visit your friends’ islands. A grown-up sets this up first.</p>
        <button class="btn go" data-act="askGrownup">👪 Ask a grown-up</button></div>`;
      return;
    }
    if (me.status === 'pending') {
      body.innerHTML = `<div class="fhero"><div class="fart" aria-hidden="true"><span>⏳</span></div><h3>Almost there!</h3><p class="pnote">The grown-up who started <b>${esc(group ? group.name : 'the group')}</b> needs to say yes. Then you can see your friends here.</p><button class="btn soft" data-act="retry">Check again</button></div>`;
      return;
    }
    if (tab === 'board') renderBoard(); else renderChat();
  }
  async function loadBoard() {
    const r = await req('GET', 'board');
    if (r.ok) { board = r.data.members; boardErr = ''; } else if (r.status !== 401) boardErr = msgOf(r);
    if (shown('#friends') && tab === 'board') renderBoard();
  }
  function renderBoard() {
    const body = $('#fBody');
    if (!board) { body.innerHTML = `<p class="pnote">${esc(boardErr || 'Loading the leaderboard…')}</p>`; return; }
    const M = METRICS.find(x => x.k === metric);
    const rows = board.slice().sort((a, b) => M.val(b) - M.val(a) || b.stars - a.stars || a.name.localeCompare(b.name));
    let rank = 0, prev = null;
    const medal = ['🥇', '🥈', '🥉'];
    const list = rows.map((m, i) => {
      if (prev === null || M.val(m) !== prev) rank = i + 1; prev = M.val(m);
      const visit = m.me ? `<span class="lb-you">That’s you!</span>` : m.canVisit ? `<button class="btn soft sm" data-visit="${m.id}" ${G.has3D() ? '' : 'disabled'}>Visit 🏝️</button>` : `<span class="lb-lock" title="This island is private">🔒 Private</span>`;
      return `<div class="lb-row${m.me ? ' me' : ''}">
        <span class="lb-rank" aria-label="Place ${rank}">${rank <= 3 ? medal[rank - 1] : rank}</span>
        <span class="lb-av" aria-hidden="true">${G.avatar(m.wear)}${m.online ? '<i class="lb-on"></i>' : ''}</span>
        <span class="lb-name"><b>${esc(m.name)}${m.me ? ' (you)' : ''}</b><small>Level ${m.level} · ⭐ ${m.stars} · 🏆 ${m.trophies}${m.online ? ' · online now' : ''}</small></span>
        <span class="lb-val">${esc(M.show(m))}</span>
        <span class="lb-act">${visit}</span></div>`;
    }).join('');
    const mine = board.find(m => m.me);
    body.innerHTML = `${boardErr ? `<p class="fwarn" role="status">🐥 ${esc(boardErr)} This is the last leaderboard we saw.</p>` : ''}<div class="seg lb-seg" role="group" aria-label="Sort the leaderboard">${METRICS.map(x => `<button data-metric="${x.k}" class="${x.k === metric ? 'sel' : ''}" aria-pressed="${x.k === metric}"><b>${x.icon} ${x.label}</b></button>`).join('')}</div>
      <div class="lb">${list}</div>
      <p class="pnote">${metric === 'week' ? 'This week counts the stars won since Monday. Everyone starts again at 0 each week!' : 'Only friends in your group can see this leaderboard.'}${mine && mine.hidden ? ' A grown-up has hidden you from the leaderboard, so only you can see your row.' : ''}${G.has3D() ? '' : ' Visiting islands needs the 3D view, which this browser cannot show.'}</p>`;
  }
  async function loadChat(fresh) {
    clearTimeout(chatT);
    if (!me || me.status === 'pending') return;
    const last = !fresh && chatServerId ? chatServerId : 0;
    const r = await req('GET', last ? `chat?after=${last}` : 'chat');
    if (r.ok) {
      chatErr = ''; const add = r.data.messages || []; const gone = r.data.removed || []; const before = chat.length;
      chat = (last ? chat.concat(add.filter(m => !chat.some(c => c.id === m.id))) : add).filter(m => !gone.includes(m.id)).sort((a, b) => a.id - b.id);
      add.forEach(m => { chatServerId = Math.max(chatServerId, m.id); }); if (!last) chatServerId = add.length ? add[add.length - 1].id : 0;
      const changed = add.length || chat.length !== before;
      if (chat.length > 150) chat = chat.slice(-150);
      chatLatest = r.data.latest || chatLatest; st.chatSeen = Math.max(st.chatSeen || 0, chatLatest); unread = 0; store(); updButton();
      if (shown('#friends') && tab === 'chat' && (fresh || changed)) renderChat();
    } else if (r.status !== 401) { chatErr = r.data.error === 'chatOff' ? 'off' : msgOf(r); if (me.perms && r.data.error === 'chatOff') me.perms.chat = false; if (shown('#friends') && tab === 'chat') render(); }
    if (shown('#friends') && tab === 'chat' && !document.hidden) chatT = setTimeout(() => loadChat(false), 4000);
  }
  function renderChat() {
    const body = $('#fBody');
    $('#chatBar').hidden = !(me.perms && me.perms.chat && !chatErr);
    if (!me.perms || !me.perms.chat || chatErr === 'off') { body.innerHTML = `<div class="fhero"><div class="fart" aria-hidden="true"><span>💬</span></div><h3>Chat is turned off</h3><p class="pnote">A grown-up can turn chat on in 👪 For Grown-ups.</p></div>`; return; }
    if (chatErr) { body.innerHTML = `<p class="pnote">${esc(chatErr)}</p><button class="btn soft" data-act="retry">Try again</button>`; return; }
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 60;
    body.innerHTML = chat.length ? `<div class="chat">${chat.map(m => `<div class="msg${m.mine ? ' mine' : ''}"><div class="mbub"><span class="mhead"><b>${m.mine ? 'You' : esc(m.name)}</b><small>${esc(when(m.at))}</small></span><p>${esc(m.text)}</p></div><button class="say sm" data-say="${m.id}" aria-label="Read this message aloud">🔊</button></div>`).join('')}</div>`
      : `<div class="fhero"><div class="fart" aria-hidden="true"><span>👋</span></div><h3>No messages yet</h3><p class="pnote">Say hi to your friends! Tap a quick message below or type your own.</p></div>`;
    if (atBottom || body.dataset.first !== '1') { body.scrollTop = body.scrollHeight; body.dataset.first = '1'; }
  }
  async function send(text) {
    text = String(text || '').trim(); const warn = $('#chatWarn');
    if (!text) { $('#chatIn').focus(); return; }
    if (sending) return; sending = true; $('#chatSend').disabled = true;
    const r = await req('POST', 'chat', { text });
    sending = false; $('#chatSend').disabled = false;
    if (r.ok) {
      $('#chatIn').value = ''; warn.hidden = true; G.sfx('tap');
      const m = r.data.message; if (m && !chat.some(c => c.id === m.id)) chat.push(m);
      st.chatSeen = Math.max(st.chatSeen || 0, m ? m.id : 0); store(); renderChat(); const b = $('#fBody'); b.scrollTop = b.scrollHeight;
    } else {
      warn.textContent = '🐥 ' + msgOf(r); warn.hidden = false; G.sfx('thunk'); G.speak(msgOf(r).replace('💛', ''));
      if (r.data.error === 'chatOff') { if (me.perms) me.perms.chat = false; render(); }
    }
  }
  function onSheetClick(e) {
    const t = e.target;
    const mt = t.closest('[data-metric]'); if (mt) { G.sfx('tap'); metric = mt.dataset.metric; renderBoard(); return; }
    const v = t.closest('[data-visit]'); if (v) { G.sfx('tap'); visit(+v.dataset.visit, v); return; }
    const sy = t.closest('[data-say]'); if (sy) { const m = chat.find(c => c.id === +sy.dataset.say); if (m) { sy.classList.add('on'); G.say(`${m.mine ? 'You' : m.name} said: ${m.text}`, () => sy.classList.remove('on')); setTimeout(() => sy.classList.remove('on'), 9000); } return; }
    const a = t.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'askGrownup') { G.sfx('tap'); closeSheet(); G.openGate(openGF); }
    if (a.dataset.act === 'retry') { G.sfx('tap'); chatErr = ''; refreshMe().then(() => { render(); if (me && me.status !== 'pending') { if (tab === 'board') loadBoard(); else loadChat(true); } }); }
  }

  /* ---------------------------------------------------------------- visiting a friend's island */
  async function visit(id, btn) {
    if (btn) btn.disabled = true;
    const r = await req('GET', `visit/${id}`);
    if (btn) btn.disabled = false;
    if (!r.ok) { G.sfx('thunk'); boardErr = ''; const body = $('#fBody'); const p = document.createElement('p'); p.className = 'fwarn'; p.textContent = '🐥 ' + msgOf(r); body.prepend(p); G.speak(msgOf(r)); return; }
    closeSheet(); visitData = r.data;
    if (G.visit(r.data)) showVisitBar(); else G.buddy('Sorry, that island could not be opened. Please try again.', true);
  }
  function showVisitBar() {
    const d = visitData; const farms = (d.plots || []).filter(p => p && p.done).length;
    $('#vbName').textContent = `${d.name}’s island`; $('#vbSub').textContent = `Level ${d.level} · ${farms} of 18 farms · ⭐ ${d.stars}`;
    $('#vbCheers').hidden = true; $('#vbCheer').setAttribute('aria-expanded', 'false'); $('#visitBar').hidden = false;
  }
  function hideVisitBar() { $('#visitBar').hidden = true; $('#vbCheers').hidden = true; visitData = null; }
  async function cheer(c) {
    if (!visitData) return; const d = visitData;
    const r = await req('POST', `cheer/${d.id}`, { emoji: c });
    $('#vbCheers').hidden = true; $('#vbCheer').setAttribute('aria-expanded', 'false');
    if (r.ok) { G.sfx('chest'); G.buddy(`You sent ${c} to ${d.name}! ${d.name} will see it next time they play.`, true); }
    else { G.sfx('thunk'); G.buddy(msgOf(r), true); }
  }

  /* ---------------------------------------------------------------- grown-ups: section in For Grown-ups */
  function parentsSection(el) {
    if (!el) return;
    if (!health) { el.innerHTML = `<h3>Friends online</h3><p class="pnote">A leaderboard, chat and island visits with friends are available when the game runs on your family website with its friends server. They are not available here.</p>`; return; }
    let line;
    if (!me) line = 'Not in a friend group yet. Join one with an invite code, or start a new group.';
    else if (me.status === 'pending') line = `${esc(me.name)} is waiting for the group host to say yes.`;
    else line = `${esc(me.name)} is in <b>${esc(group ? group.name : 'a friend group')}</b>${me.isHost ? ' (you started this group)' : ''}.${me.isHost && requests ? ` <b>${requests} ${requests === 1 ? 'child is' : 'children are'} waiting</b> for your yes.` : ''}`;
    el.innerHTML = `<h3>Friends online</h3><p class="pnote">${line}</p><div class="prow"><button class="btn soft" data-gf="open">👫 Friends settings</button></div>`;
    el.querySelector('[data-gf="open"]').onclick = () => { G.sfx('tap'); openGF(); };
  }

  /* ---------------------------------------------------------------- grown-ups: Friends online sheet */
  async function openGF() {
    $('#parents').hidden = true; $('#gfriends').hidden = false; gfView = 'main'; confirm = ''; gfMsg = ''; hist = null; renaming = 0;
    form = { board: true, visit: true, chat: true };
    renderGF();
    if (health && getToken()) { await refreshMe(); if (pin && me && me.isHost) await loadHostList(); renderGF(); }
  }
  function closeGF() { $('#gfriends').hidden = true; confirm = ''; pin = ''; hostList = null; hist = null; G.openParents(); }
  async function loadHostList() { const r = await req('GET', 'host/members', undefined, { pin }); hostList = r.ok ? r.data.members : null; if (!r.ok && r.status !== 401) gfMsg = msgOf(r); if (shown('#gfriends')) renderGF(); }
  const permRows = (p, nm) => `<div class="seg perms">
      <button type="button" data-perm="board" class="${p.board ? 'sel' : ''}" aria-pressed="${!!p.board}"><b>${p.board ? '✓ ' : ''}Show on the leaderboard</b><span>Friends see ${esc(nm)}’s game name, level, stars and trophies.</span></button>
      <button type="button" data-perm="visit" class="${p.visit ? 'sel' : ''}" aria-pressed="${!!p.visit}"><b>${p.visit ? '✓ ' : ''}Friends can visit the island</b><span>Friends can walk around ${esc(nm)}’s island and look at the farms. They cannot change anything.</span></button>
      <button type="button" data-perm="chat" class="${p.chat ? 'sel' : ''}" aria-pressed="${!!p.chat}"><b>${p.chat ? '✓ ' : ''}Chat with friends</b><span>Type and read messages in the group chat. Unkind words, links, phone numbers, emails, addresses and school names are blocked.</span></button></div>`;
  const pinRows = (id) => `<div class="prow"><label for="${id}">Grown-up PIN</label><input class="inp pin" id="${id}" type="password" inputmode="numeric" maxlength="6" placeholder="4 to 6 numbers" autocomplete="off"></div>
      <div class="prow"><label for="${id}2">PIN again</label><input class="inp pin" id="${id}2" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>
      <p class="pnote small">You need this PIN to change friend settings, say yes to children, read the chat history or leave the group. It keeps these settings away from little fingers. Please remember it.</p>`;
  const PRIVACY = `<p class="pnote small">What is shared: the game name you choose, level, stars, trophies, outfit, animals and the island map. No photos, no real names needed, no location. Chat messages are kept on your family server for up to 180 days so grown-ups can read them. Each grown-up can read the group chat and the messages their own child tried to send that were blocked (phone numbers in them are hidden).</p>`;
  let gfShape = '';
  function renderGF() {
    // typed values survive a re-draw of the same page (an error message, a toggle); a new page starts empty at the top
    const keep = {}; $('#gfBody').querySelectorAll('input[id]').forEach(e => { keep[e.id] = e.value; });
    const shape = [!!getToken(), me ? me.status : '-', !!pin, gfView].join(); const same = shape === gfShape;
    if (!same) { gfShape = shape; $('#gfBody').scrollTop = 0; }
    drawGF();
    if (same) Object.keys(keep).forEach(id => { const e = document.getElementById(id); if (e && $('#gfBody').contains(e)) e.value = keep[id]; });
  }
  function drawGF() {
    const b = $('#gfBody'); const nm = G.S.name;
    const msg = gfMsg ? `<p class="fwarn" role="status">${esc(gfMsg)}</p>` : '';
    if (!health) { b.innerHTML = `<div class="psec"><p class="pnote">The friends server cannot be reached from here.</p></div>`; return; }
    if (gfView === 'history') return renderHistory();
    if (!me) {
      b.innerHTML = `${msg}
        <form class="psec" data-form="join"><h3>Join a friend group</h3>
          <p class="pnote">Ask the grown-up who started the group for the invite code. They will say yes to ${esc(nm)} before ${esc(nm)} can see the group.</p>
          <div class="prow"><label for="gfCode">Invite code</label><input class="inp code" id="gfCode" maxlength="12" placeholder="ABCD-2345" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
          <div class="prow"><label for="gfName">Child’s game name</label><input class="inp" id="gfName" maxlength="14" value="${esc(nm)}" autocomplete="off"></div>
          ${pinRows('gfPin')}
          ${permRows(form, nm)}
          <div class="prow"><button class="btn go" data-act="join" ${gfBusy ? 'disabled' : ''}>Join the group</button></div></form>
        ${health.canCreate ? `<form class="psec" data-form="create"><h3>Start a new friend group</h3>
          <p class="pnote">Start a group, then share its invite code with other families. You say yes to each child who joins. The host key comes from your IT team (HOST_KEY on the server) and is needed only once.</p>
          <div class="prow"><label for="gfGroup">Group name</label><input class="inp" id="gfGroup" maxlength="30" placeholder="${esc(nm)}’s Friends" autocomplete="off"></div>
          <div class="prow"><label for="gfKey">Host key</label><input class="inp" id="gfKey" type="password" maxlength="200" autocomplete="off"></div>
          <div class="prow"><label for="gfName2">Child’s game name</label><input class="inp" id="gfName2" maxlength="14" value="${esc(nm)}" autocomplete="off"></div>
          ${pinRows('gfPinC')}
          <p class="pnote">The choices above (leaderboard, visits, chat) are used for this group too.</p>
          <div class="prow"><button class="btn soft" data-act="create" ${gfBusy ? 'disabled' : ''}>Start the group</button></div></form>` : ''}
        <div class="psec">${PRIVACY}</div>`;
      return;
    }
    if (!pin) {
      b.innerHTML = `${msg}<form class="psec" data-form="unlock"><h3>Grown-up PIN</h3><p class="pnote">Type the grown-up PIN chosen when ${esc(me.name)} joined <b>${esc(group ? group.name : 'the group')}</b>.</p>
        <div class="prow"><label for="gfUnlock">PIN</label><input class="inp pin" id="gfUnlock" type="password" inputmode="numeric" maxlength="6" autocomplete="off"><button class="btn go sm" data-act="unlock">Open</button></div>
        <p class="pnote small">Forgot the PIN? Your IT team can set a new one on the server.</p></form>`;
      setTimeout(() => { const e = document.getElementById('gfUnlock'); if (e) try { e.focus({ preventScroll: true }); } catch (er) { } }, 50);
      return;
    }
    if (me.status === 'pending') {
      b.innerHTML = `${msg}<div class="psec"><h3>Waiting for a yes</h3><p class="pnote"><b>${esc(me.name)}</b> asked to join <b>${esc(group ? group.name : 'the group')}</b>. The grown-up who started the group needs to say yes. This page updates when you tap Check again.</p>
        <div class="prow"><button class="btn soft" data-act="reload">Check again</button>${confirm === 'leave' ? `<b>Cancel the request?</b><button class="btn" data-act="leaveYes">Yes, cancel</button><button class="btn soft" data-act="no">No</button>` : `<button class="btn soft" data-act="leave">Cancel the request</button>`}</div></div>`;
      return;
    }
    const host = me.isHost; const pend = (hostList || []).filter(x => x.status === 'pending'); const mem = (hostList || []).filter(x => x.status !== 'pending');
    const nameRow = x => renaming === x.id
      ? `<input class="inp" id="gfRn${x.id}" maxlength="14" value="${esc(x.name)}" autocomplete="off" aria-label="New game name"><button class="btn go sm" data-rename="${x.id}">Save</button><button class="btn soft sm" data-act="no">Cancel</button>`
      : `<button class="btn soft sm" data-act="rn${x.id}">Rename</button>`;
    b.innerHTML = `${msg}
      <div class="psec"><h3>${esc(group ? group.name : 'Friend group')}</h3><p class="pnote">${group ? `${group.members} of ${group.max} players.` : ''} ${host ? 'You started this group, so you decide who joins.' : ''}</p>
        ${host ? `<div class="codebox"><span>Invite code</span><b id="gfCodeShow">${esc(group.code)}</b><button class="btn soft sm" data-act="copy">Copy</button><button class="btn soft sm" data-act="newCode">Make a new code</button></div>
        <p class="pnote">Share this code only with families you know. Making a new code stops the old one from working.</p>
        <div class="prow"><label for="gfRename">Group name</label><input class="inp" id="gfRename" maxlength="30" value="${esc(group.name)}" autocomplete="off"><button class="btn soft sm" data-act="rename">Save</button></div>` : ''}</div>
      ${host ? `<div class="psec"><h3>Waiting to join${pend.length ? ` (${pend.length})` : ''}</h3>${pend.length ? pend.map(x => `<div class="mrow"><b>${esc(x.name)}</b><small>asked ${esc(when(x.joined))}</small><span class="sp"></span><button class="btn go sm" data-approve="${x.id}">Say yes</button><button class="btn soft sm" data-decline="${x.id}">Say no</button></div>`).join('') : '<p class="pnote">Nobody is waiting right now.</p>'}</div>
        <div class="psec"><h3>Players</h3>${mem.map(x => `<div class="mrow"><b>${esc(x.name)}${x.me ? ' (your child)' : ''}</b><small>Level ${x.level} · ⭐ ${x.stars} · ${esc(x.seen || '')}</small><span class="sp"></span>${nameRow(x)}${x.me ? '' : confirm === 'rm' + x.id ? `<b>Remove?</b><button class="btn sm" data-remove="${x.id}">Yes, remove</button><button class="btn soft sm" data-act="no">No</button>` : `<button class="btn soft sm" data-act="rm${x.id}">Remove</button>`}</div>`).join('')}</div>` : ''}
      <div class="psec"><h3>${esc(me.name)} in this group</h3>
        ${host ? '' : `<p class="pnote">Game name: <b>${esc(me.name)}</b>. Only the group host can change names.</p>`}
        ${permRows(me.perms || form, me.name)}
        <div class="prow"><button class="btn soft" data-act="history">💬 Read the chat history</button></div>
        <div class="prow"><label for="gfNewPin">New grown-up PIN</label><input class="inp pin" id="gfNewPin" type="password" inputmode="numeric" maxlength="6" placeholder="4 to 6 numbers" autocomplete="off"><button class="btn soft sm" data-act="newPin">Change PIN</button></div></div>
      <div class="psec danger"><h3>${host ? 'Close the group' : 'Leave the group'}</h3><p class="pnote">${host ? 'Closing the group removes it for every family, with all its messages.' : `${esc(me.name)} leaves the group. The messages already sent stay in the group chat. The game on this device keeps all its progress.`}</p>
        <div class="prow">${confirm === 'leave' ? `<b>Are you sure?</b><button class="btn" data-act="leaveYes">${host ? 'Yes, close it' : 'Yes, leave'}</button><button class="btn soft" data-act="no">Cancel</button>` : `<button class="btn soft" data-act="leave">${host ? 'Close the group' : 'Leave the group'}</button>`}</div></div>
      <div class="psec">${PRIVACY}</div>`;
  }
  async function renderHistory() {
    const b = $('#gfBody');
    if (!hist) { b.innerHTML = `<div class="prow"><button class="btn soft sm" data-act="back">◀ Back</button></div><p class="pnote">Loading the chat history…</p>`; const r = await req('GET', 'chat/history', undefined, { pin }); hist = r.ok ? r.data.messages : []; gfMsg = r.ok ? '' : msgOf(r); if (!pin) { gfView = 'main'; renderGF(); return; } if (gfView !== 'history') return; }
    b.innerHTML = `<div class="prow"><button class="btn soft sm" data-act="back">◀ Back</button></div>${gfMsg ? `<p class="fwarn">${esc(gfMsg)}</p>` : ''}
      <div class="psec"><h3>Chat history</h3><p class="pnote">Newest first. Messages marked “blocked” were stopped by the filter and were never shown to other children; only you can see ${esc(me ? me.name : 'your child')}’s blocked messages. ${me && me.isHost ? 'As the group host you can remove any message.' : `You can remove ${esc(me ? me.name : 'your child')}’s own messages.`}</p>
      ${hist.length ? hist.map(m => `<div class="hrowm${m.blocked ? ' blocked' : ''}${m.removed ? ' removed' : ''}"><span class="hmeta"><b>${esc(m.name)}</b><small>${esc(when(m.at))}${m.blocked ? ' · blocked: ' + esc({ kind: 'unkind words', link: 'a link', contact: 'personal details' }[m.blocked] || m.blocked) : ''}${m.removed ? ' · removed' : ''}</small></span><p>${m.text ? esc(m.text) : '<i>(removed message)</i>'}</p>${m.canRemove ? `<button class="btn soft sm" data-delmsg="${m.id}">Remove</button>` : ''}</div>`).join('') : '<p class="pnote">No messages yet.</p>'}</div>`;
  }
  const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  function pinPair(a) { const p1 = val(a), p2 = val(a + '2'); if (!/^\d{4,6}$/.test(p1)) return { err: 'Please choose a grown-up PIN of 4 to 6 numbers.' }; if (p1 !== p2) return { err: 'The two PINs are not the same. Please type them again.' }; return { pin: p1 }; }
  async function onGFClick(e) {
    const t = e.target;
    const pm = t.closest('[data-perm]');
    if (pm) {
      G.sfx('tap'); const k = pm.dataset.perm;
      if (me && getToken()) { const p = Object.assign({}, me.perms); p[k] = !p[k]; const r = await req('PUT', 'me', { perms: p }, { pin }); if (r.ok) { me = r.data.me; group = r.data.group; gfMsg = ''; } else gfMsg = msgOf(r); }
      else form[k] = !form[k];
      renderGF(); return;
    }
    const ap = t.closest('[data-approve]'), dc = t.closest('[data-decline]'), rm = t.closest('[data-remove]'), dm = t.closest('[data-delmsg]'), rn = t.closest('[data-rename]');
    if (ap || dc || rm) {
      const id = +(ap || dc || rm).dataset[ap ? 'approve' : dc ? 'decline' : 'remove'];
      const r = await req('POST', `host/members/${id}/${ap ? 'approve' : dc ? 'decline' : 'remove'}`, undefined, { pin }); G.sfx(r.ok ? 'tap' : 'thunk');
      gfMsg = r.ok ? '' : msgOf(r); confirm = ''; await refreshMe(); if (pin) await loadHostList(); else renderGF(); poll(); return;
    }
    if (rn) {
      const id = +rn.dataset.rename; const r = await req(id === (me && me.id) ? 'PUT' : 'PUT', id === (me && me.id) ? 'me' : `host/members/${id}`, { name: val('gfRn' + id) }, { pin });
      gfMsg = r.ok ? 'Name saved.' : msgOf(r); if (r.ok) renaming = 0; await refreshMe(); if (pin) await loadHostList(); else renderGF(); return;
    }
    if (dm) { const r = await req('DELETE', `chat/${+dm.dataset.delmsg}`, undefined, { pin }); gfMsg = r.ok ? '' : msgOf(r); hist = null; chat = chat.filter(c => c.id !== +dm.dataset.delmsg); renderHistory(); return; }
    const a = t.closest('[data-act]'); if (!a) return; const act = a.dataset.act; G.sfx('tap');
    if (act === 'join' || act === 'create') {
      if (gfBusy) return; const pp = pinPair(act === 'join' ? 'gfPin' : 'gfPinC');
      if (act === 'join' && !val('gfCode')) { gfMsg = 'Please type the invite code.'; renderGF(); return; }
      if (pp.err) { gfMsg = pp.err; renderGF(); return; }
      gfBusy = true; gfMsg = ''; renderGF();
      const body = act === 'join' ? { code: val('gfCode'), playerName: val('gfName'), pin: pp.pin, perms: form, progress: snapshot() } : { groupName: val('gfGroup') || `${G.S.name}’s Friends`, hostKey: (document.getElementById('gfKey') || {}).value || '', playerName: val('gfName2'), pin: pp.pin, perms: form, progress: snapshot() };
      const r = await req('POST', act === 'join' ? 'join' : 'groups', body); gfBusy = false;
      if (r.ok) {
        me = r.data.me; group = r.data.group; lastHash = ''; pin = pp.pin; G.sfx('level');
        gfMsg = act === 'join' ? `Request sent! ${me.name} can play with the group once the host says yes.` : `Your group is ready! Share the invite code with other families.`;
        if (me.isHost) await loadHostList(); renderGF(); updButton(); poll(); return;
      }
      gfMsg = msgOf(r); renderGF(); return;
    }
    if (act === 'unlock') {
      const v = val('gfUnlock'); if (!/^\d{4,6}$/.test(v)) { gfMsg = 'The PIN has 4 to 6 numbers.'; renderGF(); return; }
      const r = await req('GET', 'parent', undefined, { pin: v });
      if (r.ok) { pin = v; gfMsg = ''; if (me && me.isHost) await loadHostList(); } else gfMsg = msgOf(r);
      renderGF(); return;
    }
    if (act === 'reload') { gfMsg = ''; await refreshMe(); if (pin && me && me.isHost) await loadHostList(); renderGF(); return; }
    if (act === 'leave' || act.startsWith('rm') && !act.startsWith('rn')) { confirm = act === 'leave' ? 'leave' : act; renderGF(); return; }
    if (act.startsWith('rn')) { renaming = +act.slice(2); renderGF(); const e = document.getElementById('gfRn' + renaming); if (e) e.focus(); return; }
    if (act === 'no') { confirm = ''; renaming = 0; renderGF(); return; }
    if (act === 'leaveYes') {
      const r = await req('DELETE', 'me', undefined, { pin });
      if (r.ok || r.status === 401) { const host = me && me.isHost; me = null; group = null; hostList = null; board = null; chat = []; chatServerId = 0; unread = 0; requests = 0; confirm = ''; pin = ''; gfMsg = host ? 'The group is closed.' : 'This device has left the group.'; if (G.visiting()) { hideVisitBar(); G.goHome(); } updButton(); }
      else gfMsg = msgOf(r);
      renderGF(); return;
    }
    if (act === 'copy') { const c = group && group.code; if (!c) return; try { navigator.clipboard.writeText(c).then(() => { gfMsg = 'Invite code copied.'; renderGF(); }, () => selectCode()); } catch (er) { selectCode(); } return; }
    if (act === 'newCode') { const r = await req('POST', 'host/code', undefined, { pin }); if (r.ok) { me = r.data.me; group = r.data.group; gfMsg = 'New invite code made. The old code no longer works.'; } else gfMsg = msgOf(r); renderGF(); return; }
    if (act === 'rename') { const r = await req('PUT', 'host/group', { name: val('gfRename') }, { pin }); if (r.ok) { group = r.data.group; gfMsg = 'Group name saved.'; } else gfMsg = msgOf(r); renderGF(); return; }
    if (act === 'newPin') { const v = val('gfNewPin'); if (!/^\d{4,6}$/.test(v)) { gfMsg = 'Please choose a grown-up PIN of 4 to 6 numbers.'; renderGF(); return; } const r = await req('PUT', 'me', { newPin: v }, { pin }); if (r.ok) { pin = v; gfMsg = 'The grown-up PIN is changed.'; const e = document.getElementById('gfNewPin'); if (e) e.value = ''; } else gfMsg = msgOf(r); renderGF(); return; }
    if (act === 'history') { gfView = 'history'; hist = null; gfMsg = ''; $('#gfBody').scrollTop = 0; renderHistory(); return; }
    if (act === 'back') { gfView = 'main'; gfMsg = ''; renderGF(); return; }
  }
  function selectCode() { const el = document.getElementById('gfCodeShow'); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); gfMsg = 'Select and copy the code above.'; }

  return { init, touch, parentsSection, inGroup: () => !!(getToken() && me && me.status !== 'pending'), _poll: () => poll(), _state: () => ({ health, me, group, st, unread, requests, board, chat }) };
})();
