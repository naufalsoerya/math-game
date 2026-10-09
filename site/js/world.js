'use strict';
/* =====================================================================
   Adley's Math Farm — 3D island world (Three.js r128)
   Each level is a new archipelago: 3 islands linked by bridges.
   Home island holds 7 farms, the second 6, the third 5.
   Bridges are broken until enough farms are harvested.
   Paths wind through forests; the child explores to find every farm.
   ===================================================================== */
const World = (() => {
  const N = 100, CS = 1.4, WS = N * CS, HALF = WS / 2, EG = 25;
  const BIOMES = [
    { name: 'Sunny Meadow', sky: 0x9ED8F7, fog: 0xBFE6FA, grass: [0x77BE48, 0x6AB33F, 0x84C653], dark: 0x4E8F35, sand: 0xF0DCA0, path: 0xC6965E, soil: 0x8B5A33, water: 0x3FA7DE, deep: 0x2C7FB8, tree: 'oak', leaf: [0x4FA845, 0x5DB851, 0x3E9A3C, 0x6CBF4A], trunk: 0x8A5A35, rock: 0x9AA0A8, flower: [0xFF6B8B, 0xFFD23F, 0xFFFFFF, 0xB98BFF], animals: ['🐄', '🐑', '🐔', '🐖'], light: 1 },
    { name: 'Berry Woods', sky: 0xA7D8E6, fog: 0xC4E5EE, grass: [0x5AA84A, 0x4E9B42, 0x66B254], dark: 0x356F31, sand: 0xE3D09A, path: 0xB0844F, soil: 0x7A4C2A, water: 0x3A9BC9, deep: 0x26739E, tree: 'pine', leaf: [0x2F7D42, 0x3A8C4B, 0x276E3A, 0x45965A], trunk: 0x7A4E2E, rock: 0x8E949C, flower: [0xE5484D, 0x8E4EC6, 0xFFFFFF, 0xFF9F1C], animals: ['🦊', '🐰', '🦔', '🐿️'], light: 0.95 },
    { name: 'Coconut Coast', sky: 0x8CD8F5, fog: 0xBDEBFA, grass: [0x9DCC55, 0x8EC24B, 0xA9D462], dark: 0x6E9A36, sand: 0xF5E0A2, path: 0xD3AE72, soil: 0x9C6A3E, water: 0x2FC1D9, deep: 0x1E8FB8, tree: 'palm', leaf: [0x3FA34D, 0x4DB55A, 0x5CC067, 0x36964A], trunk: 0xA0703F, rock: 0xB3A99A, flower: [0xFF5FA2, 0xFFD23F, 0xFF8C42, 0xFFFFFF], animals: ['🦀', '🐢', '🦜', '🐚'], light: 1.05 },
    { name: 'Snowy Hills', sky: 0xC9E3F4, fog: 0xE3F0F9, grass: [0xEAF3FA, 0xDDEAF4, 0xF3F8FC], dark: 0xBACFDF, sand: 0xD3E2EC, path: 0x9DB8D0, soil: 0x8D6E5A, water: 0x5AA7D4, deep: 0x3B7DB0, tree: 'snowpine', leaf: [0x2E6E4E, 0x3A7D5A, 0x285F44], trunk: 0x6B4A33, rock: 0x9DA8B5, flower: [0x8FD3F7, 0xFFFFFF, 0xBFA9FF], animals: ['🐧', '🦌', '⛄', '🐻‍❄️'], light: 1.05 },
    { name: 'Star Island', sky: 0x231C4A, fog: 0x2E2660, grass: [0x5E50A8, 0x6B5CB6, 0x544799], dark: 0x40357D, sand: 0x8F82D0, path: 0xC4B8F5, soil: 0x3A2E6E, water: 0x23307A, deep: 0x171F5A, tree: 'crystal', leaf: [0x9EE7F5, 0xC59BFF, 0xFF9BE3, 0x8FF5C8], trunk: 0x4A3E8C, rock: 0x7A6FC0, flower: [0xFFF59E, 0x9EE7F5, 0xFF9BE3], animals: ['🦄', '🌟', '🐉', '🦋'], light: 0.8, night: true }
  ];
  const ISL = [{ x: 30, y: 62, r: 22, n: 7 }, { x: 75, y: 68, r: 16, n: 6 }, { x: 62, y: 24, r: 15, n: 5 }];
  const BRIDGE_NEED = [5, 10];

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function makeNoise(rng) {
    const G = 64, v = new Float32Array(G * G); for (let i = 0; i < v.length; i++) v[i] = rng();
    const g = (a, b) => v[((a % G) + G) % G + (((b % G) + G) % G) * G]; const s = t => t * t * (3 - 2 * t);
    const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1); const u = s(xf), w = s(yf); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
    return (x, y) => n(x, y) * 0.6 + n(x * 2.07 + 13, y * 2.07 + 7) * 0.28 + n(x * 4.3 + 31, y * 4.3 + 19) * 0.12;
  }
  /* binary-heap A* on the grid */
  function astar(sx, sy, tx, ty, pass, cost, diag) {
    const S = sy * N + sx, Tt = ty * N + tx; if (S === Tt) return [[sx, sy]];
    const g = new Float32Array(N * N).fill(Infinity), came = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
    const hp = [], hf = []; const push = (n, f) => { hp.push(n); hf.push(f); let i = hp.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p; } };
    const pop = () => { const top = hp[0]; const ln = hp.pop(), lf = hf.pop(); if (hp.length) { hp[0] = ln; hf[0] = lf; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hp.length && hf[l] < hf[m]) m = l; if (r < hp.length && hf[r] < hf[m]) m = r; if (m === i) break; [hp[m], hp[i]] = [hp[i], hp[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m; } } return top; };
    const H = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return diag ? Math.max(dx, dy) + 0.414 * Math.min(dx, dy) : dx + dy; };
    g[S] = 0; push(S, H(sx, sy));
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], D8 = D4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    while (hp.length) {
      const cur = pop(); if (closed[cur]) continue; if (cur === Tt) break; closed[cur] = 1;
      const x = cur % N, y = (cur / N) | 0;
      for (const [dx, dy] of (diag ? D8 : D4)) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; if (!pass(nx, ny)) continue;
        if (dx && dy && (!pass(x + dx, y) || !pass(x, y + dy))) continue;
        const n = ny * N + nx; const ng = g[cur] + (dx && dy ? 1.414 : 1) * cost(nx, ny);
        if (ng < g[n]) { g[n] = ng; came[n] = cur; push(n, ng + H(nx, ny)); }
      }
    }
    if (came[Tt] < 0) return null;
    const out = []; let c = Tt; while (c !== -1) { out.push([c % N, (c / N) | 0]); if (c === S) break; c = came[c]; } return out.reverse();
  }
  const cellW = (x, y) => [(x + 0.5) * CS - HALF, (y + 0.5) * CS - HALF];
  const wCell = (X, Z) => [Math.floor((X + HALF) / CS), Math.floor((Z + HALF) / CS)];

  /* ---------- canvas textures ---------- */
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function texFrom(cv) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.needsUpdate = true; return t; }
  function signTex(icon, name, sub, color) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 200; const c = cv.getContext('2d');
    c.fillStyle = '#2B2340'; rr(c, 6, 10, 500, 176, 30); c.fill(); c.fillStyle = '#FFFDF5'; rr(c, 6, 4, 500, 170, 30); c.fill();
    c.fillStyle = color; rr(c, 6, 4, 500, 22, 12); c.fill(); c.fillRect(6, 16, 500, 12);
    c.font = `92px ${FONT}`; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(icon, 74, 102);
    c.fillStyle = '#2B2340'; c.textAlign = 'left'; c.font = `800 54px ${FONT}`; c.fillText(name, 138, 86, 360); c.fillStyle = '#5F5577'; c.font = `700 30px ${FONT}`; c.fillText(sub, 140, 136, 356);
    return texFrom(cv);
  }
  function bubbleTex(icon, ring, done, crown) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 300; const c = cv.getContext('2d');
    c.fillStyle = '#2B2340'; c.beginPath(); c.arc(128, 124, 104, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(98, 214); c.lineTo(158, 214); c.lineTo(128, 292); c.closePath(); c.fill();
    c.fillStyle = done ? '#FFC53D' : '#FFFDF5'; c.beginPath(); c.arc(128, 118, 96, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(106, 206); c.lineTo(150, 206); c.lineTo(128, 270); c.closePath(); c.fill();
    c.lineWidth = 14; c.strokeStyle = ring; c.beginPath(); c.arc(128, 118, 82, 0, Math.PI * 2); c.stroke();
    c.font = `110px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2B2340'; c.fillText(done ? '⭐' : icon, 128, 124);
    if (crown) { c.font = `64px ${FONT}`; c.fillText('👑', 128, 30); }
    return texFrom(cv);
  }
  function tagTex(text, bg, fg, w) {
    const cv = document.createElement('canvas'); cv.width = w || 320; cv.height = 96; const c = cv.getContext('2d');
    c.font = `800 46px ${FONT}`; const tw = Math.min(cv.width - 24, c.measureText(text).width + 44);
    c.fillStyle = bg; rr(c, (cv.width - tw) / 2, 10, tw, 76, 30); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cv.width / 2, 50, cv.width - 40);
    return texFrom(cv);
  }
  function emojiTex(e, size) { const cv = document.createElement('canvas'); cv.width = cv.height = size || 128; const c = cv.getContext('2d'); c.font = `${(size || 128) * 0.82}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, cv.width / 2, cv.height / 2 + 6); return texFrom(cv); }
  const sprite = (tex, sx, sy) => { const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }); const s = new THREE.Sprite(m); s.scale.set(sx, sy, 1); return s; };

    /* ---------------- level generation ---------------- */
    function generate(level, seed) {
      const rng = mulberry(seed); const noise = makeNoise(rng); const noise2 = makeNoise(rng); const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
      const rot = Math.floor(rng() * 4), mir = rng() < 0.5;
      const isl = ISL.map(o => { let x = o.x, y = o.y; if (mir) x = N - x; for (let k = 0; k < rot; k++) { const nx = N - y, ny = x; x = nx; y = ny; } return { x, y, r: o.r, n: o.n }; });
      const land = new Uint8Array(N * N), iid = new Int8Array(N * N).fill(-1), dd = new Float32Array(N * N).fill(9), h = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const k = y * N + x; let best = 9, bi = -1;
        isl.forEach((o, i) => { const dx = x + 0.5 - o.x, dy = y + 0.5 - o.y; const a = Math.atan2(dy, dx); const rr2 = o.r * (0.88 + 0.24 * noise(5 + 1.7 * Math.cos(a) + i * 9, 5 + 1.7 * Math.sin(a) + i * 13)); const d = Math.hypot(dx, dy) / rr2; if (d < best) { best = d; bi = i; } });
        dd[k] = best; iid[k] = bi; land[k] = best < 1 ? 1 : 0;
        h[k] = best < 1 ? 0.35 + (1 - best) * 0.5 + noise2(x / 9, y / 9) * 1.5 * Math.min(1, (1 - best) * 2.5) : -0.35 - Math.min(2.4, (best - 1) * 5);
      }
      // keep a clear channel of water between islands
      const kill = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = y * N + x; if (!land[k]) continue; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const k2 = ny * N + nx; if (land[k2] && iid[k2] !== iid[k] && iid[k] > iid[k2]) kill.push(k); } }
      kill.forEach(k => { land[k] = 0; h[k] = -0.6; });
      const isLand = (x, y) => x >= 0 && y >= 0 && x < N && y < N && land[y * N + x] === 1;
      const T = new Uint8Array(N * N); // 0 open, 1 path, 2 station, 3 home, 4 obstacle, 5 bridge, 6 barn, 7 chest, 8 fence
      const bridgeAt = new Int8Array(N * N).fill(-1);
      // bridges between islands 0-1 and 1-2
      const bridges = [[0, 1], [1, 2]].map(([a, b], bi) => {
        const A = isl[a], B = isl[b]; let lastA = null, firstB = null;
        for (let s = 0; s <= 400; s++) { const tt = s / 400; const x = Math.floor(A.x + (B.x - A.x) * tt), y = Math.floor(A.y + (B.y - A.y) * tt); const k = y * N + x; if (land[k] && iid[k] === a) lastA = [x, y]; if (land[k] && iid[k] === b && !firstB) firstB = [x, y]; }
        const cells = []; let [x0, y0] = lastA; const [x1, y1] = firstB; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
        for (;;) { if (!land[y0 * N + x0]) cells.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; const mx = e2 >= dy, my = e2 <= dx; if (mx) { err += dy; x0 += sx; } if (mx && my && !land[y0 * N + x0]) cells.push([x0, y0]); if (my) { err += dx; y0 += sy; } }
        cells.forEach(([x, y]) => { T[y * N + x] = 5; bridgeAt[y * N + x] = bi; });
        return { a, b, landA: lastA, landB: firstB, cells, need: BRIDGE_NEED[bi], open: false, y: 0.5 };
      });
      // home + station sites
      const sites = []; const tooClose = (x, y, md) => sites.some(s => Math.hypot(s.x - x, s.y - y) < md) || bridges.some(b => Math.hypot(b.landA[0] - x, b.landA[1] - y) < 6 || Math.hypot(b.landB[0] - x, b.landB[1] - y) < 6);
      const cand = (i, lim) => { const out = []; for (let y = 3; y < N - 3; y++) for (let x = 3; x < N - 3; x++) { const k = y * N + x; if (land[k] && iid[k] === i && dd[k] < (lim || 0.66)) out.push([x, y]); } for (let j = out.length - 1; j > 0; j--) { const q = Math.floor(rng() * (j + 1)); [out[j], out[q]] = [out[q], out[j]]; } return out; };
      let c0 = cand(0).filter(([x, y]) => dd[y * N + x] > 0.25 && dd[y * N + x] < 0.55); if (!c0.length) c0 = cand(0); const home = { x: c0[0][0], y: c0[0][1], home: true, island: 0 }; sites.push(home);
      isl.forEach((o, i) => { let got = 0; for (const lim of [0.66, 0.78]) { const cs = cand(i, lim); let md = 10; while (got < o.n && md >= 7) { for (const [x, y] of cs) { if (got >= o.n) break; if (!tooClose(x, y, md)) { sites.push({ x, y, island: i }); got++; } } md -= 1; } } let md = 6; while (got < o.n && md >= 4) { for (const [x, y] of cand(i, 0.8)) { if (got >= o.n) break; if (!tooClose(x, y, md)) { sites.push({ x, y, island: i }); got++; } } md -= 1; } });
      const stations = sites.filter(s => !s.home);
      // carve paths: per island MST + one loop, plus links to bridge landings
      const carveCost = (x, y) => 1 + 7 * noise(x / 4.2 + 40, y / 4.2 + 40) + (dd[y * N + x] > 0.86 ? 4 : 0);
      const markPath = (cells, wide) => cells.forEach(([x, y]) => { const k = y * N + x; if (T[k] === 0) T[k] = 1; if (wide && rng() < 0.38) { const [ax, ay] = [[1, 0], [0, 1], [-1, 0], [0, -1]][Math.floor(rng() * 4)]; const k2 = (y + ay) * N + x + ax; if (isLand(x + ax, y + ay) && T[k2] === 0) T[k2] = 1; } });
      isl.forEach((o, i) => {
        const nodes = sites.filter(s => s.island === i).map(s => [s.x, s.y]); bridges.forEach(b => { if (b.a === i) nodes.push(b.landA); if (b.b === i) nodes.push(b.landB); });
        const inT = [0], edges = []; const dist = (p, q) => Math.hypot(nodes[p][0] - nodes[q][0], nodes[p][1] - nodes[q][1]);
        while (inT.length < nodes.length) { let best = null; for (const p of inT) for (let q = 0; q < nodes.length; q++) if (!inT.includes(q)) { const dv = dist(p, q); if (!best || dv < best[2]) best = [p, q, dv]; } inT.push(best[1]); edges.push(best); }
        const extra = []; for (let p = 0; p < nodes.length; p++) for (let q = p + 1; q < nodes.length; q++) if (!edges.some(e => (e[0] === p && e[1] === q) || (e[0] === q && e[1] === p))) extra.push([p, q, dist(p, q)]);
        extra.sort((a2, b2) => a2[2] - b2[2]); if (extra.length && nodes.length > 4) edges.push(extra[Math.min(extra.length - 1, 1)]);
        edges.forEach(([p, q]) => { const path = astar(nodes[p][0], nodes[p][1], nodes[q][0], nodes[q][1], (x, y) => isLand(x, y) && iid[y * N + x] === i, carveCost, false); if (path) markPath(path, true); });
      });
      // dead-end spurs ending in treasure chests
      const chests = [];
      isl.forEach((o, i) => {
        const pathCells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = y * N + x; if (T[k] === 1 && iid[k] === i) pathCells.push([x, y]); }
        for (let s = 0; s < (i === 0 ? 3 : 2) && pathCells.length; s++) {
          for (let tries = 0; tries < 40; tries++) {
            const [px, py] = pathCells[Math.floor(rng() * pathCells.length)]; const a = rng() * Math.PI * 2, len = 6 + rng() * 5; const tx = Math.round(px + Math.cos(a) * len), ty = Math.round(py + Math.sin(a) * len);
            if (!isLand(tx, ty) || iid[ty * N + tx] !== i || dd[ty * N + tx] > 0.85 || T[ty * N + tx] !== 0) continue;
            if (sites.some(st => Math.hypot(st.x - tx, st.y - ty) < 5) || chests.some(c => Math.hypot(c.x - tx, c.y - ty) < 8)) continue;
            const path = astar(px, py, tx, ty, (x, y) => isLand(x, y) && iid[y * N + x] === i && T[y * N + x] !== 2, (x, y) => 1 + 9 * noise(x / 3 + 90, y / 3 + 90), false); if (!path) continue;
            markPath(path, false); T[ty * N + tx] = 7; chests.push({ x: tx, y: ty, open: false }); break;
          }
        }
      });
      // clear station/home footprints
      sites.forEach(s => { const R = s.home ? 3.4 : 2.9; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const cx = s.x + x, cy = s.y + y; if (isLand(cx, cy) && Math.hypot(x, y) <= R) { const k = cy * N + cx; if (T[k] !== 5) T[k] = s.home ? 3 : 2; } } });
      // entrance direction & barn
      stations.forEach(s => {
        let ax = 0, ay = 0; for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const cx = s.x + x, cy = s.y + y; if (isLand(cx, cy) && T[cy * N + cx] === 1 && Math.hypot(x, y) > 2.5) { ax += x; ay += y; } }
        const gaps = []; for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const r = Math.hypot(x, y); if (r < 2.9 || r > 4.6) continue; const cx = s.x + x, cy = s.y + y; if (isLand(cx, cy) && T[cy * N + cx] === 1) gaps.push(Math.atan2(y, x)); }
        if (!gaps.length) gaps.push(Math.atan2(ay || 1, ax || 0)); s.gaps = gaps;
        { const avg = Math.atan2(ay || 1, ax || 0); const adist0 = (p, q) => Math.abs(((p - q) + Math.PI * 3) % (Math.PI * 2) - Math.PI); s.ang = gaps.reduce((bst, g) => adist0(g, avg) < adist0(bst, avg) ? g : bst, gaps[0]); }
        s.ex = Math.round(s.x + Math.cos(s.ang) * 2); s.ey = Math.round(s.y + Math.sin(s.ang) * 2);
        const adist = (a, b) => Math.abs(((a - b) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        let bang = s.ang + Math.PI, bestD = -1; for (let q = 0; q < 16; q++) { const a = q * Math.PI / 8; const dmin = Math.min(...gaps.map(g => adist(a, g))); if (dmin > bestD) { bestD = dmin; bang = a; } } s.bang = bang;
        const bwx = s.x + 0.5 + Math.cos(bang) * 1.7, bwy = s.y + 0.5 + Math.sin(bang) * 1.7;
        for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const cx = s.x + x, cy = s.y + y; if (!isLand(cx, cy) || (x === 0 && y === 0)) continue; if (Math.hypot(cx + 0.5 - bwx, cy + 0.5 - bwy) < 0.95) T[cy * N + cx] = 6; }
        const inGap = a => gaps.some(g => Math.abs(((a - g) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.42);
        for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const r = Math.hypot(x, y); if (r < 2.4 || r > 3.15) continue; const cx = s.x + x, cy = s.y + y; if (!isLand(cx, cy) || T[cy * N + cx] === 5) continue; if (!inGap(Math.atan2(y, x))) T[cy * N + cx] = 8; }
      });
      // obstacles: forest density rises with level
      const base = 0.66 + 0.2 * Math.min(1, (level - 1) / 45);
      const obst = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const k = y * N + x; if (!land[k] || T[k] !== 0) continue;
        let nearRes = false; for (const s of sites) if (Math.hypot(s.x - x, s.y - y) < (s.home ? 4.2 : 3.9)) nearRes = true; for (const b of bridges) for (const p of [b.landA, b.landB]) if (Math.hypot(p[0] - x, p[1] - y) < 2) nearRes = true;
        if (nearRes) continue;
        const beach = dd[k] > 0.86; const dens = Math.max(0.05, Math.min(0.92, base + (noise(x / 7 + 60, y / 7 + 60) - 0.5) * 1.1)) * (beach ? 0.25 : 1);
        if (rng() < dens) { T[k] = 4; const r = rng(); obst.push({ x, y, t: beach ? (r < 0.6 ? 'rock' : 'tree') : r < 0.76 ? 'tree' : r < 0.9 ? 'rock' : 'bush' }); }
      }
      // coins on paths
      const coins = []; const pc = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (T[y * N + x] === 1) pc.push([x, y]);
      for (let tries = 0; tries < 400 && coins.length < 16; tries++) { const [x, y] = pc[Math.floor(rng() * pc.length)]; if (sites.some(s => Math.hypot(s.x - x, s.y - y) < 4) || coins.some(c => Math.hypot(c.x - x, c.y - y) < 5)) continue; coins.push({ x, y, taken: false }); }
      // walkability
      const walk = new Uint8Array(N * N); for (let k = 0; k < N * N; k++) walk[k] = land[k] && T[k] !== 4 && T[k] !== 6 && T[k] !== 8 ? 1 : 0;
      // stations get topics (shuffled each level)
      const order = []; for (let i = 0; i < 18; i++) order.push(i); for (let j = 17; j > 0; j--) { const q = Math.floor(rng() * (j + 1)); [order[j], order[q]] = [order[q], order[j]]; }
      stations.forEach((s, i) => { s.topic = order[i]; });
      return { level, seed, rng, isl, land, iid, dd, h, T, walk, bridges, bridgeAt, home, stations, chests, coins, obst, expl: new Uint8Array(EG * EG), disc: new Uint8Array(18) };
    }


  /* =================================================================== */
  function create(container, hooks) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 420);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x556644, 0.85); const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-40, 70, 30); scene.add(hemi, sun);
    let root = null; const clock = new THREE.Clock(); const ray = new THREE.Raycaster();
    const cam = { tx: 0, tz: 0, yaw: 0.6, yawTo: 0.6, dist: 34, distTo: 34, pitch: 0.92, free: false };
    let L = null; // current level data
    let paused = false, lastRender = 0, sleeping = false;

    /* ---------------- building the 3D scene ---------------- */
    function heightAt(X, Z) {
      if (!L) return 0; const fx = (X + HALF) / CS - 0.5, fz = (Z + HALF) / CS - 0.5; const x0 = Math.max(0, Math.min(N - 1, Math.floor(fx))), z0 = Math.max(0, Math.min(N - 1, Math.floor(fz)));
      const cx = Math.max(0, Math.min(N - 1, Math.floor((X + HALF) / CS))), cz = Math.max(0, Math.min(N - 1, Math.floor((Z + HALF) / CS)));
      const br = L.bridgeAt[cz * N + cx]; if (br >= 0) return L.bridges[br].y;
      const x1 = Math.min(N - 1, x0 + 1), z1 = Math.min(N - 1, z0 + 1); const tx = Math.max(0, Math.min(1, fx - x0)), tz = Math.max(0, Math.min(1, fz - z0));
      const H = L.hv; const a = H[z0 * N + x0], b = H[z0 * N + x1], c = H[z1 * N + x0], d = H[z1 * N + x1];
      return Math.max(0.05, a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz);
    }
    function build(level, topics, plots, save, opts) {
      if (root) { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } }); }
      const bi = Math.min(4, Math.floor((level - 1) / 10)); const B = BIOMES[bi];
      L = generate(level, level * 7919 + 101); L.B = B; L.topics = topics; L.gold = opts && opts.gold != null ? opts.gold : -1; L.visit = !!(opts && opts.visit); guest = null;
      root = new THREE.Group(); scene.add(root);
      scene.background = new THREE.Color(B.sky); scene.fog = new THREE.Fog(B.fog, 75, 190);
      hemi.color.set(B.night ? 0xB9A8FF : 0xffffff); hemi.groundColor.set(B.night ? 0x221a44 : 0x556644); hemi.intensity = 0.62 * B.light; sun.intensity = 0.72 * B.light; sun.color.set(B.night ? 0xC9B8FF : 0xFFF6E0);
      const { land, T, h, dd } = L;
      // smoothed vertex heights & colour masks on the corner grid
      const C = N + 1; const vh = new Float32Array(C * C), mPath = new Float32Array(C * C), mSoil = new Float32Array(C * C), mSand = new Float32Array(C * C), mDark = new Float32Array(C * C);
      const nz = makeNoise(mulberry(L.seed + 5));
      for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
        let s = 0, n = 0, p = 0, so = 0, sa = 0, dk = 0, wsum = 0;
        for (let y = j - 2; y <= j + 1; y++) for (let x = i - 2; x <= i + 1; x++) {
          if (x < 0 || y < 0 || x >= N || y >= N) continue; const k = y * N + x; const near = (x === i - 1 || x === i) && (y === j - 1 || y === j); const w = near ? 1 : 0.35;
          if (near) { s += h[k]; n++; }
          wsum += w; if (T[k] === 1 || T[k] === 7 || T[k] === 3) p += w; if (T[k] === 2 || T[k] === 6 || T[k] === 8) so += w; if (land[k] && dd[k] > 0.9) sa += w; if (T[k] === 4) dk += w;
        }
        const k2 = j * C + i; vh[k2] = (n ? s / n : -2) + (nz(i / 3, j / 3) - 0.5) * 0.35; mPath[k2] = p / wsum; mSoil[k2] = so / wsum; mSand[k2] = sa / wsum; mDark[k2] = dk / wsum;
      }
      // flatten paths & stations slightly
      for (let k = 0; k < C * C; k++) if (mPath[k] > 0.4 || mSoil[k] > 0.4) vh[k] = vh[k] * 0.7 + 0.42 * 0.3;
      L.hv = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) L.hv[y * N + x] = (vh[y * C + x] + vh[y * C + x + 1] + vh[(y + 1) * C + x] + vh[(y + 1) * C + x + 1]) / 4;
      // terrain mesh (non-indexed, flat-shaded low poly)
      const pos = new Float32Array(N * N * 6 * 3), col = new Float32Array(N * N * 6 * 3); let pi = 0;
      const cg = B.grass.map(c => new THREE.Color(c)), cPath = new THREE.Color(B.path), cSoil = new THREE.Color(B.soil), cSand = new THREE.Color(B.sand), cDark = new THREE.Color(B.dark), cUnder = new THREE.Color(B.deep);
      const tmp = new THREE.Color(); const vcol = (i, j) => {
        const k = j * C + i; const y = vh[k]; if (y < -0.25) { tmp.copy(cSand).lerp(cUnder, Math.min(1, (-y - 0.25) / 1.4)); return tmp; }
        const gi = Math.floor(nz(i / 5 + 7, j / 5 + 3) * 2.99); tmp.copy(cg[Math.max(0, Math.min(2, gi))]);
        tmp.lerp(cDark, Math.min(0.55, mDark[k] * 0.7)); tmp.lerp(cSand, Math.min(1, Math.max(0, mSand[k] - 0.3) * 1.8 + (y < 0.1 ? 0.75 : 0)));
        const pth = Math.min(1, Math.max(0, (mPath[k] - 0.16) * 3.2)); tmp.lerp(cPath, pth); const sl = Math.min(1, Math.max(0, (mSoil[k] - 0.3) * 2.2)); tmp.lerp(cSoil, sl * 0.85); return tmp;
      };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const X0 = x * CS - HALF, X1 = X0 + CS, Z0 = y * CS - HALF, Z1 = Z0 + CS; const a = [X0, vh[y * C + x], Z0, x, y], b = [X1, vh[y * C + x + 1], Z0, x + 1, y], c = [X0, vh[(y + 1) * C + x], Z1, x, y + 1], d = [X1, vh[(y + 1) * C + x + 1], Z1, x + 1, y + 1];
        const tris = (x + y) % 2 ? [[a, c, b], [b, c, d]] : [[a, c, d], [a, d, b]];
        tris.forEach(tr => { const cc = new THREE.Color(0, 0, 0); tr.forEach(p => cc.add(vcol(p[3], p[4]))); cc.multiplyScalar(1 / 3); tr.forEach(p => { pos[pi] = p[0]; pos[pi + 1] = p[1]; pos[pi + 2] = p[2]; col[pi] = cc.r; col[pi + 1] = cc.g; col[pi + 2] = cc.b; pi += 3; }); });
      }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
      const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); root.add(terrain); L.terrain = terrain;
      // water
      const wg = new THREE.PlaneGeometry(WS * 2.6, WS * 2.6, 56, 56); wg.rotateX(-Math.PI / 2); const water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: B.water, transparent: true, opacity: 0.84, shininess: 90, flatShading: true, specular: 0x88ccff })); water.position.y = 0; root.add(water); L.water = water; L.wbase = Float32Array.from(wg.attributes.position.array);
      // instanced helpers
      const dummy = new THREE.Object3D();
      const inst = (geo, mat, list, fn) => { if (!list.length) return null; const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, i) => { fn(it, i, dummy); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (it._c != null) m.setColorAt(i, new THREE.Color(it._c)); }); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; root.add(m); return m; };
      const lam = c => new THREE.MeshLambertMaterial({ color: c });
      const lamW = () => new THREE.MeshLambertMaterial({ color: 0xffffff });
      const pick = a => a[Math.floor(L.rng() * a.length)];
      // trees, rocks, bushes
      const trees = L.obst.filter(o => o.t === 'tree').map(o => { const [X, Z] = cellW(o.x, o.y); const jx = (L.rng() - 0.5) * CS * 0.6, jz = (L.rng() - 0.5) * CS * 0.6; return { X: X + jx, Z: Z + jz, s: 0.8 + L.rng() * 0.55, r: L.rng() * 6.28 }; });
      trees.forEach(t => { t.Y = heightAt(t.X, t.Z); });
      const kind = B.tree;
      if (kind === 'oak') {
        inst(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 6), lam(B.trunk), trees, (t, i, d) => { d.position.set(t.X, t.Y + 0.6 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(0, t.r, 0); });
        trees.forEach(t => { t._c = pick(B.leaf); });
        inst(new THREE.IcosahedronGeometry(1.05, 0), lamW(), trees, (t, i, d) => { d.position.set(t.X, t.Y + 1.85 * t.s, t.Z); d.scale.set(t.s, t.s * 0.95, t.s); d.rotation.set(0, t.r, 0); });
      } else if (kind === 'pine' || kind === 'snowpine') {
        inst(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 5), lam(B.trunk), trees, (t, i, d) => { d.position.set(t.X, t.Y + 0.45 * t.s, t.Z); d.scale.setScalar(t.s); });
        trees.forEach(t => { t._c = pick(B.leaf); });
        inst(new THREE.ConeGeometry(1.05, 1.7, 7), lamW(), trees, (t, i, d) => { d.position.set(t.X, t.Y + 1.55 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(0, t.r, 0); });
        inst(new THREE.ConeGeometry(0.78, 1.35, 7), lamW(), trees, (t, i, d) => { d.position.set(t.X, t.Y + 2.45 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(0, t.r + 0.3, 0); });
        if (kind === 'snowpine') { trees.forEach(t => { t._c = 0xFFFFFF; }); inst(new THREE.ConeGeometry(0.45, 0.7, 7), lamW(), trees, (t, i, d) => { d.position.set(t.X, t.Y + 2.92 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(0, t.r + 0.3, 0); }); }
      } else if (kind === 'palm') {
        inst(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 6), lam(B.trunk), trees, (t, i, d) => { d.position.set(t.X, t.Y + 1.25 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(0.12, t.r, 0.08); });
        trees.forEach(t => { t._c = pick(B.leaf); });
        inst(new THREE.ConeGeometry(1.2, 0.5, 6), lamW(), trees, (t, i, d) => { d.position.set(t.X + 0.15 * t.s, t.Y + 2.62 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(Math.PI, t.r, 0); });
        inst(new THREE.ConeGeometry(0.75, 0.6, 5), lamW(), trees, (t, i, d) => { d.position.set(t.X + 0.15 * t.s, t.Y + 2.95 * t.s, t.Z); d.scale.setScalar(t.s); d.rotation.set(0, t.r + 0.5, 0); });
        trees.forEach(t => { t._c = 0x7A4E2E; }); inst(new THREE.SphereGeometry(0.16, 6, 5), lamW(), trees, (t, i, d) => { d.position.set(t.X + 0.15 * t.s, t.Y + 2.35 * t.s, t.Z + 0.2); d.scale.setScalar(t.s); });
      } else {
        trees.forEach(t => { t._c = pick(B.leaf); });
        const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x3A2A80 });
        inst(new THREE.OctahedronGeometry(0.75, 0), cm, trees, (t, i, d) => { d.position.set(t.X, t.Y + 1.5 * t.s, t.Z); d.scale.set(t.s * 0.9, t.s * 2.1, t.s * 0.9); d.rotation.set(0, t.r, 0.1); });
        inst(new THREE.OctahedronGeometry(0.4, 0), cm, trees, (t, i, d) => { d.position.set(t.X + 0.55 * t.s, t.Y + 0.75 * t.s, t.Z + 0.2); d.scale.set(t.s, t.s * 1.8, t.s); d.rotation.set(0, t.r, -0.35); });
      }
      const rocks = L.obst.filter(o => o.t === 'rock').map(o => { const [X, Z] = cellW(o.x, o.y); return { X: X + (L.rng() - 0.5) * 0.5, Z: Z + (L.rng() - 0.5) * 0.5, s: 0.7 + L.rng() * 0.6, r: L.rng() * 6.28 }; });
      inst(new THREE.DodecahedronGeometry(0.62, 0), lam(B.rock), rocks, (t, i, d) => { d.position.set(t.X, heightAt(t.X, t.Z) + 0.22 * t.s, t.Z); d.scale.set(t.s, t.s * 0.72, t.s * 0.9); d.rotation.set(t.r * 0.2, t.r, 0); });
      const bushes = L.obst.filter(o => o.t === 'bush').map(o => { const [X, Z] = cellW(o.x, o.y); return { X, Z, s: 0.8 + L.rng() * 0.4, _c: pick(B.leaf) }; });
      inst(new THREE.IcosahedronGeometry(0.66, 0), lamW(), bushes, (t, i, d) => { d.position.set(t.X, heightAt(t.X, t.Z) + 0.35 * t.s, t.Z); d.scale.set(t.s * 1.2, t.s * 0.85, t.s); });
      // flowers and grass tufts on open ground
      const fl = []; for (let k = 0; k < 2200 && fl.length < 230; k++) { const x = Math.floor(L.rng() * N), y = Math.floor(L.rng() * N); const kk = y * N + x; if (!land[kk] || T[kk] !== 0 || dd[kk] > 0.86) continue; const [X, Z] = cellW(x, y); fl.push({ X: X + (L.rng() - 0.5) * CS, Z: Z + (L.rng() - 0.5) * CS, _c: fl.length % 3 ? B.grass[2] : pick(B.flower), t: fl.length % 3 ? 'g' : 'f' }); }
      const ff = fl.filter(f => f.t === 'f'), gg = fl.filter(f => f.t === 'g'); gg.forEach(f => { f._c = new THREE.Color(f._c).multiplyScalar(0.82).getHex(); });
      inst(new THREE.IcosahedronGeometry(0.14, 0), lamW(), ff, (t, i, d) => { d.position.set(t.X, heightAt(t.X, t.Z) + 0.22, t.Z); });
      inst(new THREE.ConeGeometry(0.1, 0.42, 4), lamW(), gg, (t, i, d) => { d.position.set(t.X, heightAt(t.X, t.Z) + 0.18, t.Z); d.rotation.set(0, i, 0.15); });
      // stations
      const fenceP = [], fenceR = [], barns = [], roofs = [], sprouts = [], crops = [];
      L.stations.forEach((s, si) => {
        const tp = topics[s.topic]; const [X, Z] = cellW(s.x, s.y); s.X = X; s.Z = Z; s.Y = heightAt(X, Z); const [EX, EZ] = cellW(s.ex, s.ey); s.EX = EX; s.EZ = EZ;
        const R = 2.75 * CS; const pts = []; for (let a = 0; a < 360; a += 20) { const ang = a * Math.PI / 180; if (s.gaps.some(g => Math.abs(((ang - g) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 0.42)) continue; pts.push([X + Math.cos(ang) * R, Z + Math.sin(ang) * R, ang]); }
        pts.forEach((p, i) => { fenceP.push({ X: p[0], Z: p[1] }); const q = pts[i + 1]; if (q && Math.abs(q[2] - p[2]) < 0.4) fenceR.push({ X: (p[0] + q[0]) / 2, Z: (p[1] + q[1]) / 2, a: Math.atan2(q[1] - p[1], q[0] - p[0]), l: Math.hypot(q[0] - p[0], q[1] - p[1]) }); });
        const bxw = X + Math.cos(s.bang) * 1.7 * CS, bzw = Z + Math.sin(s.bang) * 1.7 * CS; s.BX = bxw; s.BZ = bzw;
        const tc = new THREE.Color(tp.color); barns.push({ X: bxw, Z: bzw, a: s.bang + Math.PI, _c: tc.clone().lerp(new THREE.Color(0xffffff), 0.25).getHex() }); roofs.push({ X: bxw, Z: bzw, a: s.bang + Math.PI, _c: tc.clone().multiplyScalar(0.72).getHex() });
        for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) { const ox = X + Math.cos(s.ang) * 0.35 * CS + c * 0.75, oz = Z + Math.sin(s.ang) * 0.35 * CS + r * 0.75; sprouts.push({ X: ox, Z: oz, st: si }); crops.push({ X: ox, Z: oz, st: si, _c: tp.color }); }
      });
      const hY = (X, Z) => heightAt(X, Z);
      inst(new THREE.BoxGeometry(0.18, 0.95, 0.18), lam(0xC9925A), fenceP, (t, i, d) => { d.position.set(t.X, hY(t.X, t.Z) + 0.45, t.Z); });
      inst(new THREE.BoxGeometry(1, 0.12, 0.1), lam(0xE0B07A), fenceR, (t, i, d) => { d.position.set(t.X, hY(t.X, t.Z) + 0.62, t.Z); d.rotation.set(0, -t.a, 0); d.scale.set(t.l, 1, 1); });
      inst(new THREE.BoxGeometry(2.1, 1.5, 1.9), lamW(), barns, (t, i, d) => { d.position.set(t.X, hY(t.X, t.Z) + 0.72, t.Z); d.rotation.set(0, -t.a + Math.PI / 2, 0); });
      inst(new THREE.ConeGeometry(1.7, 1.15, 4), lamW(), roofs, (t, i, d) => { d.position.set(t.X, hY(t.X, t.Z) + 2.02, t.Z); d.rotation.set(0, -t.a + Math.PI / 4 + Math.PI / 2, 0); d.scale.set(1.0, 1, 0.92); });
      L.sproutMesh = inst(new THREE.ConeGeometry(0.16, 0.5, 5), lam(0x5DB851), sprouts, (t, i, d) => { d.position.set(t.X, hY(t.X, t.Z) + 0.22, t.Z); });
      L.cropMesh = inst(new THREE.IcosahedronGeometry(0.3, 0), lamW(), crops, (t, i, d) => { d.position.set(t.X, hY(t.X, t.Z) + 0.32, t.Z); d.scale.setScalar(0.001); });
      L.sprouts = sprouts; L.crops = crops;
      // barn doors (white trim) as one instanced mesh
      inst(new THREE.BoxGeometry(0.7, 0.95, 0.06), lam(0xFFF6E6), barns, (t, i, d) => { d.position.set(t.X + Math.cos(t.a) * 0.97, hY(t.X, t.Z) + 0.5, t.Z + Math.sin(t.a) * 0.97); d.rotation.set(0, -t.a + Math.PI / 2, 0); });
      // signs, bubbles, invisible hit targets
      L.hits = [];
      L.stations.forEach((s, si) => {
        const tp = topics[s.topic];
        s.gold = s.topic === L.gold; const sg = sprite(signTex(tp.icon, tp.farm, s.gold ? '👑 Golden Challenge' : tp.topic, s.gold ? '#E0A800' : tp.color), 3.3, 1.29); sg.position.set(s.EX + Math.cos(s.ang) * 0.7 - Math.sin(s.ang) * 2.1, s.Y + 1.55, s.EZ + Math.sin(s.ang) * 0.7 + Math.cos(s.ang) * 2.1); root.add(sg); s.sign = sg;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 5), lam(0x8A5A35)); post.position.set(sg.position.x, s.Y + 0.5, sg.position.z); root.add(post); s.post = post;
        s.bubbleTex = [bubbleTex(tp.icon, s.gold ? '#E0A800' : tp.color, false, s.gold), bubbleTex(tp.icon, s.gold ? '#E0A800' : tp.color, true, s.gold), bubbleTex('❓', '#9AA0A8', false)];
        const bb = sprite(s.bubbleTex[0], 2.1, 2.46); bb.position.set(s.BX, s.Y + 4.2, s.BZ); root.add(bb); s.bubble = bb;
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.set(s.X, s.Y + 2.5, s.Z); hit.userData.station = si; root.add(hit); L.hits.push(hit);
        setDone(si, !!(plots[s.topic] && plots[s.topic].done), true);
      });
      // home
      { const s = L.home; const [X, Z] = cellW(s.x, s.y); const Y = heightAt(X, Z); s.X = X; s.Z = Z; const g = new THREE.Group(); g.position.set(X, Y, Z);
        const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.8), lam(0xFFF1D6)); walls.position.y = 1.1; g.add(walls);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.75, 1.7, 4), lam(0xD9483B)); roof.position.y = 3.05; roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 1.05); g.add(roof);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.08), lam(0x8E4EC6)); door.position.set(0, 0.65, 1.42); g.add(door);
        [-1.05, 1.05].forEach(x => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), lam(0xA9DEF9)); w.position.set(x, 1.3, 1.42); g.add(w); });
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.0, 0.45), lam(0x9AA0A8)); ch.position.set(0.9, 3.4, -0.4); g.add(ch);
        root.add(g); const tag = sprite(tagTex('🏡 Home', '#FFFDF5', '#2B2340'), 2.6, 0.78); tag.position.set(X, Y + 4.6, Z); root.add(tag); }
      // bridges
      L.bridges.forEach((b, bi2) => {
        const [AX, AZ] = cellW(b.landA[0], b.landA[1]), [BX, BZ] = cellW(b.landB[0], b.landB[1]); b.y = Math.max(0.45, (L.hv[b.landA[1] * N + b.landA[0]] + L.hv[b.landB[1] * N + b.landB[0]]) / 2 + 0.05);
        const len = Math.hypot(BX - AX, BZ - AZ), ang = Math.atan2(BZ - AZ, BX - AX); const n = Math.max(2, Math.floor(len / 0.42)); const planks = [];
        for (let i = 0; i <= n; i++) planks.push({ X: AX + (BX - AX) * i / n, Z: AZ + (BZ - AZ) * i / n, i });
        b.plankMesh = inst(new THREE.BoxGeometry(0.34, 0.12, 1.7), lam(0xB97E4A), planks, (t, i, d) => { d.position.set(t.X, b.y, t.Z); d.rotation.set(0, -ang, 0); });
        b.planks = planks; b.ang = ang;
        const posts = []; for (let i = 0; i <= n; i += 3) [-1, 1].forEach(sd => posts.push({ X: planks[i].X - Math.sin(ang) * 0.85 * sd, Z: planks[i].Z + Math.cos(ang) * 0.85 * sd }));
        inst(new THREE.CylinderGeometry(0.08, 0.1, 1.3, 5), lam(0x8A5A35), posts, (t, i, d) => { d.position.set(t.X, b.y + 0.2, t.Z); });
        const ropes = [-1, 1].map(sd => ({ X: (AX + BX) / 2 - Math.sin(ang) * 0.85 * sd, Z: (AZ + BZ) / 2 + Math.cos(ang) * 0.85 * sd }));
        b.ropeMesh = inst(new THREE.CylinderGeometry(0.035, 0.035, len, 4), lam(0xE6C9A0), ropes, (t, i, d) => { d.position.set(t.X, b.y + 0.72, t.Z); d.rotation.set(0, -ang, Math.PI / 2); });
        b.sign = sprite(tagTex(`🔒 ${b.need} farms`, '#FFFDF5', '#2B2340', 380), 3.2, 0.8); b.sign.position.set((AX + BX) / 2, b.y + 2.2, (AZ + BZ) / 2); root.add(b.sign);
        b.open = false; setBridge(bi2, false, true);
      });
      // coins
      L.coinMesh = inst(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0xFFC83D, emissive: 0x5A3A00 }), L.coins, (t, i, d) => { const [X, Z] = cellW(t.x, t.y); t.X = X; t.Z = Z; d.position.set(X, heightAt(X, Z) + 0.8, Z); d.rotation.set(Math.PI / 2, 0, 0); });
      // chests
      L.chests.forEach(c => { const [X, Z] = cellW(c.x, c.y); c.X = X; c.Z = Z; const g = new THREE.Group(); g.position.set(X, heightAt(X, Z), Z); g.rotation.y = L.rng() * 6.28;
        const base2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.65), lam(0x9C5B2E)); base2.position.y = 0.28; g.add(base2);
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.1, 0.68), lam(0xFFC83D)); band.position.y = 0.42; g.add(band);
        const lidP = new THREE.Group(); lidP.position.set(0, 0.55, -0.32); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.26, 0.66), lam(0xB66A35)); lid.position.set(0, 0.13, 0.32); lidP.add(lid); g.add(lidP);
        root.add(g); c.lid = lidP; });
      // animals (billboards) wandering on open land
      L.animals = []; for (let k = 0; k < 500 && L.animals.length < 9; k++) { const x = Math.floor(L.rng() * N), y = Math.floor(L.rng() * N); const kk = y * N + x; if (!L.walk[kk] || T[kk] !== 0) continue; const [X, Z] = cellW(x, y); const sp = sprite(emojiTex(B.animals[L.animals.length % B.animals.length]), 1.5, 1.5); sp.position.set(X, heightAt(X, Z) + 0.75, Z); root.add(sp); L.animals.push({ sp, X, Z, tx: X, tz: Z, wait: L.rng() * 3 }); }
      // clouds
      L.clouds = []; for (let k = 0; k < 7; k++) { const g = new THREE.Group(); const cm = new THREE.MeshLambertMaterial({ color: B.night ? 0x8C82C8 : 0xffffff, transparent: true, opacity: 0.9 }); for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + L.rng() * 1.2, 0), cm); m.position.set(j * 1.8 - 2.7, L.rng() * 0.8, (L.rng() - 0.5) * 1.5); g.add(m); } const ca = L.rng() * 6.28, cr = WS * (0.62 + L.rng() * 0.25); g.position.set(Math.cos(ca) * cr, 26 + L.rng() * 8, Math.sin(ca) * cr); root.add(g); L.clouds.push(g); }
      if (B.night) { const sg = new THREE.BufferGeometry(); const sp = new Float32Array(900); for (let k = 0; k < 300; k++) { const a = L.rng() * 6.28, e = 0.2 + L.rng() * 1.2, r = 180; sp[k * 3] = Math.cos(a) * Math.cos(e) * r; sp[k * 3 + 1] = Math.sin(e) * r; sp[k * 3 + 2] = Math.sin(a) * Math.cos(e) * r; } sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); root.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xFFF7C2, size: 1.6, fog: false }))); }
      // character
      buildPlayer();
      const [hx, hz] = cellW(L.home.x + 2, L.home.y + 3); let px = hx, pz = hz;
      if (save && save.level === level) { if (save.pos && !L.visit) { px = save.pos[0]; pz = save.pos[1]; } (save.coins || []).forEach(i => { if (L.coins[i]) takeCoin(i, true); }); (save.chests || []).forEach(i => { if (L.chests[i]) openChest(i, true); }); if (save.expl) for (let k = 0; k < L.expl.length; k++) L.expl[k] = save.expl.charCodeAt(k) === 49 ? 1 : 0; if (save.disc) for (let k = 0; k < 18; k++) L.disc[k] = save.disc.charCodeAt(k) === 49 ? 1 : 0; }
      L.stations.forEach((s, si) => bubbleState(si));
      const [pcx, pcz] = wCell(px, pz); if (!L.walk[pcz * N + pcx]) { px = hx; pz = hz; }
      P.X = px; P.Z = pz; P.path = []; P.auto = -1; P.group.position.set(px, heightAt(px, pz), pz);
      cam.tx = px; cam.tz = pz; cam.free = false;
      L.near = -2; L.bridgeNear = -1; buildMinimap();
      petsBuild(); lastRender = 0;
    }

    /* ---------------- player ---------------- */
    const P = { X: 0, Z: 0, path: [], speed: 6.8, dir: 0, t: 0, auto: -1, keys: {}, colors: { shirt: 0xE5484D, pants: 0x3E7BFA, hat: 0xF2C14E, skin: 0xF2C29B }, name: 'Adley' };
    function makeFarmer(name, C2, o) {
      const g = new THREE.Group(); const m = c => new THREE.MeshLambertMaterial({ color: c });
      const shirt = m(C2.shirt), pants = m(C2.pants), skin = m(C2.skin), hat = m(C2.hat), dark = m(0x2B2340), boot = m(0x5A3A22);
      const legL = new THREE.Group(), legR = new THREE.Group(); [legL, legR].forEach((lg, i) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.26), pants); leg.position.y = -0.27; lg.add(leg); const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.34), boot); b2.position.set(0, -0.55, 0.04); lg.add(b2); lg.position.set(i ? 0.15 : -0.15, 0.66, 0); g.add(lg); });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.7, 0.42), shirt); body.position.y = 1.0; g.add(body);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.32, 0.44), pants); strap.position.y = 0.8; g.add(strap);
      const armL = new THREE.Group(), armR = new THREE.Group(); [armL, armR].forEach((ag, i) => { const a = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), shirt); a.position.y = -0.25; ag.add(a); const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), skin); hd.position.y = -0.56; ag.add(hd); ag.position.set(i ? 0.44 : -0.44, 1.3, 0); g.add(ag); });
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), skin); head.position.y = 1.72; g.add(head);
      [-0.13, 0.13].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), dark); e.position.set(x, 1.76, 0.34); g.add(e); });
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), m(0xFF8FA3)); cheek.position.set(0.22, 1.66, 0.31); g.add(cheek); const ch2 = cheek.clone(); ch2.position.x = -0.22; g.add(ch2);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 12), hat); brim.position.y = 1.98; g.add(brim);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 10), hat); top.position.y = 2.14; g.add(top);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.08, 10), m(0xD9483B)); band.position.y = 2.03; g.add(band);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04; g.add(sh);
      const tag = sprite(tagTex(name, o.tagBg || '#2B2340', '#FFFFFF'), 2.0, 0.6); tag.material.depthTest = false; tag.renderOrder = 999; tag.position.y = 2.75; g.add(tag);
      let ar = null; if (o.arrow) { ar = sprite(emojiTex('🔻', 96), 0.7, 0.7); ar.material.depthTest = false; ar.renderOrder = 999; ar.position.y = 3.35; g.add(ar); }
      if (o.xray) {
        const xr = new THREE.MeshBasicMaterial({ color: 0x2B2340, transparent: true, opacity: 0.5, depthFunc: THREE.GreaterDepth, depthWrite: false });
        const ms = []; g.traverse(n => { if (n.isMesh && n !== sh) ms.push(n); }); ms.forEach(n => { n.material = n.material.clone(); n.material.transparent = true; n.renderOrder = 20; const x = new THREE.Mesh(n.geometry, xr); x.renderOrder = 10; n.add(x); });
      }
      g.scale.setScalar(1.05);
      return { g, legs: [legL, legR], arms: [armL, armR], body, tag, arrow: ar };
    }
    function buildPlayer() {
      if (P.group && P.group.parent) P.group.parent.remove(P.group);
      const f = makeFarmer(P.name, P.colors, { arrow: true, xray: true });
      P.group = f.g; P.legs = f.legs; P.arms = f.arms; P.body = f.body; P.tag = f.tag; P.arrow = f.arrow; (root || scene).add(f.g);
    }
    /* a friend's farmer standing by the home while you visit their island */
    let guest = null;
    function setGuest(gs) {
      if (guest) { guest.items.forEach(n => n.parent && n.parent.remove(n)); guest = null; }
      if (!gs || !L || !root) return;
      const f = makeFarmer(gs.name || 'Friend', Object.assign({ shirt: 0xE5484D, pants: 0x3E7BFA, hat: 0xF2C14E, skin: 0xF2C29B }, gs.colors || {}), { tagBg: '#8E4EC6' });
      const spot = nearestWalk(L.home.x - 2, L.home.y + 3, 6) || nearestWalk(L.home.x, L.home.y + 3, 8) || [L.home.x + 2, L.home.y + 3];
      const [X, Z] = cellW(spot[0], spot[1]); f.g.position.set(X, heightAt(X, Z), Z); root.add(f.g);
      const items = [f.g];
      const pets = (gs.pets || []).slice(0, 4).map((e, i) => { const a = 2.2 + i * 0.9; const px = X + Math.cos(a) * 1.7, pz = Z + Math.sin(a) * 1.7; const sp = sprite(emojiTex(e), 1.2, 1.2); sp.position.set(px, heightAt(px, pz) + 0.6, pz); root.add(sp); items.push(sp); return { sp, X: px, Z: pz }; });
      guest = { f, X, Z, items, pets, dir: 0 };
    }

    /* pets follow the farmer */
    let pets = [], petList = [];
    function petsBuild() { pets.forEach(p => p.sp.parent && p.sp.parent.remove(p.sp)); pets = petList.map((e, i) => { const sp = sprite(emojiTex(e), 1.3, 1.3); sp.position.set(P.X - 1 - i, 0.7, P.Z + 1); root.add(sp); return { sp, X: P.X - 1 - i * 0.8, Z: P.Z + 1 }; }); P.trail = []; }

    /* ---------------- state changes ---------------- */
    function bubbleState(si) { const s = L.stations[si]; const known = L.disc[si] || s.done; s.bubble.material.map = s.bubbleTex[s.done ? 1 : known ? 0 : 2]; s.bubble.material.needsUpdate = true; s.sign.visible = !!known; s.post.visible = !!known; }
    function setDone(si, done, silent) {
      const s = L.stations[si]; s.done = done; bubbleState(si);
      const d = new THREE.Object3D(); L.crops.forEach((c, i) => { if (c.st !== si) return; d.position.set(c.X, heightAt(c.X, c.Z) + 0.36, c.Z); d.scale.setScalar(done ? 1 : 0.001); d.updateMatrix(); L.cropMesh.setMatrixAt(i, d.matrix); });
      L.sprouts.forEach((c, i) => { if (c.st !== si) return; d.position.set(c.X, heightAt(c.X, c.Z) + 0.22, c.Z); d.scale.setScalar(done ? 0.001 : 1); d.rotation.set(0, 0, 0); d.updateMatrix(); L.sproutMesh.setMatrixAt(i, d.matrix); });
      L.cropMesh.instanceMatrix.needsUpdate = true; L.sproutMesh.instanceMatrix.needsUpdate = true;
      if (!silent && done) s.pop = 1;
    }
    function setBridge(bi2, open, silent) {
      const b = L.bridges[bi2]; b.open = open; b.cells.forEach(([x, y]) => { L.walk[y * N + x] = open ? 1 : 0; });
      const d = new THREE.Object3D(); b.planks.forEach((p, i) => { const show = open || i < 2 || i > b.planks.length - 3 || (i % 5 === 0 && i > 3 && i < b.planks.length - 4 && false); d.position.set(p.X, b.y - (show ? 0 : 3), p.Z); d.rotation.set(0, -b.ang, 0); d.scale.setScalar(show ? 1 : 0.001); d.updateMatrix(); b.plankMesh.setMatrixAt(i, d.matrix); });
      b.plankMesh.instanceMatrix.needsUpdate = true; b.ropeMesh.visible = open; b.sign.visible = !open;
      if (open && !silent) { b.build = 0; }
    }
    function harvested(count, silent) { L.bridges.forEach((b, i) => { if (!b.open && count >= b.need) { setBridge(i, true, silent); if (!silent) { b.build = 0.0001; hooks.onBridgeOpen && hooks.onBridgeOpen(i, b); } } else if (b.open && count < b.need) setBridge(i, false, true); }); }
    function takeCoin(i, silent) { const c = L.coins[i]; c.taken = true; const d = new THREE.Object3D(); d.scale.setScalar(0.001); d.position.set(c.X, -5, c.Z); d.updateMatrix(); L.coinMesh.setMatrixAt(i, d.matrix); L.coinMesh.instanceMatrix.needsUpdate = true; if (!silent) hooks.onCoin && hooks.onCoin(1); }
    function openChest(i, silent) { const c = L.chests[i]; c.open = true; c.lid.rotation.x = -1.9; if (!silent) hooks.onChest && hooks.onChest(); }

    /* ---------------- walking ---------------- */
    const walkable = (x, y) => x >= 0 && y >= 0 && x < N && y < N && L.walk[y * N + x] === 1;
    function nearestWalk(x, y, R) { let best = null, bd = 1e9; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (walkable(x + dx, y + dy)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x + dx, y + dy]; } } } return best; }
    function los(a, b) { const [ax, ay] = a, [bx, by] = b; const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3); for (let i = 0; i <= n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; for (const [ox, oy] of [[0.28, 0.28], [-0.28, 0.28], [0.28, -0.28], [-0.28, -0.28]]) if (!walkable(Math.floor(x + 0.5 + ox), Math.floor(y + 0.5 + oy))) return false; } return true; }
    function findPath(tx, ty) {
      const [sx, sy] = wCell(P.X, P.Z); const start = walkable(sx, sy) ? [sx, sy] : nearestWalk(sx, sy, 3); if (!start) return null;
      const path = astar(start[0], start[1], tx, ty, walkable, () => 1, true); if (!path) return null;
      const out = []; let i = 0; while (i < path.length - 1) { let j = path.length - 1; while (j > i + 1 && !los(path[i], path[j])) j--; out.push(path[j]); i = j; }
      return out.map(([x, y]) => cellW(x, y));
    }
    let ringMesh = null, ringT = 0;
    function walkTo(cx, cy, auto) {
      const tgt = walkable(cx, cy) ? [cx, cy] : nearestWalk(cx, cy, 4); if (!tgt) { hooks.onBlocked && hooks.onBlocked('far'); return false; }
      const path = findPath(tgt[0], tgt[1]);
      if (!path) { const [px, py] = wCell(P.X, P.Z); const ia = L.iid[py * N + px], ib = L.iid[tgt[1] * N + tgt[0]]; const lb = ia >= 0 && ib >= 0 && ia !== ib ? L.bridges.filter((br, bi) => bi >= Math.min(ia, ib) && bi < Math.max(ia, ib)).find(br => !br.open) : null; hooks.onBlocked && hooks.onBlocked(lb ? 'bridge' : 'far', lb); return false; }
      P.path = path; P.auto = auto == null ? -1 : auto; cam.free = false;
      const [X, Z] = cellW(tgt[0], tgt[1]); if (!ringMesh) { ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.7, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); ringMesh.rotation.x = -Math.PI / 2; } root.add(ringMesh); ringMesh.position.set(X, heightAt(X, Z) + 0.08, Z); ringT = 1;
      hooks.onWalk && hooks.onWalk(); return true;
    }
    function goStation(si) { const s = L.stations[si]; return walkTo(s.ex, s.ey, si); }

    /* ---------------- show the way ---------------- */
    let prints = [], printT = 0;
    function showWay() {
      prints.forEach(p => root.remove(p)); prints = [];
      const [sx, sy] = wCell(P.X, P.Z); let best = null;
      L.stations.forEach((s, si) => { if (s.done) return; const p = astar(...(walkable(sx, sy) ? [sx, sy] : nearestWalk(sx, sy, 3)), s.ex, s.ey, walkable, () => 1, true); if (p && (!best || p.length < best.p.length)) best = { p, si }; });
      if (!best) { const lb = L.bridges.find(b => !b.open); return lb ? { blocked: lb.need } : null; }
      const tex = emojiTex('🐾', 96); best.p.forEach(([x, y], i) => { if (i % 2 || i === 0) return; const [X, Z] = cellW(x, y); const s2 = sprite(tex, 0.9, 0.9); s2.position.set(X, heightAt(X, Z) + 0.45, Z); s2.material.opacity = 0; s2.userData.i = i; root.add(s2); prints.push(s2); });
      printT = 0.0001; return { si: best.si, steps: best.p.length };
    }

    /* ---------------- minimap ---------------- */
    let mmBase = null; const mm = { cv: null };
    function buildMinimap() {
      const cv = document.createElement('canvas'); cv.width = cv.height = N * 3; const c = cv.getContext('2d'); const B = L.B;
      const hex = n => '#' + new THREE.Color(n).getHexString();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = y * N + x; let col; if (L.bridgeAt[k] >= 0) col = '#B97E4A'; else if (!L.land[k]) col = hex(B.water); else if (L.T[k] === 1 || L.T[k] === 7) col = hex(B.path); else if (L.T[k] === 4 || L.T[k] === 6) col = hex(B.dark); else if (L.T[k] === 2 || L.T[k] === 3) col = hex(B.soil); else if (L.dd[k] > 0.86) col = hex(B.sand); else col = hex(B.grass[0]); c.fillStyle = col; c.fillRect(x * 3, y * 3, 3, 3); }
      mmBase = cv;
    }
    function drawMinimap(target, big) {
      if (!L || !mmBase || !target) return; const c = target.getContext('2d'); const W2 = target.width, s = W2 / (N * 3); c.clearRect(0, 0, W2, W2); c.drawImage(mmBase, 0, 0, W2, W2);
      const cw = W2 / EG; c.fillStyle = 'rgba(30,24,52,0.84)'; for (let j = 0; j < EG; j++) for (let i = 0; i < EG; i++) if (!L.expl[j * EG + i]) { const x0 = Math.round(i * cw), y0 = Math.round(j * cw); c.fillRect(x0, y0, Math.round((i + 1) * cw) - x0, Math.round((j + 1) * cw) - y0); }
      const u = W2 / N; const fs = Math.max(11, u * (big ? 3.2 : 4.2));
      c.textAlign = 'center'; c.textBaseline = 'middle';
      L.bridges.forEach(b => { if (b.open) return; const [x, y] = b.cells[Math.floor(b.cells.length / 2)] || b.landA; c.font = `${fs}px ${FONT}`; c.fillText('🔒', (x + 0.5) * u, (y + 0.5) * u); });
      c.font = `${fs}px ${FONT}`; c.fillText('🏡', (L.home.x + 0.5) * u, (L.home.y + 0.5) * u);
      L.stations.forEach((st, si) => { if (!L.disc[si]) return; const x = (st.x + 0.5) * u, y = (st.y + 0.5) * u; c.fillStyle = st.done ? '#FFC53D' : '#FFFDF5'; c.beginPath(); c.arc(x, y, fs * 0.62, 0, 6.29); c.fill(); c.lineWidth = st.gold ? 4 : 2; c.strokeStyle = st.gold ? '#E0A800' : '#2B2340'; c.stroke(); c.fillStyle = '#2B2340'; c.font = `${fs * 0.78}px ${FONT}`; c.fillText(st.done ? '⭐' : L.topics[st.topic].icon, x, y + 1); });
      L.chests.forEach(ch => { const k = Math.floor(ch.y / 4) * EG + Math.floor(ch.x / 4); if (!L.expl[k] || ch.open) return; c.font = `${fs * 0.8}px ${FONT}`; c.fillText('🎁', (ch.x + 0.5) * u, (ch.y + 0.5) * u); });
      const [px, pz] = [(P.X + HALF) / CS * u, (P.Z + HALF) / CS * u]; c.fillStyle = '#E5484D'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(px, pz, Math.max(5, u * 1.3), 0, 6.29); c.fill(); c.stroke();
      // camera view direction wedge
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2; const a = -cam.yaw - Math.PI / 2; c.beginPath(); c.moveTo(px, pz); c.lineTo(px + Math.cos(a - 0.4) * u * 9, pz + Math.sin(a - 0.4) * u * 9); c.moveTo(px, pz); c.lineTo(px + Math.cos(a + 0.4) * u * 9, pz + Math.sin(a + 0.4) * u * 9); c.stroke();
    }
    function minimapTap(fx, fy) { const x = Math.floor(fx * N), y = Math.floor(fy * N); const si = L.stations.findIndex((s, i) => L.disc[i] && Math.hypot(s.x - x, s.y - y) < 4); if (si >= 0) return goStation(si) ? 'ok' : 'blocked'; const gi = Math.floor(y / 4) * EG + Math.floor(x / 4); if (x < 0 || y < 0 || x >= N || y >= N || !L.expl[gi]) return 'fog'; return walkTo(x, y) ? 'ok' : 'blocked'; }

    /* ---------------- input ---------------- */
    const el = renderer.domElement; const ptr = new Map(); let gest = null;
    el.addEventListener('pointerdown', e => { try { el.setPointerCapture(e.pointerId); } catch (er) { } ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }); if (ptr.size === 1) gest = { type: 'tap', moved: 0 }; else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; gest = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), dist: cam.distTo, yaw: cam.yawTo, moved: 99 }; } });
    el.addEventListener('pointermove', e => {
      const p = ptr.get(e.pointerId); if (!p || !gest) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (gest.type === 'pinch' && ptr.size >= 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cam.distTo = Math.max(13, Math.min(62, gest.dist * gest.d / d)); const ang = Math.atan2(b.y - a.y, b.x - a.x); cam.yawTo = gest.yaw - (ang - gest.ang); cam.yaw = cam.yawTo; return; }
      gest.moved = Math.max(gest.moved, Math.hypot(e.clientX - p.sx, e.clientY - p.sy));
      if (gest.moved > 9) { gest.type = 'pan'; const k = cam.dist * 0.0021; const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw); cam.tx -= (dx * cy + dy * sy) * k; cam.tz -= (-dx * sy + dy * cy) * k; cam.tx = Math.max(-HALF, Math.min(HALF, cam.tx)); cam.tz = Math.max(-HALF, Math.min(HALF, cam.tz)); cam.free = true; }
    });
    const up = e => { const p = ptr.get(e.pointerId); if (!p) return; ptr.delete(e.pointerId); if (gest && gest.type === 'tap' && e.type === 'pointerup' && performance.now() - p.t < 700) tap(e.clientX, e.clientY); if (!ptr.size) gest = null; else if (gest && gest.type === 'pinch') gest = { type: 'pan', moved: 99 }; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey) cam.distTo = Math.max(13, Math.min(62, cam.distTo * Math.exp(e.deltaY * 0.01))); else if (e.shiftKey) cam.yawTo += e.deltaY * 0.004; else { cam.distTo = Math.max(13, Math.min(62, cam.distTo * Math.exp(e.deltaY * 0.0015))); } }, { passive: false });
    window.addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; P.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { P.keys[e.key.toLowerCase()] = false; });
    function tap(cx, cy) {
      if (!L || paused) return; const r = el.getBoundingClientRect(); const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(v, camera);
      const hs = ray.intersectObjects(L.hits); if (hs.length) { const si = hs[0].object.userData.station; hooks.onTapStation && hooks.onTapStation(si); goStation(si); return; }
      const ht = ray.intersectObject(L.terrain); let pt = ht.length ? ht[0].point : null; if (!pt) { const wh = ray.intersectObject(L.water); if (wh.length) pt = wh[0].point; }
      if (!pt) return; const [x, y] = wCell(pt.x, pt.z); hooks.onTapGround && hooks.onTapGround(); walkTo(Math.max(0, Math.min(N - 1, x)), Math.max(0, Math.min(N - 1, y)));
    }

    /* ---------------- frame loop ---------------- */
    let mmTimer = -1e9; const mmCanvas = { small: null, big: null };
    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, clock.getDelta()); const now = performance.now();
      if (!L) return;
      if (sleeping || (paused && now - lastRender < 400)) return;
      const t = clock.elapsedTime;
      // keyboard move
      let kx = 0, kz = 0; const K = P.keys; if (!paused) { if (K['arrowup'] || K['w']) kz -= 1; if (K['arrowdown'] || K['s']) kz += 1; if (K['arrowleft'] || K['a']) kx -= 1; if (K['arrowright'] || K['d']) kx += 1; }
      let moving = false, mvx = 0, mvz = 0;
      if (kx || kz) { P.path = []; P.auto = -1; cam.free = false; const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw); mvx = kx * cy + kz * sy; mvz = -kx * sy + kz * cy; const l = Math.hypot(mvx, mvz); mvx /= l; mvz /= l; const nx = P.X + mvx * P.speed * dt, nz = P.Z + mvz * P.speed * dt; const [cx2, cz2] = wCell(nx, nz); const [cxo, czo] = wCell(P.X, P.Z); if (walkable(cx2, cz2)) { P.X = nx; P.Z = nz; } else { if (walkable(cx2, czo)) P.X = nx; else if (walkable(cxo, cz2)) P.Z = nz; } moving = true; }
      else if (P.path.length) { const [wx, wz] = P.path[0]; const dx = wx - P.X, dz = wz - P.Z, d = Math.hypot(dx, dz); const st = P.speed * dt; if (d <= st) { P.X = wx; P.Z = wz; P.path.shift(); } else { P.X += dx / d * st; P.Z += dz / d * st; } mvx = dx; mvz = dz; moving = true; if (!P.path.length && P.auto >= 0) { const si = P.auto; P.auto = -1; hooks.onArrive && hooks.onArrive(si); } }
      if (moving && (mvx || mvz)) { const target = Math.atan2(mvx, mvz); let da = target - P.dir; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; P.dir += da * Math.min(1, dt * 12); }
      P.t += moving ? dt * 11 : 0; const sw = moving ? Math.sin(P.t) * 0.65 : 0; P.legs[0].rotation.x = sw; P.legs[1].rotation.x = -sw; P.arms[0].rotation.x = -sw * 0.8; P.arms[1].rotation.x = sw * 0.8;
      P.group.position.set(P.X, heightAt(P.X, P.Z) + (moving ? Math.abs(Math.sin(P.t)) * 0.08 : Math.sin(t * 2) * 0.015), P.Z); P.group.rotation.y = P.dir;
      // pets trail
      if (pets.length) { P.trail = P.trail || []; if (!P.trail.length || Math.hypot(P.trail[0][0] - P.X, P.trail[0][1] - P.Z) > 0.35) P.trail.unshift([P.X, P.Z]); if (P.trail.length > 80) P.trail.pop(); pets.forEach((p, i) => { const tr = P.trail[Math.min(P.trail.length - 1, 5 + i * 5)]; if (tr) { p.X += (tr[0] - p.X) * Math.min(1, dt * 5); p.Z += (tr[1] - p.Z) * Math.min(1, dt * 5); } p.sp.position.set(p.X, heightAt(p.X, p.Z) + 0.65 + Math.abs(Math.sin(t * 6 + i)) * 0.15, p.Z); }); }
      // pickups & proximity
      if (!L.visit) { // on a friend's island the coins and chests are theirs: look, don't take
        L.coins.forEach((c, i) => { if (!c.taken && Math.hypot(c.X - P.X, c.Z - P.Z) < 1.1) takeCoin(i); });
        L.chests.forEach((c, i) => { if (!c.open && Math.hypot(c.X - P.X, c.Z - P.Z) < 1.7) openChest(i); });
      }
      let near = -1, nd = 2.6; L.stations.forEach((s, si) => { const d = Math.hypot(s.EX - P.X, s.EZ - P.Z); if (d < nd) { nd = d; near = si; } const dv = Math.hypot(s.X - P.X, s.Z - P.Z); if (!L.disc[si] && dv < 13) { L.disc[si] = 1; bubbleState(si); s.pop = 0.0001; hooks.onDiscover && hooks.onDiscover(si); } });
      if (near !== L.near) { L.near = near; hooks.onNear && hooks.onNear(near); }
      let bn = -1; L.bridges.forEach((b, i) => { if (b.open) return; for (const p of [b.landA, b.landB]) { const [X, Z] = cellW(p[0], p[1]); if (Math.hypot(X - P.X, Z - P.Z) < 3.2) bn = i; } }); if (bn !== L.bridgeNear) { L.bridgeNear = bn; if (bn >= 0) hooks.onBridgeNear && hooks.onBridgeNear(L.bridges[bn]); }
      const [pcx, pcz] = wCell(P.X, P.Z); const ci = Math.floor(pcx / 4), cj = Math.floor(pcz / 4); for (let j = cj - 2; j <= cj + 2; j++) for (let i = ci - 2; i <= ci + 2; i++) if (i >= 0 && j >= 0 && i < EG && j < EG && Math.hypot(i - ci, j - cj) <= 2.3) L.expl[j * EG + i] = 1;
      // animations
      if (!paused) {
        const wp = L.water.geometry.attributes.position; const b0 = L.wbase; for (let i = 0; i < wp.count; i++) { const x = b0[i * 3], z = b0[i * 3 + 2]; wp.array[i * 3 + 1] = Math.sin(x * 0.18 + t * 1.3) * 0.12 + Math.cos(z * 0.21 + t * 1.1) * 0.1; } wp.needsUpdate = true;
        const d = new THREE.Object3D(); L.coins.forEach((c, i) => { if (c.taken) return; d.position.set(c.X, heightAt(c.X, c.Z) + 0.85 + Math.sin(t * 3 + i) * 0.12, c.Z); d.rotation.set(Math.PI / 2, 0, t * 3 + i); d.scale.setScalar(1); d.updateMatrix(); L.coinMesh.setMatrixAt(i, d.matrix); }); if (L.coinMesh) L.coinMesh.instanceMatrix.needsUpdate = true;
        L.stations.forEach((s, si) => { s.bubble.position.y = s.Y + 4.25 + Math.sin(t * 2 + si) * 0.18; const sc = s.pop ? 1 + Math.sin(Math.min(1, s.pop) * Math.PI) * 0.6 : (L.near === si ? 1.15 : 1); s.bubble.scale.set(2.1 * sc, 2.46 * sc, 1); if (s.pop) { s.pop += dt * 1.6; if (s.pop > 1) s.pop = 0; } });
        L.animals.forEach(a => { a.wait -= dt; if (a.wait <= 0) { const [cx3, cz3] = wCell(a.X, a.Z); const nx = cx3 + Math.floor(L.rng() * 7) - 3, nz = cz3 + Math.floor(L.rng() * 7) - 3; if (walkable(nx, nz) && L.T[nz * N + nx] === 0) { const [X, Z] = cellW(nx, nz); a.tx = X; a.tz = Z; } a.wait = 2 + L.rng() * 4; } const dx = a.tx - a.X, dz = a.tz - a.Z, d2 = Math.hypot(dx, dz); if (d2 > 0.05) { const s3 = Math.min(d2, dt * 1.4); a.X += dx / d2 * s3; a.Z += dz / d2 * s3; } a.sp.position.set(a.X, heightAt(a.X, a.Z) + 0.72 + (d2 > 0.05 ? Math.abs(Math.sin(t * 8)) * 0.12 : 0), a.Z); });
        L.clouds.forEach((g, i) => { g.position.x += dt * (0.6 + i * 0.08); if (g.position.x > WS * 0.95) g.position.x = -WS * 0.95; });
        if (P.arrow) P.arrow.position.y = 3.35 + Math.sin(t * 4) * 0.12;
        if (guest) { // the friend's farmer turns to you and waves
          const want = Math.atan2(P.X - guest.X, P.Z - guest.Z); let da = want - guest.dir; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; guest.dir += da * Math.min(1, dt * 3); guest.f.g.rotation.y = guest.dir;
          const wave = Math.sin(t * 0.9) > 0.3; guest.f.arms[1].rotation.z = wave ? 2.5 + Math.sin(t * 9) * 0.35 : 0; guest.f.g.position.y = heightAt(guest.X, guest.Z) + Math.abs(Math.sin(t * 2)) * 0.05;
          guest.pets.forEach((p, i) => { p.sp.position.y = heightAt(p.X, p.Z) + 0.6 + Math.abs(Math.sin(t * 5 + i)) * 0.15; });
        }
        L.bridges.forEach((b, i) => { if (b.build > 0 && b.build < 1) { b.build = Math.min(1, b.build + dt * 0.7); const d3 = new THREE.Object3D(); const n2 = b.planks.length; b.planks.forEach((p, j) => { const k = Math.max(0, Math.min(1, b.build * 1.4 * n2 - j * 1.0) / 1); const kk = Math.min(1, Math.max(0, (b.build * (n2 + 6) - j) / 6)); d3.position.set(p.X, b.y - (1 - kk) * 2.5, p.Z); d3.rotation.set(0, -b.ang, (1 - kk) * 1.2); d3.scale.setScalar(Math.max(0.001, kk)); d3.updateMatrix(); b.plankMesh.setMatrixAt(j, d3.matrix); }); b.plankMesh.instanceMatrix.needsUpdate = true; } });
        L.chests.forEach(c => { if (c.open && c.lid.rotation.x > -1.9) c.lid.rotation.x -= dt * 4; });
        if (ringMesh && ringT > 0) { ringT -= dt * 1.2; ringMesh.material.opacity = Math.max(0, ringT); ringMesh.scale.setScalar(1 + (1 - ringT) * 0.8); }
        if (printT > 0) { printT += dt; prints.forEach(p => { const i = p.userData.i; const a = Math.max(0, Math.min(1, (printT * 18 - i) / 4)) * Math.max(0, Math.min(1, (9 - printT) / 1.5)); p.material.opacity = a; }); if (printT > 9) { prints.forEach(p => root.remove(p)); prints = []; printT = 0; } }
      }
      // camera
      if (!cam.free) { const k = 1 - Math.exp(-dt * 5); cam.tx += (P.X - cam.tx) * k; cam.tz += (P.Z - cam.tz) * k; }
      cam.yaw += (cam.yawTo - cam.yaw) * (1 - Math.exp(-dt * 8)); cam.dist += (cam.distTo - cam.dist) * (1 - Math.exp(-dt * 8));
      const ty = heightAt(cam.tx, cam.tz) * 0.5 + 0.6; const cp = Math.cos(cam.pitch);
      camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.tx, ty, cam.tz);
      renderer.render(scene, camera); lastRender = now;
      if (now - mmTimer > 250) { mmTimer = now; if (mmCanvas.small) drawMinimap(mmCanvas.small, false); if (mmCanvas.big && mmCanvas.big.offsetParent) drawMinimap(mmCanvas.big, true); }
    }
    function exploredShare() { let land = 0, seen = 0; for (let j = 0; j < EG; j++) for (let i = 0; i < EG; i++) { let has = false; for (let y = j * 4; y < j * 4 + 4 && !has; y++) for (let x = i * 4; x < i * 4 + 4; x++) if (L.land[y * N + x]) { has = true; break; } if (has) { land++; if (L.expl[j * EG + i]) seen++; } } return land ? seen / land : 0; }
    function toScreen(X, Y, Z) { const v = new THREE.Vector3(X, Y, Z).project(camera); const r = el.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, vis: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 }; }
    function resize() { const w = container.clientWidth || 1, h2 = container.clientHeight || 1; renderer.setSize(w, h2, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h2 + 'px'; camera.aspect = w / h2; camera.fov = w < h2 ? 52 : 40; camera.updateProjectionMatrix(); }
    window.addEventListener('resize', resize); resize(); requestAnimationFrame(frame);

    return {
      build, resize, harvested, showWay, goStation, setDone: (topic, done) => { const si = L.stations.findIndex(s => s.topic === topic); if (si >= 0) setDone(si, done); },
      stationTopic: si => L.stations[si].topic, stationOfTopic: tp => L.stations.findIndex(s => s.topic === tp),
      pause: v => { paused = v; if (v) { P.path = []; P.keys = {}; } }, sleep: v => { sleeping = !!v; },
      zoom: f => { cam.distTo = Math.max(13, Math.min(62, cam.distTo * f)); }, rotate: d => { cam.yawTo += d; }, recenter: () => { cam.free = false; },
      setMinimap: (small, big) => { mmCanvas.small = small; mmCanvas.big = big; }, minimapTap, drawMaps: () => { if (mmCanvas.small) drawMinimap(mmCanvas.small, false); if (mmCanvas.big) drawMinimap(mmCanvas.big, true); },
      setPets: list => { petList = list.slice(0, 4); if (L) petsBuild(); }, setGuest,
      setPlayer: (name, colors) => { P.name = name || P.name; if (colors) Object.assign(P.colors, colors); if (L) { const pos = P.group ? P.group.position.clone() : null; buildPlayer(); if (pos) P.group.position.copy(pos); } },
      save: () => L ? { level: L.level, pos: [Math.round(P.X * 10) / 10, Math.round(P.Z * 10) / 10], coins: L.coins.map((c, i) => c.taken ? i : -1).filter(i => i >= 0), chests: L.chests.map((c, i) => c.open ? i : -1).filter(i => i >= 0), expl: Array.from(L.expl).join(''), disc: Array.from(L.disc).join('') } : null,
      info: () => L ? { chestsTotal: L.chests.length, explored: exploredShare(), coinsLeft: L.coins.filter(c => !c.taken).length, chestsLeft: L.chests.filter(c => !c.open).length, discovered: L.disc.reduce((a, b) => a + b, 0), biome: L.B.name, bridges: L.bridges.map(b => ({ open: b.open, need: b.need })) } : null,
      stationScreen: si => { const s = L.stations[si]; return toScreen(s.X, s.Y + 2.5, s.Z); }, playerScreen: () => toScreen(P.X, heightAt(P.X, P.Z) + 1.6, P.Z), stationInfo: si => { const s = L.stations[si]; return { topic: s.topic, done: !!s.done, found: !!L.disc[si], island: s.island, gold: !!s.gold }; },
      biomes: BIOMES, renderer, debug: () => ({ L, P, cam, camera })
    };
  }
  return { create, generate, BIOMES, N };
})();
