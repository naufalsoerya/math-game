'use strict';
/* =====================================================================
   Bonus skill games — one is unlocked every 2–3 levels.
   Each game gets harder every time it comes back (round = times played).
   ===================================================================== */
const Arcade = (() => {
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  const emo = (c, e, x, y, s, rot, flip) => { c.save(); c.fillStyle = '#000'; c.translate(x, y); if (rot) c.rotate(rot); if (flip) c.scale(-1, 1); c.font = `${s}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 0, s * 0.06); c.restore(); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const bigText = (c, txt, x, y, s, col) => { c.save(); c.font = `800 ${s}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = s * 0.16; c.strokeStyle = '#2B2340'; c.lineJoin = 'round'; c.strokeText(txt, x, y); c.fillStyle = col || '#FFFFFF'; c.fillText(txt, x, y); c.restore(); };

  /* ---------------- 1. Penalty Kick ---------------- */
  function penalty(A) {
    const g = { score: 0 };
    g.init = r => Object.assign(g, { r, kick: 0, phase: 'aim', ang: -1, dir: 1, kx: 0.5, kd: 1, ball: null, msg: '', msgT: 0, angSpeed: 1.35 + 0.3 * r, kv: 0.32 + 0.11 * r, score: 0, done: false });
    const geo = () => { const W = A.W(), H = A.H(); const gw = Math.min(W * 0.66, H * 1.05), x0 = (W - gw) / 2, gy = H * 0.2, gh = Math.min(H * 0.24, gw * 0.36); return { W, H, gw, x0, gy, gh, bx: W / 2, by: H * 0.84 }; };
    g.info = () => `Kick ${Math.min(g.kick + 1, 5)} of 5`;
    g.coins = () => g.score * 8;
    g.update = dt => {
      const G = geo(); const kspd = g.phase === 'fly' && g.ball && Math.abs(g.ball.rel - g.kx) < 0.28 ? g.kv * 2.6 : g.kv;
      if (g.phase === 'fly' && g.ball && Math.abs(g.ball.rel - g.kx) < 0.28) g.kd = Math.sign(g.ball.rel - g.kx) || g.kd;
      g.kx += g.kd * kspd * dt; if (g.kx > 0.86) { g.kx = 0.86; g.kd = -1; } if (g.kx < 0.14) { g.kx = 0.14; g.kd = 1; }
      if (g.phase === 'aim') { g.ang += g.dir * g.angSpeed * dt; if (g.ang > 1) { g.ang = 1; g.dir = -1; } if (g.ang < -1) { g.ang = -1; g.dir = 1; } }
      if (g.phase === 'fly') { g.ball.t += dt * 1.9; if (g.ball.t >= 1) { const rel = g.ball.rel; if (rel < 0.03 || rel > 0.97) { g.msg = 'Wide!'; A.sfx('thunk'); } else if (Math.abs(rel - g.kx) < 0.12) { g.msg = 'Saved!'; A.sfx('thunk'); A.shake(6); } else { g.msg = 'GOAL!'; g.score++; A.sfx('cheer'); A.burst(G.x0 + rel * G.gw, G.gy + G.gh * 0.5, 40); } g.phase = 'result'; g.msgT = 1.3; } }
      if (g.phase === 'result') { g.msgT -= dt; if (g.msgT <= 0) { g.kick++; if (g.kick >= 5) { g.done = true; } else { g.phase = 'aim'; g.ball = null; g.msg = ''; } } }
    };
    g.down = () => { if (g.phase !== 'aim') return; const G = geo(); const tx = G.W / 2 + g.ang * G.gw * 0.56; g.ball = { t: 0, tx, ty: G.gy + G.gh * rnd(0.3, 0.75), rel: (tx - G.x0) / G.gw }; g.phase = 'fly'; A.sfx('kick'); };
    g.draw = c => {
      const G = geo(); const { W, H } = G;
      let gr = c.createLinearGradient(0, 0, 0, H * 0.42); gr.addColorStop(0, '#5BB6F0'); gr.addColorStop(1, '#BFE6FA'); c.fillStyle = gr; c.fillRect(0, 0, W, H * 0.42);
      for (let row = 0; row < 3; row++) for (let i = 0; i < W / 16; i++) { c.fillStyle = ['#E5484D', '#FFC53D', '#3E7BFA', '#2FA35A', '#8E4EC6', '#FFFFFF'][(i * 7 + row * 3) % 6]; c.beginPath(); c.arc(i * 16 + (row % 2) * 8, H * 0.1 + row * 14, 5, 0, 7); c.fill(); }
      c.fillStyle = '#5A4B8C'; c.fillRect(0, H * 0.17, W, 10);
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#5FB34A' : '#6CC055'; c.fillRect(0, H * 0.42 + i * (H * 0.058), W, H * 0.058 + 1); }
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.strokeRect(G.x0 - G.gw * 0.12, G.gy + G.gh, G.gw * 1.24, H * 0.16); c.beginPath(); c.arc(W / 2, G.by - 6, 5, 0, 7); c.fillStyle = '#fff'; c.fill();
      // net
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(G.x0, G.gy, G.gw, G.gh); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5;
      for (let x = G.x0; x <= G.x0 + G.gw; x += 16) { c.beginPath(); c.moveTo(x, G.gy); c.lineTo(x, G.gy + G.gh); c.stroke(); } for (let y = G.gy; y <= G.gy + G.gh; y += 14) { c.beginPath(); c.moveTo(G.x0, y); c.lineTo(G.x0 + G.gw, y); c.stroke(); }
      c.fillStyle = '#fff'; c.strokeStyle = '#2B2340'; c.lineWidth = 3; c.fillRect(G.x0 - 9, G.gy - 9, 9, G.gh + 9); c.strokeRect(G.x0 - 9, G.gy - 9, 9, G.gh + 9); c.fillRect(G.x0 + G.gw, G.gy - 9, 9, G.gh + 9); c.strokeRect(G.x0 + G.gw, G.gy - 9, 9, G.gh + 9); c.fillRect(G.x0 - 9, G.gy - 9, G.gw + 18, 9); c.strokeRect(G.x0 - 9, G.gy - 9, G.gw + 18, 9);
      // keeper
      const kx = G.x0 + g.kx * G.gw, ky = G.gy + G.gh, kw = G.gw * 0.2, kh = G.gh * 0.82;
      c.fillStyle = '#2B2340'; rr(c, kx - kw * 0.28, ky - kh * 0.62, kw * 0.56, kh * 0.62, 8); c.fill(); c.fillStyle = '#F08A24'; rr(c, kx - kw * 0.25, ky - kh * 0.6, kw * 0.5, kh * 0.4, 8); c.fill();
      c.fillStyle = '#F2C29B'; c.beginPath(); c.arc(kx, ky - kh * 0.78, kh * 0.17, 0, 7); c.fill(); c.strokeStyle = '#2B2340'; c.lineWidth = 3; c.stroke();
      c.strokeStyle = '#F08A24'; c.lineWidth = kh * 0.09; c.lineCap = 'round'; c.beginPath(); c.moveTo(kx - kw * 0.22, ky - kh * 0.55); c.lineTo(kx - kw * 0.5, ky - kh * 0.85); c.moveTo(kx + kw * 0.22, ky - kh * 0.55); c.lineTo(kx + kw * 0.5, ky - kh * 0.85); c.stroke();
      emo(c, '🧤', kx - kw * 0.52, ky - kh * 0.9, kh * 0.22); emo(c, '🧤', kx + kw * 0.52, ky - kh * 0.9, kh * 0.22, 0, true);
      // aim + ball
      if (g.phase === 'aim') { const tx = W / 2 + g.ang * G.gw * 0.56, ty = G.gy + G.gh * 0.5; c.setLineDash([10, 10]); c.strokeStyle = '#FFFFFF'; c.lineWidth = 5; c.beginPath(); c.moveTo(G.bx, G.by - 20); c.lineTo(tx, ty); c.stroke(); c.setLineDash([]); c.fillStyle = '#FFC53D'; c.beginPath(); c.arc(tx, ty, 12, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = '#2B2340'; c.stroke(); }
      let bx = G.bx, by = G.by - 18, bs = Math.min(64, H * 0.08); if (g.ball) { const t = Math.min(1, g.ball.t); bx = G.bx + (g.ball.tx - G.bx) * t; by = (G.by - 18) + (g.ball.ty - G.by + 18) * t - Math.sin(t * Math.PI) * H * 0.08; bs *= 1 - 0.45 * t; }
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(bx, g.ball ? by + bs * 0.9 : G.by + 8, bs * 0.45, bs * 0.15, 0, 0, 7); c.fill(); emo(c, '⚽', bx, by, bs, g.ball ? g.ball.t * 8 : 0);
      if (g.msg) bigText(c, g.msg, W / 2, H * 0.58, Math.min(90, W * 0.12), g.msg === 'GOAL!' ? '#FFC53D' : '#FFFFFF');
    };
    return g;
  }

  /* ---------------- 2. Shoot the Balls ---------------- */
  function balls(A) {
    const g = { score: 0 }; const COLS = ['#E5484D', '#3E7BFA', '#2FA35A', '#F5B400', '#8E4EC6', '#F08A24'];
    g.init = r => Object.assign(g, { r, time: 30, list: [], spawn: 0, shots: [], aim: -Math.PI / 2, score: 0, done: false });
    g.info = () => `${Math.ceil(Math.max(0, g.time))} sec`; g.coins = () => Math.min(50, g.score * 2);
    const mk = () => { const W = A.W(), H = A.H(); const s = Math.min(W, H) / 700; const typ = Math.random() < 0.1 + 0.02 * g.r ? 'bomb' : Math.random() < 0.06 ? 'gold' : 'ball'; const R = (typ === 'ball' ? rnd(26, 42) : 32) * s * 1.2; const sp = rnd(90, 170) * (1 + 0.15 * g.r) * s * 1.3; const a = rnd(0, Math.PI * 2); return { x: rnd(R + 10, W - R - 10), y: rnd(90 + R, H * 0.6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, R, typ, col: pick(COLS), born: 0 }; };
    g.update = dt => {
      const W = A.W(), H = A.H(); g.time -= dt; if (g.time <= 0) { g.done = true; return; }
      g.spawn -= dt; if (g.spawn <= 0 && g.list.length < 5 + g.r) { g.list.push(mk()); g.spawn = rnd(0.4, 0.9); }
      g.list.forEach(b => { b.born = Math.min(1, b.born + dt * 3); b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < b.R) { b.x = b.R; b.vx = Math.abs(b.vx); } if (b.x > W - b.R) { b.x = W - b.R; b.vx = -Math.abs(b.vx); } if (b.y < 80 + b.R) { b.y = 80 + b.R; b.vy = Math.abs(b.vy); } if (b.y > H - 130 - b.R) { b.y = H - 130 - b.R; b.vy = -Math.abs(b.vy); } });
      g.shots.forEach(s => { s.t += dt; }); g.shots = g.shots.filter(s => s.t < 0.25);
    };
    g.down = (x, y) => {
      const W = A.W(), H = A.H(); const cx = W / 2, cy = H - 60; g.aim = Math.atan2(y - cy, x - cx); g.shots.push({ x, y, t: 0 });
      let best = -1, bd = 1e9; g.list.forEach((b, i) => { const d = Math.hypot(b.x - x, b.y - y); if (d < b.R + 14 && d < bd) { bd = d; best = i; } });
      if (best < 0) { A.sfx('pew'); return; }
      const b = g.list[best]; g.list.splice(best, 1);
      if (b.typ === 'bomb') { g.score = Math.max(0, g.score - 3); A.sfx('boom'); A.shake(12); A.float('−3', b.x, b.y, '#E5484D'); A.burst(b.x, b.y, 30, ['#2B2340', '#5F5577', '#F08A24']); }
      else if (b.typ === 'gold') { g.score += 5; A.sfx('coin'); A.float('+5', b.x, b.y, '#FFC53D'); A.burst(b.x, b.y, 30, ['#FFC53D', '#FFF59E']); }
      else { g.score += 1; A.sfx('pop'); A.float('+1', b.x, b.y); A.burst(b.x, b.y, 18, [b.col, '#ffffff']); }
    };
    g.draw = c => {
      const W = A.W(), H = A.H(); const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3B2E7A'); gr.addColorStop(1, '#7D6CC9'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc((i * 137) % W, (i * 89) % H, 2 + (i % 3), 0, 7); c.fill(); }
      g.list.forEach(b => { const R = b.R * (0.4 + 0.6 * b.born); if (b.typ === 'bomb') { emo(c, '💣', b.x, b.y, R * 2); return; } const rg = c.createRadialGradient(b.x - R * 0.35, b.y - R * 0.35, R * 0.1, b.x, b.y, R); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.25, b.typ === 'gold' ? '#FFE680' : b.col); rg.addColorStop(1, b.typ === 'gold' ? '#C98F00' : b.col); c.fillStyle = rg; c.beginPath(); c.arc(b.x, b.y, R, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = '#2B2340'; c.stroke(); if (b.typ === 'gold') emo(c, '⭐', b.x, b.y, R); });
      const cx = W / 2, cy = H - 60; g.shots.forEach(s => { c.strokeStyle = `rgba(255,240,140,${1 - s.t * 4})`; c.lineWidth = 6; c.beginPath(); c.moveTo(cx + Math.cos(g.aim) * 50, cy + Math.sin(g.aim) * 50); c.lineTo(s.x, s.y); c.stroke(); c.beginPath(); c.arc(s.x, s.y, 18 * (1 - s.t * 2), 0, 7); c.stroke(); });
      c.save(); c.translate(cx, cy); c.rotate(g.aim + Math.PI / 2); c.fillStyle = '#5F5577'; rr(c, -14, -62, 28, 62, 8); c.fill(); c.lineWidth = 3; c.strokeStyle = '#2B2340'; c.stroke(); c.restore();
      c.fillStyle = '#FFC53D'; c.beginPath(); c.arc(cx, cy, 30, 0, 7); c.fill(); c.lineWidth = 4; c.strokeStyle = '#2B2340'; c.stroke();
    };
    return g;
  }

  /* ---------------- 3. Fruit Catch ---------------- */
  function fruit(A) {
    const g = { score: 0 }; const FR = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍐', '🍉'];
    g.init = r => Object.assign(g, { r, time: 35, lives: 3, bx: A.W() / 2, tx: A.W() / 2, items: [], spawn: 0.5, score: 0, done: false, hurt: 0 });
    g.info = () => `${'❤️'.repeat(Math.max(0, g.lives))} ${Math.ceil(Math.max(0, g.time))}s`; g.coins = () => Math.min(50, g.score * 2);
    g.update = dt => {
      const W = A.W(), H = A.H(); const s = Math.min(W, H) / 700; g.time -= dt; if (g.time <= 0 || g.lives <= 0) { g.done = true; return; }
      g.bx += (g.tx - g.bx) * Math.min(1, dt * 14); g.hurt = Math.max(0, g.hurt - dt);
      g.spawn -= dt; if (g.spawn <= 0) { const rock = Math.random() < 0.2 + 0.03 * g.r; g.items.push({ x: rnd(40, W - 40), y: 70, v: rnd(170, 260) * (1 + 0.12 * g.r + (35 - g.time) * 0.012) * s * 1.2, e: rock ? '🪨' : pick(FR), rock, rot: rnd(-1, 1) }); g.spawn = Math.max(0.25, 0.7 - 0.05 * g.r - (35 - g.time) * 0.008); }
      const by = H - 90 * s - 30, bw = 150 * s + 40;
      g.items.forEach(it => { it.y += it.v * dt; it.rot += dt; if (!it.gone && it.y > by - 20 && it.y < by + 30 && Math.abs(it.x - g.bx) < bw / 2) { it.gone = true; if (it.rock) { g.lives--; g.hurt = 0.6; A.sfx('hit'); A.shake(10); A.float('Ouch!', it.x, by - 40, '#E5484D'); } else { g.score++; A.sfx('pop'); A.float('+1', it.x, by - 40); A.burst(it.x, by - 10, 10); } } });
      g.items = g.items.filter(it => !it.gone && it.y < H + 60);
    };
    g.move = x => { g.tx = Math.max(60, Math.min(A.W() - 60, x)); }; g.down = x => { g.move(x); };
    g.draw = c => {
      const W = A.W(), H = A.H(); const s = Math.min(W, H) / 700; const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8FD3F7'); gr.addColorStop(0.7, '#D8F1FF'); gr.addColorStop(0.7, '#7CC85A'); gr.addColorStop(1, '#5FAF45'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      emo(c, '🌳', W * 0.12, H * 0.62, 120 * s + 30); emo(c, '🌳', W * 0.88, H * 0.6, 140 * s + 30); emo(c, '☀️', W * 0.85, H * 0.18, 80 * s + 20);
      g.items.forEach(it => emo(c, it.e, it.x, it.y, 56 * s + 16, it.rot));
      const by = H - 90 * s - 30, bw = 150 * s + 40, bh = 70 * s + 20;
      c.save(); if (g.hurt > 0) c.globalAlpha = 0.6 + 0.4 * Math.sin(g.hurt * 40); c.fillStyle = '#C98A4A'; c.beginPath(); c.moveTo(g.bx - bw / 2, by); c.lineTo(g.bx + bw / 2, by); c.lineTo(g.bx + bw * 0.4, by + bh); c.lineTo(g.bx - bw * 0.4, by + bh); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = '#2B2340'; c.stroke();
      c.strokeStyle = '#8A5A2E'; c.lineWidth = 3; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(g.bx - bw / 2 + i * bw / 4 * 0.98, by + 4); c.lineTo(g.bx - bw * 0.4 + i * bw * 0.8 / 4, by + bh - 4); c.stroke(); } c.beginPath(); c.moveTo(g.bx - bw * 0.45, by + bh * 0.5); c.lineTo(g.bx + bw * 0.45, by + bh * 0.5); c.stroke(); c.restore();
    };
    return g;
  }

  /* ---------------- 4. Bop the Hamsters ---------------- */
  function moles(A) {
    const g = { score: 0 };
    g.init = r => Object.assign(g, { r, time: 30, holes: Array.from({ length: 9 }, () => ({ up: 0, life: 0, kind: 'h', hit: 0 })), spawn: 0.6, score: 0, done: false, ham: null });
    g.info = () => `${Math.ceil(Math.max(0, g.time))} sec`; g.coins = () => Math.min(50, g.score * 3);
    const pos = i => { const W = A.W(), H = A.H(); const cw = Math.min(W * 0.28, H * 0.24); const x0 = W / 2 - cw, y0 = H * 0.36; return { x: x0 + (i % 3) * cw, y: y0 + Math.floor(i / 3) * cw * 0.82, R: cw * 0.34 }; };
    g.update = dt => {
      g.time -= dt; if (g.time <= 0) { g.done = true; return; }
      g.spawn -= dt; if (g.spawn <= 0) { const free = g.holes.map((h, i) => h.life <= 0 && h.up <= 0.01 ? i : -1).filter(i => i >= 0); if (free.length) { const h = g.holes[pick(free)]; h.kind = Math.random() < 0.16 + 0.02 * g.r ? 'b' : 'h'; h.life = Math.max(0.55, 1.15 - 0.12 * g.r - (30 - g.time) * 0.012); h.hit = 0; } g.spawn = Math.max(0.28, 0.75 - 0.07 * g.r - (30 - g.time) * 0.01); }
      g.holes.forEach(h => { if (h.life > 0) { h.life -= dt; h.up = Math.min(1, h.up + dt * 7); } else h.up = Math.max(0, h.up - dt * 6); if (h.hit > 0) h.hit -= dt; });
      if (g.ham) { g.ham.t -= dt; if (g.ham.t <= 0) g.ham = null; }
    };
    g.down = (x, y) => {
      g.ham = { x, y, t: 0.18 }; let hitAny = false;
      g.holes.forEach((h, i) => { const p = pos(i); if (h.up > 0.35 && h.life > 0 && Math.hypot(x - p.x, y - (p.y - p.R * 0.6)) < p.R * 1.25) { hitAny = true; h.life = 0; h.hit = 0.4; if (h.kind === 'h') { g.score++; A.sfx('whack'); A.float('+1', p.x, p.y - p.R * 1.6); A.burst(p.x, p.y - p.R, 14, ['#FFC53D', '#FFFFFF']); } else { g.score = Math.max(0, g.score - 2); A.sfx('boing'); A.float('Oops −2', p.x, p.y - p.R * 1.6, '#E5484D'); } } });
      if (!hitAny) A.sfx('thunk');
    };
    g.draw = c => {
      const W = A.W(), H = A.H(); const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#A9DEF9'); gr.addColorStop(0.2, '#A9DEF9'); gr.addColorStop(0.2, '#86CC5E'); gr.addColorStop(1, '#5FAF45'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      g.holes.forEach((h, i) => {
        const p = pos(i); c.fillStyle = '#7C4A22'; c.beginPath(); c.ellipse(p.x, p.y, p.R * 1.15, p.R * 0.45, 0, 0, 7); c.fill(); c.fillStyle = '#3B2414'; c.beginPath(); c.ellipse(p.x, p.y, p.R, p.R * 0.36, 0, 0, 7); c.fill();
        if (h.up > 0.01) { c.save(); c.beginPath(); c.rect(p.x - p.R * 1.3, p.y - p.R * 3, p.R * 2.6, p.R * 3); c.clip(); const yy = p.y + p.R * 0.6 - h.up * p.R * 1.5; emo(c, h.hit > 0 ? (h.kind === 'h' ? '😵' : '🐰') : (h.kind === 'h' ? '🐹' : '🐰'), p.x, yy, p.R * 1.7); c.restore(); }
        c.fillStyle = '#9B6233'; c.beginPath(); c.ellipse(p.x, p.y + p.R * 0.2, p.R * 1.15, p.R * 0.28, 0, 0, Math.PI); c.fill();
      });
      if (g.ham) emo(c, '🔨', g.ham.x + 20, g.ham.y - 30, 70, -0.6 + (0.18 - g.ham.t) * 5);
    };
    return g;
  }

  /* ---------------- 5. Hoop Shot ---------------- */
  function hoops(A) {
    const g = { score: 0 };
    g.init = r => Object.assign(g, { r, shot: 0, phase: 'aim', p: 0, pd: 1, c: rnd(0.55, 0.85), w: Math.max(0.05, 0.1 - 0.012 * r), ball: null, msg: '', msgT: 0, score: 0, done: false, spd: 1.05 + 0.25 * r });
    g.info = () => `Shot ${Math.min(g.shot + 1, 8)} of 8`; g.coins = () => Math.min(60, g.score * 4);
    const geo = () => { const W = A.W(), H = A.H(); return { W, H, hx: W * 0.66, hy: H * 0.34, hr: Math.min(W, H) * 0.075, bx: W * 0.36, by: H * 0.8, mx: W * 0.1, my: H * 0.22, mh: H * 0.56 }; };
    g.update = dt => {
      if (g.phase === 'aim') { g.p += g.pd * g.spd * dt; if (g.p > 1) { g.p = 1; g.pd = -1; } if (g.p < 0) { g.p = 0; g.pd = 1; } }
      if (g.phase === 'fly') { g.ball.t += dt * 1.3; if (g.ball.t >= 1) { g.phase = 'result'; g.msgT = 1.1; if (g.ball.res === 'swish') { g.score += 2; g.msg = 'Swish! +2'; A.sfx('swish'); const G = geo(); A.burst(G.hx, G.hy, 30); } else if (g.ball.res === 'rim') { g.score += 1; g.msg = 'In off the rim! +1'; A.sfx('rim'); } else { g.msg = g.ball.res === 'short' ? 'Too short!' : 'Too far!'; A.sfx('thunk'); } } }
      if (g.phase === 'result') { g.msgT -= dt; if (g.msgT <= 0) { g.shot++; if (g.shot >= 8) g.done = true; else { g.phase = 'aim'; g.ball = null; g.msg = ''; g.c = rnd(0.5, 0.88); } } }
    };
    g.down = () => { if (g.phase !== 'aim') return; const d = Math.abs(g.p - g.c); const res = d < g.w ? 'swish' : d < g.w * 2 ? 'rim' : g.p < g.c ? 'short' : 'long'; g.ball = { t: 0, res }; g.phase = 'fly'; A.sfx('jump'); };
    g.draw = c => {
      const G = geo(); const { W, H } = G; c.fillStyle = '#F2C48D'; c.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 48) { c.fillStyle = i % 96 ? '#EBB878' : '#F2C48D'; c.fillRect(i, H * 0.62, 48, H * 0.38); }
      c.fillStyle = '#5B4E9E'; c.fillRect(0, 0, W, H * 0.62); c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 12; i++) c.fillRect(i * W / 12, 0, 3, H * 0.62);
      c.fillStyle = '#fff'; c.fillRect(G.hx + G.hr * 0.6, G.hy - G.hr * 2.6, G.hr * 0.5, G.hr * 3.2); c.lineWidth = 4; c.strokeStyle = '#2B2340'; c.strokeRect(G.hx + G.hr * 0.6, G.hy - G.hr * 2.6, G.hr * 0.5, G.hr * 3.2); c.fillStyle = '#9AA0A8'; c.fillRect(G.hx + G.hr * 0.8, G.hy + G.hr * 0.6, G.hr * 0.18, H * 0.62 - G.hy);
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(G.hx + i * G.hr * 0.3, G.hy); c.lineTo(G.hx + i * G.hr * 0.18, G.hy + G.hr * 1.1); c.stroke(); }
      let bx = G.bx, by = G.by, bs = G.hr * 1.3;
      if (g.ball) { const t = Math.min(1, g.ball.t); let ex = G.hx, ey = G.hy; if (g.ball.res === 'short') { ex = G.hx - G.hr * 2.5; ey = G.hy + G.hr * 2; } if (g.ball.res === 'long') { ex = G.hx + G.hr * 0.6; ey = G.hy - G.hr * 2; } if (g.ball.res === 'rim') { ex = G.hx + (t > 0.85 ? 0 : G.hr * 0.5); } bx = G.bx + (ex - G.bx) * t; by = G.by + (ey - G.by) * t - Math.sin(t * Math.PI) * H * 0.3; if (t >= 1 && g.ball.res !== 'long') by += 0; }
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(bx, H * 0.86, bs * 0.4, bs * 0.12, 0, 0, 7); c.fill(); emo(c, '🏀', bx, by, bs, g.ball ? g.ball.t * 10 : 0);
      c.strokeStyle = '#F08A24'; c.lineWidth = 7; c.beginPath(); c.ellipse(G.hx, G.hy, G.hr, G.hr * 0.25, 0, 0, Math.PI); c.stroke(); c.beginPath(); c.ellipse(G.hx, G.hy, G.hr, G.hr * 0.25, 0, Math.PI, Math.PI * 2); c.stroke();
      // power meter
      c.fillStyle = '#FFFDF5'; rr(c, G.mx - 22, G.my - 10, 44, G.mh + 20, 14); c.fill(); c.lineWidth = 4; c.strokeStyle = '#2B2340'; c.stroke();
      const y = v => G.my + G.mh * (1 - v); c.fillStyle = '#FFE08A'; c.fillRect(G.mx - 14, y(Math.min(1, g.c + 2 * g.w)), 28, G.mh * 4 * g.w); c.fillStyle = '#5CC36B'; c.fillRect(G.mx - 14, y(Math.min(1, g.c + g.w)), 28, G.mh * 2 * g.w);
      c.fillStyle = '#E5484D'; c.beginPath(); c.moveTo(G.mx + 26, y(g.p)); c.lineTo(G.mx + 46, y(g.p) - 12); c.lineTo(G.mx + 46, y(g.p) + 12); c.closePath(); c.fill(); c.stroke(); c.fillRect(G.mx - 18, y(g.p) - 3, 36, 6);
      bigText(c, 'POWER', G.mx, G.my + G.mh + 34, 20);
      if (g.msg) bigText(c, g.msg, W / 2, H * 0.52, Math.min(70, W * 0.08), g.msg.startsWith('Swish') ? '#FFC53D' : '#FFFFFF');
    };
    return g;
  }

  /* ---------------- 6. Hay Jump ---------------- */
  function jump(A) {
    const g = { score: 0 };
    g.init = r => Object.assign(g, { r, time: 30, lives: 3, y: 0, vy: 0, obs: [], corn: [], spawn: 1.2, cspawn: 2, speed: 0, off: 0, inv: 0, score: 0, done: false });
    g.info = () => `${'❤️'.repeat(Math.max(0, g.lives))} ${Math.ceil(Math.max(0, g.time))}s`; g.coins = () => Math.min(50, g.score * 2);
    const sc = () => Math.min(A.W(), A.H()) / 700;
    g.update = dt => {
      const W = A.W(), H = A.H(), s = sc(); g.time -= dt; if (g.time <= 0 || g.lives <= 0) { g.done = true; return; }
      g.speed = (330 + 30 * g.r + (30 - g.time) * 7) * s * 1.2; g.off += g.speed * dt; g.inv = Math.max(0, g.inv - dt);
      g.vy += 2600 * s * dt; g.y += g.vy * dt; if (g.y > 0) { g.y = 0; g.vy = 0; }
      g.spawn -= dt; if (g.spawn <= 0) { g.obs.push({ x: W + 60, w: rnd(55, 85) * s + 10, h: rnd(48, 78) * s + 10, passed: false }); g.spawn = rnd(0.95, 1.7) / (1 + 0.08 * g.r); }
      g.cspawn -= dt; if (g.cspawn <= 0) { g.corn.push({ x: W + 60, y: -rnd(140, 220) * s }); g.cspawn = rnd(1.8, 3); }
      const gx = W * 0.22, gy = H * 0.74, cs = 70 * s + 10;
      g.obs.forEach(o => { o.x -= g.speed * dt; if (!o.passed && o.x + o.w < gx - cs * 0.3) { o.passed = true; g.score++; A.sfx('tick'); } if (g.inv <= 0 && o.x < gx + cs * 0.3 && o.x + o.w > gx - cs * 0.3 && -g.y < o.h - 6) { g.lives--; g.inv = 1.1; A.sfx('hit'); A.shake(10); A.float('Bonk!', gx, gy - cs * 1.4, '#E5484D'); } });
      g.corn.forEach(o => { o.x -= g.speed * dt; if (!o.got && Math.abs(o.x - gx) < cs * 0.6 && Math.abs((gy + o.y) - (gy + g.y - cs * 0.5)) < cs * 0.7) { o.got = true; g.score += 3; A.sfx('coin'); A.float('+3', gx, gy + o.y - 30, '#FFC53D'); } });
      g.obs = g.obs.filter(o => o.x > -120); g.corn = g.corn.filter(o => o.x > -80 && !o.got);
    };
    g.down = () => { if (g.y > -2) { g.vy = -1000 * sc() - 120; A.sfx('jump'); } };
    g.draw = c => {
      const W = A.W(), H = A.H(), s = sc(); const gy = H * 0.74; const gr = c.createLinearGradient(0, 0, 0, gy); gr.addColorStop(0, '#7FCBF2'); gr.addColorStop(1, '#D8F1FF'); c.fillStyle = gr; c.fillRect(0, 0, W, gy);
      emo(c, '☀️', W * 0.82, H * 0.16, 90 * s + 10); c.fillStyle = '#A6DB86'; for (let i = -1; i < 6; i++) { const x = ((i * 300 - g.off * 0.2) % (W + 300) + W + 300) % (W + 300) - 150; c.beginPath(); c.ellipse(x, gy, 220, 110, 0, Math.PI, Math.PI * 2); c.fill(); }
      c.fillStyle = '#7CC85A'; c.fillRect(0, gy, W, H - gy); c.fillStyle = '#C98A4A'; c.fillRect(0, gy, W, 18); for (let x = -(g.off % 60); x < W; x += 60) { c.fillStyle = '#B07538'; c.fillRect(x, gy + 4, 30, 6); }
      g.obs.forEach(o => { c.fillStyle = '#F2C14E'; c.fillRect(o.x, gy - o.h, o.w, o.h); c.lineWidth = 4; c.strokeStyle = '#2B2340'; c.strokeRect(o.x, gy - o.h, o.w, o.h); c.strokeStyle = '#C9922E'; c.lineWidth = 3; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(o.x + 4, gy - o.h + k * o.h / 4); c.lineTo(o.x + o.w - 4, gy - o.h + k * o.h / 4); c.stroke(); } c.strokeStyle = '#D9483B'; c.lineWidth = 4; c.beginPath(); c.moveTo(o.x + o.w * 0.3, gy - o.h); c.lineTo(o.x + o.w * 0.3, gy); c.moveTo(o.x + o.w * 0.7, gy - o.h); c.lineTo(o.x + o.w * 0.7, gy); c.stroke(); });
      g.corn.forEach(o => emo(c, '🌽', o.x, gy + o.y, 52 * s + 10, Math.sin(o.x * 0.02) * 0.3));
      const cs = 70 * s + 10; c.save(); if (g.inv > 0) c.globalAlpha = 0.5 + 0.5 * Math.sin(g.inv * 30); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(W * 0.22, gy + 6, cs * 0.4 * (1 + g.y / 600), 8, 0, 0, 7); c.fill(); emo(c, '🐔', W * 0.22, gy + g.y - cs * 0.48, cs, g.y < -2 ? -0.2 : Math.sin(g.off * 0.05) * 0.06, true); c.restore();
    };
    return g;
  }

  /* ---------------- 7. Target Archery ---------------- */
  function archery(A) {
    const g = { score: 0 };
    g.init = r => Object.assign(g, { r, n: 0, arrow: null, stuck: [], t: 0, msg: '', msgT: 0, score: 0, done: false, spd: 1.1 + 0.28 * r });
    g.info = () => `Arrow ${Math.min(g.n + 1, 6)} of 6`; g.coins = () => Math.min(60, g.score);
    const geo = () => { const W = A.W(), H = A.H(); const R = Math.min(W, H) * 0.12 * Math.pow(0.93, g.r); return { W, H, tx: W * 0.8, ty: H * 0.52 + Math.sin(g.t * g.spd) * H * 0.24, R, bx: W * 0.14, by: H * 0.52 }; };
    g.update = dt => {
      g.t += dt; const G = geo();
      if (g.arrow) { g.arrow.x += G.W * 1.5 * dt; if (g.arrow.x >= G.tx - 6) { const dy = g.arrow.y - G.ty; const d = Math.abs(dy) / G.R; let pts = 0, m = 'Miss!'; if (d < 0.2) { pts = 10; m = 'Bullseye! +10'; } else if (d < 0.45) { pts = 6; m = '+6'; } else if (d < 0.7) { pts = 3; m = '+3'; } else if (d < 1) { pts = 1; m = '+1'; }
          g.score += pts; g.msg = m; g.msgT = 1; A.sfx(pts ? (pts === 10 ? 'cheer' : 'thunk') : 'swish'); if (pts) { g.stuck.push(dy); if (pts === 10) A.burst(G.tx, g.arrow.y, 30); } g.arrow = null; g.n++; } }
      if (g.msgT > 0) { g.msgT -= dt; if (g.msgT <= 0) { g.msg = ''; if (g.n >= 6) g.done = true; } }
    };
    g.down = () => { if (g.arrow || g.n >= 6 || g.msgT > 0) return; const G = geo(); g.arrow = { x: G.bx + 30, y: G.by }; A.sfx('swish'); };
    g.draw = c => {
      const G = geo(); const { W, H } = G; const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9ED8F7'); gr.addColorStop(0.62, '#DDF2FF'); gr.addColorStop(0.62, '#86CC5E'); gr.addColorStop(1, '#5FAF45'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#8A5A35'; c.lineWidth = 8; c.beginPath(); c.moveTo(G.tx - G.R * 0.4, H * 0.62 + 40); c.lineTo(G.tx, G.ty); c.lineTo(G.tx + G.R * 0.4, H * 0.62 + 40); c.stroke();
      [[1, '#FFFFFF'], [0.82, '#2B2340'], [0.7, '#3E7BFA'], [0.45, '#E5484D'], [0.2, '#FFC53D']].forEach(([f, col]) => { c.fillStyle = col; c.beginPath(); c.ellipse(G.tx, G.ty, G.R * f * 0.42, G.R * f, 0, 0, 7); c.fill(); }); c.lineWidth = 3; c.strokeStyle = '#2B2340'; c.beginPath(); c.ellipse(G.tx, G.ty, G.R * 0.42, G.R, 0, 0, 7); c.stroke();
      const arrowAt = (x, y) => { c.strokeStyle = '#6B4A33'; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 70, y); c.lineTo(x, y); c.stroke(); c.fillStyle = '#9AA0A8'; c.beginPath(); c.moveTo(x + 12, y); c.lineTo(x - 4, y - 8); c.lineTo(x - 4, y + 8); c.closePath(); c.fill(); c.fillStyle = '#E5484D'; c.beginPath(); c.moveTo(x - 70, y); c.lineTo(x - 82, y - 9); c.lineTo(x - 60, y); c.lineTo(x - 82, y + 9); c.closePath(); c.fill(); };
      g.stuck.forEach(dy => arrowAt(G.tx - 4, G.ty + dy));
      c.strokeStyle = '#8A5A35'; c.lineWidth = 9; c.beginPath(); c.arc(G.bx - 40, G.by, 80, -1.1, 1.1); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(G.bx - 40 + 80 * Math.cos(-1.1), G.by + 80 * Math.sin(-1.1)); c.lineTo(g.arrow ? G.bx - 10 : G.bx - 30, G.by); c.lineTo(G.bx - 40 + 80 * Math.cos(1.1), G.by + 80 * Math.sin(1.1)); c.stroke();
      if (g.arrow) arrowAt(g.arrow.x, g.arrow.y); else if (g.n < 6) arrowAt(G.bx + 40, G.by);
      c.setLineDash([6, 10]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(G.bx + 60, G.by); c.lineTo(G.tx - G.R * 0.5, G.by); c.stroke(); c.setLineDash([]);
      if (g.msg) bigText(c, g.msg, W / 2, H * 0.22, Math.min(70, W * 0.08), g.msg.startsWith('Bull') ? '#FFC53D' : '#FFFFFF');
    };
    return g;
  }

  const GAMES = [
    { id: 'penalty', name: 'Penalty Kick', icon: '⚽', how: 'The white line swings left and right. Tap to kick when it points at an open spot in the goal. Beat the goalie! You get 5 kicks.', make: penalty },
    { id: 'balls', name: 'Shoot the Balls', icon: '🎯', how: 'Tap the bouncing balls to shoot them. Gold star balls give 5 points. Do NOT shoot the bombs!', make: balls },
    { id: 'fruit', name: 'Fruit Catch', icon: '🧺', how: 'Drag your finger to move the basket. Catch the falling fruit and stay away from the rocks!', make: fruit },
    { id: 'moles', name: 'Bop the Hamsters', icon: '🐹', how: 'Tap the hamsters when they pop up. Leave the bunnies alone!', make: moles },
    { id: 'hoops', name: 'Hoop Shot', icon: '🏀', how: 'The power arrow moves up and down. Tap when it is in the green part to score!', make: hoops },
    { id: 'jump', name: 'Hay Jump', icon: '🐔', how: 'Tap to make the chicken jump over the hay bales. Grab the corn for extra points!', make: jump },
    { id: 'archery', name: 'Target Archery', icon: '🏹', how: 'The target moves up and down. Tap to shoot when it lines up with your arrow. The middle is worth 10!', make: archery }
  ];

  function create(root, deps) {
    const cv = root.querySelector('#arcCv'); const c = cv.getContext('2d');
    const $ = s => root.querySelector(s);
    let W = 1, H = 1, G = null, info = null, raf = 0, last = 0, state = 'off', parts = [], floats = [], shakeA = 0, onDone = null, round = 0, free = false;
    const api = {
      W: () => W, H: () => H, sfx: n => deps.sfx(n), shake: a => { shakeA = Math.max(shakeA, a); },
      burst: (x, y, n, cols) => { cols = cols || ['#FFC53D', '#E5484D', '#3E7BFA', '#2FA35A', '#8E4EC6', '#FFFFFF']; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = rnd(120, 420); parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, s: rnd(5, 11), c: pick(cols), l: rnd(0.5, 1) }); } },
      float: (t, x, y, col) => floats.push({ t, x, y, col: col || '#FFFFFF', l: 1 })
    };
    function size() { const r = root.getBoundingClientRect(); const dp = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dp); cv.height = Math.round(H * dp); cv.style.width = W + 'px'; cv.style.height = H + 'px'; c.setTransform(dp, 0, 0, dp, 0, 0); }
    window.addEventListener('resize', () => { if (state !== 'off') size(); });
    function hud() { $('#arcScore').textContent = G ? G.score : 0; $('#arcInfo').textContent = G ? G.info() : ''; }
    function loop(ts) {
      raf = requestAnimationFrame(loop); const dt = Math.min(0.04, (ts - last) / 1000 || 0); last = ts;
      if (state === 'play') { G.update(dt); if (G.done) end(); }
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt; p.l -= dt; }); parts = parts.filter(p => p.l > 0);
      floats.forEach(f => { f.y -= 60 * dt; f.l -= dt; }); floats = floats.filter(f => f.l > 0);
      shakeA *= Math.pow(0.02, dt);
      c.save(); if (shakeA > 0.5) c.translate(rnd(-shakeA, shakeA), rnd(-shakeA, shakeA)); if (G) G.draw(c);
      parts.forEach(p => { c.globalAlpha = Math.max(0, Math.min(1, p.l * 2)); c.fillStyle = p.c; c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * 0.7); }); c.globalAlpha = 1;
      floats.forEach(f => { c.globalAlpha = Math.max(0, f.l); bigText(c, f.t, f.x, f.y, 34, f.col); }); c.globalAlpha = 1; c.restore();
      if (state === 'play') hud();
    }
    function open(idx, rnd2, cb, isFree) {
      info = GAMES[idx]; round = rnd2; onDone = cb; free = !!isFree; root.hidden = false; size(); G = info.make(api); G.init(round); parts = []; floats = [];
      $('#arcName').textContent = info.name; $('#arcIcon').textContent = info.icon; $('#arcTitle').textContent = `Bonus game: ${info.name}`; $('#arcHow').textContent = info.how + (round ? ` (Round ${round + 1}: a little faster!)` : '');
      $('#arcIntro').hidden = false; $('#arcEnd').hidden = true; $('#arcCount').hidden = true; state = 'intro'; hud();
      cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
      deps.say && deps.say(`Bonus game! ${info.name}. ${info.how}`);
    }
    function start() {
      $('#arcIntro').hidden = true; let n = 3; const cd = $('#arcCount'); cd.hidden = false; cd.textContent = n; deps.sfx('tick'); state = 'count';
      const iv = setInterval(() => { n--; if (n > 0) { cd.textContent = n; deps.sfx('tick'); } else { clearInterval(iv); cd.textContent = 'GO!'; deps.sfx('go'); setTimeout(() => { cd.hidden = true; }, 450); state = 'play'; } }, 650);
    }
    function end() {
      if (state === 'end') return; state = 'end'; const coins = free ? 0 : G.coins(); hud();
      $('#arcEndT').textContent = G.score > 0 ? 'Great game!' : 'Nice try!'; $('#arcEndP').textContent = `You scored ${G.score} ${G.score === 1 ? 'point' : 'points'}` + (free ? '.' : ` and earned ${coins} ${coins === 1 ? 'coin' : 'coins'}.`); $('#arcDone').textContent = free || !coins ? 'OK' : `Collect ${coins} ${coins === 1 ? 'coin' : 'coins'}`;
      $('#arcEnd').hidden = false; deps.sfx(G.score > 0 ? 'level' : 'tick'); api.burst(W / 2, H * 0.4, 70); deps.say && deps.say(`${$('#arcEndT').textContent} ${$('#arcEndP').textContent}`);
      root.dataset.coins = coins; root.dataset.score = G.score;
    }
    function close() { cancelAnimationFrame(raf); state = 'off'; root.hidden = true; const coins = +(root.dataset.coins || 0), score = +(root.dataset.score || 0), skipped = root.dataset.skipped === '1'; root.dataset.coins = 0; root.dataset.score = 0; root.dataset.skipped = 0; if (onDone) onDone(coins, score, skipped); }
    $('#arcGo').onclick = start; $('#arcDone').onclick = close; $('#arcX').onclick = () => { if (state === 'play' || state === 'count') end(); else if (state === 'intro') { root.dataset.coins = 0; root.dataset.score = 0; root.dataset.skipped = 1; close(); } else close(); };
    cv.addEventListener('pointerdown', e => { if (state !== 'play') return; e.preventDefault(); const r = cv.getBoundingClientRect(); G.down && G.down(e.clientX - r.left, e.clientY - r.top); try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
    cv.addEventListener('pointermove', e => { if (state !== 'play' || !G.move) return; const r = cv.getBoundingClientRect(); G.move(e.clientX - r.left, e.clientY - r.top); });
    return { open, games: GAMES, state: () => state, _test: { start, end, G: () => G } };
  }
  return { GAMES, create };
})();
