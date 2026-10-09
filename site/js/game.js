(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = $('#app');
  const pickOne = a => a[Math.floor(Math.random() * a.length)];

  /* =====================================================================
     constants
     ===================================================================== */
  const MAXL = 50;
  const BIO = World.BIOMES;
  const bioOf = L => Math.min(4, Math.floor((L - 1) / 10));
  const MEDAL = [
    { n: 'Sunflower', c: '#FFC53D', star: true }, { n: 'Sapphire', c: '#3E7BFA' }, { n: 'Emerald', c: '#2FA35A' },
    { n: 'Ruby', c: '#E5484D' }, { n: 'Diamond', c: '#9EE7F5' }, { n: 'Legend', c: '#C064E0', star: true }
  ];
  /* a bonus game after levels 2, 5, 7, 10, 12, 15 … (every 2–3 levels) */
  const isBonus = L => L % 5 === 2 || L % 5 === 0;
  const bonusCountAt = L => { let n = 0; for (let l = 1; l < L; l++) if (isBonus(l)) n++; return n; };
  const BONUS_LEVELS = []; for (let l = 1; l <= MAXL; l++) if (isBonus(l)) BONUS_LEVELS.push(l);
  const nextBonusLevel = L => { for (let l = L; l < L + 5; l++) if (isBonus(l)) return l; return L; };
  const REPLAY = 20;
  const PETS = [
    { e: '🐶', n: 'Puppy', p: 40 }, { e: '🐱', n: 'Kitten', p: 40 }, { e: '🐰', n: 'Bunny', p: 60 }, { e: '🐷', n: 'Piglet', p: 80 },
    { e: '🦆', n: 'Duckling', p: 80 }, { e: '🐴', n: 'Pony', p: 140 }, { e: '🦊', n: 'Fox', p: 180 }, { e: '🐼', n: 'Panda', p: 240 },
    { e: '🦄', n: 'Unicorn', p: 320 }, { e: '🐉', n: 'Little Dragon', p: 500 }
  ];
  const WEAR = {
    shirt: { label: 'Shirt', items: [['Red', '#E5484D', 0], ['Sky', '#3E9BFA', 20], ['Green', '#2FA35A', 20], ['Purple', '#8E4EC6', 30], ['Orange', '#F08A24', 30], ['Pink', '#FF7AB6', 40], ['Gold', '#FFC53D', 60], ['Night', '#2B2340', 60]] },
    pants: { label: 'Overalls', items: [['Blue', '#3E7BFA', 0], ['Brown', '#8A5A35', 20], ['Green', '#3F8F3A', 30], ['Berry', '#C8325A', 30], ['Gray', '#6B7280', 40]] },
    hat: { label: 'Hat', items: [['Straw', '#F2C14E', 0], ['Red', '#D9483B', 25], ['Blue', '#3474C9', 25], ['Purple', '#8E4EC6', 40], ['Pink', '#FF8FC8', 40], ['Mint', '#5CC36B', 60]] },
    skin: { label: 'Skin', free: true, items: [['Light', '#F2C29B', 0], ['Tan', '#D9A066', 0], ['Brown', '#A86B3C', 0], ['Deep', '#6E4528', 0]] }
  };
  const hexN = h => parseInt(h.slice(1), 16);
  const PRAISE = ['Yummy! You got it!', 'Super farmer!', 'Great thinking!', 'Hooray, that is right!', 'Wow, well done!', 'You are a math star!', 'Brilliant!', 'Amazing work!'];
  const TRY = ['Not yet! Try again.', 'Almost! Look one more time.', 'Hmm, not quite. You can do it!'];

  /* =====================================================================
     saved state
     ===================================================================== */
  const KEY = 'adley-math-farm-v2';
  const AUTH_KEY = 'adley-math-farm-auth';
  let authToken = null;
  try { authToken = localStorage.getItem(AUTH_KEY); } catch(e){}
  const setAuth = t => { authToken = t; try { if (t) localStorage.setItem(AUTH_KEY, t); else localStorage.removeItem(AUTH_KEY); } catch(e){} };
  const authHeaders = () => authToken ? { Authorization: 'Bearer ' + authToken } : {};
  async function serverSave(s) {
    if (!authToken) return;
    try {
      const prog = { level: s.level, stars: s.stars, coins: s.coins, trophies: Object.keys(s.trophies || {}).length, medals: (s.medals || []).length, legend: s.legend || 0, bestStreak: s.bestStreak || 0, plots: s.plots, world: (typeof W !== 'undefined' && W && !V) ? W.save() : s.world, wear: s.wear, follow: s.follow };
      await fetch('api/game/progress', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ state: s, progress: prog }), cache: 'no-store', keepalive: true, credentials: 'omit' });
    } catch(e){}
  }
  const newPlots = () => TOPICS.map(() => ({ done: false, stars: 0 }));
  const fresh = () => ({
    v: 2, name: 'Adley', level: 1, coins: 0, stars: 0, plots: newPlots(), owned: [], follow: [],
    wear: { shirt: 0, pants: 0, hat: 0, skin: 0 }, have: ['shirt0', 'pants0', 'hat0'], stats: {},
    settings: { sound: true, music: true, read: true, mode: 'explorer' }, medals: [], legend: 0, rounds: 0,
    world: null, cleared: 0, pendingBonus: -1, plays: {}, best: {}, tut: false,
    seen: {}, streak: 0, bestStreak: 0, golds: 0, firstTry: 0, comebacks: 0, bridges: 0, harvests: 0, perfects: 0, treasureIslands: 0, trophies: {}, qdone: {}, pend: {}, goldDone: {}, fullHarvests: 0
  });
  function merge(o) {
    const f = fresh(); const s = Object.assign(f, o);
    s.settings = Object.assign(fresh().settings, o.settings || {}); s.wear = Object.assign(fresh().wear, o.wear || {});
    if (!Array.isArray(s.plots) || s.plots.length !== TOPICS.length) s.plots = newPlots();
    s.level = Math.max(1, s.level | 0); return s;
  }
  function load() {
    try {
      const r = localStorage.getItem(KEY); if (r) { const o = JSON.parse(r); if (o && o.v === 2) return merge(o); }
      const old = localStorage.getItem('adley-math-farm-v1');
      if (old) { const o = JSON.parse(old) || {}; const f = fresh(); f.name = o.name || f.name; f.coins = o.coins | 0; f.stars = o.stars | 0; f.owned = (o.owned || []).filter(e => PETS.some(p => p.e === e)); f.follow = f.owned.slice(0, 4); f.stats = o.stats || {}; f.settings = Object.assign(f.settings, o.settings || {}); return f; }
    } catch (e) { }
    return fresh();
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} serverSave(S); }
  // ask the browser to keep saved progress (when hosted as a website); silently ignored where unsupported
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }
  const doneCount = () => S.plots.filter(p => p.done).length;
  const wearHex = (w, k) => { const it = WEAR[k].items; const i = Math.max(0, Math.min(it.length - 1, (w && w[k]) | 0)); return it[i][1]; };
  const colorsOfWear = w => ({ shirt: hexN(wearHex(w, 'shirt')), pants: hexN(wearHex(w, 'pants')), hat: hexN(wearHex(w, 'hat')), skin: hexN(wearHex(w, 'skin')) });
  const colorsOf = () => colorsOfWear(S.wear);
  const hasFriends = () => typeof Friends !== 'undefined';
  const ftouch = important => { try { if (hasFriends()) Friends.touch(important); } catch (e) { } };

  /* =====================================================================
     sound: effects + gentle generated music
     ===================================================================== */
  const audio = (() => {
    let ac = null, sfxBus = null, musBus = null, noiseBuf = null, musTimer = 0, nextT = 0, step = 0, ducked = false, mel = 2;
    function ctx() {
      if (!ac) {
        try {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(ac.destination);
          musBus = ac.createGain(); musBus.gain.value = 0; musBus.connect(ac.destination);
          const n = ac.sampleRate; noiseBuf = ac.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { ac = null; }
      }
      if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { } }
      return ac;
    }
    function tone(f, t0, dur, type, vol, f2, bus, at) {
      const a = ctx(); if (!a) return;
      try {
        const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; const t = (at || a.currentTime) + t0;
        o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
      } catch (e) { }
    }
    function noise(t0, dur, vol, fq, q, type, fq2, bus, at) {
      const a = ctx(); if (!a) return;
      try {
        const s = a.createBufferSource(); s.buffer = noiseBuf; const fl = a.createBiquadFilter(); fl.type = type || 'bandpass'; const t = (at || a.currentTime) + t0;
        fl.frequency.setValueAtTime(fq || 1000, t); if (fq2) fl.frequency.exponentialRampToValueAtTime(fq2, t + dur); fl.Q.value = q || 1;
        const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(fl); fl.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
      } catch (e) { }
    }
    const arp = (fs, gap, dur, type, vol) => fs.forEach((f, i) => tone(f, i * gap, dur, type, vol));
    const FX = {
      tap: () => tone(680, 0, 0.06, 'triangle', 0.11),
      step: () => noise(0, 0.07, 0.06, 700, 1.2),
      correct: () => arp([523, 659, 784, 1047], 0.09, 0.28, 'triangle', 0.17),
      wrong: () => { tone(330, 0, 0.18, 'sine', 0.14); tone(262, 0.15, 0.26, 'sine', 0.12); },
      coin: () => { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.07, 0.2, 'square', 0.05); },
      level: () => arp([523, 659, 784, 659, 784, 1047, 1319], 0.12, 0.32, 'triangle', 0.17),
      chest: () => { noise(0, 0.12, 0.12, 300, 1, 'lowpass'); arp([784, 988, 1175, 1568, 1976], 0.07, 0.25, 'triangle', 0.12); },
      discover: () => arp([1047, 1319, 1568, 2093], 0.06, 0.22, 'sine', 0.08),
      bridge: () => { [0, 0.22, 0.44].forEach(t => { noise(t, 0.09, 0.25, 500, 2); tone(160, t, 0.1, 'sine', 0.18, 90); }); arp([523, 784, 1047, 1319], 0.1, 0.35, 'triangle', 0.13); },
      whoosh: () => noise(0, 0.7, 0.12, 300, 0.8, 'bandpass', 2400),
      thunk: () => { tone(150, 0, 0.14, 'sine', 0.22, 60); noise(0, 0.06, 0.1, 400, 1, 'lowpass'); },
      cheer: () => { noise(0, 0.9, 0.08, 1800, 0.6); arp([784, 988, 1175, 1568], 0.08, 0.3, 'triangle', 0.12); },
      kick: () => { noise(0, 0.08, 0.3, 250, 1, 'lowpass'); tone(130, 0, 0.16, 'sine', 0.3, 50); },
      pew: () => tone(900, 0, 0.14, 'square', 0.05, 280),
      boom: () => { noise(0, 0.6, 0.4, 500, 0.7, 'lowpass', 80); tone(90, 0, 0.5, 'sine', 0.3, 30); },
      pop: () => tone(480, 0, 0.09, 'sine', 0.22, 950),
      hit: () => tone(220, 0, 0.22, 'sawtooth', 0.1, 80),
      whack: () => { noise(0, 0.07, 0.3, 1600, 1.5); tone(320, 0, 0.1, 'triangle', 0.15, 150); },
      boing: () => { tone(260, 0, 0.3, 'sine', 0.16, 620); },
      swish: () => noise(0, 0.28, 0.12, 4000, 1, 'bandpass', 1200),
      rim: () => { tone(1200, 0, 0.25, 'triangle', 0.1); tone(900, 0.06, 0.25, 'triangle', 0.08); },
      jump: () => tone(300, 0, 0.18, 'square', 0.05, 720),
      tick: () => tone(1000, 0, 0.05, 'square', 0.05),
      go: () => tone(1320, 0, 0.35, 'square', 0.07)
    };
    function sfx(n) { if (!S.settings.sound) return; const f = FX[n]; if (f) f(); }
    /* ---- music: I–V–vi–IV with a wandering pentatonic tune ---- */
    const KEYS = [261.63, 293.66, 349.23, 246.94, 220.0];
    function musicStep(t, i) {
      const L = S.level, b = bioOf(L), night = b === 4; const root = KEYS[b] / (night ? 1 : 1);
      const prog = night ? [0, -4, -2, -5] : [0, 7, 9, 5]; const bar = Math.floor(i / 8) % 4, beat = i % 8;
      const semi = s => root * Math.pow(2, s / 12);
      const chord = prog[bar];
      if (beat === 0 || beat === 4) tone(semi(chord - 12), 0, 0.5, 'sine', 0.16, 0, musBus, t);
      if (beat === 2 || beat === 6) tone(semi(chord + (night ? 3 : 4)), 0, 0.22, 'triangle', 0.05, 0, musBus, t), tone(semi(chord + 7), 0, 0.22, 'triangle', 0.04, 0, musBus, t);
      if (beat % 2 === 1) noise(0, 0.04, 0.025, 7000, 1, 'highpass', 0, musBus, t);
      const PENT = night ? [0, 3, 5, 7, 10, 12, 15] : [0, 2, 4, 7, 9, 12, 14];
      if (Math.random() < (beat % 2 ? 0.35 : 0.7)) { mel = Math.max(0, Math.min(PENT.length - 1, mel + Math.floor(Math.random() * 3) - 1)); tone(semi(PENT[mel] + 12), 0, beat % 4 === 0 ? 0.42 : 0.24, 'triangle', 0.07, 0, musBus, t); }
    }
    function sched() { if (!ac) return; const spb = 60 / (bioOf(S.level) === 4 ? 84 : 100) / 2; while (nextT < ac.currentTime + 0.35) { musicStep(nextT, step); nextT += spb; step++; } }
    function musVol() { return !musTimer ? 0 : ducked ? 0.22 : 0.6; }
    function musicStart() { const a = ctx(); if (!a || musTimer) return; nextT = a.currentTime + 0.12; step = 0; musTimer = setInterval(sched, 110); try { musBus.gain.setTargetAtTime(musVol(), a.currentTime, 0.6); } catch (e) { } }
    function musicStop() { if (musTimer) clearInterval(musTimer); musTimer = 0; if (ac) try { musBus.gain.setTargetAtTime(0, ac.currentTime, 0.15); } catch (e) { } }
    function duck(v) { ducked = v; if (ac && musTimer) try { musBus.gain.setTargetAtTime(musVol(), ac.currentTime, 0.3); } catch (e) { } }
    function unlock() { ctx(); try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { } }
    return { sfx, unlock, musicStart, musicStop, duck, playing: () => !!musTimer };
  })();
  const sfx = n => audio.sfx(n);
  function syncMusic() { if (S.settings.music && $('#title').hidden && !document.hidden) audio.musicStart(); else audio.musicStop(); }

  /* =====================================================================
     read aloud
     ===================================================================== */
  const tts = (() => {
    let voice = null, lastT = 0;
    function pickVoice() {
      try {
        const vs = speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
        const pref = ['Samantha', 'Karen', 'Google US English', 'Microsoft Aria', 'Daniel', 'Moira'];
        voice = pref.map(n => vs.find(v => v.name.indexOf(n) >= 0)).find(Boolean) || vs.find(v => /en.US/i.test(v.lang)) || vs[0] || null;
      } catch (e) { voice = null; }
    }
    if ('speechSynthesis' in window) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { } }
    const SAYW = { '🔊': 'speaker', '🔇': 'speaker', '🎵': 'music', '🛒': 'shop', '🎮': 'games', '👪': 'grown-ups', '❓': 'question mark', '⌫': 'back arrow', '✔': 'tick', '🐾': 'paw prints', '👑': 'crown', '🔥': 'fire', '🎯': 'target', '🔁': '', '🌱': '', '🧺': '', '✕': 'cross', '⭐': 'star' };
    function clean(t) {
      return String(t).replace(/🔊|🔇|🎵|🛒|🎮|👪|❓|⌫|✔|🐾|👑|🔥|🎯|🔁|🌱|🧺|✕|⭐/gu, m => ' ' + SAYW[m] + ' ').replace(/<[^>]+>/g, ' ').replace(/\$(\d+)/g, (m, n) => n + (n === '1' ? ' dollar' : ' dollars')).replace(/(\d+) g\b/g, '$1 grams').replace(/(\d+) cm\b/g, '$1 centimeters')
        .replace(/−/g, ' minus ').replace(/\+/g, ' plus ').replace(/ = /g, ' equals ').replace(/[“”]/g, '').replace(/×/g, ' times ').replace(/÷/g, ' divided by ')
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{3030}]/gu, ' ').replace(/\s+/g, ' ').trim();
    }
    function say(t, onend) {
      if (!('speechSynthesis' in window)) { if (onend) onend(); return; }
      try {
        speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(clean(t)); u.lang = 'en-US'; if (voice) u.voice = voice; u.rate = 0.9; u.pitch = 1.08;
        audio.duck(true); const fin = () => { if (!$('#qwrap') || $('#qwrap').hidden) audio.duck(false); if (onend) onend(); };
        u.onend = fin; u.onerror = fin; speechSynthesis.speak(u); lastT = performance.now();
      } catch (e) { if (onend) onend(); }
    }
    function stop() { try { speechSynthesis.cancel(); } catch (e) { } }
    return { say, stop, ok: 'speechSynthesis' in window, since: () => performance.now() - lastT };
  })();
  const speak = t => { if (S.settings.read) tts.say(t); };

  /* =====================================================================
     confetti + floating labels
     ===================================================================== */
  const fx = (() => {
    const cv = $('#fx'); const cx = cv.getContext('2d'); let parts = [], raf = 0; const COLS = ['#FFC53D', '#E5484D', '#3E7BFA', '#2FA35A', '#8E4EC6', '#F08A24', '#ffffff'];
    function size() { const r = cv.getBoundingClientRect(); const dp = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dp); cv.height = Math.round(r.height * dp); cx.setTransform(dp, 0, 0, dp, 0, 0); }
    function burst(x, y, n, sp) {
      if (reduced) return; sp = sp || 9; const a = app.getBoundingClientRect(); x -= a.left; y -= a.top;
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * sp * 1.6, vy: -Math.random() * sp - 3, s: 7 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, c: COLS[i % COLS.length], life: 80 + Math.random() * 50 });
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick() {
      const r = cv.getBoundingClientRect(); cx.clearRect(0, 0, r.width, r.height);
      parts = parts.filter(p => p.life-- > 0 && p.y < r.height + 40);
      for (const p of parts) { p.vy += 0.34; p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.r += p.vr; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.62); cx.restore(); }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }
    function at(el, n, sp) { const b = el ? el.getBoundingClientRect() : app.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, n, sp); }
    function center(n, sp) { const a = app.getBoundingClientRect(); burst(a.left + a.width / 2, a.top + a.height / 3, n, sp); }
    function clear() { parts = []; const r = cv.getBoundingClientRect(); cx.clearRect(0, 0, r.width, r.height); }
    return { size, burst, at, center, clear };
  })();
  function floater(txt, x, y, cls) {
    const a = app.getBoundingClientRect(); const f = document.createElement('div'); f.className = 'floater' + (cls ? ' ' + cls : '');
    f.style.left = Math.max(60, Math.min(a.width - 60, x - a.left)) + 'px'; f.style.top = Math.max(70, Math.min(a.height - 40, y - a.top)) + 'px'; f.textContent = txt; app.appendChild(f); setTimeout(() => f.remove(), 1700);
  }

  /* =====================================================================
     HUD, medals, helper chick
     ===================================================================== */
  function starPts(cx, cy, R, r) { let p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r : R; p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1)); } return p.join(' '); }
  function gem(i, cls) {
    const M = MEDAL[Math.max(0, Math.min(5, i))]; const c = M.c;
    if (M.star) return `<svg class="gem ${cls || ''}" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${starPts(50, 54, 46, 21)}" fill="${c}" stroke="#2B2340" stroke-width="6" stroke-linejoin="round"/><circle cx="40" cy="42" r="6" fill="#fff" opacity=".7"/></svg>`;
    return `<svg class="gem ${cls || ''}" viewBox="0 0 100 100" aria-hidden="true"><polygon points="16,38 32,14 68,14 84,38 50,90" fill="${c}" stroke="#2B2340" stroke-width="6" stroke-linejoin="round"/><polygon points="32,14 42,38 58,38 68,14" fill="#fff" opacity=".42"/><polyline points="16,38 84,38" fill="none" stroke="#2B2340" stroke-width="4"/><polyline points="42,38 50,90 58,38" fill="none" stroke="#2B2340" stroke-width="3" opacity=".45"/></svg>`;
  }
  const lvlLabel = L => L <= MAXL ? `Level ${L} of ${MAXL}` : `Legend level ${L - MAXL}`;
  function renderHUD(bump) {
    const L = S.level, n = doneCount(), b = bioOf(L);
    $('#landGem').innerHTML = gem(L > MAXL ? 5 : b); $('#landName').textContent = BIO[b].name; $('#landSub').textContent = lvlLabel(L);
    $('#progBar').style.width = (n / 18 * 100) + '%'; $('#progTxt').textContent = `${n}/18`;
    $('#coinTxt').textContent = S.coins; $('#starTxt').textContent = S.stars;
    $('#sndBtn').textContent = S.settings.sound ? '🔊' : '🔇'; $('#sndBtn').classList.toggle('off', !S.settings.sound);
    $('#musBtn').classList.toggle('off', !S.settings.music); $('#musBtn').setAttribute('aria-pressed', S.settings.music ? 'true' : 'false');
    $('#bonusDot').hidden = !(S.pendingBonus >= 0);
    $('#streakChip').hidden = !(S.streak >= 2); $('#streakTxt').textContent = S.streak;
    if (bump) ['#coinTxt', '#starTxt', '#progTxt'].forEach(s => { const e = $(s); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); });
  }
  let buddyT = 0;
  function buddy(msg, talk) {
    $('#bsay').textContent = msg; const b = $('#buddy'); b.classList.remove('min'); clearTimeout(buddyT);
    buddyT = setTimeout(() => b.classList.add('min'), 8000); if (talk) speak(msg);
  }
  function buddyAuto() {
    if (V) { buddy(`You are visiting ${V.name}’s island. Tap 🏠 Home to go back to your own island.`); return; }
    if (!W) { const m = doneCount(); buddy(m === 18 ? 'Every farm is harvested! Great job!' : `Tap the map button to choose a farm. ${18 - m} ${18 - m === 1 ? 'farm' : 'farms'} left.`); return; }
    const n = doneCount(); const info = W ? W.info() : null; const found = info ? info.discovered : 0;
    if (n === 18) buddy('Every farm is harvested! Great job!');
    else if (n === 0 && found < 3) buddy(`Hi ${S.name}! Tap the ground to walk. Find the hidden farms!`);
    else { const nb = info ? info.bridges.filter(b => !b.open).map(b => b.need).sort((a, b) => a - b)[0] : 0; buddy(`${18 - n} ${18 - n === 1 ? 'farm' : 'farms'} left.` + (nb ? ` Harvest ${nb - n} more to fix the next bridge!` : ' Keep exploring!')); }
  }

  /* =====================================================================
     the 3D world
     ===================================================================== */
  let W = null, quietUntil = 0, nearSi = -1, promptSi = -1, dirty = false, V = null;
  const hooks = {
    onNear: si => { nearSi = si; if (si < 0) hidePrompt(); else if (!busy()) showPrompt(si); },
    onArrive: si => { if (busy()) return; const info = W.stationInfo(si); if (V || S.plots[info.topic].done) showPrompt(si); else openQ(info.topic, false); },
    onTapStation: si => { sfx('tap'); const info = W.stationInfo(si); const t = TOPICS[info.topic]; buddy(V ? `Let’s look at ${V.name}’s ${t.farm}!` : info.found || info.done ? `Let’s go to the ${t.farm}!` : 'A mystery farm! Let’s go and see what it is.'); },
    onTapGround: () => sfx('step'),
    onBlocked: (kind, b) => {
      sfx('thunk');
      if (kind === 'bridge' && b) buddy(V ? `That place is across the water. ${V.name} has not fixed that bridge yet.` : `That place is across the water, and the bridge is broken. Harvest ${b.need} farms to fix it. You have ${doneCount()}.`, true);
      else buddy('Hmm, I can’t find a way there. Try a different spot!', true);
    },
    onCoin: () => { if (V) return; S.coins += 2; sfx('coin'); renderHUD(); const p = W.playerScreen(); floater('+2', p.x, p.y - 30, 'sm'); dirty = true; },
    onChest: () => { if (V) return; S.coins += 15; sfx('chest'); const p = W.playerScreen(); fx.burst(p.x, p.y, 40, 9); floater('+15 coins', p.x, p.y - 40); buddy('A treasure chest! You found 15 coins!', true); renderHUD(true); dirty = true; if (W.info().chestsLeft === 0) { S.treasureIslands++; save(); } checkQuests(); checkTrophies(); },
    onDiscover: si => {
      if (V) { if (performance.now() >= quietUntil) { sfx('discover'); buddy(`You found ${V.name}’s ${TOPICS[W.stationInfo(si).topic].farm}!`); } return; }
      dirty = true; if (performance.now() < quietUntil) return; sfx('discover');
      const t = TOPICS[W.stationInfo(si).topic]; buddy(`You found the ${t.farm}! Its puzzles are about ${t.topic.toLowerCase()}.`, tts.since() > 2500);
    },
    onBridgeNear: b => buddy(V ? `${V.name} has not fixed this bridge yet. It needs ${b.need} harvested farms.` : `This bridge is broken. Harvest ${b.need} farms to fix it. You have ${doneCount()} now.`, true),
    onBridgeOpen: () => { if (V) return; sfx('bridge'); S.bridges++; save(); setTimeout(() => buddy('You fixed a bridge! A new part of the island is waiting. Let’s explore!', true), 600); checkTrophies(); },
    onWalk: () => { }
  };
  function makeWorld() {
    try {
      if (typeof THREE === 'undefined') throw new Error('3D library did not load');
      W = World.create($('#stage'), hooks); W.setMinimap($('#mini'), $('#bigmap'));
    } catch (e) {
      W = null; const er = $('#tErr'); er.hidden = false; $('#ctrl .cgrid').hidden = true; $('#zMe').hidden = true;
      er.textContent = 'This browser cannot show the 3D islands, so the farms open from a list instead. Try Safari or Chrome for the full adventure.';
    }
  }
  function buildLevel() {
    hidePrompt(); nearSi = -1; renderHUD();
    if (!W) return;
    quietUntil = performance.now() + 1800;
    W.setPlayer(S.name, colorsOf());
    W.build(S.level, TOPICS, S.plots, S.world && S.world.level === S.level ? S.world : null, { gold: goldTopic(S.level) });
    W.harvested(doneCount(), true); W.setPets(S.follow);
    S.world = W.save(); save();
  }
  const busy = () => $$('.ov').some(o => !o.hidden) || !$('#arcade').hidden || !$('#tour').hidden;
  function syncPause() {
    const b = busy(); if (W) { W.pause(b); W.sleep(!$('#arcade').hidden || !$('#sail').hidden || !$('#title').hidden); }
    if (!b && nearSi >= 0 && $('#prompt').hidden) showPrompt(nearSi);
    if (b && !$('#prompt').hidden) $('#prompt').hidden = true;
    if (!b) setTimeout(flushToasts, 500);
  }
  new MutationObserver(syncPause).observe(app, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  /* ---------- farm prompt ---------- */
  function starsHTML(n) { return '★'.repeat(n) + `<span class="lost">${'★'.repeat(3 - n)}</span>`; }
  function showPrompt(si) {
    if (!W) return; const info = W.stationInfo(si); const t = TOPICS[info.topic], p = S.plots[info.topic]; promptSi = si;
    $('#prompt').style.setProperty('--tc', t.color); $('#pIco').textContent = t.icon; $('#pName').textContent = t.farm; $('#pSub').textContent = t.topic;
    if (info.gold) { $('#pSub').textContent = p.done ? '👑 Golden Challenge beaten!' : '👑 Golden Challenge · ' + (S.level <= 45 ? 'harder puzzle, ' : '') + 'double coins'; $('#prompt').style.setProperty('--tc', '#E0A800'); }
    $('#prompt').classList.toggle('gold', !!info.gold);
    if (V) { const fp = (V.plots && V.plots[info.topic]) || { done: false, stars: 0 }; $('#pSub').textContent = fp.done ? `${V.name} harvested this farm!` : `${V.name} has not harvested this farm yet.`; $('#pStars').innerHTML = fp.done ? starsHTML(fp.stars) : ''; $('#pGo').hidden = true; $('#prompt').hidden = false; app.classList.add('prompting'); return; }
    $('#pGo').hidden = false;
    $('#pStars').innerHTML = p.done ? starsHTML(p.stars) : ''; $('#pGo').textContent = p.done ? 'Practice 🔁' : 'Play ▶';
    $('#prompt').hidden = false; app.classList.add('prompting');
  }
  function hidePrompt() { $('#prompt').hidden = true; app.classList.remove('prompting'); promptSi = -1; }
  $('#pGo').onclick = () => { if (promptSi < 0 || V) return; const tp = W.stationInfo(promptSi).topic; sfx('tap'); openQ(tp, S.plots[tp].done); };

  /* ---------- camera buttons ---------- */
  $('#zIn').onclick = () => { sfx('tap'); W && W.zoom(0.78); };
  $('#zOut').onclick = () => { sfx('tap'); W && W.zoom(1.28); };
  $('#rotL').onclick = () => { sfx('tap'); W && W.rotate(-0.7); };
  $('#rotR').onclick = () => { sfx('tap'); W && W.rotate(0.7); };
  $('#zMe').onclick = () => { sfx('tap'); W && W.recenter(); };
  $('#wayBtn').onclick = () => {
    sfx('tap'); if (!W) { openMap(); return; }
    W.recenter(); const r = W.showWay();
    if (r && r.si != null) { const info = W.stationInfo(r.si); buddy(`Follow the paw prints to ${info.found ? 'the ' + TOPICS[info.topic].farm : 'a mystery farm'}!`, true); }
    else if (r && r.blocked) buddy(`Harvest ${r.blocked} farms to fix the bridge first.`, true);
    else buddy('Every farm you can reach is harvested!', true);
  };

  /* ---------- big map ---------- */
  function openMap() {
    sfx('tap'); const box = $('#mapov'); box.hidden = false;
    if (!W) { renderFarmList(); return; }
    if (V) { const n = (V.plots || []).filter(p => p.done).length; $('#mapQuests').innerHTML = `<h3>${esc(V.name)}’s island</h3><p class="pnote">Level ${V.level} · ${n} of 18 farms harvested. You are visiting, so coins and chests here stay ${esc(V.name)}’s.</p>`; }
    else $('#mapQuests').innerHTML = '<h3>Island quests</h3>' + questsHTML();
    W.drawMaps(); const info = W.info(); $('#mapStat').innerHTML = `<b>${info.discovered}</b> of 18 farms found · <b>${doneCount()}</b> harvested<br><b>${info.chestsLeft}</b> treasure ${info.chestsLeft === 1 ? 'chest' : 'chests'} and <b>${info.coinsLeft}</b> coins still hidden`;
  }
  $('#miniBtn').onclick = openMap;
  $('#mapX').onclick = () => { $('#mapov').hidden = true; };
  $('#bigmap').addEventListener('click', e => {
    if (!W) return; const r = e.currentTarget.getBoundingClientRect(); const res = W.minimapTap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    if (res === 'ok') { sfx('step'); $('#mapov').hidden = true; } else if (res === 'fog') { sfx('thunk'); buddy('That part is still a mystery. Walk closer to explore it!', true); $('#mapov').hidden = true; }
    else $('#mapov').hidden = true;
  });
  function renderFarmList() {
    const mb = $('#mapov .mapbody'); let fl = mb.querySelector('.flist');
    if (!fl) { mb.innerHTML = '<div class="flist"></div>'; fl = mb.querySelector('.flist'); fl.onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; $('#mapov').hidden = true; const i = +b.dataset.f; openQ(i, S.plots[i].done); }; }
    const gt = goldTopic(S.level);
    fl.innerHTML = TOPICS.map((t, i) => `<button class="fl-i${S.plots[i].done ? ' done' : ''}" data-f="${i}" style="--tc:${t.color}"><span class="em">${t.icon}</span><b>${i === gt ? '👑 ' : ''}${esc(t.farm)}</b><small>${esc(t.topic)}</small>${S.plots[i].done ? `<i>${'★'.repeat(S.plots[i].stars)}</i>` : ''}</button>`).join('');
  }

  /* =====================================================================
     question card
     ===================================================================== */
  let Q = null;
  const tier = () => Math.max(1, Math.min(10, Math.ceil(S.level / 5)));
  const padRate = () => [0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.5, 0.5][tier() - 1];
  const potStars = () => Q.round > 0 ? 1 : Q.tries >= 1 ? 2 : 3;
  function updStars() { if (Q.practice) { $('#qstars').innerHTML = ''; return; } const n = Q.solved ? Q.stars : potStars(); $('#qstars').innerHTML = starsHTML(n); }
  function openQ(i, practice) {
    if (V) return;
    const t = TOPICS[i]; hidePrompt();
    Q = { i, practice: !!practice, round: 0, tries: 0, solved: false, gold: !practice && i === goldTopic(S.level) };
    $('#qwrap .qcard').style.setProperty('--tc', Q.gold ? '#C98F00' : t.color); $('#qwrap .qcard').classList.toggle('gold', Q.gold);
    $('#qico').textContent = t.icon; $('#qfarm').textContent = t.farm; $('#qtopic').textContent = Q.gold ? `👑 Golden Challenge · ${t.topic}` : `${t.topic} · ${S.level <= MAXL ? 'Level ' + S.level : 'Legend ' + (S.level - MAXL)}`;
    $('#qwrap').hidden = false; audio.duck(true);
    const pk = S.level + ':' + i, pend = !Q.practice && S.pend ? S.pend[pk] : null;
    if (pend) { Q.round = pend.r || 0; Q.keep = pend.v; }
    newQuestion();
    if (pend && pend.v != null && pend.t) { Q.tries = pend.t; Q.recorded = true; $('#qhint').hidden = true; fb('warn', 'Welcome back! Have another go.', '🐥 Hint: ' + Q.q.hint); updStars(); }
    savePend();
    setTimeout(() => { try { $('#qsay').focus({ preventScroll: true }); } catch (e) { } }, 60);
  }
  /* each farm has 3 prepared variants per level; pick one Adley has not seen (the history survives a restart) */
  function savePend() {
    if (!Q || Q.practice) return; S.pend = S.pend || {}; const pk = S.level + ':' + Q.i;
    if (Q.solved) delete S.pend[pk]; else S.pend[pk] = Q.revealed ? { v: null, t: 0, r: Q.round + 1 } : { v: Q.v, t: Q.tries, r: Q.round };
    save();
  }
  function bankKey(ti, gold) { return S.level > MAXL ? 'legend:' + ti : (gold ? 'g' : '') + S.level + ':' + ti; }
  function bankFor(ti, gold) { try { return S.level > MAXL ? bankSet(S.level, ti) : bankSet(S.level, ti, gold); } catch (e) { return []; } }
  function parseSeen(v) { v = String(v || ''); return (v.indexOf(',') >= 0 ? v.split(',') : v.split('')).filter(x => x !== '').map(Number); }
  function pickVariant(ti, gold, avoid) {
    const set = bankFor(ti, gold); if (!set.length) return null;
    const key = bankKey(ti, gold); const seen = parseSeen(S.seen[key]).filter(v => v < set.length);
    let cand = set.map((q, v) => v).filter(v => !seen.includes(v) && v !== avoid);
    if (!cand.length) { const old = seen.filter(v => v !== avoid); cand = old.length ? [old[0]] : set.map((q, v) => v).filter(v => v !== avoid); }
    if (!cand.length) cand = [0];
    const v = cand[Math.floor(Math.random() * cand.length)];
    S.seen[key] = seen.filter(x => x !== v).concat(v).join(',') + ',';
    return { q: set[v], v };
  }
  function newQuestion() {
    const t = TOPICS[Q.i]; let q = null;
    if (!Q.practice) {
      if (Q.keep != null) { const set = bankFor(Q.i, Q.gold); if (set[Q.keep]) { q = set[Q.keep]; Q.v = Q.keep; } Q.keep = null; }
      if (!q) { const pv = pickVariant(Q.i, Q.gold, Q.v); if (pv) { q = pv.q; Q.v = pv.v; } }
    } else {
      try {
        let ps = [];
        if (S.level <= MAXL) for (let l = Math.max(1, S.level - 4); l <= S.level; l++) { const set = bankSet(l, Q.i); parseSeen(S.seen[l + ':' + Q.i]).forEach(v => { if (set[v]) ps.push(set[v]); }); }
        ps = ps.filter(x => x !== Q.q); if (!ps.length) ps = practiceSet(S.level, Q.i).filter(x => x !== Q.q);
        if (ps.length) q = ps[Math.floor(Math.random() * ps.length)];
      } catch (e) { q = null; }
    }
    for (let k = 0; k < 8 && !q; k++) { try { q = t.gen(S.level); if (!q || !q.text) q = null; } catch (e) { q = null; } }
    Q.q = q; Q.tries = 0; Q.solved = false; Q.recorded = false; Q.revealed = false; Q.pad = ''; Q.purse = [];
    Q.mode = q.type === 'coins' ? 'coins' : (q.num && Math.random() < padRate()) ? 'pad' : 'choice';
    $('#qtext').innerHTML = (Q.practice ? '<span class="practice-tag">Practice</span>' : '') + esc(q.text);
    $('#qvis').innerHTML = q.vis || '';
    setupTap(!!q.tap); renderAnswer();
    $('#qfb').hidden = true; $('#qnext').hidden = true; $('#qback').hidden = true; $('#qhint').hidden = false;
    updStars(); $('#qbody').scrollTop = 0;
    if (S.settings.read) setTimeout(() => { if (Q && Q.q === q) readQ(false); }, 350);
  }
  function readQ(withOpts) {
    const q = Q.q; let t = q.say || q.text;
    if (withOpts && Q.mode === 'choice') t += ' ' + q.opts.map((o, k) => `${'ABCD'[k]}: ${o.say}.`).join(' ');
    const b = $('#qsay'); b.classList.add('on'); tts.say(t, () => b.classList.remove('on')); setTimeout(() => b.classList.remove('on'), 14000);
  }
  function setupTap(on) {
    const box = $('#qtap'); box.hidden = !on; $('#qtapn').textContent = '0'; if (!on) return;
    $('#qvis').querySelectorAll('.tp').forEach(el => { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); });
  }
  $('#qvis').addEventListener('click', e => {
    const el = e.target.closest('.tp'); if (!el || $('#qtap').hidden) return;
    el.classList.toggle('on'); sfx('tap'); $('#qtapn').textContent = $('#qvis').querySelectorAll('.tp.on').length;
  });
  $('#qtapr').onclick = () => { $('#qvis').querySelectorAll('.tp.on').forEach(el => el.classList.remove('on')); $('#qtapn').textContent = '0'; };
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  const keyHTML = attr => KEYS.map(k => `<button class="key${k === 'ok' ? ' ok' : k === 'del' ? ' del' : ''}" ${attr}="${k}" aria-label="${k === 'del' ? 'Delete' : k === 'ok' ? 'Check my answer' : k}">${k === 'del' ? '⌫' : k === 'ok' ? '✔' : k}</button>`).join('');
  function renderAnswer() {
    const q = Q.q; const box = $('#qans');
    if (Q.mode === 'choice') {
      const long = q.opts.some(o => /otxt/.test(o.html) && String(o.say).length > 9);
      box.innerHTML = `<div class="opts ${q.opts.length === 4 ? 'c4' : 'c3'}${long ? ' long' : ''}" role="group" aria-label="Answers">` + q.opts.map((o, k) => `<button class="opt" data-k="${k}" aria-label="${'ABCD'[k]}: ${esc(o.say)}"><span class="ol" aria-hidden="true">${'ABCD'[k]}</span>${o.html}</button>`).join('') + '</div>';
    } else if (Q.mode === 'pad') {
      box.innerHTML = `<div class="padw"><div class="pdisp" id="pdisp" aria-live="polite"></div><div class="pad">${keyHTML('data-key')}</div></div>`; showPad();
    } else {
      box.innerHTML = `<div class="coinw"><div class="purse" id="purse"></div><div class="bank">${q.coins.map(v => `<button class="cb" data-add="${v}" aria-label="Add ${v} dollar${v > 1 ? 's' : ''}">${coin(v)}</button>`).join('')}</div><button class="btn go" id="payBtn">Pay ✔</button></div>`; showPurse();
    }
  }
  function showPad() { const q = Q.q; const d = $('#pdisp'); if (!d) return; d.innerHTML = Q.pad ? `${esc(q.pre || '')}${Q.pad}${esc(q.post || '')}` : `<span class="ph">${esc(q.pre || '')}?${esc(q.post || '')}</span>`; }
  function showPurse() {
    const s = Q.purse.reduce((a, b) => a + b, 0);
    $('#purse').innerHTML = `<div class="pl"><span>Your money (tap one to take it back)</span><b>$${s}</b></div>` + Q.purse.map((v, k) => `<button class="cb" data-rm="${k}" aria-label="Remove ${v} dollars">${coin(v)}</button>`).join('');
  }
  $('#qans').addEventListener('click', e => {
    if (!Q || Q.solved || Q.revealed) return;
    const o = e.target.closest('.opt'); if (o) { const k = +o.dataset.k; submit(Q.q.opts[k].val === Q.q.ans, o); return; }
    const key = e.target.closest('.key');
    if (key) {
      const v = key.dataset.key; sfx('tap');
      if (v === 'del') Q.pad = Q.pad.slice(0, -1);
      else if (v === 'ok') { if (!Q.pad) { const d = $('#pdisp'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); return; } submit(Q.pad === Q.q.ans, $('#pdisp')); return; }
      else if (Q.pad.length < 3) Q.pad = (Q.pad === '0' ? '' : Q.pad) + v;
      showPad(); return;
    }
    const add = e.target.closest('[data-add]'); if (add) { if (Q.purse.length < 16) { Q.purse.push(+add.dataset.add); sfx('coin'); showPurse(); } return; }
    const rm = e.target.closest('[data-rm]'); if (rm) { Q.purse.splice(+rm.dataset.rm, 1); sfx('tap'); showPurse(); return; }
    if (e.target.closest('#payBtn')) { const s = Q.purse.reduce((a, b) => a + b, 0); if (!s) return; submit(s === Q.q.target, $('#purse')); }
  });
  function fb(kind, head, body) { const f = $('#qfb'); f.className = 'fb ' + kind; f.innerHTML = `<b class="h">${esc(head)}</b>${body ? `<span>${esc(body)}</span>` : ''}`; f.hidden = false; setTimeout(() => f.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }), 60); }
  function record(ok) { const k = String(Q.i); const st = S.stats[k] || (S.stats[k] = { a: 0, f: 0 }); st.a++; if (ok) st.f++; }
  function submit(ok, el) { if (!Q.recorded) { record(ok); Q.recorded = true; } if (ok) success(el); else fail(el); }
  function success(el) {
    const q = Q.q; Q.solved = true; const stars = Q.practice ? 0 : potStars(); Q.stars = stars;
    if (el) el.classList.add('right'); const opts = document.querySelector('.opts'); if (opts) opts.classList.add('locked');
    sfx('correct'); fx.at(el, 46, 9);
    const coins = Q.practice ? 5 : stars * (Q.gold ? 20 : 10); let bonus = 0;
    if (!Q.practice) {
      S.plots[Q.i] = { done: true, stars }; S.stars += stars;
      if (Q.tries === 0 && Q.round === 0) { S.streak++; S.firstTry++; S.bestStreak = Math.max(S.bestStreak, S.streak); bonus = streakBonus(S.streak); } else S.comebacks++;
      if (Q.gold && !S.goldDone[S.level]) { S.goldDone[S.level] = 1; S.golds++; }
      S.harvests++; if (doneCount() === 18) S.fullHarvests++; delete S.pend[S.level + ':' + Q.i];
    }
    Q.coins = coins + bonus; S.coins += coins + bonus; save(); renderHUD();
    const praise = Q.gold ? 'Golden Challenge beaten! 👑' : pickOne(PRAISE);
    const streakMsg = bonus ? `🔥 ${S.streak} in a row! +${bonus} bonus coins. ` : '';
    fb('good', `${praise} +${coins} coins${stars ? ' · ' + '★'.repeat(stars) : ''}`, streakMsg + 'How we know: ' + q.explain);
    speak((Q.gold ? 'Golden Challenge beaten!' : praise) + ' ' + (bonus ? `${S.streak} in a row! ` : '') + q.explain);
    $('#qhint').hidden = true; $('#qnext').textContent = Q.practice ? 'Another one 🔁' : 'Harvest 🧺'; $('#qnext').hidden = false; $('#qback').hidden = !Q.practice;
    updStars(); try { $('#qnext').focus({ preventScroll: true }); } catch (e) { }
  }
  function fail(el) {
    const q = Q.q; Q.tries++;
    if (!Q.practice && S.streak) { S.streak = 0; save(); renderHUD(); }
    if (el && el.classList.contains('opt')) el.classList.add('wrong');
    else if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    sfx('wrong');
    if (Q.tries === 1) {
      const m = pickOne(TRY); fb('warn', m, '🐥 Hint: ' + q.hint); speak(m + ' Hint: ' + q.hint);
      if (Q.mode === 'pad') { Q.pad = ''; showPad(); }
      if (Q.mode === 'coins') { Q.purse = []; showPurse(); }
      $('#qhint').hidden = true; updStars(); savePend(); return;
    }
    Q.revealed = true; savePend(); let ansTxt = '';
    if (Q.mode === 'choice') { const k = q.opts.findIndex(o => o.val === q.ans); const b = document.querySelector(`.opt[data-k="${k}"]`); if (b) b.classList.add('reveal'); document.querySelector('.opts').classList.add('locked'); }
    else if (Q.mode === 'pad') { Q.pad = q.ans; showPad(); ansTxt = ` The answer is ${q.pre || ''}${q.ans}${q.post || ''}.`; }
    fb('learn', 'Let’s learn this one together', q.explain + ansTxt); speak('Let’s learn this one together. ' + q.explain + ansTxt);
    $('#qhint').hidden = true; $('#qnext').textContent = 'Try a new one 🌱'; $('#qnext').hidden = false; $('#qback').hidden = true;
    try { $('#qnext').focus({ preventScroll: true }); } catch (e) { }
  }
  $('#qhint').onclick = () => { sfx('tap'); fb('learn', '🐥 Hint', Q.q.hint); speak(Q.q.hint); };
  $('#qsay').onclick = () => { audio.unlock(); readQ(true); };
  $('#qnext').onclick = () => { sfx('tap'); tts.stop(); if (Q.solved && !Q.practice) { closeQ(); return; } if (!Q.solved) Q.round++; newQuestion(); savePend(); };
  $('#qback').onclick = () => closeQ();
  $('#qclose').onclick = () => closeQ();
  function closeQ() {
    savePend(); tts.stop(); $('#qwrap').hidden = true; audio.duck(false);
    const was = Q; Q = null;
    if (was && was.solved && !was.practice) harvest(was.i, was.stars, was.coins);
    else renderHUD();
  }
  function harvest(tp, stars, coins) {
    renderHUD(true); sfx('coin'); if (coins == null) coins = stars * 10;
    if (W) {
      W.setDone(tp, true); const si = W.stationOfTopic(tp); const p = W.stationScreen(si);
      setTimeout(() => { fx.burst(p.x, p.y, 36, 8); floater(`+${coins} coins`, p.x, p.y - 50); }, 150);
      W.harvested(doneCount()); S.world = W.save();
    }
    save();
    const n = doneCount(); checkQuests(); checkTrophies(); ftouch(true);
    if (n === 18) setTimeout(levelComplete, 1500);
    else if (!W || !W.info().bridges.some(b => b.need === n)) buddyAuto();
  }

  /* =====================================================================
     level complete → bonus game → sail to the next island
     ===================================================================== */
  function levelComplete() {
    if (!$('#levelup').hidden || doneCount() < 18) return;
    const L = S.level, perfect = S.plots.every(p => p.stars === 3), n3 = S.plots.filter(p => p.stars === 3).length;
    $('#levelup').hidden = false; tts.stop();
    $('#lquests').innerHTML = questsHTML();
    $('#lstars').innerHTML = TOPICS.map((t, i) => `<span class="ls" title="${esc(t.farm)}"><span class="em sm">${t.icon}</span><i>${'★'.repeat(S.plots[i].stars) || '·'}</i></span>`).join('');
    if (S.settings.mode === 'champion' && !perfect) {
      $('#lmedal').innerHTML = gem(bioOf(L), 'dim'); $('#ltitle').textContent = 'So close, champion!';
      $('#lmsg').textContent = `${n3} of 18 farms got 3 stars. In Champion mode every farm needs 3 stars before you can sail on. Let’s plant again and go for 18!`;
      $('#lbonus').hidden = true; $('#lgo').textContent = 'Plant again 🌱'; $('#lgo').dataset.act = 'replant';
      speak($('#ltitle').textContent + ' ' + $('#lmsg').textContent); return;
    }
    const medal = L <= MAXL && L % 10 === 0 ? L / 10 - 1 : -1; checkQuests();
    if (S.cleared !== L) {
      S.cleared = L; S.coins += 100; S.rounds++; if (perfect) S.perfects++;
      if (medal >= 0 && !S.medals.includes(medal)) S.medals.push(medal);
      if (L > MAXL) S.legend = (S.legend || 0) + 1;
      S.pendingBonus = isBonus(L) ? bonusCountAt(L) : -1; save(); renderHUD(true);
      sfx('level'); fx.center(140, 13); setTimeout(checkTrophies, 1200);
    }
    const nb = bioOf(L + 1), newLand = nb !== bioOf(L);
    $('#lmedal').innerHTML = gem(L > MAXL ? 5 : medal >= 0 ? medal : bioOf(L));
    $('#ltitle').textContent = L <= MAXL ? `Level ${L} complete!` : `Legend level ${L - MAXL} complete!`;
    $('#lmsg').textContent = '+100 bonus coins.' + (perfect ? ' Perfect: every farm got 3 stars!' : '') + (medal >= 0 ? ` You won the ${MEDAL[medal].n} medal!` : '') + (L === MAXL ? ' You finished all 50 levels! Now you are a Legend farmer.' : '') + ` Next: ${lvlLabel(L + 1).replace(/ of \d+/, '')}${newLand ? ` in ${BIO[nb].name}, a brand new land!` : '.'}`;
    const pb = S.pendingBonus;
    if (pb >= 0 && !bonusSkipped) {
      const g = Arcade.GAMES[pb % Arcade.GAMES.length]; const first = !(S.plays[pb % Arcade.GAMES.length] > 0);
      $('#lbonus').innerHTML = `<span class="bi">${g.icon}</span><span><b>Bonus game${first ? ' unlocked' : ''}: ${esc(g.name)}!</b><small>Play it to win extra coins.</small></span>`; $('#lbonus').hidden = false;
      $('#lgo').textContent = `Play ${g.name} ${g.icon}`; $('#lgo').dataset.act = 'bonus';
    } else {
      $('#lbonus').hidden = true; $('#lgo').textContent = `Sail to ${lvlLabel(L + 1).replace(/ of \d+/, '')} ⛵`; $('#lgo').dataset.act = 'sail';
    }
    speak(`Hooray ${S.name}! ${$('#ltitle').textContent} ${$('#lmsg').textContent}` + (pb >= 0 ? ' And you get a bonus game!' : ''));
  }
  $('#lgo').onclick = () => {
    sfx('tap'); tts.stop(); const act = $('#lgo').dataset.act;
    if (act === 'bonus') { $('#levelup').hidden = true; playBonus(() => levelComplete()); return; }
    if (act === 'replant') { S.plots = newPlots(); S.pend = {}; if (S.world) S.world.pos = null; save(); $('#levelup').hidden = true; buildLevel(); buddyAuto(); return; }
    travel();
  };
  function travel() {
    bonusSkipped = false;
    const from = bioOf(S.level); S.level++; S.plots = newPlots(); S.world = null; S.pend = {}; save();
    $('#levelup').hidden = true;
    sail(() => {
      buildLevel(); renderHUD(true); updTitle(); setTimeout(checkTrophies, 2600); ftouch(true);
      const b = bioOf(S.level);
      buddy(b !== from ? `Welcome to ${BIO[b].name}, ${S.name}! A whole new land to explore.` : `Welcome to ${lvlLabel(S.level).replace(/ of \d+/, '').replace('Level', 'island')}! The farms are hidden again. Can you find them?`, true);
    });
  }
  function sail(cb) {
    const ov = $('#sail'); $('#sailT').textContent = `Sailing to ${lvlLabel(S.level).replace(/ of \d+/, '')} · ${BIO[bioOf(S.level)].name}`;
    ov.hidden = false; sfx('whoosh'); const t0 = performance.now();
    setTimeout(() => { try { cb(); } catch (e) { console.error(e); } const wait = Math.max(200, (reduced ? 600 : 2100) - (performance.now() - t0)); setTimeout(() => { ov.hidden = true; fx.center(60, 10); }, wait); }, 450);
  }

  /* ---------- bonus games ---------- */
  let arc = null, bonusSkipped = false;
  function arcade() { fx.clear(); if (!arc) arc = Arcade.create($('#arcade'), { sfx: n => sfx(n), say: t => speak(t) }); return arc; }
  function playBonus(after) {
    const pb = S.pendingBonus; if (pb < 0) { if (after) after(); return; }
    const gi = pb % Arcade.GAMES.length, round = S.plays[gi] || 0;
    audio.duck(true);
    arcade().open(gi, round, (coins, score, skipped) => {
      audio.duck(false); if (skipped) { bonusSkipped = true; renderHUD(); buddy('Your bonus game is waiting for you in the 🎮 games button.', true); if (after) after(); return; } S.coins += coins; S.plays[gi] = round + 1; S.best[gi] = Math.max(S.best[gi] || 0, score || 0); S.pendingBonus = -1; save(); renderHUD(true);
      if (coins) floater(`+${coins} ${coins === 1 ? 'coin' : 'coins'}`, window.innerWidth / 2, window.innerHeight / 2);
      checkTrophies(); if (after) after();
    });
  }
  function replay(gi) {
    if (S.coins < REPLAY) return; S.coins -= REPLAY; save(); renderHUD(); $('#hub').hidden = true; audio.duck(true);
    arcade().open(gi, S.plays[gi] || 0, (coins, score, skipped) => { audio.duck(false); if (skipped) S.coins += REPLAY; else S.best[gi] = Math.max(S.best[gi] || 0, score || 0); save(); renderHUD(); }, true);
  }
  function renderHub() {
    $('#hubCoins').textContent = S.coins; const G = Arcade.GAMES; const readyGi = S.pendingBonus >= 0 ? S.pendingBonus % G.length : -1;
    const nbl = nextBonusLevel(S.level);
    const comesAt = i => { for (let l = Math.max(1, S.level); l < S.level + 80; l++) if (isBonus(l) && bonusCountAt(l) % G.length === i) return l; return null; };
    const lvName = l => l > MAXL ? `legend level ${l - MAXL}` : `level ${l}`;
    $('#hubNote').textContent = readyGi >= 0 ? 'Your bonus game is ready! Play it to win coins.' : `A bonus game comes every 2 or 3 levels. The next one is after ${lvName(nbl)}. You can replay games you unlocked for ${REPLAY} coins, just for fun.`;
    $('#hubG').innerHTML = G.map((g, i) => {
      const unlocked = (S.plays[i] || 0) > 0, ready = readyGi === i, can = S.coins >= REPLAY;
      const lvl = comesAt(i);
      let act;
      if (ready) act = `<button class="btn go" data-ready="1">Play now ▶</button>`;
      else if (unlocked) act = `<button class="btn ${can ? 'go' : 'soft'}" data-rep="${i}" ${can ? '' : 'disabled'}>Play <span class="coin-i">$</span>${REPLAY}</button>`;
      else act = `<span class="lockt">🔒 Finish ${lvl ? lvName(lvl) : 'more levels'}</span>`;
      return `<div class="hg${unlocked || ready ? '' : ' locked'}${ready ? ' ready' : ''}"><span class="hgi">${g.icon}</span><b>${esc(g.name)}</b>${unlocked ? `<small>Best: ${S.best[i] || 0} · Played ${S.plays[i]}×</small>` : `<small>${ready ? 'New!' : 'Coming soon'}</small>`}${act}</div>`;
    }).join('');
  }
  $('#bonusBtn').onclick = () => { sfx('tap'); renderHub(); $('#hub').hidden = false; };
  $('#hubX').onclick = () => { $('#hub').hidden = true; };
  $('#hubG').addEventListener('click', e => {
    if (e.target.closest('[data-ready]')) { bonusSkipped = false; $('#hub').hidden = true; playBonus(() => { if (doneCount() === 18) levelComplete(); }); return; }
    const r = e.target.closest('[data-rep]'); if (r) replay(+r.dataset.rep);
  });

  /* ---------- journey map ---------- */
  let jTab = 'isl';
  function renderJourney() {
    $('#tabIsl').classList.toggle('sel', jTab === 'isl'); $('#tabTro').classList.toggle('sel', jTab === 'tro'); $('#tabIsl').setAttribute('aria-selected', jTab === 'isl'); $('#tabTro').setAttribute('aria-selected', jTab === 'tro');
    $('#troCount').textContent = `${Object.keys(S.trophies).length}/${TROPHIES.length}`;
    if (jTab === 'tro') { $('#jBody').innerHTML = trophiesHTML(); return; }
    const L = S.level; let h = `<p class="pnote">${esc(S.name)} is on <b>${lvlLabel(L)}</b>. Each level is a new island with all 18 JISMO topics. 🎮 marks a bonus game.</p><div class="jrows">`;
    for (let b = 0; b < 5; b++) {
      const got = S.medals.includes(b);
      h += `<div class="jrow" style="--bc:#${THREE_COLOR(BIO[b].grass[0])}"><div class="jhead">${gem(b, got ? '' : 'dim')}<span><b>${esc(BIO[b].name)}</b><small>Levels ${b * 10 + 1}–${b * 10 + 10}${got ? ' · medal won!' : ''}</small></span></div><div class="jdots">`;
      for (let l = b * 10 + 1; l <= b * 10 + 10; l++) h += `<span class="jd${l < L ? ' done' : l === L ? ' now' : ''}${isBonus(l) ? ' bon' : ''}" aria-label="Level ${l}${l < L ? ', done' : l === L ? ', you are here' : ''}${isBonus(l) ? ', bonus game' : ''}">${l < L ? '✓' : l}${isBonus(l) ? '<i>🎮</i>' : ''}</span>`;
      h += '</div></div>';
    }
    h += '</div>'; if (L > MAXL) h += `<p class="pnote">Legend levels finished: <b>${S.legend || 0}</b>. Keep going, champion!</p>`;
    $('#jBody').innerHTML = h;
  }
  function THREE_COLOR(n) { return ('000000' + n.toString(16)).slice(-6); }
  $('#landChip').onclick = () => { sfx('tap'); jTab = 'isl'; renderJourney(); $('#journey').hidden = false; };
  $('#tabIsl').onclick = () => { sfx('tap'); jTab = 'isl'; renderJourney(); };
  $('#tabTro').onclick = () => { sfx('tap'); jTab = 'tro'; renderJourney(); };
  $('#jX').onclick = () => { $('#journey').hidden = true; };

  /* ---------- shop: animal friends + clothes ---------- */
  function avatarSVG(c) {
    return `<svg viewBox="0 0 120 170" width="120" height="170" aria-hidden="true"><g stroke="#2B2340" stroke-width="4" stroke-linejoin="round">
      <ellipse cx="60" cy="164" rx="34" ry="5" fill="#2B2340" opacity=".15" stroke="none"/>
      <rect x="42" y="118" width="15" height="38" rx="4" fill="${c.pants}"/><rect x="63" y="118" width="15" height="38" rx="4" fill="${c.pants}"/>
      <rect x="40" y="152" width="19" height="10" rx="4" fill="#5A3A22"/><rect x="61" y="152" width="19" height="10" rx="4" fill="#5A3A22"/>
      <rect x="22" y="80" width="14" height="38" rx="6" fill="${c.shirt}"/><rect x="84" y="80" width="14" height="38" rx="6" fill="${c.shirt}"/>
      <circle cx="29" cy="121" r="7" fill="${c.skin}"/><circle cx="91" cy="121" r="7" fill="${c.skin}"/>
      <rect x="34" y="76" width="52" height="50" rx="10" fill="${c.shirt}"/><path d="M38 104 h44 v22 h-44 z" fill="${c.pants}"/>
      <circle cx="60" cy="52" r="25" fill="${c.skin}"/>
      <ellipse cx="60" cy="30" rx="40" ry="7" fill="${c.hat}"/><path d="M40 30 q2 -22 20 -22 q18 0 20 22 z" fill="${c.hat}"/><rect x="40" y="22" width="40" height="7" fill="#D9483B"/></g>
      <circle cx="51" cy="54" r="3.6" fill="#2B2340"/><circle cx="69" cy="54" r="3.6" fill="#2B2340"/><circle cx="44" cy="62" r="4" fill="#FF8FA3" opacity=".8"/><circle cx="76" cy="62" r="4" fill="#FF8FA3" opacity=".8"/><path d="M53 64 q7 6 14 0" fill="none" stroke="#2B2340" stroke-width="3" stroke-linecap="round"/></svg>`;
  }
  let shopTab = 'pets';
  function renderShop() {
    $('#shopCoins').textContent = S.coins;
    $('#tabPets').classList.toggle('sel', shopTab === 'pets'); $('#tabWear').classList.toggle('sel', shopTab === 'wear');
    $('#tabPets').setAttribute('aria-selected', shopTab === 'pets'); $('#tabWear').setAttribute('aria-selected', shopTab === 'wear');
    $('#petPane').hidden = shopTab !== 'pets'; $('#wearPane').hidden = shopTab !== 'wear';
    $('#shopG').innerHTML = PETS.map((it, k) => {
      const own = S.owned.includes(it.e), fol = S.follow.includes(it.e), can = S.coins >= it.p;
      if (own) return `<button class="si-card own${fol ? ' fol' : ''}" data-fol="${k}" aria-pressed="${fol}"><span class="em">${it.e}</span><b>${esc(it.n)}</b><span class="pnote">${fol ? '✓ Following you' : 'Tap to bring along'}</span></button>`;
      return `<div class="si-card"><span class="em">${it.e}</span><b>${esc(it.n)}</b><button class="btn ${can ? 'go' : 'soft'}" data-buy="${k}" ${can ? '' : 'disabled'}><span class="coin-i">$</span>${it.p}</button>${can ? '' : `<span class="pnote">${it.p - S.coins} more ${it.p - S.coins === 1 ? 'coin' : 'coins'}</span>`}</div>`;
    }).join('');
    const c = {}; Object.keys(WEAR).forEach(k => { c[k] = WEAR[k].items[S.wear[k]][1]; });
    $('#avPrev').innerHTML = avatarSVG(c) + `<b>${esc(S.name)}</b>`;
    $('#wardG').innerHTML = Object.keys(WEAR).map(slot => `<div class="wslot"><h3>${WEAR[slot].label}</h3><div class="sw">` + WEAR[slot].items.map((it, k) => {
      const id = slot + k, have = WEAR[slot].free || it[2] === 0 || S.have.includes(id), on = S.wear[slot] === k, can = S.coins >= it[2];
      return `<button class="swb${on ? ' on' : ''}${!have && !can ? ' no' : ''}" data-w="${slot}:${k}" aria-label="${it[0]} ${WEAR[slot].label}${have ? '' : `, costs ${it[2]} coins`}${on ? ', wearing' : ''}" aria-pressed="${on}"><i style="background:${it[1]}"></i><span>${have ? (on ? '✓' : it[0]) : '$' + it[2]}</span></button>`;
    }).join('') + '</div></div>').join('');
  }
  $('#shopBtn').onclick = () => { sfx('tap'); renderShop(); $('#shop').hidden = false; };
  $('#shopX').onclick = () => { $('#shop').hidden = true; };
  $('#tabPets').onclick = () => { shopTab = 'pets'; sfx('tap'); renderShop(); };
  $('#tabWear').onclick = () => { shopTab = 'wear'; sfx('tap'); renderShop(); };
  $('#shopG').addEventListener('click', e => {
    const b = e.target.closest('[data-buy]');
    if (b) {
      const it = PETS[+b.dataset.buy]; if (S.coins < it.p || S.owned.includes(it.e)) return;
      S.coins -= it.p; S.owned.push(it.e); if (S.follow.length < 4) S.follow.push(it.e); save(); sfx('chest'); fx.at(b, 50, 9);
      W && W.setPets(S.follow); renderShop(); renderHUD(true); buddy(S.follow.includes(it.e) ? `Your new ${it.n.toLowerCase()} will follow you everywhere!` : `The ${it.n.toLowerCase()} is yours! Four friends already follow you. Tap one to let it rest, then tap the ${it.n.toLowerCase()} to bring it along.`, true); checkTrophies(); return;
    }
    const f = e.target.closest('[data-fol]');
    if (f) {
      const it = PETS[+f.dataset.fol]; const i = S.follow.indexOf(it.e);
      if (i >= 0) S.follow.splice(i, 1); else if (S.follow.length < 4) S.follow.push(it.e); else { buddy('Only 4 friends can follow you at once. Tap one to let it rest first.', true); return; }
      sfx('tap'); save(); W && W.setPets(S.follow); renderShop(); ftouch(true);
    }
  });
  $('#wardG').addEventListener('click', e => {
    const b = e.target.closest('[data-w]'); if (!b) return; const [slot, ks] = b.dataset.w.split(':'); const k = +ks; const it = WEAR[slot].items[k]; const id = slot + k;
    const have = WEAR[slot].free || it[2] === 0 || S.have.includes(id);
    if (!have) { if (S.coins < it[2]) { sfx('thunk'); return; } S.coins -= it[2]; S.have.push(id); sfx('chest'); fx.at(b, 30, 7); renderHUD(true); } else sfx('tap');
    S.wear[slot] = k; save(); W && W.setPlayer(S.name, colorsOf()); renderShop(); checkTrophies(); ftouch(true);
  });

  /* =====================================================================
     grown-ups
     ===================================================================== */
  let gateAns = 0, gateVal = '', gateThen = null;
  function openGate(then) {
    gateThen = typeof then === 'function' ? then : null;
    const a = 6 + Math.floor(Math.random() * 4), b = 12 + Math.floor(Math.random() * 8); gateAns = a * b; gateVal = '';
    $('#gq').textContent = `${a} × ${b} = ?`;
    $('#gpad').innerHTML = `<div class="pdisp" id="gdisp"><span class="ph">?</span></div><div class="pad">${keyHTML('data-g')}</div>`;
    $('#gate').hidden = false;
  }
  $('#gpad').addEventListener('click', e => {
    const k = e.target.closest('[data-g]'); if (!k) return; const v = k.dataset.g;
    if (v === 'del') gateVal = gateVal.slice(0, -1);
    else if (v === 'ok') { if (+gateVal === gateAns) { $('#gate').hidden = true; const go = gateThen; gateThen = null; if (go) go(); else openParents(); } else { openGate(gateThen); $('#gdisp').classList.add('shake'); } return; }
    else if (gateVal.length < 3) gateVal += v;
    $('#gdisp').innerHTML = gateVal || '<span class="ph">?</span>';
  });
  $('#gateX').onclick = () => { $('#gate').hidden = true; gateThen = null; };
  $('#parBtn').onclick = () => { sfx('tap'); openGate(); };
  function openParents() { renderParents(); $('#parents').hidden = false; }
  $('#parX').onclick = () => { $('#parents').hidden = true; renderHUD(); buddyAuto(); };
  function renderParents() {
    const L = S.level;
    const rows = TOPICS.map((t, i) => { const st = S.stats[i] || { a: 0, f: 0 }; return { i, t, a: st.a, f: st.f, p: st.a ? Math.round(st.f / st.a * 100) : null }; });
    const weak = rows.filter(r => r.a >= 2).sort((x, y) => x.p - y.p).slice(0, 3).filter(r => r.p < 80).map(r => r.i);
    const total = rows.reduce((s, r) => s + r.a, 0);
    const rep = rows.map(r => `<div class="rr"><span class="ri">${r.t.icon}</span><div class="rn"><b>${r.i + 1}. ${esc(r.t.topic)}</b><div class="rbar"><i class="${r.p == null ? '' : r.p >= 80 ? '' : r.p >= 50 ? 'mid' : 'low'}" style="width:${r.p || 0}%"></i></div><span class="rs">${r.a ? `${r.f} of ${r.a} right on the first try (${r.p}%)` : 'Not tried yet'}${weak.includes(r.i) ? ' · <span class="flag">needs practice</span>' : ''}</span></div><button class="btn soft" data-prac="${r.i}">Practice</button></div>`).join('');
    const sel = Math.min(L, MAXL), nm = esc(S.name);
    $('#parBody').innerHTML = `
      <div class="psec"><h3>Player name</h3><div class="prow"><input class="inp" id="pNameIn" maxlength="14" value="${nm}" aria-label="Player name"><button class="btn soft" id="pNameSave">Save</button></div></div>
      <div class="psec"><h3>Level (1–50)</h3><p class="pnote">Now on ${lvlLabel(L)} (${esc(BIO[bioOf(L)].name)}). Every level is a new island with one farm for each of the 18 JISMO Grade 1 topics. Levels 1–5: numbers to 20, like the JISMO Grade 1 practice papers. Levels 6–10: the full Grade 1 syllabus with more two-step problems. Levels 11–20: numbers to 30–40, number pyramids and logic chains. Levels 21–35: numbers to 50–80, olympiad tricks, area and calendars. Levels 36–50: numbers to 100, multi-clue logic, perimeter and three-step problems. Changing the level builds a new island and replants the farms.</p>
        <div class="prow"><input type="range" id="pLvl" min="1" max="${MAXL}" value="${sel}" aria-label="Choose a level"><b class="lvlv" id="pLvlV">Level ${sel}</b><button class="btn soft" id="pLvlGo">Go</button></div></div>
      <div class="psec"><h3>Question bank</h3><p class="pnote">Every farm has 3 prepared puzzles on every level: 2,850 puzzles in all, each one checked for correct logic. The game always picks one ${nm} has not seen yet, so replaying a level, or starting again from level 1, brings different puzzles before anything repeats. One farm on each island is the 👑 Golden Challenge, with its own 3 puzzles taken from 5 levels ahead (from level 46 on they are top-level puzzles) and double coins. After level 50, Legend islands reuse the 15 reviewed top-level puzzles of each farm. Practice in the report below picks prepared puzzles from the last five levels.</p></div>
      <div class="psec"><h3>Level-up rule</h3><div class="seg" id="pMode">
        <button data-m="explorer" class="${S.settings.mode === 'explorer' ? 'sel' : ''}"><b>Relaxed (default)</b><span>Sail on after all 18 farms are harvested. After two wrong tries, ${nm} sees the explanation and gets another puzzle on the same topic until one is solved.</span></button>
        <button data-m="champion" class="${S.settings.mode === 'champion' ? 'sel' : ''}"><b>Champion</b><span>Sail on only when all 18 farms were solved on the first try (3 stars each). Otherwise the island is replanted with new puzzles.</span></button>
      </div></div>
      <div class="psec"><h3>Sound</h3><div class="seg"><button id="pRead" class="${S.settings.read ? 'sel' : ''}"><b>Read questions aloud</b><span>${S.settings.read ? 'On' : 'Off'}${tts.ok ? '' : ' (not supported in this browser)'}</span></button><button id="pSnd" class="${S.settings.sound ? 'sel' : ''}"><b>Sound effects</b><span>${S.settings.sound ? 'On' : 'Off'}</span></button><button id="pMus" class="${S.settings.music ? 'sel' : ''}"><b>Music</b><span>${S.settings.music ? 'On' : 'Off'}</span></button></div><p class="pnote">On an iPhone or iPad with no sound at all, turn off silent mode, then tap the 🔊 button twice (off and on again).</p></div>
      <div class="psec"><h3>Progress by JISMO topic</h3><p class="pnote">${total ? `${total} ${total === 1 ? 'puzzle' : 'puzzles'} answered so far.` : 'No puzzles answered yet.'} The percentage counts puzzles solved on the first try. Practice opens a practice puzzle for that topic, taken from the last five levels, without changing the farms.</p><div class="rep">${rep}</div></div>
      <div class="psec"><h3>Challenges</h3><p class="pnote">Best streak: <b>${S.bestStreak}</b> in a row · Golden Challenges beaten: <b>${S.golds}</b> · Solved after a wrong try: <b>${S.comebacks}</b> · Trophies: <b>${Object.keys(S.trophies).length} of ${TROPHIES.length}</b></p></div>
      <div class="psec"><h3>Bonus games</h3><p class="pnote">After levels 2, 5, 7, 10, 12, 15 and so on (every 2–3 levels), ${nm} unlocks a skill game: Penalty Kick, Shoot the Balls, Fruit Catch, Bop the Hamsters, Hoop Shot, Hay Jump and Target Archery. Each time a game comes back it is a little faster. Unlocked games can be replayed for ${REPLAY} coins, so play time stays linked to math practice.</p></div>
      <div class="psec" id="pFriends"></div>
      <div class="psec danger"><h3>Start over</h3><p class="pnote">Deletes progress, coins, animals, clothes, medals, trophies and the report on this device. The player name, the settings and the record of puzzles already seen are kept, so a fresh start still brings new puzzles.</p><div class="prow"><button class="btn soft" id="pReset">Reset progress</button><span id="pResetC" class="prow" hidden><b>Are you sure?</b><button class="btn" id="pResetY">Yes, delete</button><button class="btn soft" id="pResetN">Cancel</button></span></div></div>
      <p class="pnote">Progress is saved in this browser on this device.${hasFriends() && Friends.inGroup() ? ' A short summary (level, stars, trophies, outfit, animals and the island map) is also shared with the friend group.' : ''} Puzzles follow the 18 topics of the JISMO Grade 1 Math Autumn 2026 course outline; they are not copies of official questions.</p>`;
    $('#pLvl').oninput = e => { $('#pLvlV').textContent = 'Level ' + e.target.value; };
    try { if (hasFriends()) Friends.parentsSection($('#pFriends')); else $('#pFriends').hidden = true; } catch (e) { $('#pFriends').hidden = true; }
  }
  $('#parBody').addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#pNameSave')) { const v = $('#pNameIn').value.trim().slice(0, 14); if (v) { S.name = v; save(); W && W.setPlayer(S.name, colorsOf()); updTitle(); renderParents(); ftouch(true); } return; }
    const m = t.closest('[data-m]'); if (m) { S.settings.mode = m.dataset.m; save(); renderParents(); return; }
    if (t.closest('#pLvlGo')) { const n = +$('#pLvl').value; if (n !== S.level) { if (V) leaveVisit(); S.level = n; S.plots = newPlots(); S.world = null; S.cleared = 0; S.pend = {}; save(); buildLevel(); updTitle(); ftouch(true); } renderParents(); return; }
    if (t.closest('#pRead')) { S.settings.read = !S.settings.read; save(); renderParents(); return; }
    if (t.closest('#pSnd')) { S.settings.sound = !S.settings.sound; save(); renderParents(); renderHUD(); return; }
    if (t.closest('#pMus')) { S.settings.music = !S.settings.music; save(); renderParents(); renderHUD(); syncMusicSoon(); return; }
    const p = t.closest('[data-prac]'); if (p) { $('#parents').hidden = true; openQ(+p.dataset.prac, true); return; }
    if (t.closest('#pReset')) { $('#pResetC').hidden = false; return; }
    if (t.closest('#pResetN')) { $('#pResetC').hidden = true; return; }
    if (t.closest('#pResetY')) { if (V) leaveVisit(); const keep = { seen: S.seen || {}, name: S.name, settings: S.settings, tut: S.tut }; S = fresh(); Object.assign(S, keep); save(); syncMusic(); $('#parents').hidden = true; buildLevel(); updTitle(); buddyAuto(); ftouch(true); return; }
  });
  function syncMusicSoon() { setTimeout(syncMusic, 0); }

  /* =====================================================================
     challenge: streaks, island quests, trophies, toasts
     ===================================================================== */
  /* pop-ups wait while a card or screen is open, so they never cover it */
  const toastQ = []; let toastT = 0;
  function toast(icon, title, sub) { toastQ.push([icon, title, sub]); flushToasts(); }
  function flushToasts() {
    if (toastT || !toastQ.length || busy() || !$('#title').hidden) return;
    const [icon, title, sub] = toastQ.shift(); showToast(icon, title, sub);
    toastT = setTimeout(() => { toastT = 0; flushToasts(); }, 1400);
  }
  function showToast(icon, title, sub) {
    const box = $('#toasts'); while (box.children.length > 2) box.firstChild.remove();
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = `<span class="tico" aria-hidden="true">${icon}</span><span class="ttx"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
    box.appendChild(el); setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4400);
  }
  const streakBonus = n => n === 3 ? 10 : n === 5 ? 20 : n === 10 ? 50 : n > 10 && n % 5 === 0 ? 30 : 0;
  function quests() {
    if (V) return [];
    const info = W ? W.info() : null, gt = goldTopic(S.level), n3 = S.plots.filter(p => p.stars === 3).length;
    return [
      { id: 'treasure', icon: '🗝️', name: 'Chest Finder', how: info ? `Open all ${info.chestsTotal} treasure chests on this island` : 'Open every treasure chest on this island', have: info ? info.chestsTotal - info.chestsLeft : 0, need: info ? Math.max(1, info.chestsTotal) : 1 },
      { id: 'stars', icon: '⭐', name: 'Star Farmer', how: 'Get 3 stars on 15 farms', have: Math.min(15, n3), need: 15 },
      { id: 'gold', icon: '👑', name: 'Golden Challenge', how: `Beat the golden ${TOPICS[gt].farm}`, have: S.plots[gt].done ? 1 : 0, need: 1 }
    ].filter(q => W || q.id !== 'treasure');
  }
  function questsHTML() {
    return quests().map(q => { const done = q.have >= q.need, pc = Math.round(Math.min(1, q.have / q.need) * 100);
      return `<div class="qst${done ? ' done' : ''}"><span class="qi" aria-hidden="true">${q.icon}</span><span class="qt"><b>${esc(q.name)}</b><small>${esc(q.how)}</small><span class="qbar"><i style="width:${pc}%"></i></span></span><span class="qn">${done ? '✓' : `${q.have}/${q.need}`}</span></div>`; }).join('');
  }
  function checkQuests() {
    quests().forEach(q => { const k = S.level + ':' + q.id; if (q.have >= q.need && !S.qdone[k]) { S.qdone[k] = 1; S.coins += 25; save(); renderHUD(true); toast(q.icon, `Quest complete: ${q.name}!`, '+25 coins'); sfx('level'); } });
  }
  const TROPHIES = [
    { id: 'first', icon: '🌱', name: 'First Harvest', how: 'Harvest your first farm.' },
    { id: 'island', icon: '🏝️', name: 'Island Hero', how: 'Harvest all 18 farms on an island.' },
    { id: 'streak5', icon: '🔥', name: 'Hot Streak', how: 'Solve 5 puzzles in a row on the first try.' },
    { id: 'streak10', icon: '☄️', name: 'On Fire', how: 'Solve 10 puzzles in a row on the first try.' },
    { id: 'gold1', icon: '👑', name: 'Golden Touch', how: 'Beat a Golden Challenge farm.' },
    { id: 'gold5', icon: '💛', name: 'Gold Collector', how: 'Beat 5 Golden Challenge farms.' },
    { id: 'treasure', icon: '🗝️', name: 'Treasure Hunter', how: 'Open every treasure chest on one island.' },
    { id: 'explorer', icon: '🧭', name: 'Map Maker', how: 'Explore an island until almost all of its map is uncovered.' },
    { id: 'perfect', icon: '🌟', name: 'Perfect Island', how: 'Get 3 stars on all 18 farms of one island.' },
    { id: 'bridges', icon: '🌉', name: 'Bridge Builder', how: 'Fix 10 bridges.' },
    { id: 'comeback', icon: '💪', name: 'Never Give Up', how: 'Solve 10 puzzles after a wrong try.' },
    { id: 'brain', icon: '🧠', name: 'Math Brain', how: 'Solve 100 puzzles on the first try.' },
    { id: 'arcade', icon: '🎮', name: 'Game Champ', how: 'Play all 7 bonus games.' },
    { id: 'pet', icon: '🐶', name: 'Animal Friend', how: 'Get your first animal friend.' },
    { id: 'style', icon: '🎩', name: 'Fashion Farmer', how: 'Buy something new to wear.' },
    { id: 'rich', icon: '💰', name: 'Coin Keeper', how: 'Have 500 coins at once.' },
    { id: 'lvl10', icon: '⛵', name: 'Sailor', how: 'Reach island 10.' },
    { id: 'lvl25', icon: '⚓', name: 'Captain', how: 'Reach island 25.' },
    { id: 'medals', icon: '💎', name: 'Medal Master', how: 'Win all 5 land medals.' },
    { id: 'legend', icon: '🏆', name: 'Math Farm Legend', how: 'Finish all 50 islands.' }
  ];
  function trophyMet(id) {
    switch (id) {
      case 'first': return S.harvests >= 1; case 'island': return S.rounds >= 1 || S.fullHarvests >= 1;
      case 'streak5': return S.bestStreak >= 5; case 'streak10': return S.bestStreak >= 10;
      case 'gold1': return S.golds >= 1; case 'gold5': return S.golds >= 5;
      case 'treasure': return S.treasureIslands >= 1;
      case 'explorer': { const info = W ? W.info() : null; return !!(info && info.explored >= 0.9); }
      case 'perfect': return S.perfects >= 1; case 'bridges': return S.bridges >= 10;
      case 'comeback': return S.comebacks >= 10; case 'brain': return S.firstTry >= 100;
      case 'arcade': return Arcade.GAMES.every((g, i) => (S.plays[i] || 0) > 0);
      case 'pet': return S.owned.length >= 1; case 'style': return S.have.length > 3; case 'rich': return S.coins >= 500;
      case 'lvl10': return S.level >= 10; case 'lvl25': return S.level >= 25;
      case 'medals': return S.medals.length >= 5; case 'legend': return S.cleared >= MAXL || S.level > MAXL;
    }
    return false;
  }
  function checkTrophies() {
    if (!$('#title').hidden || V) return;
    TROPHIES.forEach(t => { if (!S.trophies[t.id] && trophyMet(t.id)) { S.trophies[t.id] = Date.now(); save(); toast(t.icon, `New trophy: ${t.name}!`, t.how); sfx('chest'); } });
  }
  function trophiesHTML() {
    const got = TROPHIES.filter(t => S.trophies[t.id]).length;
    return `<p class="pnote">${got} of ${TROPHIES.length} trophies won. Gray ones are still waiting for you. Can you collect them all?</p><div class="trog">` +
      TROPHIES.map(t => { const on = !!S.trophies[t.id]; return `<div class="tro${on ? ' on' : ''}"><span class="tico" aria-hidden="true">${on ? t.icon : '🔒'}</span><b>${esc(t.name)}</b><small>${esc(t.how)}</small></div>`; }).join('') + '</div>';
  }

  /* =====================================================================
     opening tutorial (story + how to play + grown-ups)
     ===================================================================== */
  const INTRO = () => [
    { art: '<div class="art a1"><span class="sun">☀️</span><span class="isl i1">🏝️</span><span class="isl i2">🏝️</span><span class="isl i3">🏝️</span><span class="qm q1">❓</span><span class="qm q2">❓</span><span class="qm q3">❓</span><span class="boat">⛵</span></div>',
      title: `Welcome, ${S.name}!`,
      text: `Far out at sea there are 50 secret islands. On every island, 18 farms are hiding in the forest, with treasure chests and broken bridges too. Nobody knows what is waiting on island 50… Are you brave and clever enough to find out?` },
    { art: '<div class="art a2"><span class="tree t1">🌳</span><span class="tree t2">🌲</span><span class="tree t3">🌳</span><span class="path"></span><span class="farmer">🧑‍🌾</span><span class="tapr"></span><span class="tap">👆</span></div>',
      title: 'Walk and explore',
      text: 'Tap the ground and your farmer walks there. Drag one finger to look around, and pinch with two fingers to zoom. The paths twist and turn through the forest, so keep your eyes open!' },
    { art: '<div class="art a3"><span class="bub"><b class="f">❓</b><b class="b">🥕</b></span><span class="paw p1">🐾</span><span class="paw p2">🐾</span><span class="paw p3">🐾</span><span class="map">🗺️</span></div>',
      title: 'Find the hidden farms',
      text: 'A ❓ bubble is a farm you have not found yet. Walk close and it shows which farm it is. Your map fills in as you explore. Lost? Tap the Find 🐾 button and follow the paw prints.' },
    { art: '<div class="art a4"><div class="mq"><b>7 + 5 = ?</b><span class="mo">11</span><span class="mo ok">12</span><span class="mo">13</span></div><span class="st3">⭐⭐⭐</span><span class="chk">🐥</span></div>',
      title: 'Solve the farm puzzle',
      text: 'Every farm has a math puzzle. Solve it to harvest the farm and win coins! Tap the 🔊 button to hear it. Right on the first try wins 3 stars. A wrong answer is okay: I am Chicky the chick, and I will give you a hint so you can try again. Every puzzle makes your brain stronger.' },
    { art: '<div class="art a5"><span class="isl l">🏝️</span><span class="brg"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="isl r">🏝️</span><span class="lk">🔒</span><span class="boat">⛵</span><span class="game">🎮</span></div>',
      title: 'Fix the bridges and sail on',
      text: 'Harvest 5 farms to fix the first bridge and 10 farms to fix the second. Harvest all 18 and you sail to a brand new island, with harder puzzles. Every 2 or 3 islands a bonus game unlocks: penalty kicks, hoops, archery and more!' },
    { art: '<div class="art a6"><span>🔥</span><span>👑</span><span>🏆</span><span>🐶</span><span>👕</span><span>💎</span></div>',
      title: 'Win treasures and trophies',
      text: 'Solve puzzles on the first try, one after another, to build a 🔥 streak and win bonus coins. Each island has one 👑 Golden Challenge farm with an extra tricky puzzle and double coins. Finish island quests, spend coins on animal friends and clothes, collect 20 trophies, and win a medal every 10 islands.' },
    { art: '<div class="art a7"><span class="fam">👪</span><div class="ck"><i>✓ All 18 JISMO Grade 1 topics</i><i>✓ 50 levels, harder each time</i><i>✓ 3 prepared puzzles per farm</i><i>✓ Report for every topic</i></div></div>',
      title: 'For grown-ups',
      text: 'Tap the 👪 button and answer a quick question to open the grown-ups page: a progress report for all 18 topics, practice for any topic, levels 1 to 50, and settings. Each farm has 3 prepared puzzles on every level, so replaying brings new questions. Progress is saved on this device. Tap the ❓ button anytime to ask Chicky for help.' }
  ];
  let introI = 0;
  function openIntro(i) { introI = i || 0; $('#intro').hidden = false; showIntro(); }
  function showIntro() {
    const P = INTRO(), p = P[introI], last = introI === P.length - 1;
    $('#iArt').innerHTML = p.art; $('#iTitle').textContent = p.title; $('#iText').textContent = p.text; $('#iStep').textContent = `${introI + 1} of ${P.length}`;
    $('#iDots').innerHTML = P.map((x, k) => `<i class="${k === introI ? 'on' : k < introI ? 'done' : ''}"></i>`).join('');
    $('#iBack').style.visibility = introI === 0 ? 'hidden' : 'visible'; $('#iNext').hidden = last; $('#iEnd').hidden = !last; $('#iSkip').hidden = last;
    if (S.settings.read) speak(p.title + '. ' + p.text);
  }
  function closeIntro(then) { tts.stop(); $('#intro').hidden = true; if (!S.tut) { S.tut = true; save(); } if (then === 'tour') setTimeout(startTour, 350); else greet(); }
  $('#iNext').onclick = () => { sfx('tap'); introI = Math.min(INTRO().length - 1, introI + 1); showIntro(); };
  $('#iBack').onclick = () => { sfx('tap'); introI = Math.max(0, introI - 1); showIntro(); };
  $('#iSkip').onclick = () => { sfx('tap'); closeIntro(); };
  $('#iGo').onclick = () => { sfx('level'); closeIntro(); };
  $('#iTour').onclick = () => { sfx('tap'); closeIntro('tour'); };
  $('#iSay').onclick = () => { audio.unlock(); const p = INTRO()[introI]; tts.say(p.title + '. ' + p.text); };

  /* =====================================================================
     help: Ask Chicky (searchable answers), button guide, all topics
     ===================================================================== */
  const FAQ = [
    { g: 'Getting around', q: 'How do I walk?', k: 'walk move go tap ground character farmer run keys arrow', a: 'Tap the ground where you want to go, and your farmer walks there. You can also tap a farm bubble to walk straight to it. On a computer, the arrow keys work too.' },
    { g: 'Getting around', q: 'How do I look around?', k: 'look around drag pan camera view see turn rotate zoom pinch slide', a: 'Drag one finger across the island to slide the view. Pinch with two fingers to zoom. The turn buttons spin the view, plus and minus zoom in and out, and the target button brings the camera back to you.' },
    { g: 'Getting around', q: 'Where are the farms?', k: 'where farms farm find hidden question mark bubble lost mystery paw prints paws last', a: 'Farms hide in the forest. A ❓ bubble is a farm you have not found yet. Walk close and it shows which farm it is. Tap the Find 🐾 button and follow the paw prints to the nearest farm you have not harvested.' },
    { g: 'Getting around', q: 'How does the map work?', k: 'map minimap dark mystery fog explored big corner', a: 'The small map in the corner shows where you have been. Dark parts are still a mystery. Tap it to open the big map, see your island quests, and tap a farm or a place you have explored to walk there.' },
    { g: 'Getting around', q: 'Why can I not walk there?', k: 'cannot walk stuck blocked trees forest way path reach cant go', a: 'Trees, rocks and water block the way. Try tapping a spot on the path instead, or tap the Find 🐾 button. If the place is across the water, the bridge has to be fixed first.' },
    { g: 'Puzzles', q: 'How do I play a farm?', k: 'play farm puzzle question open start enter', a: 'Walk to a farm. When you arrive the puzzle opens. You can also tap Play on the farm card at the bottom of the screen.' },
    { g: 'Puzzles', q: 'What does harvest mean?', k: 'harvest harvested crops grow basket finish farm', a: 'Harvest means the farm is finished. When you solve a farm puzzle, its crops grow, a ⭐ appears on its bubble, and the harvest bar at the top fills up.' },
    { g: 'Puzzles', q: 'How do I get 3 stars?', k: 'stars three 3 star first try score', a: 'Right on the first try wins 3 stars. Right on the second try wins 2 stars. If a puzzle is tricky, Chicky explains it and gives you a new one, worth 1 star.' },
    { g: 'Puzzles', q: 'What if I get it wrong?', k: 'wrong mistake incorrect fail again try stuck hard difficult', a: 'That is okay! After one wrong try Chicky gives you a hint and you try again. After two, Chicky explains the answer and gives you a fresh puzzle. Mistakes help your brain grow.' },
    { g: 'Puzzles', q: 'How do I get a hint?', k: 'hint help clue button idea dont answer', a: 'Tap the 🐥 Hint button at the bottom of the puzzle. Chicky also gives you a hint by itself after a wrong try.' },
    { g: 'Puzzles', q: 'How do I hear the question?', k: 'hear read listen sound speaker voice aloud', a: 'Tap the yellow 🔊 button next to the question. It reads the question and the answers out loud.' },
    { g: 'Puzzles', q: 'How do I type a number?', k: 'type keypad number pad enter keyboard digits delete answer', a: 'Some puzzles show a number pad. Tap the digits, tap the ⌫ button to take one away, and tap the ✔ button to check your answer.' },
    { g: 'Puzzles', q: 'How do I pay in money puzzles?', k: 'money puzzle pay paying notes dollars purse total', a: 'In money puzzles, tap coins and notes to put them in your purse. Tap one in the purse to take it back. Tap Pay when the total is right.' },
    { g: 'Puzzles', q: 'Can I count the pictures?', k: 'count tap pictures tick counting', a: 'Yes! In counting puzzles you can tap each picture. It gets a green tick, and the number of taps shows below. Tap Clear to start counting again.' },
    { g: 'Puzzles', q: 'How do I leave a puzzle?', k: 'leave close exit quit back cross x stop puzzle out island return', a: 'Tap the ✕ at the top of the puzzle to go back to the island. When you come back, the same puzzle is waiting for you, unless Chicky already explained it; then you get a new one.' },
    { g: 'Puzzles', q: 'Can I play a farm again?', k: 'again replay practice practise done finished harvested farm', a: 'Yes. Walk to a harvested farm and tap Practice 🔁. Practice puzzles win 5 coins and do not change your stars.' },
    { g: 'Islands', q: 'Why is the bridge broken?', k: 'bridge broken lock locked cross water island cannot other', a: 'Bridges are fixed by harvesting farms. 5 farms fix the first bridge and 10 farms fix the second. Then you can walk across to the next part of the island.' },
    { g: 'Islands', q: 'How do I go to the next island?', k: 'next level island sail boat finish complete level up new many win', a: 'Harvest all 18 farms. A big celebration appears, you win 100 coins, and you sail to the next island. There are 50 islands, and the puzzles get harder as you go.' },
    { g: 'Islands', q: 'When is the bonus game?', k: 'bonus game games play arcade penalty fun hoop archery', a: 'A bonus game unlocks after islands 2, 5, 7, 10, 12, 15 and 17. After that the games come around again, a little faster each time. Tap the 🎮 button to see them. A game you unlocked can be played again for 20 coins, just for fun.' },
    { g: 'Islands', q: 'What is the Golden Challenge?', k: 'gold golden crown challenge hard harder double king', a: 'Every island has one farm with a 👑. Up to island 45 its puzzle comes from 5 islands further ahead; on the last islands it is one of the hardest puzzles. It gives double coins, and beating it finishes an island quest.' },
    { g: 'Islands', q: 'What is a streak?', k: 'streak fire row flame bonus combo 3 three', a: 'Solve puzzles on the first try, one after another, to build a 🔥 streak. 3 in a row wins 10 bonus coins, 5 wins 20, 10 wins 50, and every 5 after that wins 30 more. A wrong try starts the streak again from zero.' },
    { g: 'Islands', q: 'What are island quests?', k: 'quest quests task tasks mission missions', a: 'Each island has 3 quests: open every treasure chest, get 3 stars on 15 farms, and beat the Golden Challenge. Each quest wins 25 coins. Tap the map to see them.' },
    { g: 'Islands', q: 'Where is the treasure?', k: 'treasure chest chests gift hidden path dead end open find', a: 'Treasure chests hide at the end of little paths that lead nowhere else. Walk into a chest to open it and win 15 coins. Shiny coins on the paths give 2 coins each.' },
    { g: 'Islands', q: 'What happens after island 50?', k: 'after 50 fifty end last legend finish all', a: 'You become a Math Farm Legend! The adventure keeps going on Legend islands, with the hardest puzzles from islands 46 to 50.' },
    { g: 'Islands', q: 'Why do I have to plant again?', k: 'plant again replant champion same island', a: 'In Champion mode, every farm needs 3 stars before you can sail on. If some farms got fewer stars, the island is planted again and you try for 18 perfect farms.' },
    { g: 'Rewards', q: 'What are trophies?', k: 'trophy trophies achievement badge badges collect prize', a: 'Trophies are special prizes for things like a 10 streak, finding all the treasure, or a perfect island. Tap the island name at the top left, then Trophies, to see all 20.' },
    { g: 'Rewards', q: 'What can I do with coins?', k: 'coins coin buy shop spend money pets pet earn more lots cost price puppy kitten bunny pony unicorn dragon', a: 'Tap the 🛒 button to buy animal friends and new shirts, overalls and hats. Coins come from puzzles, treasure, quests, streaks, bonus games and finishing islands.' },
    { g: 'Rewards', q: 'How do animal friends follow me?', k: 'animal friends pet pets follow following walk behind rest find gone', a: 'Up to 4 animal friends walk behind you. In the shop, tap a friend you own to bring it along or let it rest.' },
    { g: 'Rewards', q: 'How do I change my clothes?', k: 'clothes shirt hat outfit wear dress skin colour color look buy', a: 'Tap the 🛒 button, then Clothes. Tap a color you own to wear it, or buy a new one with coins.' },
    { g: 'Rewards', q: 'Where are my medals?', k: 'medal medals gem land diamond ruby', a: 'You win a medal every 10 islands: Sunflower, Sapphire, Emerald, Ruby and Diamond. See them on the start screen and on the adventure map.' },
    { g: 'Help', q: 'Who is Chicky?', k: 'chicky chick bird helper buddy yellow tips', a: 'I am Chicky, your helper! I give you tips at the bottom of the screen. Tap me to hear a tip again, or tap the ❓ button to ask me anything.' },
    { g: 'Help', q: 'There is no sound', k: 'no sound sounds silent quiet mute music volume nothing anything working work louder loud broken speaker off hear', a: 'Check that the 🔊 and 🎵 buttons at the top are on. On an iPad or iPhone, turn off silent mode, then tap the 🔊 button twice (off and on again).' },
    { g: 'Help', q: 'How do I stop the reading out loud?', k: 'stop reading read aloud voice talking quiet speech', a: 'A grown-up can turn off "Read questions aloud" on the grown-ups page. You can still tap the 🔊 button on a puzzle to hear it.' },
    { g: 'Help', q: 'The islands do not show', k: 'blank 3d not showing black screen slow loading broken internet offline online wifi', a: 'The 3D islands need an internet connection to load. If they cannot show, the farms open from a list when you tap the map button.' },
    { g: 'Help', q: 'Is my game saved?', k: 'save saved progress lost keep remember', a: 'Yes. Your progress saves on this device by itself.' },
    { g: 'For grown-ups', q: 'Where are the grown-up settings?', k: 'parent parents grown up adult settings level reset mode change choose name rename champion relaxed skip number', a: 'Tap the 👪 button and answer the grown-up question. There you can rename the player, choose a level from 1 to 50, switch Relaxed or Champion mode, turn reading aloud on or off, see the report for all 18 topics, practice any topic, or reset.' },
    { g: 'For grown-ups', q: 'How does the progress report work?', k: 'report progress percent percentage needs practice topic results child kid doing well', a: 'The grown-ups page lists all 18 JISMO topics. Each shows how many puzzles were solved on the first try. Topics below 80% after a few tries are marked "needs practice", with a Practice button.' },
    { g: 'For grown-ups', q: 'Will the questions repeat?', k: 'repeat same questions again replay variation variations bank different', a: 'Each farm has 3 prepared puzzles on every level, and no puzzle appears twice in levels 1 to 50. The game picks one that has not been seen yet, so replaying a level, or starting over from level 1, brings different puzzles before any repeat.' },
    { g: 'For grown-ups', q: 'What does the game teach?', k: 'teach topics jismo syllabus curriculum math grade learn about', a: 'The 18 farms are the 18 topics of the JISMO Grade 1 course outline, from number sense and story problems to geometry, time, money, data and multi-step thinking. Levels 1 to 5 match the Grade 1 practice papers, and later levels stretch further.' },
    { g: 'Friends', q: 'How do I play with my friends?', k: 'friends friend play together online group class classmates join invite with others multiplayer', a: 'Tap the 👫 Friends button. There you can see the leaderboard, chat with your friends and visit their islands. A grown-up sets it up first in 👪 For Grown-ups, with an invite code. The 👫 button shows up when the game runs on your family website.' },
    { g: 'Friends', q: 'What is the leaderboard?', k: 'leaderboard leader board rank ranking first place top best score who winning most stars week weekly', a: 'The leaderboard shows the friends in your group. Tap Level, Stars, This week or Trophies to change the order. This week counts the stars won since Monday, so everyone can be first! Win stars by solving puzzles on the first try.' },
    { g: 'Friends', q: 'How do I chat with my friends?', k: 'chat message messages talk send type write say hello hi text', a: 'Tap 👫, then 💬 Chat. Tap a quick message or type your own, then tap Send. Tap 🔊 next to a message to hear it. Please use kind words!' },
    { g: 'Friends', q: 'Why was my message not sent?', k: 'message not sent blocked why cannot cant send oops kind words link phone number email', a: 'To keep everyone safe and happy, the chat stops unkind words, links, phone numbers, emails, usernames, home addresses and school names, and asking friends for them. Chicky tells you why. Try saying it a nicer way! Your grown-up can read the chat too.' },
    { g: 'Friends', q: 'How do I visit a friend’s island?', k: 'visit island friend friends look see farm farms go to trip cheer heart', a: 'Tap 👫, then Visit next to a friend. You can walk around and look at their farms, but you cannot take their coins. Tap ❤️ Cheer to send a sticker, and tap 🏠 Home to go back to your island.' },
    { g: 'Friends', q: 'Can my friends see my island?', k: 'private privacy see my island hide hidden visit friends see me lock', a: 'Only if a grown-up said yes. A grown-up chooses in 👪 For Grown-ups whether friends can visit your island, see you on the leaderboard and chat with you. Friends can only look. They cannot change anything.' },
    { g: 'For grown-ups', q: 'How does a grown-up start or join a friend group?', k: 'grown up parent start create make join invite code host key group friends approve say yes setup set up', a: 'Tap 👪, answer the question, then tap 👫 Friends settings. To join, type the invite code from the family that started the group; they say yes to your child. To start a group you need the host key from your IT team, then you share your invite code and say yes to each child.' }
  ];
  const QUICK = [0, 2, 16, 7, 8, 18, 19, 26];
  const BGUIDE = [['🏝️', 'Island name', 'Adventure map and trophies'], ['🌾', 'Harvest bar', 'Farms harvested here'], ['$', 'Coins', 'Spend them in the shop'], ['⭐', 'Stars', 'All the stars you won'], ['🔥', 'Streak', 'First-try answers in a row'], ['🎮', 'Bonus games', 'Games you unlocked'], ['🛒', 'Shop', 'Animal friends and clothes'], ['👫', 'Friends', 'Leaderboard, chat and visits'], ['❓', 'Help', 'Ask Chicky anything'], ['🎵', 'Music', 'Music on or off'], ['🔊', 'Sound', 'Sound effects on or off'], ['👪', 'Grown-ups', 'Report and settings'], ['🗺️', 'Map', 'Big map and island quests'], ['🐾', 'Find', 'Paw prints to a farm'], ['⟲', 'Turn', 'Spin the view'], ['＋', 'Zoom', 'Closer or farther'], ['🎯', 'Back to me', 'Camera follows you'], ['🐥', 'Chicky', 'Tips; tap to hear again'], ['🐥', 'Hint', 'A clue for the puzzle'], ['✕', 'Close', 'Back to the island'], ['🧺', 'Harvest', 'Finish the farm'], ['🔁', 'Practice', 'Play a harvested farm again'], ['🌱', 'Try a new one', 'A fresh puzzle after learning']];
  const STOP = new Set('a an the i to do does did how what where when why who is are was can could my me you your it its of in on at for and or with this that be get got am there please want know tell not t see'.split(' '));
  const words = t => String(t).toLowerCase().replace(/n['’]t\b/g, 'nt').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
  /* score = sum over the child's words of how rare the word is across all answers (rare words like "gold" count more than "farm") */
  let BAGS = null, DF = null;
  const stem = w => w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w;
  function searchFAQ(text) {
    if (!BAGS) { BAGS = FAQ.map(f => new Set(words(f.k + ' ' + f.q).map(stem))); DF = {}; BAGS.forEach(bag => bag.forEach(w => { DF[w] = (DF[w] || 0) + 1; })); }
    const qw = [...new Set(words(text).map(stem))]; if (!qw.length) return [];
    const idf = w => Math.log(1 + FAQ.length / (DF[w] || FAQ.length));
    return BAGS.map((bag, i) => { let sc = 0; qw.forEach(w => { if (bag.has(w)) sc += idf(w); else if (w.length >= 4) { const hit = [...bag].find(b => b.length >= 4 && (b.startsWith(w.slice(0, 4)) || w.startsWith(b.slice(0, 4)))); if (hit) sc += idf(hit) * 0.5; } }); return { i, sc }; })
      .filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, 3);
  }
  function renderHelp() {
    $('#askChips').innerHTML = QUICK.map(i => `<button class="chip2" data-faq="${i}">${esc(FAQ[i].q)}</button>`).join('');
    $('#bGuide').innerHTML = BGUIDE.map(([ic, n, d]) => `<div class="bg"><span class="bgi" aria-hidden="true">${ic === '$' ? '<span class="coin-i">$</span>' : ic}</span><span><b>${esc(n)}</b><small>${esc(d)}</small></span></div>`).join('');
    const groups = [...new Set(FAQ.map(f => f.g))];
    $('#faqList').innerHTML = groups.map(g => `<div class="fg"><h4>${esc(g)}</h4>${FAQ.map((f, i) => f.g === g ? `<details data-i="${i}"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>` : '').join('')}</div>`).join('');
  }
  function showAnswer(i, more) {
    const f = FAQ[i]; const box = $('#askAns');
    box.innerHTML = `<span class="af" aria-hidden="true">🐥</span><div class="ab"><b>${esc(f.q)}</b><p>${esc(f.a)}</p>${more && more.length ? `<div class="more"><small>You might also like:</small>${more.map(j => `<button class="chip2" data-faq="${j}">${esc(FAQ[j].q)}</button>`).join('')}</div>` : ''}</div><button class="say" id="ansSay" aria-label="Read the answer aloud">🔊</button>`;
    box.hidden = false; box.dataset.i = i; speak(f.a);
    $('#ansSay').onclick = () => { audio.unlock(); tts.say(f.q + '. ' + f.a); };
  }
  function openHelp() { renderHelp(); $('#askAns').hidden = true; $('#askIn').value = ''; $('#help').hidden = false; }
  $('#helpBtn').onclick = () => { sfx('tap'); openHelp(); };
  $('#helpX').onclick = () => { tts.stop(); $('#help').hidden = true; };
  $('#askForm').addEventListener('submit', e => {
    e.preventDefault(); const v = $('#askIn').value.trim(); if (!v) { $('#askIn').focus(); return; } sfx('tap');
    const r = searchFAQ(v);
    if (r.length) showAnswer(r[0].i, r.slice(1).map(x => x.i));
    else { const box = $('#askAns'); box.innerHTML = `<span class="af" aria-hidden="true">🐥</span><div class="ab"><b>Hmm, I am not sure about that one.</b><p>Try one of these questions, or ask a grown-up to tap 👪.</p><div class="more">${QUICK.slice(0, 4).map(j => `<button class="chip2" data-faq="${j}">${esc(FAQ[j].q)}</button>`).join('')}</div></div>`; box.hidden = false; speak('Hmm, I am not sure about that one. Try one of these questions.'); }
  });
  $('#help').addEventListener('click', e => { const c = e.target.closest('[data-faq]'); if (!c) return; sfx('tap'); const i = +c.dataset.faq; showAnswer(i, []); $('#askAns').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); });
  $('#faqList').addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && d.open) speak(FAQ[+d.dataset.i].a); }, true);
  $('#helpIntro').onclick = () => { sfx('tap'); tts.stop(); $('#help').hidden = true; openIntro(0); };
  $('#helpTour').onclick = () => { sfx('tap'); tts.stop(); $('#help').hidden = true; setTimeout(startTour, 250); };

  /* ---------- guided tour of every button ---------- */
  const TOUR = [
    ['#landChip', 'This is your island and level. Tap it to see the adventure map and your trophies.'],
    ['.chip.prog', 'This bar fills up as you harvest farms. Fill it to 18 to sail to the next island!'],
    ['.chip.coins', 'These are your coins. Win them by solving puzzles and finding treasure.'],
    ['.chip.stars', 'These are all the stars you have won. Solve a puzzle on the first try for 3 stars!'],
    ['#bonusBtn', 'Bonus games live here. A new one unlocks every 2 or 3 islands.'],
    ['#shopBtn', 'The shop! Buy animal friends and new clothes with your coins.'],
    ['#friendsBtn', 'Your friends! See the leaderboard, send kind messages and visit their islands.'],
    ['#helpBtn', 'Stuck? Tap the question mark and ask me anything.'],
    ['#musBtn', 'Turn the music on or off.'],
    ['#sndBtn', 'Turn the sound effects on or off.'],
    ['#parBtn', 'This one is for grown-ups: the progress report and settings.'],
    ['#miniBtn', 'Your map. The dark parts are still a mystery! Tap it for the big map and your island quests.'],
    ['#wayBtn', 'Lost? Tap Find and follow the paw prints to a farm.'],
    ['#ctrl .cgrid', 'Turn the view, and zoom in or out.'],
    ['#zMe', 'Tap the target to bring the camera back to you.'],
    ['#buddy', 'And I am Chicky! I give you tips. Tap me to hear a tip again. Now go and find those farms!']
  ];
  let tourI = 0, tourList = [];
  function startTour() {
    $('#buddy').classList.remove('min');
    tourList = TOUR.filter(([sel]) => { const e = $(sel); return e && e.getClientRects().length > 0 && !e.closest('[hidden]'); });
    if (!tourList.length) { greet(); return; }
    tourI = 0; $('#tour').hidden = false; showTour();
  }
  function showTour() {
    const [sel, txt] = tourList[tourI]; const e = $(sel); const a = app.getBoundingClientRect(), r = e.getBoundingClientRect(), pad = 6;
    Object.assign($('#tHole').style, { left: (r.left - a.left - pad) + 'px', top: (r.top - a.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
    $('#tText').textContent = txt; $('#tCount').textContent = `${tourI + 1} of ${tourList.length}`; $('#tNext').textContent = tourI === tourList.length - 1 ? 'Let’s go! ✓' : 'Next ▶';
    const tip = $('#tTip'); const tw = Math.min(340, a.width - 32); tip.style.width = tw + 'px';
    const th = tip.offsetHeight; let top = r.bottom - a.top + 16; if (top + th > a.height - 12) top = r.top - a.top - th - 16; top = Math.max(12, Math.min(a.height - th - 12, top));
    let left = r.left - a.left + r.width / 2 - tw / 2; left = Math.max(16, Math.min(a.width - tw - 16, left));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
    speak(txt);
  }
  function endTour() { tts.stop(); $('#tour').hidden = true; greet(); }
  $('#tNext').onclick = () => { sfx('tap'); if (tourI < tourList.length - 1) { tourI++; showTour(); } else endTour(); };
  $('#tSkip').onclick = () => { sfx('tap'); endTour(); };
  window.addEventListener('resize', () => { if (!$('#tour').hidden) showTour(); });

  /* =====================================================================
     misc controls, title, tutorial, boot
     ===================================================================== */
  $('#sndBtn').onclick = () => { audio.unlock(); S.settings.sound = !S.settings.sound; save(); renderHUD(); if (S.settings.sound) sfx('tap'); };
  $('#musBtn').onclick = () => { audio.unlock(); S.settings.music = !S.settings.music; save(); renderHUD(); syncMusic(); };
  $('#buddy').onclick = () => { audio.unlock(); buddy($('#bsay').textContent, true); };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#tour').hidden) endTour(); else if (!$('#intro').hidden) closeIntro(); else if (!$('#help').hidden) $('#help').hidden = true; else if (!$('#qwrap').hidden) closeQ(); else if (!$('#mapov').hidden) $('#mapov').hidden = true; else if (!$('#shop').hidden) $('#shop').hidden = true;
    else if (!$('#hub').hidden) $('#hub').hidden = true; else if (!$('#journey').hidden) $('#journey').hidden = true; else if (!$('#gate').hidden) $('#gate').hidden = true; else if (!$('#parents').hidden) $('#parX').click();
  });
  function updTitle() {
    $('#tName').textContent = S.name + (/s$/i.test(S.name) ? '’' : '’s');
    let h = ''; for (let b = 0; b < 5; b++) { const got = S.medals.includes(b); h += `<span class="md${got ? '' : ' no'}">${gem(b)}${esc(MEDAL[b].n)}</span>`; }
    if (S.legend) h += `<span class="md">${gem(5)}Legend ×${S.legend}</span>`;
    $('#tmedals').innerHTML = h;
    $('#playBtn').textContent = S.stars || S.level > 1 ? `▶ Play ${lvlLabel(S.level).replace(/ of \d+/, '')}` : '▶ Let’s play!';
  }
  function greet() {
    if (V) { buddyAuto(); return; }
    if (!W) { buddy(`Hi ${S.name}! Tap the map button to choose a farm.`, true); return; }
    const n = doneCount();
    buddy(n ? `Welcome back, ${S.name}! ${18 - n} ${18 - n === 1 ? 'farm is' : 'farms are'} waiting on this island.` : `Hi ${S.name}! Welcome to ${BIO[bioOf(S.level)].name}. Look for the ❓ bubbles. They are hidden farms!`, true);
    checkQuests(); if (n === 18) setTimeout(levelComplete, 700);
    setTimeout(checkTrophies, 1500);
  }
  $('#playBtn').onclick = () => {
    audio.unlock(); sfx('level'); $('#title').hidden = true; syncMusic();
    if (!S.tut) { openIntro(0); return; }
    greet();
  };
  $('#howBtn').onclick = () => { audio.unlock(); sfx('tap'); $('#title').hidden = true; syncMusic(); openIntro(0); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { tts.stop(); if (W && !V) { S.world = W.save(); } save(); ftouch(true); } syncMusic(); });
  function layoutVars() { app.style.setProperty('--hudH', $('#hud').offsetHeight + 'px'); }
  window.addEventListener('resize', () => { fx.size(); layoutVars(); });
  setInterval(() => { if (W && $('#title').hidden && !V) { S.world = W.save(); if (dirty) { dirty = false; } save(); if (!busy()) checkTrophies(); } ftouch(false); }, 5000);

  /* ---------- visiting a friend's island (look only: no puzzles, coins or saving) ---------- */
  function visitFriend(d) {
    if (!W || !d) return false;
    if (!V) { try { S.world = W.save(); save(); } catch (e) { } }
    const lvl = Math.max(1, d.level | 0); const plots = Array.isArray(d.plots) && d.plots.length === 18 ? d.plots : newPlots();
    V = { id: d.id, name: String(d.name || 'Friend'), level: lvl, plots, stars: d.stars | 0 };
    app.classList.add('visiting'); hidePrompt(); nearSi = -1; quietUntil = performance.now() + 1800; setTimeout(layoutVars, 30);
    try {
      W.setPlayer(S.name, colorsOf());
      W.build(lvl, TOPICS, plots, d.world && d.world.level === lvl ? d.world : null, { gold: goldTopic(lvl), visit: true });
      W.harvested(plots.filter(p => p.done).length, true); W.setPets(S.follow);
      W.setGuest({ name: V.name, colors: colorsOfWear(d.wear), pets: (d.follow || []).filter(e => PETS.some(p => p.e === e)) });
    } catch (e) { leaveVisit(); return false; }
    sfx('level'); buddy(`Welcome to ${V.name}’s island! Walk around and look at ${V.name}’s farms. Tap 🏠 Home when you are done.`, true);
    return true;
  }
  function leaveVisit() { if (!V) return false; V = null; app.classList.remove('visiting'); $('#visitBar').hidden = true; hidePrompt(); buildLevel(); setTimeout(layoutVars, 30); return true; }
  function goHome() { if (!leaveVisit()) return; sfx('level'); buddy(`Welcome home, ${S.name}!`, true); }

  /* ================================================================ auth UI */
  const $auth = s => document.querySelector(s);
  function showAuthMsg(msg) { const el = $auth('#authMsg'); el.textContent = msg; el.hidden = !msg; }
  function showAuth() { $auth('#auth').hidden = false; $auth('#title').hidden = true; }
  function hideAuth() { $auth('#auth').hidden = true; }
  async function tryAutoLogin() {
    if (!authToken) { showAuth(); return; }
    try {
      const r = await fetch('api/auth/me', { headers: authHeaders(), cache: 'no-store', credentials: 'omit' });
      if (r.ok) {
        const d = await r.json();
        if (d.progress && d.progress.v === 2) S = merge(d.progress);
        S.name = d.user.username;
        hideAuth(); $auth('#title').hidden = false; init();
        return;
      }
    } catch(e){}
    setAuth(null); showAuth();
  }
  $auth('#showRegister').onclick = () => { $auth('#authLogin').hidden = true; $auth('#authRegister').hidden = false; showAuthMsg(''); };
  $auth('#showLogin').onclick = () => { $auth('#authRegister').hidden = true; $auth('#authLogin').hidden = false; showAuthMsg(''); };
  $auth('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); showAuthMsg('');
    const u = $auth('#loginUser').value.trim(), p = $auth('#loginPass').value;
    if (!u || !p) { showAuthMsg('Please fill in all fields.'); return; }
    $auth('#loginBtn').disabled = true;
    try {
      const r = await fetch('api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }), cache: 'no-store', credentials: 'omit' });
      const d = await r.json();
      if (r.ok) {
        setAuth(d.token);
        if (d.progress && d.progress.v === 2) S = merge(d.progress);
        S.name = d.user.username;
        hideAuth(); $auth('#title').hidden = false; init();
      } else showAuthMsg(d.message || 'Login failed.');
    } catch(e) { showAuthMsg('Cannot reach the server. Try again.'); }
    $auth('#loginBtn').disabled = false;
  });
  $auth('#registerForm').addEventListener('submit', async e => {
    e.preventDefault(); showAuthMsg('');
    const u = $auth('#regUser').value.trim(), p = $auth('#regPass').value, p2 = $auth('#regPass2').value;
    if (!u || !p) { showAuthMsg('Please fill in all fields.'); return; }
    if (p !== p2) { showAuthMsg('Passwords do not match.'); return; }
    if (p.length < 6) { showAuthMsg('Password must be at least 6 characters.'); return; }
    $auth('#regBtn').disabled = true;
    try {
      const r = await fetch('api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }), cache: 'no-store', credentials: 'omit' });
      const d = await r.json();
      if (r.ok) {
        setAuth(d.token);
        S = fresh(); S.name = d.user.username;
        hideAuth(); $auth('#title').hidden = false; init();
      } else showAuthMsg(d.message || 'Registration failed.');
    } catch(e) { showAuthMsg('Cannot reach the server. Try again.'); }
    $auth('#regBtn').disabled = false;
  });

  function init() {
    fx.size(); makeWorld(); buildLevel(); updTitle(); renderHUD(); buddyAuto(); layoutVars(); setTimeout(layoutVars, 600);
    if (hasFriends()) {
      try {
        Friends.init({
          get S() { return S; }, save, toast, sfx, speak, say: (t, done) => { audio.unlock(); tts.say(t, done); }, buddy, esc, busy, openGate, openParents,
          avatar: w => { const c = {}; Object.keys(WEAR).forEach(k => { c[k] = wearHex(w, k); }); return avatarSVG(c); },
          isTitle: () => !$('#title').hidden, visiting: () => V, visit: visitFriend, goHome, has3D: () => !!W,
          progress: () => ({ level: S.level, stars: S.stars, coins: S.coins, trophies: Object.keys(S.trophies).length, medals: S.medals.length, legend: S.legend, bestStreak: S.bestStreak, plots: S.plots, world: W && !V ? W.save() : S.world, wear: S.wear, follow: S.follow }),
          layout: layoutVars,
          authToken: () => authToken
        });
      } catch (e) { console.warn('friends module failed to start', e); }
    }
  }
  const hot = window.claude && window.claude.hot;
  try { if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ state: (W && !V && (S.world = W.save()), S) })); } catch (e) { }
  function boot(data) { if (data && data.state && data.state.v === 2) S = merge(data.state); tryAutoLogin(); }
  if (hot && typeof hot.ready === 'function') hot.ready(boot); else boot((hot && hot.data) || {});
  window.__game = { get S() { return S; }, get Q() { return Q; }, W: () => W, visitFriend, goHome, get V() { return V; }, openQ, levelComplete, harvest, playBonus, travel, renderHub, arc: () => arcade(), pickVariant, openIntro, startTour, openHelp, searchFAQ, checkTrophies, quests, TROPHIES, FAQ };
})();
