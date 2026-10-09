'use strict';
/* =====================================================================
   Adley's Math Farm — question generators (pure, no DOM)
   18 farms = the 18 areas of the JISMO Grade 1 Math course outline.
   Every question is generated fresh: numbers, pictures and wording
   are randomised, so each farm has many variations per level.
   d = difficulty 1..5 (land number, capped at 5)
   ===================================================================== */

/* ---------- small helpers ---------- */
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
const sample = (a, k) => shuffle(a).slice(0, k);
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const sumA = a => a.reduce((x, y) => x + y, 0);
const listAnd = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const TENW = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const word = n => n <= 20 ? WORDS[n] : TENW[Math.floor(n / 10)] + (n % 10 ? '-' + WORDS[n % 10] : '');
function ord(n) { const t = n % 100; const s = (t >= 11 && t <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th'); return n + s; }

const NM = {
  '🥕': ['carrot', 'carrots'], '🍅': ['tomato', 'tomatoes'], '🥚': ['egg', 'eggs'], '🌽': ['corn cob', 'corn cobs'], '🍓': ['strawberry', 'strawberries'],
  '🍎': ['apple', 'apples'], '🍏': ['green apple', 'green apples'], '🍌': ['banana', 'bananas'], '🍇': ['bunch of grapes', 'bunches of grapes'], '🍐': ['pear', 'pears'],
  '🍊': ['orange', 'oranges'], '🍉': ['watermelon', 'watermelons'], '🍍': ['pineapple', 'pineapples'], '🍒': ['cherry', 'cherries'], '🍋': ['lemon', 'lemons'],
  '🥦': ['broccoli', 'broccoli'], '🥒': ['cucumber', 'cucumbers'], '🍆': ['eggplant', 'eggplants'], '🥔': ['potato', 'potatoes'],
  '🐥': ['chick', 'chicks'], '🐔': ['hen', 'hens'], '🐑': ['sheep', 'sheep'], '🐐': ['goat', 'goats'], '🐄': ['cow', 'cows'], '🐖': ['pig', 'pigs'],
  '🦆': ['duck', 'ducks'], '🐟': ['fish', 'fish'], '🐞': ['ladybug', 'ladybugs'], '🦋': ['butterfly', 'butterflies'], '🐝': ['bee', 'bees'],
  '🐦': ['bird', 'birds'], '🐰': ['bunny', 'bunnies'], '🐢': ['turtle', 'turtles'], '🐌': ['snail', 'snails'], '🐴': ['horse', 'horses'],
  '🐶': ['dog', 'dogs'], '🐱': ['cat', 'cats'], '🐸': ['frog', 'frogs'], '🐼': ['panda', 'pandas'], '🦊': ['fox', 'foxes'], '🐵': ['monkey', 'monkeys'],
  '🐨': ['koala', 'koalas'], '🐯': ['tiger', 'tigers'], '🦁': ['lion', 'lions'], '🐻': ['bear', 'bears'], '🐷': ['pig', 'pigs'], '🐭': ['mouse', 'mice'],
  '🌼': ['daisy', 'daisies'], '🌷': ['tulip', 'tulips'], '🌻': ['sunflower', 'sunflowers'], '🌸': ['blossom', 'blossoms'], '🍄': ['mushroom', 'mushrooms'], '🍀': ['clover', 'clovers'],
  '🍪': ['cookie', 'cookies'], '🧁': ['cupcake', 'cupcakes'], '🍦': ['ice cream', 'ice creams'], '🍩': ['donut', 'donuts'], '🍭': ['lollipop', 'lollipops'], '🧃': ['juice box', 'juice boxes'],
  '🎈': ['balloon', 'balloons'], '🐚': ['shell', 'shells'], '⭐': ['sticker', 'stickers'], '🚗': ['toy car', 'toy cars'], '🧸': ['teddy bear', 'teddy bears'],
  '⚽': ['ball', 'balls'], '🎲': ['dice', 'dice'], '📦': ['box', 'boxes'], '🥫': ['can', 'cans'], '🏀': ['basketball', 'basketballs'],
  '🚂': ['train', 'trains'], '🚲': ['bike', 'bikes'], '🚌': ['bus', 'buses'], '🚜': ['tractor', 'tractors'], '🚑': ['ambulance', 'ambulances'],
  '👕': ['shirt', 'shirts'], '👖': ['pants', 'pants'], '🧦': ['socks', 'socks'], '🧢': ['cap', 'caps'], '👗': ['dress', 'dresses'], '🧤': ['gloves', 'gloves'],
  '🐙': ['octopus', 'octopuses'], '🦀': ['crab', 'crabs'], '🐬': ['dolphin', 'dolphins'], '🐳': ['whale', 'whales'], '🦈': ['shark', 'sharks'],
  '🌱': ['sprout', 'sprouts'], '🌿': ['leafy plant', 'leafy plants'], '🐣': ['hatching chick', 'hatching chicks'],
  '🌅': ['sunrise', 'sunrises'], '🌞': ['midday sun', 'midday suns'], '🌇': ['sunset', 'sunsets'], '🌙': ['night moon', 'night moons'],
  '🧱': ['pile of bricks', 'piles of bricks'], '👚': ['blouse', 'blouses'], '🎽': ['vest', 'vests'], '🧥': ['coat', 'coats'], '🩳': ['shorts', 'shorts'], '✏️': ['pencil', 'pencils'], '📘': ['book', 'books'], '🐹': ['hamster', 'hamsters'], '🧒': ['child', 'children'], '🏗️': ['house being built', 'houses being built'], '🏠': ['finished house', 'finished houses'], '🔵': ['marble', 'marbles']
};
const nm = (e, n) => NM[e] ? (n === 1 ? NM[e][0] : NM[e][1]) : 'thing';
const FRUITW = { '🍎': 'apples', '🍌': 'bananas', '🍇': 'grapes', '🍓': 'strawberries', '🍐': 'pears', '🍊': 'oranges' };

const PEOPLE = [['Mia', 'she'], ['Leo', 'he'], ['Zara', 'she'], ['Omar', 'he'], ['Nina', 'she'], ['Kai', 'he'], ['Sari', 'she'], ['Budi', 'he'], ['Lily', 'she'], ['Sam', 'he'], ['Rina', 'she'], ['Arif', 'he']];
function people(k) { return sample(PEOPLE, k).map(([n, g]) => ({ n, he: g, He: cap(g), his: g === 'he' ? 'his' : 'her', him: g === 'he' ? 'him' : 'her', face: g === 'he' ? '👦' : '👧' })); }

/* ---------- option builders ---------- */
function sayNum(pre, v, post) { if (pre === '$') return v + (v === 1 ? ' dollar' : ' dollars'); if (post === ' g') return v + ' grams'; if (post === ' cm') return v + ' centimeters'; return String(v); }
function numQ(ans, mistakes, o) {
  o = o || {}; const pre = o.pre || '', post = o.post || '';
  const vals = [ans];
  const ok = v => Number.isInteger(v) && v >= (o.min == null ? 0 : o.min) && (o.max == null || v <= o.max) && vals.indexOf(v) < 0;
  (mistakes || []).forEach(m => { if (vals.length < 3 && ok(m)) vals.push(m); });
  [1, -1, 2, -2, 3, -3, 4, -4, 5, 10].forEach(dl => { if (vals.length < 3 && ok(ans + dl)) vals.push(ans + dl); });
  return { ans: String(ans), num: true, pre, post, opts: shuffle(vals).map(v => ({ val: String(v), html: `<b class="onum">${pre}${v}${post}</b>`, say: sayNum(pre, v, post) })) };
}
function optQ(ans, others, render, say, n) {
  n = n || 3; const vals = [String(ans)];
  others.forEach(v => { v = String(v); if (vals.length < n && vals.indexOf(v) < 0) vals.push(v); });
  return { ans: String(ans), opts: shuffle(vals).map(v => ({ val: v, html: render ? render(v) : `<span class="otxt">${v}</span>`, say: say ? say(v) : v })) };
}
const R_NUM = v => `<b class="onum">${v}</b>`;
const R_EM = v => `<span class="oem">${v}</span>`;
const S_EM = v => nm(v, 1);

/* ---------- picture builders (HTML strings) ---------- */
const em = (e, c) => `<span class="em${c ? ' ' + c : ''}">${e}</span>`;
function rows5(e, n, tap, cross) {
  let h = '<div class="r5">';
  for (let r = 0; r * 5 < n; r++) {
    h += '<div class="r5r">';
    for (let i = r * 5; i < Math.min(n, r * 5 + 5); i++) { const x = cross && i >= n - cross; h += `<span class="em${tap ? ' tp' : ''}${x ? ' x' : ''}">${e}</span>`; }
    h += '</div>';
  }
  return h + '</div>';
}
function scatter(items) {
  const C = 7, RW = 4; const cells = sample(range(0, C * RW - 1), items.length);
  return '<div class="sc">' + items.map((e, i) => {
    const c = cells[i] % C, r = Math.floor(cells[i] / C);
    const x = (c + 0.5 + (Math.random() - 0.5) * 0.42) / C * 100, y = (r + 0.5 + (Math.random() - 0.5) * 0.36) / RW * 100;
    return `<span class="em tp si" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%">${e}</span>`;
  }).join('') + '</div>';
}
function eq(tokens) {
  return '<div class="eq">' + tokens.map(t => {
    t = String(t);
    if (t === 'BOX') return '<span class="bx"></span>';
    if (t === 'PK') return '<span class="pk">?</span>';
    if (['+', '−', '=', '>', '<'].includes(t)) return `<i class="eo">${t}</i>`;
    if (/^[A-D]$/.test(t)) return `<span class="lt">${t}</span>`;
    return `<b class="en">${t}</b>`;
  }).join('') + '</div>';
}
function chain(items, alt) {
  return '<div class="chn">' + items.map((v, i) => {
    const s = String(v); const c = s === '?' ? ' q' : /^[A-D]$/.test(s) ? ' lt' : ''; const a = alt ? (i % 2 ? ' b' : ' a') : '';
    return `<span class="cn${c}${a}">${s}</span>`;
  }).join('<i class="lk"></i>') + '</div>';
}
const BUN = '<svg class="bun" viewBox="0 0 62 96" aria-hidden="true">' + range(0, 9).map(i => `<rect x="${(3 + i * 5.6).toFixed(1)}" y="4" width="4.2" height="88" rx="2"/>`).join('') + '<rect class="band" x="0" y="42" width="62" height="12" rx="4"/></svg>';
const STK = '<svg class="stk" viewBox="0 0 10 96" aria-hidden="true"><rect x="2.9" y="4" width="4.2" height="88" rx="2"/></svg>';
const bundles = (t, o) => `<div class="sticks">${BUN.repeat(t)}<span class="sgap"></span>${STK.repeat(o)}</div>`;

const COL = { red: '#E5484D', blue: '#3E7BFA', green: '#2FA35A', yellow: '#F5B400', purple: '#8E4EC6', orange: '#F08A24' };
function ngon(n, cx, cy, r) { const p = []; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); } return p.join(' '); }
function starPts(cx, cy, R, r) { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r : R; p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); } return p.join(' '); }
function shp(kind, color, s) {
  s = s || 64; const f = COL[color] || color || '#FFE08A';
  const st = `fill="${f}" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"`; let b = '';
  switch (kind) {
    case 'circle': b = `<circle cx="50" cy="50" r="38" ${st}/>`; break;
    case 'square': b = `<rect x="14" y="14" width="72" height="72" ${st}/>`; break;
    case 'rectangle': b = `<rect x="4" y="28" width="92" height="44" ${st}/>`; break;
    case 'triangle': b = `<polygon points="50,10 92,86 8,86" ${st}/>`; break;
    case 'star': b = `<polygon points="${starPts(50, 53, 44, 19)}" ${st}/>`; break;
    case 'pentagon': b = `<polygon points="${ngon(5, 50, 54, 42)}" ${st}/>`; break;
    case 'hexagon': b = `<polygon points="${ngon(6, 50, 50, 42)}" ${st}/>`; break;
    case 'octagon': b = `<polygon points="${ngon(8, 50, 50, 42)}" ${st}/>`; break;
    case 'lshape': b = `<polygon points="14,8 46,8 46,56 92,56 92,92 14,92" ${st}/>`; break;
  }
  return `<svg class="shp" viewBox="0 0 100 100" width="${s}" height="${s}" aria-hidden="true">${b}</svg>`;
}
const arrow = (deg, s) => `<svg class="arw" viewBox="0 0 100 100" width="${s || 64}" height="${s || 64}" aria-hidden="true"><g transform="rotate(${deg} 50 50)"><path d="M50 8 L84 46 L63 46 L63 92 L37 92 L37 46 L16 46 Z" fill="#46A9E2" stroke="#2B2340" stroke-width="5" stroke-linejoin="round"/></g></svg>`;
function clock(h, m, size) {
  const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
  let n = ''; for (let i = 1; i <= 12; i++) { const a = (i * 30 - 90) * Math.PI / 180; n += `<text x="${(60 + 41 * Math.cos(a)).toFixed(1)}" y="${(60 + 41 * Math.sin(a)).toFixed(1)}">${i}</text>`; }
  let tk = ''; for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; tk += `<line x1="${(60 + 50 * Math.sin(a)).toFixed(1)}" y1="${(60 - 50 * Math.cos(a)).toFixed(1)}" x2="${(60 + 54 * Math.sin(a)).toFixed(1)}" y2="${(60 - 54 * Math.cos(a)).toFixed(1)}"/>`; }
  const z = size || 180;
  return `<svg class="clk" viewBox="0 0 120 120" width="${z}" height="${z}" aria-hidden="true"><circle cx="60" cy="60" r="56" class="cf"/><g class="ct">${tk}</g><line class="hm" x1="60" y1="60" x2="${(60 + 40 * Math.sin(ma)).toFixed(1)}" y2="${(60 - 40 * Math.cos(ma)).toFixed(1)}"/><line class="hh" x1="60" y1="60" x2="${(60 + 25 * Math.sin(ha)).toFixed(1)}" y2="${(60 - 25 * Math.cos(ha)).toFixed(1)}"/><g class="cnum">${n}</g><circle cx="60" cy="60" r="4.5" class="cc"/></svg>`;
}
const bal = (L, R, tilt) => `<div class="bal t${tilt}"><div class="beam"><div class="pan pl">${L}</div><div class="pan pr">${R}</div></div><div class="post"></div><div class="foot"></div></div>`;
const wt = g => `<span class="wt">${g} g</span>`;
const bag = c => `<span class="bag" style="--bc:${COL[c]}">${c}</span>`;
function tally(n) {
  const g = Math.floor(n / 5), r = n % 5; let x = 6, s = '';
  for (let i = 0; i < g; i++) { for (let k = 0; k < 4; k++) s += `<line x1="${x + k * 9}" y1="5" x2="${x + k * 9}" y2="39"/>`; s += `<line x1="${x - 5}" y1="33" x2="${x + 32}" y2="11"/>`; x += 50; }
  for (let k = 0; k < r; k++) s += `<line x1="${x + k * 9}" y1="5" x2="${x + k * 9}" y2="39"/>`;
  x += r * 9 + 4; const w = Math.max(x, 20);
  return `<svg class="tal" viewBox="0 0 ${w} 44" width="${Math.round(w * 0.9)}" height="40" aria-hidden="true">${s}</svg>`;
}
const coin = v => v >= 5 ? `<span class="note n${v}">$${v}</span>` : `<span class="coin c${v}">$${v}</span>`;
const tag = (e, p, lbl) => `<div class="it">${lbl ? `<span class="itl">${lbl}</span>` : ''}${em(e)}<span class="tag">$${p}</span></div>`;
function greedy(T, set) { const s = set.slice().sort((a, b) => b - a); const out = []; let t = T; for (const c of s) { while (t >= c) { out.push(c); t -= c; } } return out; }
const nests = (g, k, e) => '<div class="nests">' + range(1, g).map(() => `<div class="nest">${em(e || '🥚').repeat(k)}</div>`).join('') + '</div>';
const plates = (g, k) => '<div class="nests">' + range(1, g).map(() => `<div class="plate">${em('🍪').repeat(k)}</div>`).join('') + '</div>';
const clues = list => '<ul class="clues">' + list.map(c => `<li><span class="cl">🔎</span><span>${c}</span></li>`).join('') + '</ul>';
const faces = (P, extra) => '<div class="scene">' + P.map(p => `<span class="pp">${em(p.face)}<small>${p.n}</small></span>`).join('') + (extra || '') + '</div>';

/* =====================================================================
   LEVEL SYSTEM — 50 levels, 10 difficulty tiers (5 levels per tier)
   Tier 1  (levels 1-5)   : JISMO Grade 1 practice-paper level, numbers to 20
   Tier 2  (levels 6-10)  : full JISMO Grade 1, more two-step problems
   Tier 3-4 (11-20)       : numbers to 30-40, regrouping, pyramids, logic chains
   Tier 5-7 (21-35)       : numbers to 50-80, olympiad tricks, area, calendars
   Tier 8-10 (36-50)      : numbers to 100, multi-clue logic, perimeter, 3-step problems
   ===================================================================== */
const tierOf = L => Math.max(1, Math.min(10, Math.ceil(L / 5)));
const NMAX = t => [20, 20, 30, 40, 50, 60, 80, 100, 100, 100][t - 1];
function kind(t, list) {
  const ok = list.filter(k => t >= k[1] && t <= (k[2] || 10));
  const w = ok.map(k => (k[3] || 1) * (t - k[1] <= 2 ? 1.5 : 1));
  let r = Math.random() * sumA(w);
  for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return (kind.last = ok[i][0]); }
  return (kind.last = ok[ok.length - 1][0]);
}
function perms(a) { if (a.length <= 1) return [a.slice()]; const out = []; a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => out.push([x].concat(p)))); return out; }
const R_TXT = v => `<span class="otxt">${v}</span>`;
const R_BIG = v => `<span class="otxt big">${v}</span>`;

/* ---------- extra picture builders ---------- */
function numLine(vals, labels, arrowIdx) {
  const n = vals.length, Wd = 560, x0 = 34, dx = (Wd - 68) / (n - 1);
  let s = `<line x1="12" y1="52" x2="${Wd - 12}" y2="52" class="nl"/><path d="M${Wd - 12} 52 l-12 -8 v16 z" class="nla2"/>`;
  vals.forEach((v, i) => { const x = (x0 + i * dx).toFixed(1); s += `<line x1="${x}" y1="40" x2="${x}" y2="64" class="nl"/>`; if (labels.includes(i)) s += `<text x="${x}" y="90" class="nlt">${v}</text>`; });
  const ax = (x0 + arrowIdx * dx).toFixed(1);
  s += `<path d="M${ax} 36 l-10 -14 h20 z" class="nlarr"/><text x="${ax}" y="14" class="nlq">?</text>`;
  return `<svg class="numl" viewBox="0 0 ${Wd} 100" width="${Wd}" height="100" aria-hidden="true">${s}</svg>`;
}
const pyramid = rows => '<div class="pyr">' + rows.slice().reverse().map(r => '<div class="pyr-r">' + r.map(v => v === null ? '<span class="pb q">?</span>' : v === '' ? '<span class="pb e"></span>' : `<span class="pb">${v}</span>`).join('') + '</div>').join('') + '</div>';
function gridSVG(w, h, cells, halves) {
  const u = 30, P = 4; let s = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) s += `<rect x="${P + x * u}" y="${P + y * u}" width="${u}" height="${u}" class="g0"/>`;
  cells.forEach(([x, y]) => { s += `<rect x="${P + x * u}" y="${P + y * u}" width="${u}" height="${u}" class="g1"/>`; });
  (halves || []).forEach(([x, y, o]) => {
    const X = P + x * u, Y = P + y * u; const c = [[X, Y], [X + u, Y], [X + u, Y + u], [X, Y + u]];
    const tri = [[c[0], c[1], c[3]], [c[0], c[1], c[2]], [c[1], c[2], c[3]], [c[0], c[2], c[3]]][o];
    s += `<polygon points="${tri.map(p => p.join(',')).join(' ')}" class="g1"/>`;
  });
  return `<svg class="gridsvg" viewBox="0 0 ${w * u + 2 * P} ${h * u + 2 * P}" width="${w * u + 2 * P}" height="${h * u + 2 * P}" aria-hidden="true">${s}</svg>`;
}
function polyo(n, w, h) {
  for (let tries = 0; tries < 200; tries++) {
    const set = new Set(); const K = (x, y) => x + ',' + y; set.add(K(Math.floor(w / 2), Math.floor(h / 2))); let g = 0;
    while (set.size < n && g++ < 600) { const [x, y] = pick([...set]).split(',').map(Number); const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < w && ny >= 0 && ny < h) set.add(K(nx, ny)); }
    // reject shapes with holes: every empty cell must reach the border
    const seen = new Set(); const st = []; for (let x = -1; x <= w; x++) for (let y = -1; y <= h; y++) if (x < 0 || y < 0 || x >= w || y >= h) { seen.add(K(x, y)); st.push([x, y]); }
    while (st.length) { const [x, y] = st.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx < -1 || ny < -1 || nx > w || ny > h) return; const k = K(nx, ny); if (seen.has(k) || set.has(k)) return; seen.add(k); st.push([nx, ny]); }); }
    let hole = false; for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { const k = K(x, y); if (!set.has(k) && !seen.has(k)) hole = true; }
    if (!hole && set.size === n) return [...set].map(s => s.split(',').map(Number));
  }
  return range(0, n - 1).map(i => [i % w, Math.floor(i / w)]);
}
function perim(cells) { const s = new Set(cells.map(c => c.join(','))); let p = 0; cells.forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (!s.has((x + dx) + ',' + (y + dy))) p++; })); return p; }
const MCOL = ['#FFFFFF', '#E5484D', '#3E7BFA'];
function mgrid(p, size, mirror) {
  const n = p.length, u = size / n; let s = '';
  p.forEach((row, y) => row.forEach((v, x) => { s += `<rect x="${(x * u + 2).toFixed(1)}" y="${(y * u + 2).toFixed(1)}" width="${u.toFixed(1)}" height="${u.toFixed(1)}" fill="${MCOL[v]}" stroke="#2B2340" stroke-width="2"/>`; }));
  if (mirror) s += `<line x1="${size + 12}" y1="0" x2="${size + 12}" y2="${size + 4}" class="cut"/>`;
  const W = mirror ? size + 18 : size + 4;
  return `<svg class="mg" viewBox="0 0 ${W} ${size + 4}" width="${W}" height="${size + 4}" aria-hidden="true">${s}</svg>`;
}
const SOLID = {
  cube: '<polygon points="22,40 62,40 62,80 22,80" fill="#FFD36B"/><polygon points="22,40 40,22 80,22 62,40" fill="#FFE9A8"/><polygon points="62,40 80,22 80,62 62,80" fill="#E9AE32"/>',
  box: '<polygon points="10,46 66,46 66,80 10,80" fill="#F7B27A"/><polygon points="10,46 28,30 84,30 66,46" fill="#FBD2AE"/><polygon points="66,46 84,30 84,64 66,80" fill="#D98B4E"/>',
  cylinder: '<path d="M26 28 V74 A24 9 0 0 0 74 74 V28" fill="#8FD3F7"/><ellipse cx="50" cy="28" rx="24" ry="9" fill="#C9ECFF"/>',
  cone: '<path d="M50 12 L76 74 A26 9 0 0 1 24 74 Z" fill="#FFB35A"/>',
  pyramid: '<polygon points="50,12 18,70 54,84" fill="#F5D06B"/><polygon points="50,12 54,84 84,66" fill="#D9A93A"/>',
  sphere: '<circle cx="50" cy="50" r="32" fill="#F08AA8"/><path d="M18 50 A32 11 0 0 0 82 50" fill="none" stroke-dasharray="5 4"/><circle cx="38" cy="38" r="7" fill="#fff" opacity=".6" stroke="none"/>'
};
const solid = (k, s) => `<svg class="sol" viewBox="0 0 100 100" width="${s || 110}" height="${s || 110}" aria-hidden="true"><g stroke="#2B2340" stroke-width="3" stroke-linejoin="round">${SOLID[k]}</g></svg>`;
function rulerSVG(len, s, e) {
  const u = 38, P = 22, W = len * u + 2 * P; let t = `<rect x="${P - 10}" y="44" width="${len * u + 20}" height="40" rx="6" class="rl"/>`;
  for (let i = 0; i <= len; i++) { const x = P + i * u; t += `<line x1="${x}" y1="44" x2="${x}" y2="${i % 5 === 0 ? 64 : 58}" class="rlt"/><text x="${x}" y="78" class="rln">${i}</text>`; }
  t += `<rect x="${P + s * u}" y="12" width="${(e - s) * u}" height="24" rx="5" class="rib2"/>`;
  return `<svg class="rul" viewBox="0 0 ${W} 92" width="${W}" height="92" aria-hidden="true">${t}</svg>`;
}
const DIR8 = { 0: 'up', 45: 'up-right', 90: 'right', 135: 'down-right', 180: 'down', 225: 'down-left', 270: 'left', 315: 'up-left' };
const cardsRow = d => `<div class="cards">${d.map(x => `<span class="dcard">${x}</span>`).join('')}</div>`;
const half = e => `<span class="em sm halfi">${e}</span>`;

/* =====================================================================
   1. NUMBER SENSE — Carrot Patch
   ===================================================================== */
function g1(L) {
  const t = tierOf(L), M = NMAX(t); const pu = (n, w) => n + ' ' + (n === 1 ? w : w + 's');
  const k = kind(t, [['count', 1, 1], ['word', 1, 3], ['compare', 1, 4], ['tens', 1, 3], ['sign', 1, 6], ['between', 1, 10], ['order', 2, 10], ['regroup', 4, 10], ['numline', 2, 10, 1.3], ['skip', 2, 9], ['digits', 5, 10, 1.3], ['countEven', 6, 10], ['oddEven', 3, 8]]);
  if (k === 'count') {
    const n = ri(13, 20); const e = pick(['🥕', '🍅', '🥚', '🌽', '🍓']); const rows = Math.floor(n / 5), rem = n % 5;
    let ex = `Count the full rows by fives: ${range(1, rows).map(i => i * 5).join(', ')}.`; if (rem) ex += ' Then count on: ' + range(rows * 5 + 1, n).join(', ') + '.'; ex += ` There are ${n} ${nm(e, n)}.`;
    return { text: `How many ${nm(e, 2)} are there?`, vis: rows5(e, n, true), tap: true, ...numQ(n, [n + 1, n - 1, n + 5]), hint: 'Each full row has 5. Count by fives, then count on.', explain: ex };
  }
  if (k === 'word') {
    const n = t === 1 ? ri(11, 20) : ri(21, 99);
    if (t === 1 && Math.random() < 0.5) {
      let ds; if (n >= 13 && n <= 19) ds = [TENW[n - 10], WORDS[n - 10]]; else if (n === 20) ds = ['twelve', 'two']; else if (n === 11) ds = ['one', 'twelve']; else ds = ['twenty', 'two'];
      return { text: `Which word matches the number ${n}?`, vis: `<div class="bignum">${n}</div>`, ...optQ(word(n), ds), hint: n >= 13 && n <= 19 ? 'Teen numbers have 1 ten. Listen for “teen” at the end.' : n === 20 ? 'Words that end in “ty” are tens. 20 is 2 tens.' : '11 and 12 have their own special words. They do not end in “teen”.', explain: `${n} is written “${word(n)}”.` };
    }
    const tn = Math.floor(n / 10), on = n % 10; let mis;
    if (n <= 20) mis = n >= 13 ? [(n - 10) * 10, n - 10] : [n + 1, n - 1]; else mis = [on ? on * 10 + tn : n + 1, on ? Number(`${tn * 10}${on}`) : n - 10, n + 10];
    const hw = n <= 12 ? 'Eleven and twelve both have 1 ten. Count on from ten: ten, eleven, twelve.' : n < 20 ? 'A “teen” word has 1 ten. The first part of the word tells you the ones.' : on === 0 ? 'A word that ends in “ty” tells you the tens. There are 0 ones.' : 'The first part of the word tells you the tens. The last part tells you the ones.';
    return { text: `Which number is “${word(n)}”?`, say: `Which number is ${word(n)}?`, vis: `<div class="bigword">${word(n)}</div>`, ...numQ(n, mis, { max: 999 }), hint: hw, explain: `“${cap(word(n))}” is ${tn} ${tn === 1 ? 'ten' : 'tens'} and ${on} ${on === 1 ? 'one' : 'ones'}: ${n}.` };
  }
  if (k === 'compare') {
    let vals;
    if (M >= 30 && Math.random() < 0.5) { const top = Math.min(9, Math.floor(M / 10)); const x = ri(1, top - 1), y = ri(x + 1, top); const a = 10 * x + y, b = 10 * y + x; let c; do { c = ri(10, Math.min(99, M)); } while (c === a || c === b); vals = [a, b, c]; }
    else { const base = ri(t === 1 ? 1 : t === 2 ? 8 : 10 * (t - 2), M - 9); vals = sample(range(base, base + 9), 3); }
    const big = Math.random() < 0.5; const ans = big ? Math.max(...vals) : Math.min(...vals); const sorted = vals.slice().sort((a, b) => a - b);
    return { text: big ? 'Which number is the greatest?' : 'Which number is the smallest?', vis: '', ...optQ(ans, vals.filter(v => v !== ans), R_NUM), hint: 'Look at the tens first. If the tens are the same, look at the ones.', explain: `From smallest to greatest: ${sorted.join(', ')}. So ${ans} is the ${big ? 'greatest' : 'smallest'}.` };
  }
  if (k === 'tens') {
    const tt = t === 1 ? ri(1, 2) : ri(2, 9), o = ri(1, 9); const ans = 10 * tt + o;
    return { text: `${tt} ${tt === 1 ? 'ten' : 'tens'} and ${o} ${o === 1 ? 'one' : 'ones'} make what number?`, vis: tt <= 5 ? bundles(tt, o) : '', ...numQ(ans, [tt + o, Number(`${10 * tt}${o}`), 10 * o + tt], { max: 999 }), hint: tt <= 5 ? 'Each bundle is 1 ten. Count the tens first, then the ones.' : 'Each ten is 10. Count the tens first, then the ones.', explain: `${tt} ${tt === 1 ? 'ten is' : 'tens are'} ${10 * tt}. ${10 * tt} and ${o} more make ${ans}.` };
  }
  if (k === 'sign') {
    let Ls, Rs, lv, rv;
    if (t === 1) { const a = ri(3, 9), b = ri(2, 9); lv = a + b; Ls = `${a} + ${b}`; rv = Math.random() < 0.25 ? lv : ri(lv - 3, lv + 3); Rs = String(rv); }
    else { const h = Math.floor(M / 2); const a = ri(2, h), b = ri(2, h); lv = a + b; const c = ri(lv, Math.min(M + 10, lv + h)); const want = Math.random() < 0.25 ? lv : lv + ri(-3, 3); const d = c - want; if (d < 1) { rv = c; Rs = String(c); } else { rv = c - d; Rs = `${c} − ${d}`; } Ls = `${a} + ${b}`; }
    const ans = lv > rv ? '>' : lv < rv ? '<' : '='; const names = { '>': 'greater than', '<': 'less than', '=': 'equals' };
    return { text: 'Which sign goes in the box?', vis: eq([...Ls.split(' '), 'BOX', ...Rs.split(' ')]), ...optQ(ans, ['>', '<', '='].filter(s => s !== ans), R_NUM, v => names[v]), hint: 'Work out each side first. The open mouth faces the bigger side.', explain: `${Ls} = ${lv}. ${Rs.includes('−') ? `${Rs} = ${rv}. ` : ''}` + (ans === '=' ? 'Both sides are the same, so we use =.' : `${Math.max(lv, rv)} is bigger, so the open mouth faces that side: ${ans}.`) };
  }
  if (k === 'between') {
    const incl = t >= 3 && Math.random() < 0.5; const a = ri(1, M - 12); const b = a + ri(4, Math.min(M - a, t === 1 ? 9 : 25));
    if (!incl) { const ans = b - a - 1; return { text: `How many numbers are between ${a} and ${b}? Do not count ${a} and ${b}.`, vis: chain([a, '…', b]), ...numQ(ans, [b - a, b - a + 1, ans - 1]), hint: `Count only the numbers in the middle, after ${a} and before ${b}.`, explain: ans <= 10 ? `The numbers between are ${range(a + 1, b - 1).join(', ')}. That is ${ans} numbers.` : `${b} − ${a} = ${b - a} steps. The numbers in the middle are one fewer: ${ans}.` }; }
    const ans = b - a + 1; return { text: `How many numbers are there from ${a} to ${b}, counting both ${a} and ${b}?`, vis: chain([a, '…', b]), ...numQ(ans, [b - a, b - a - 1, ans + 1]), hint: 'Take away to find the jumps, then add 1 because both ends count.', explain: `${b} − ${a} = ${b - a}. Both ends count, so add 1: ${ans}.` };
  }
  if (k === 'order') {
    const desc = Math.random() < 0.4; let nums;
    if (M <= 20) nums = sample(range(1, 20), 4); else { const tA = ri(1, Math.floor(M / 10) - 1), tB = tA + 1; nums = sample([...range(10 * tA, 10 * tA + 9), ...range(10 * tB, Math.min(10 * tB + 9, M))], 4); }
    const srt = nums.slice().sort((a, b) => desc ? b - a : a - b); const right = srt.join(', ');
    const sw = srt.slice(); [sw[1], sw[2]] = [sw[2], sw[1]];
    const byOnes = nums.slice().sort((a, b) => desc ? (b % 10 - a % 10 || b - a) : (a % 10 - b % 10 || a - b)); let d2 = byOnes.join(', ');
    if (d2 === right || d2 === sw.join(', ')) { const s2 = srt.slice(); [s2[0], s2[3]] = [s2[3], s2[0]]; d2 = s2.join(', '); }
    return { text: `Which list goes from ${desc ? 'biggest to smallest' : 'smallest to biggest'}?`, vis: `<div class="pt">${shuffle(nums).map(v => `<span class="cn">${v}</span>`).join('')}</div>`, ...optQ(right, [sw.join(', '), d2], R_TXT), hint: 'Compare the tens digits first, then the ones digits.', explain: `In order: ${right}.` };
  }
  if (k === 'regroup') {
    const x = ri(3, Math.min(9, Math.floor(M / 10))), y = ri(0, 9); const n = 10 * x + y; const give = t >= 7 ? pick([1, 2]) : 1; const tg = x - give; const ans = 10 * give + y;
    return { text: `${n} is ${pu(tg, 'ten')} and how many ones?`, vis: x <= 6 ? bundles(x, y) : '', ...numQ(ans, [y, ans + 10, 10 + y === ans ? y + 1 : 10 + y]), hint: `${n} is ${x} tens and ${pu(y, 'one')}. Break ${give === 1 ? 'one ten' : 'two tens'} into ones.`, explain: `${n} = ${x} tens and ${pu(y, 'one')}. Break ${give} ${give === 1 ? 'ten' : 'tens'} into ${10 * give} ones. Now it is ${pu(tg, 'ten')} and ${10 * give} + ${y} = ${ans} ones.` };
  }
  if (k === 'numline') {
    const st = pick(t <= 2 ? [1, 2] : t <= 4 ? [2, 5] : [2, 5, 10]); const n = 9; const top = Math.max(M, 30);
    const s0 = st * ri(0, Math.max(0, Math.floor((top - st * (n - 1)) / st))); const vals = range(0, n - 1).map(i => s0 + i * st);
    const labs = t <= 3 ? [0, 1] : pick([[0, 2], [1, 3], [0, 4]]); let ai; do { ai = ri(2, n - 1); } while (labs.includes(ai)); const ans = vals[ai];
    return { text: 'What number is the arrow pointing to?', vis: numLine(vals, labs, ai), ...numQ(ans, [s0 + ai, ans + st, ans - st]), hint: 'Find how much each jump is worth from the two numbers you can see. Then count on jump by jump.', explain: `From ${vals[labs[0]]} to ${vals[labs[1]]} is ${labs[1] - labs[0] === 1 ? `1 jump, so each jump is ${st}.` : `${labs[1] - labs[0]} jumps. Counting by ${st}s gets there: ${vals.slice(labs[0], labs[1] + 1).join(', ')}. So each jump is ${st}.`} Count on: ${vals.slice(labs[0], ai + 1).join(', ')}. The arrow points to ${ans}.` };
  }
  if (k === 'skip') {
    const st = pick(t <= 3 ? [2, 5, 10] : [3, 4, 5, 6, 10]); const back = t >= 4 && Math.random() < 0.4; let N = ri(5, t <= 3 ? 7 : 10);
    let start, seq; if (!back) { start = st * ri(0, 3) + (t >= 5 ? ri(1, 2) : 0); N = Math.min(N, Math.floor((100 - start) / st) + 1); seq = range(0, N - 1).map(i => start + i * st); } else { start = (N - 1) * st + ri(1, 20); seq = range(0, N - 1).map(i => start - i * st); }
    const ans = seq[N - 1];
    return { text: `Count ${back ? 'back ' : ''}by ${st}s starting at ${start}: ${seq.slice(0, 3).join(', ')}, … What is the ${ord(N)} number you say?`, vis: '', ...numQ(ans, [back ? ans - st : ans + st, back ? ans + st : ans - st, ans + 1]), hint: `The 1st number is ${start}. Keep ${back ? 'taking away' : 'adding'} ${st} until you reach the ${ord(N)} one.`, explain: `${seq.join(', ')}. The ${ord(N)} number is ${ans}.` };
  }
  if (k === 'digits') {
    let a, b, c2; do { a = ri(1, 9); b = ri(0, 9); } while (a === b || a + b < 5 || a + b > 13);
    if (a === 2 * b && b > 0 && Math.random() < 0.5) c2 = 'My tens digit is double my ones digit.'; else c2 = a > b ? `My tens digit is ${a - b} more than my ones digit.` : `My ones digit is ${b - a} more than my tens digit.`;
    const ans = 10 * a + b; const cl = [`I am a two-digit number.`, `My two digits add up to ${a + b}.`, c2];
    const same = range(10, 99).filter(x => Math.floor(x / 10) + x % 10 === a + b && x !== ans);
    return { text: cl.join(' ') + ' What number am I?', vis: clues(cl), ...numQ(ans, [b ? 10 * b + a : ans + 1, ...same.slice(0, 2)], { min: 10 }), hint: `List the two-digit numbers whose digits add to ${a + b}. Then check the other clue.`, explain: `Numbers with digits adding to ${a + b}: ${same.concat([ans]).sort((x, y) => x - y).join(', ')}. Only ${ans} also fits: ${c2.toLowerCase()}` };
  }
  if (k === 'countEven') {
    const ev = Math.random() < 0.5; const a = ri(1, 40), b = a + ri(8, 30); const list = range(a, b).filter(x => (x % 2 === 0) === ev); const ans = list.length;
    return { text: `How many ${ev ? 'even' : 'odd'} numbers are there from ${a} to ${b}? Count ${a} and ${b} too if they are ${ev ? 'even' : 'odd'}.`, vis: '', ...numQ(ans, [ans + 1, ans - 1, b - a + 1]), hint: `${ev ? 'Even' : 'Odd'} numbers jump by 2. Find the first and the last one and count the jumps of 2. Then add 1, because the first number counts too.`, explain: list.length <= 8 ? `They are ${list.join(', ')}. That is ${ans} numbers.` : `They are ${list.slice(0, 3).join(', ')}, …, ${list[ans - 1]}. From ${list[0]} to ${list[ans - 1]} is ${ans - 1} jumps of 2. The first number counts too, so ${ans - 1} + 1 = ${ans} numbers.` };
  }
  const X = ri(15, Math.max(30, M)); const typ = pick(['bigOdd', 'smallEven', 'bigEven']); let ans, text;
  if (typ === 'bigOdd') { ans = X % 2 ? X - 2 : X - 1; text = `What is the biggest odd number that is less than ${X}?`; }
  else if (typ === 'smallEven') { ans = X % 2 ? X + 1 : X + 2; text = `What is the smallest even number that is more than ${X}?`; }
  else { ans = X % 2 ? X - 1 : X - 2; text = `What is the biggest even number that is less than ${X}?`; }
  return { text, vis: '', ...numQ(ans, [X, ans + 2 === X ? ans - 2 : ans + 2, ans + 1]), hint: 'Even numbers end in 0, 2, 4, 6 or 8. Odd numbers end in 1, 3, 5, 7 or 9. “Less than” and “more than” do not include the number itself.', explain: `${typ === 'smallEven' ? `Count up from ${X}: ${range(X + 1, ans).join(', ')}` : `Count down from ${X}: ${range(ans, X - 1).reverse().join(', ')}`}. ${X} itself does not count. The first ${typ === 'bigOdd' ? 'odd' : 'even'} number we reach is ${ans}.` };
}

/* =====================================================================
   2. ADDITION AND SUBTRACTION — Apple Orchard
   ===================================================================== */
function g2(L) {
  const t = tierOf(L), M = NMAX(t); const pu = (n, w) => n + ' ' + (n === 1 ? w : w + 's');
  const k = kind(t, [['add20', 1, 2], ['sub20', 1, 2], ['sentence', 1, 2], ['bond', 1, 3], ['add3', 1, 6], ['noReg', 2, 4], ['reg', 3, 10, 1.6], ['chain', 3, 10], ['pairSum', 3, 10], ['smart', 6, 10], ['missDigit', 6, 10]]);
  if (k === 'add20') {
    let a, b; if (Math.random() < 0.3) { a = ri(11, 16); b = ri(2, 20 - a); } else { a = ri(3, 9); b = ri(Math.max(2, 11 - a), 9); }
    const s = a + b; const tt = 10 - a; let ex;
    if (a < 10 && s > 10) ex = `Make a ten! ${a} + ${tt} = 10. Then add the ${b - tt} left over: 10 + ${b - tt} = ${s}.`; else ex = `Start at ${a} and count on ${b}: ${range(a + 1, s).join(', ')}. So ${a} + ${b} = ${s}.`;
    return { text: `What is ${a} + ${b}?`, vis: eq([a, '+', b, '=', 'BOX']), ...numQ(s, [s + 1, s - 1, s - 10]), hint: a < 10 && s > 10 ? `What goes with ${a} to make 10?` : 'Start with the bigger number and count on.', explain: ex };
  }
  if (k === 'sub20') {
    const a = ri(11, 20), b = ri(3, 9); const r = a - b; let ex;
    if (r < 10) { const f = a - 10; ex = `Take away ${f} to reach 10: ${a} − ${f} = 10. Then take away ${b - f} more: 10 − ${b - f} = ${r}.`; } else ex = `Count back ${b} from ${a}: ${range(r, a - 1).reverse().join(', ')}. So ${a} − ${b} = ${r}.`;
    return { text: `What is ${a} − ${b}?`, vis: eq([a, '−', b, '=', 'BOX']), ...numQ(r, [r + 1, r - 1, a - b + 10]), hint: r < 10 ? `First take away ${a - 10} to get to 10.` : 'Count back from the bigger number.', explain: ex };
  }
  if (k === 'sentence') {
    const e = pick(['🦆', '🐸', '🐢']); const add = Math.random() < 0.5; const a = ri(add ? 5 : 9, add ? 11 : 15); const b = add ? ri(3, Math.min(20 - a, a - 1)) : ri(2, a - 3);
    const verbIn = e === '🐸' ? 'hop in' : e === '🐢' ? 'crawl in' : 'waddle in';
    let ans, ds, text;
    if (add) { text = `There are ${a} ${nm(e, a)} in the pond. Then ${b} more ${nm(e, b)} ${verbIn}. Which number sentence matches the story?`; ans = `${a} + ${b} = ${a + b}`; ds = [`${a} − ${b} = ${a - b}`, `${a + b} + ${b} = ${a + 2 * b}`]; }
    else { text = `There are ${a} ${nm(e, a)} in the pond. Then ${b} of them leave. Which number sentence matches the story?`; ans = `${a} − ${b} = ${a - b}`; ds = [`${a} + ${b} = ${a + b}`, `${a - b} + ${a} = ${2 * a - b}`]; }
    return { text, vis: `<div class="pond">${add ? em(e).repeat(a) : em(e).repeat(a - b) + em(e, 'leave').repeat(b)}</div>` + (add ? `<div class="incoming"><span class="arr" style="display:inline-block;transform:scaleX(-1)">➜</span>${em(e).repeat(b)}</div>` : ''), ...optQ(ans, ds, R_BIG), hint: add ? 'More are coming, so the group gets bigger.' : 'Some are leaving, so the group gets smaller.', explain: `We start with ${a} and ${b} ${add ? 'more join' : 'leave'}: ${ans}.` };
  }
  if (k === 'bond') {
    const T = ri(t === 1 ? 12 : 18, t === 1 ? 20 : 30); const a = ri(2, T - 6); const b = ri(2, T - a - 2); const c = T - a - b;
    return { text: `We need ${T} fruits in the basket. There are ${a} apples and ${b} bananas. The rest will be pears. How many pears do we need?`, vis: `<div class="bk">${a + b <= 18 ? em('🍎').repeat(a) + em('🍌').repeat(b) : `<b class="en">${a}</b>${em('🍎')}<b class="en">${b}</b>${em('🍌')}`}<span class="pk">?</span></div><div class="cap">Total: ${T} fruits</div>`, ...numQ(c, [c + 1, c - 1, T - a]), hint: `First add the apples and bananas. Then find how many more make ${T}.`, explain: `${a} + ${b} = ${a + b}. ${T} − ${a + b} = ${c}. We need ${c} ${nm('🍐', c)}.` };
  }
  if (k === 'add3') {
    let x, y; if (t >= 3 && Math.random() < 0.5) { x = ri(11, 19); y = 20 - x; } else { x = ri(1, 9); y = 10 - x; } const z = ri(3, t >= 3 ? 19 : 9); const arr = shuffle([x, y, z]); const s = x + y + z;
    return { text: `What is ${arr[0]} + ${arr[1]} + ${arr[2]}?`, vis: eq([arr[0], '+', arr[1], '+', arr[2], '=', 'BOX']), ...numQ(s, [s - 1, s + 1, s - 10]), hint: `Look for two numbers that make ${x + y} together.`, explain: `${x} + ${y} = ${x + y}. Then ${x + y} + ${z} = ${s}.` };
  }
  if (k === 'noReg') {
    const f = pick(['2d1', '2d1s', 'tt', '2dt']); let a, b, op, r, ex;
    if (f === '2d1') { const tt = ri(2, 4), o = ri(1, 7); a = 10 * tt + o; b = ri(1, 9 - o); op = '+'; r = a + b; ex = `${a} is ${tt} tens and ${pu(o, 'one')}. ${o} + ${b} = ${o + b} ones. So ${a} + ${b} = ${r}.`; }
    else if (f === '2d1s') { const tt = ri(2, 4), o = ri(2, 9); a = 10 * tt + o; b = ri(1, o); op = '−'; r = a - b; ex = `${o} − ${b} = ${pu(o - b, 'one')}, and the ${tt} tens stay. So ${a} − ${b} = ${r}.`; }
    else if (f === 'tt') { const x = ri(1, 3), y = ri(1, 3); a = 10 * x; b = 10 * y; op = '+'; r = a + b; ex = `${pu(x, 'ten')} + ${pu(y, 'ten')} = ${x + y} tens = ${r}.`; }
    else { const tt = ri(3, 4), o = ri(1, 9); a = 10 * tt + o; const y = ri(1, tt - 1); b = 10 * y; op = '−'; r = a - b; ex = `Take away ${pu(y, 'ten')}: ${pu(tt - y, 'ten')} and ${pu(o, 'one')} = ${r}.`; }
    return { text: `What is ${a} ${op} ${b}?`, vis: eq([a, op, b, '=', 'BOX']), ...numQ(r, [r + 10, r - 10, r + 1]), hint: 'Split into tens and ones.', explain: ex };
  }
  if (k === 'reg') {
    const add = Math.random() < 0.55; let a, b, g = 0;
    if (add) { do { a = ri(12, M - 12); b = ri(12, M - a); } while (((a % 10) + (b % 10) < 10 || a + b > M || a + b < M / 2) && g++ < 400); const s = a + b; const A = a - a % 10, B = b - b % 10;
      return { text: `What is ${a} + ${b}?`, vis: eq([a, '+', b, '=', 'BOX']), ...numQ(s, [s - 10, s + 10, s + 1]), hint: 'Add the tens, then add the ones. The ones make a new ten!', explain: `Tens: ${A} + ${B} = ${A + B}. Ones: ${a % 10} + ${b % 10} = ${a % 10 + b % 10}. Then ${A + B} + ${a % 10 + b % 10} = ${s}.` }; }
    do { a = ri(Math.max(21, Math.floor(M / 2)), M); b = ri(11, a - 5); } while (a % 10 >= b % 10 && g++ < 400); const r = a - b; const B = b - b % 10; const wrong = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs(a % 10 - b % 10);
    return { text: `What is ${a} − ${b}?`, vis: eq([a, '−', b, '=', 'BOX']), ...numQ(r, [wrong, r + 10, r - 1]), hint: `Take away the tens first (${B}), then take away the ${pu(b % 10, 'one')}.`, explain: `${a} − ${B} = ${a - B}. Then ${a - B} − ${b % 10} = ${r}.` };
  }
  if (k === 'chain') {
    const h = Math.floor(M / 2); const a = ri(5, h), b = ri(3, h), c = ri(2, a + b - 1); let r = a + b - c; let text = `What is ${a} + ${b} − ${c}`, toks = [a, '+', b, '−', c]; let ex = `${a} + ${b} = ${a + b}. ${a + b} − ${c} = ${r}.`;
    if (t >= 6) { const d = ri(2, 15); const plus = Math.random() < 0.5 || r - d < 1; text += ` ${plus ? '+' : '−'} ${d}`; toks.push(plus ? '+' : '−', d); ex += ` ${r} ${plus ? '+' : '−'} ${d} = ${plus ? r + d : r - d}.`; r = plus ? r + d : r - d; }
    return { text: text + '?', vis: eq([...toks, '=', 'BOX']), ...numQ(r, [r + 2 * c, r + 1, r - 10]), hint: 'Work from left to right, one step at a time.', explain: ex };
  }
  if (k === 'pairSum') {
    const T = t <= 4 ? ri(15, 30) : t <= 6 ? ri(30, 60) : ri(50, 100); const x = ri(3, T - 3); const y = T - x;
    const mk = dl => { const S2 = T + dl; const p = ri(2, S2 - 2); return `${p} and ${S2 - p}`; };
    return { text: `Which two numbers add up to ${T}?`, vis: `<div class="bignum">${T}</div>`, ...optQ(`${x} and ${y}`, [mk(pick([1, -1, 2])), mk(pick([10, -10, -2]))], R_BIG), hint: 'Add each pair. Check the ones digits first!', explain: `${x} + ${y} = ${T}.` };
  }
  if (k === 'smart') {
    const kk = ri(2, 7), dd = pick([1, 2]); const a = 10 * kk - dd; const add = Math.random() < 0.6;
    if (add) { const b = ri(11, 99 - a); const s = a + b; return { text: `What is ${a} + ${b}?`, vis: eq([a, '+', b, '=', 'BOX']), ...numQ(s, [s + dd, s - 10, s + 10]), hint: `${a} is close to ${10 * kk}. Add ${10 * kk}, then fix it.`, explain: `${a} is ${dd} less than ${10 * kk}. ${10 * kk} + ${b} = ${10 * kk + b}. Take away ${dd}: ${s}.` }; }
    const big = ri(a + 5, 99); const r = big - a; return { text: `What is ${big} − ${a}?`, vis: eq([big, '−', a, '=', 'BOX']), ...numQ(r, [r - dd, r + 10, r - 10]), hint: `Take away ${10 * kk} instead, then give back ${dd}.`, explain: `${big} − ${10 * kk} = ${big - 10 * kk}. We took away ${dd} too many, so add ${dd} back: ${r}.` };
  }
  let a, b, s, box, g = 0; do { a = ri(12, 69); b = ri(12, 89 - a); s = a + b; } while ((s > 99 || a % 10 === 0) && g++ < 100);
  box = Math.random() < 0.5 ? 'ones' : 'tens'; const ans = box === 'ones' ? a % 10 : Math.floor(a / 10);
  const shown = box === 'ones' ? `${Math.floor(a / 10)}<span class="bxd"></span>` : `<span class="bxd"></span>${a % 10}`;
  return { text: `One digit is hidden in the box. What digit goes in the box?`, say: 'One digit is hidden in the box. What digit goes in the box?', vis: `<div class="eq"><b class="en">${shown}</b><i class="eo">+</i><b class="en">${b}</b><i class="eo">=</i><b class="en">${s}</b></div>`, ...numQ(ans, [ans + 1, ans - 1, ans + 2], { max: 9 }), hint: `Find ${s} − ${b} first.`, explain: `${s} − ${b} = ${a}. So the missing digit is ${ans}.` };
}

/* =====================================================================
   3. MISSING NUMBERS — Pumpkin Patch
   ===================================================================== */
const FR3 = ['🍎', '🍌', '🍇', '🍓', '🍐', '🍊'];
function g3(L) {
  const t = tierOf(L), M = NMAX(t);
  const k = kind(t, [['basic', 1, 4], ['balance', 1, 8], ['doubles', 2, 8], ['fruits', 2, 10, 1.3], ['pyramid', 2, 10, 1.3], ['big', 4, 10]]);
  if (k === 'basic' || k === 'big') {
    const forms = ['?+b', 'a+?', 'a-?', '?-b']; if (k === 'basic') forms.push('a+?+b');
    const f = pick(forms); let tokens, x, ex, mis, hn; const lo = k === 'big' ? 11 : 1, hf = k === 'big' ? Math.floor(M / 2) : 0;
    if (f === '?+b') { x = ri(lo, M - lo - 1); const b = ri(Math.max(lo, hf - x), M - x); const c = x + b; tokens = ['PK', '+', b, '=', c]; ex = `${c} − ${b} = ${x}. Check it: ${x} + ${b} = ${c}.`; hn = `Taking away undoes adding. Start at ${c} and take away ${b}.`; mis = [c + b, x + 10, x - 1]; }
    else if (f === 'a+?') { const a = ri(lo, M - lo - 1); x = ri(Math.max(lo, hf - a), M - a); const c = a + x; tokens = [a, '+', 'PK', '=', c]; ex = `${c} − ${a} = ${x}. Check it: ${a} + ${x} = ${c}.`; hn = `Taking away undoes adding. Start at ${c} and take away ${a}.`; mis = [a + c, x + 10, x - 1]; }
    else if (f === 'a-?') { const a = ri(Math.max(lo + 5, hf), M); x = ri(lo, a - 1); const c = a - x; tokens = [a, '−', 'PK', '=', c]; ex = `${a} − ${c} = ${x}. Check it: ${a} − ${x} = ${c}.`; hn = `Start at ${a}. How many must you take away to get down to ${c}?`; mis = [a + c, x + 1, x - 10]; }
    else if (f === '?-b') { const b = ri(lo, Math.floor(M / 2)); const c = ri(Math.max(lo, hf - b), M - b); x = b + c; tokens = ['PK', '−', b, '=', c]; ex = `Think backwards: ${c} + ${b} = ${x}. Check it: ${x} − ${b} = ${c}.`; hn = `Adding undoes taking away. Start at ${c} and add the ${b} back.`; mis = [Math.abs(c - b), x + 1, x - 10]; }
    else { const a = ri(2, 9), b = ri(2, 9); x = ri(2, Math.max(2, Math.min(15, M - a - b))); const c = a + b + x; tokens = [a, '+', 'PK', '+', b, '=', c]; ex = `${a} + ${b} = ${a + b}. Then ${c} − ${a + b} = ${x}.`; hn = `Add the numbers you know first: ${a} + ${b}. Then how many more make ${c}?`; mis = [c - a, x + 1, x - 1]; }
    return { text: 'What number is hiding under the pumpkin?', vis: eq(tokens), ...numQ(x, mis), hint: hn, explain: ex };
  }
  if (k === 'balance') {
    if (t >= 4 && Math.random() < 0.5) { const a = ri(Math.max(15, Math.floor(M / 2)), M), b = ri(2, 12); const D = a - b; const c = ri(2, 15); const x = D + c; return { text: 'What number is hiding under the pumpkin?', vis: eq([a, '−', b, '=', 'PK', '−', c]), ...numQ(x, [D, D - c, x + 1]), hint: `Work out the left side first. The pumpkin take away ${c} must give the same answer.`, explain: `${a} − ${b} = ${D}. The pumpkin − ${c} must also be ${D}, so the pumpkin is ${D} + ${c} = ${x}.` }; }
    const a = ri(Math.max(3, Math.floor(M / 4)), Math.floor(M * 0.6)), b = ri(2, Math.floor(M * 0.4)); const S = a + b; const c = ri(1, S - 1); const x = S - c;
    return { text: 'What number is hiding under the pumpkin?', vis: eq([a, '+', b, '=', 'PK', '+', c]), ...numQ(x, [S, S + c, x + 1]), hint: 'Work out the left side first. Both sides must be equal.', explain: `${a} + ${b} = ${S}. The pumpkin + ${c} must also be ${S}. ${S} − ${c} = ${x}.` };
  }
  if (k === 'doubles') {
    const three = t >= 5 && Math.random() < 0.5; const n = three ? 3 : 2; const x = ri(Math.min(t, 6), three ? 12 : 15); const a = ri(t >= 6 ? 3 : 1, 12); const minus = t >= 6 && Math.random() < 0.4 && n * x > a;
    const c = minus ? n * x - a : n * x + a; const toks = []; for (let i = 0; i < n; i++) { if (i) toks.push('+'); toks.push('BOX'); } toks.push(minus ? '−' : '+', a, '=', c);
    return { text: 'Every box holds the SAME number. What number goes in each box?', vis: eq(toks), ...numQ(x, [c - a, x + 1, n * x], { min: 1 }), hint: `First ${minus ? 'add back' : 'take away'} the ${a}. Then share ${minus ? 'that number' : 'what is left'} equally into the ${n} boxes.`, explain: `${c} ${minus ? '+' : '−'} ${a} = ${n * x}. ${n * x} shared into ${n} equal boxes is ${x} each (${range(1, n).map(() => x).join(' + ')} = ${n * x}).` };
  }
  if (k === 'fruits') {
    const [A, B, C] = sample(FR3, 3); const row = (l, r) => `<div class="feq">${l}<i class="eo">=</i><b class="en">${r}</b></div>`;
    if (t >= 8 && Math.random() < 0.5) { const x = ri(5, 20), y = ri(1, x - 1); return { text: `Each fruit stands for a number. What number is the ${nm(A, 1)}?`, vis: `<div class="feqs">${row(em(A) + '<i class="eo">+</i>' + em(B), x + y)}${row(em(A) + '<i class="eo">−</i>' + em(B), x - y)}</div>`, ...numQ(x, [y, x + y, x - y]), hint: `Add the two lines together: the ${nm(B, 1)} disappears and you get two ${nm(A, 2)}.`, explain: `Add the two lines: ${x + y} + ${x - y} = ${2 * x}. The ${nm(B, 1)} is added once and taken away once, so only two ${nm(A, 2)} are left. Two ${nm(A, 2)} make ${2 * x}, so one ${nm(A, 1)} is ${x}. (The ${nm(B, 1)} is ${y}.)` }; }
    if (t >= 5) { const a = ri(2, 9), b = pick(range(2, 12).filter(v => v !== a)), c = pick(range(2, 12).filter(v => v !== a && v !== b)); return { text: `Each fruit stands for a number. What number is the ${nm(C, 1)}?`, vis: `<div class="feqs">${row(em(A) + '<i class="eo">+</i>' + em(A) + '<i class="eo">+</i>' + em(A), 3 * a)}${row(em(A) + '<i class="eo">+</i>' + em(B), a + b)}${row(em(B) + '<i class="eo">+</i>' + em(C), b + c)}</div>`, ...numQ(c, [b, a + c, b + c - a]), hint: `Find the ${nm(A, 1)} first, then the ${nm(B, 1)}, then the ${nm(C, 1)}.`, explain: `3 ${nm(A, 2)} make ${3 * a}, so one ${nm(A, 1)} is ${a} (${a} + ${a} + ${a} = ${3 * a}). ${cap(nm(A, 1))} + ${nm(B, 1)} = ${a + b}, so the ${nm(B, 1)} is ${b}. ${cap(nm(B, 1))} + ${nm(C, 1)} = ${b + c}, so the ${nm(C, 1)} is ${c}.` }; }
    const a = ri(2, 10), b = pick(range(2, 10).filter(v => v !== a)); return { text: `Each fruit stands for a number. What number is the ${nm(B, 1)}?`, vis: `<div class="feqs">${row(em(A) + '<i class="eo">+</i>' + em(A), 2 * a)}${row(em(A) + '<i class="eo">+</i>' + em(B), a + b)}</div>`, ...numQ(b, [a, a + b - 2 * a < 0 ? a + 1 : a + b, b + 1]), hint: `Two ${nm(A, 2)} make ${2 * a}. So what is one ${nm(A, 1)}?`, explain: `Two ${nm(A, 2)} make ${2 * a}, so one ${nm(A, 1)} is ${a}. Then ${a} + ${nm(B, 1)} = ${a + b}, so the ${nm(B, 1)} is ${b}.` };
  }
  // pyramid
  const big = t >= 7 && Math.random() < 0.5; const lim = t <= 3 ? 9 : t <= 6 ? 15 : 20;
  if (big) {
    let a, b, c, d, m1, m2, top, g = 0; do { [a, b, c, d] = [ri(1, lim), ri(1, lim), ri(1, lim), ri(1, lim)]; m1 = [a + b, b + c, c + d]; m2 = [m1[0] + m1[1], m1[1] + m1[2]]; top = m2[0] + m2[1]; } while (top > 99 && g++ < 200);
    return { text: 'Each brick is the sum of the two bricks under it. What number goes in the brick with the question mark?', vis: pyramid([[a, b, null, d], ['', '', ''], [m2[0], ''], [top]]), ...numQ(c, [m1[1], c + 1, c - 1], { min: 1 }), hint: `Work up from the bottom. First find the brick that sits on ${a} and ${b}.`, explain: `The brick on ${a} and ${b} is ${a} + ${b} = ${m1[0]}. The ${m2[0]} brick sits on this ${m1[0]} brick and the brick next to it, so that brick is ${m2[0]} − ${m1[0]} = ${m1[1]}. That brick sits on ${b} and the question mark, so ? = ${m1[1]} − ${b} = ${c}.` };
  }
  const [a, b, c] = [ri(1, lim), ri(1, lim), ri(1, lim)]; const m1 = a + b, m2 = b + c, top = m1 + m2; const sc = t <= 2 ? 's1' : pick(['s1', 's2', 's3']);
  if (sc === 's1') return { text: 'Each brick is the sum of the two bricks under it. What number goes on top?', vis: pyramid([[a, b, c], ['', ''], [null]]), ...numQ(top, [a + b + c, top + 1, top - b]), hint: 'Fill the middle row first.', explain: `Middle row: ${a} + ${b} = ${m1} and ${b} + ${c} = ${m2}. Top: ${m1} + ${m2} = ${top}.` };
  if (sc === 's2') return { text: 'Each brick is the sum of the two bricks under it. What number goes in the brick with the question mark?', vis: pyramid([[a, '', null], [m1, m2], [top]]), ...numQ(c, [m2 - a, c + 1, b]), hint: `Find the middle bottom brick first: ${m1} − ${a}.`, explain: `The middle bottom brick is ${m1} − ${a} = ${b}. Then the brick with the question mark is ${m2} − ${b} = ${c}.` };
  return { text: 'Each brick is the sum of the two bricks under it. What number goes in the middle of the bottom row?', vis: pyramid([[a, null, c], ['', ''], [top]]), ...numQ(b, [top - a - c, b + 1, b - 1], { min: 0 }), hint: `The top is ${a} + the middle brick + the middle brick + ${c}.`, explain: `The middle row is ${a} + ? and ? + ${c}, so the top is ${a} + ? + ? + ${c}. ${top} − ${a} − ${c} = ${2 * b}. Two equal bricks make ${2 * b}, so ? = ${b} (${b} + ${b} = ${2 * b}).` };
}

/* =====================================================================
   4. MISSING (NUMBER) PATTERNS — Corn Rows
   ===================================================================== */
function g4(L) {
  const t = tierOf(L), M = NMAX(t);
  const k = kind(t, [['arith', 1, 10], ['alt', 1, 10], ['ab', 1, 10], ['rule', 1, 5], ['plusMinus', 3, 10], ['growing', 4, 10, 1.3], ['notFit', 5, 10], ['doubling', 5, 10], ['fib', 7, 10]]);
  const steps = t === 1 ? [2, 3] : t === 2 ? [2, 3, 5] : t <= 4 ? [3, 4, 5, 10] : [4, 5, 6, 7, 9, 11, 12, 15];
  const mk = () => { const s = pick(steps); const up = Math.random() < 0.55; const top = Math.max(M, s * 6 + 5); const a = up ? ri(0, top - s * 5) : ri(s * 5, top); return { s, up, seq: range(0, 5).map(i => up ? a + i * s : a - i * s) }; };
  if (k === 'arith') { const { s, up, seq } = mk(); const idx = pick([5, ri(1, 4)]); const ans = seq[idx]; const prev = seq[idx - 1];
    return { text: idx === 5 ? 'These numbers follow a rule. What number comes next?' : 'These numbers follow a rule. What number is missing?', vis: chain(seq.map((v, i) => i === idx ? '?' : v)), ...numQ(ans, [up ? prev + 1 : prev - 1, up ? ans + s : ans - s, ans + 1]), hint: 'How much does it change from one number to the next?', explain: `The rule is ${up ? 'add' : 'take away'} ${s} each time. ${prev} ${up ? '+' : '−'} ${s} = ${ans}.` }; }
  if (k === 'alt') {
    const s1 = pick(t <= 2 ? [1, 2] : [2, 3, 4, 5]), s2 = pick(t <= 2 ? [1, 2] : [1, 2, 3, 5]); const a0 = ri(1, 5 + t), b0 = ri(3 * s2 + 3, 3 * s2 + 10 + 2 * t);
    const A = range(0, 3).map(i => a0 + i * s1), B = range(0, 3).map(i => b0 - i * s2); const seq = []; for (let i = 0; i < 4; i++) seq.push(A[i], B[i]); const idx = ri(4, 7); const ans = seq[idx];
    return { text: 'These numbers follow a rule. What number is missing?', vis: chain(seq.map((v, i) => i === idx ? '?' : v), t <= 2), ...numQ(ans, [ans + 1, ans - 1, seq[idx - 1]]), hint: 'Look at every other number. Two patterns are mixed together!', explain: `Every other number: ${A.join(', ')} goes up by ${s1}. ${B.join(', ')} goes down by ${s2}. So the missing number is ${ans}.` };
  }
  if (k === 'ab') { let r, i1, i2, tries = 0; do { r = mk(); i1 = ri(0, 2); i2 = ri(i1 + 2, 5); } while (t < 4 && r.seq[i1] + r.seq[i2] > M && ++tries < 60); const { s, up, seq } = r; const A = seq[i1], B = seq[i2]; const sub = t >= 4 && (Math.random() < 0.5 || A + B > M); const ans = sub ? Math.abs(B - A) : A + B;
    return { text: sub ? `These numbers follow a rule. Find A and B. What is ${B > A ? 'B − A' : 'A − B'}?` : 'These numbers follow a rule. Find A and B. What is A + B?', vis: chain(seq.map((v, i) => i === i1 ? 'A' : i === i2 ? 'B' : v)), ...numQ(ans, [ans + s, Math.abs(ans - s), ans + 1]), hint: 'First find the rule. Then work out A and B one at a time.', explain: `The rule is ${up ? 'add' : 'take away'} ${s}. A is ${A} and B is ${B}. ${sub ? `${Math.max(A, B)} − ${Math.min(A, B)}` : `${A} + ${B}`} = ${ans}.` }; }
  if (k === 'rule') { const { s, up, seq } = mk(); const ans = `${up ? 'Add' : 'Take away'} ${s} each time`;
    return { text: 'What is the rule for these numbers?', vis: chain(seq), ...optQ(ans, [`${up ? 'Take away' : 'Add'} ${s} each time`, `${up ? 'Add' : 'Take away'} ${s + 1} each time`], R_TXT), hint: 'Is it getting bigger or smaller? By how much?', explain: `${seq[0]} to ${seq[1]} is ${up ? '+' : '−'}${s}, and ${seq[1]} to ${seq[2]} is ${up ? '+' : '−'}${s} too.` }; }
  if (k === 'plusMinus') { const p = ri(Math.max(3, t - 1), 4 + t), q = ri(1, p - 1); let v = ri(1, 10); const seq = [v]; for (let i = 1; i < 7; i++) { v = i % 2 ? v + p : v - q; seq.push(v); } const idx = pick([6, ri(3, 5)]); const ans = seq[idx];
    return { text: 'These numbers follow a rule. What number is missing?', vis: chain(seq.map((x, i) => i === idx ? '?' : x)), ...numQ(ans, [seq[idx - 1] + p, seq[idx - 1] - q, ans + 1]), hint: 'The change is not the same every time. Look at the jumps: up, down, up, down…', explain: `The rule is: add ${p}, then take away ${q}, again and again. ${seq[idx - 1]} ${idx % 2 ? '+ ' + p : '− ' + q} = ${ans}.` }; }
  if (k === 'growing') { const d0 = ri(1, 3), inc = t >= 7 ? pick([1, 2]) : 1; let v = ri(1, 8); const seq = [v]; let d = d0; for (let i = 1; i < 6; i++) { v += d; seq.push(v); d += inc; } const ans = seq[5];
    const diffs = range(1, 5).map(i => seq[i] - seq[i - 1]);
    return { text: 'The jumps between these numbers grow. What number comes next?', vis: chain(seq.slice(0, 5).concat(['?'])), ...numQ(ans, [seq[4] + diffs[3], ans + 1, ans + inc + 1]), hint: 'Write down how much each jump is. How do the jumps change?', explain: `The jumps are ${diffs.slice(0, 4).join(', ')}. Each jump is ${inc} more than the one before, so the next jump is ${diffs[4]}. ${seq[4]} + ${diffs[4]} = ${ans}.` }; }
  if (k === 'notFit') { const { s, up, seq } = mk(); const bad = ri(1, 4); const wrongV = seq[bad] + pick([1, -1, 2]); const shown = seq.slice(); shown[bad] = wrongV;
    return { text: 'One number does NOT follow the rule. Which one is it?', vis: chain(shown), ...optQ(String(wrongV), sample(shown.filter((x, i) => i !== bad && x !== wrongV), 2).map(String), R_NUM), hint: 'Find the rule from the numbers at the start and the end. Then check each one.', explain: `The rule is ${up ? 'add' : 'take away'} ${s}. The number should be ${seq[bad]}, not ${wrongV}.` }; }
  if (k === 'doubling') { const half = Math.random() < 0.4; let seq; if (!half) { const a = ri(1, 3); seq = range(0, 5).map(i => a * Math.pow(2, i)); } else { const a = pick([1, 3]) * 32; seq = range(0, 5).map(i => a / Math.pow(2, i)); } const idx = ri(2, 5); const ans = seq[idx], prev = seq[idx - 1];
    return { text: idx === 5 ? 'These numbers follow a rule. What number comes next?' : 'These numbers follow a rule. What number is missing?', vis: chain(seq.map((v, i) => i === idx ? '?' : v)), ...numQ(ans, [prev + (prev - seq[idx - 2]), half ? ans + 1 : ans + 2, half ? ans + 4 : ans * 2]), hint: half ? 'Each number is half of the one before.' : 'Each number is double the one before.', explain: `${half ? 'Each number is half of the one before' : 'Each number is double the one before'}. ${half ? `Half of ${prev}` : `${prev} + ${prev}`} = ${ans}.` }; }
  const a = ri(1, 3), b = ri(a, a + 2); const seq = [a, b]; for (let i = 2; i < 8; i++) seq.push(seq[i - 1] + seq[i - 2]); const idx = ri(5, 7); const ans = seq[idx];
  return { text: 'Each number is made from the numbers before it. What number is missing?', vis: chain(seq.slice(0, idx).concat(['?'])), ...numQ(ans, [seq[idx - 1] + 1, 2 * seq[idx - 1], ans + 1]), hint: 'Try adding the two numbers just before the missing one.', explain: `Each number is the two numbers before it added together. ${seq[idx - 2]} + ${seq[idx - 1]} = ${ans}.` };
}

/* =====================================================================
   5. PICTURE PATTERNS — Flower Garden
   ===================================================================== */
const PAT = ['🌷', '🌻', '🐰', '🍄', '🐞', '🦋', '🐝', '🍀', '🐌', '🍓'];
const DIRN = { 0: 'up', 90: 'right', 180: 'down', 270: 'left' };
const SH3 = ['circle', 'square', 'triangle', 'star'];
function g5(L) {
  const t = tierOf(L);
  const k = kind(t, [['next', 1, 4], ['middle', 1, 3], ['nth', 1, 10, 1.4], ['turn', 1, 8], ['grow', 2, 10], ['countIn', 4, 10, 1.3], ['twoAttr', 5, 10, 1.3]]);
  const units = t === 1 ? ['ABC', 'AAB', 'ABB', 'AABB'] : t <= 3 ? ['ABCB', 'AABC', 'ABCD', 'ABBC', 'AABB'] : ['ABCDB', 'AABCC', 'ABACD', 'ABCBA', 'AABBC'];
  const mkU = () => { const u = pick(units); const letters = [...new Set(u.split(''))]; const sym = sample(PAT, letters.length); const map = {}; letters.forEach((l, i) => { map[l] = sym[i]; }); return u.split('').map(l => map[l]); };
  const ptRow = arr => `<div class="pt">${arr.map(s => s === '?' ? '<span class="pq">?</span>' : em(s)).join('')}</div>`;
  const choose = (unit, ans) => { const others = [...new Set(unit)].filter(e => e !== ans); while (others.length < 2) { const e = pick(PAT); if (e !== ans && !others.includes(e)) others.push(e); } return shuffle(others).slice(0, 2); };
  if (k === 'next' || k === 'middle') {
    const unit = mkU(); const len = unit.length; const at = i => unit[i % len]; let show, ans;
    if (k === 'next') { const n = len * 2 + ri(1, len - 1); show = range(0, n - 1).map(at).concat(['?']); ans = at(n); } else { const n = len * 2 + 2; show = range(0, n - 1).map(at); const idx = ri(len, n - 2); ans = show[idx]; show[idx] = '?'; }
    return { text: k === 'next' ? 'The pictures make a pattern. What comes next?' : 'Which picture is missing from the pattern?', vis: ptRow(show), ...optQ(ans, choose(unit, ans), R_EM, S_EM), hint: 'Find the part that repeats. Say it out loud.', explain: `The part that repeats is: ${unit.map(e => nm(e, 1)).join(', ')}. The answer is the ${nm(ans, 1)}.` };
  }
  if (k === 'nth' || k === 'countIn') {
    const unit = mkU(); const len = unit.length; const at = i => unit[i % len]; const show = range(0, len * 2 + 1).map(at);
    if (k === 'nth') { const N = t === 1 ? ri(10, 15) : t <= 4 ? ri(15, 30) : t <= 7 ? ri(30, 60) : ri(60, 99); const ans = at(N - 1); const fullU = Math.floor((N - 1) / len) * len;
      return { text: `The pattern keeps going. What will the ${ord(N)} picture be?`, vis: ptRow(show), ...optQ(ans, choose(unit, ans), R_EM, S_EM), hint: `The pattern repeats every ${len} pictures. Jump in groups of ${len}.`, explain: `The pattern repeats every ${len}. ${fullU ? `After ${fullU} pictures the pattern starts again. ` : ''}The ${ord(N)} picture is number ${N - fullU} in the pattern: the ${nm(ans, 1)}.` }; }
    const N = t <= 5 ? ri(12, 20) : ri(20, 40); const tgt = pick([...new Set(unit)]); const per = unit.filter(e => e === tgt).length; const full = Math.floor(N / len), rem = N % len; const ans = full * per + unit.slice(0, rem).filter(e => e === tgt).length;
    return { text: `The pattern keeps going. How many ${nm(tgt, 2)} are there in the first ${N} pictures?`, vis: ptRow(show), ...numQ(ans, [ans + 1, ans - 1, full * per]), hint: `Each group of ${len} pictures has ${per} ${nm(tgt, per)}. How many full groups fit in ${N}?`, explain: `${N} pictures = ${full} full groups of ${len}${rem ? ` and ${rem} more` : ''}. Each group has ${per} ${nm(tgt, per)}, so ${full} × ${per} = ${full * per}.` + (!rem ? '' : ans > full * per ? (rem === 1 ? ` The extra picture is a ${nm(tgt, 1)} too: ${full * per} + 1 = ${ans}.` : ` The ${rem} extra pictures have ${ans - full * per} more: ${full * per} + ${ans - full * per} = ${ans}.`) : (rem === 1 ? ` The extra picture is not a ${nm(tgt, 1)}, so the answer is ${ans}.` : ` The ${rem} extra pictures have no ${nm(tgt, 2)}, so the answer is ${ans}.`)) };
  }
  if (k === 'turn') {
    const eight = t >= 4 && Math.random() < 0.6; const stp = eight ? pick([45, -45, 135]) : pick([90, -90, 180]); const a0 = eight ? 45 * ri(0, 7) : 90 * ri(0, 3);
    const angs = range(0, 6).map(i => ((a0 + i * stp) % 360 + 360) % 360); const ans = angs[6]; const pool = eight ? [0, 45, 90, 135, 180, 225, 270, 315] : [0, 90, 180, 270];
    const ds = shuffle(pool.filter(a => a !== ans)).slice(0, 2); const nameOf = a => (eight ? DIR8 : DIRN)[a];
    return { text: 'The arrow turns the same way each time. Which arrow comes next?', vis: `<div class="pt">${angs.slice(0, 6).map(a => arrow(a, 52)).join('')}<span class="pq">?</span></div>`, ...optQ(String(ans), ds.map(String), v => arrow(+v, 66), v => 'pointing ' + nameOf(+v)), hint: 'Watch the arrow tip. How far does it turn each time?', explain: Math.abs(stp) === 180 ? `The arrow turns half a turn each time, so it keeps flipping to point the opposite way. Next it points ${nameOf(ans)}.` : `The arrow turns ${Math.abs(stp) === 45 ? 'an eighth of a turn' : Math.abs(stp) === 90 ? 'a quarter turn' : 'three eighths of a turn'} ${stp > 0 ? 'clockwise (the way clock hands move)' : 'counterclockwise (the opposite way to clock hands)'} each time. Next it points ${nameOf(ans)}.` };
  }
  if (k === 'grow') {
    const tri = t >= 5 && Math.random() < 0.5;
    if (tri) { const N = t >= 8 ? ri(6, 9) : ri(5, 6); const ans = N * (N + 1) / 2; const rows = range(1, 3).map(i => `<div class="gr"><small>Step ${i}</small><span class="tri">${range(1, i).map(r => `<span class="trr">${em('🟡', 'sm').repeat(r)}</span>`).join('')}</span></div>`).join('') + `<div class="gr"><small>Step ${N}</small><b class="pq">?</b></div>`;
      return { text: `Each step adds a new row with one more ball. How many balls are in step ${N}?`, vis: `<div class="grow">${rows}</div>`, ...numQ(ans, [ans - N, ans + 1, N * N]), hint: 'Step 1 has 1, step 2 adds 2 more, step 3 adds 3 more…', explain: `${range(1, N).join(' + ')} = ${ans}.` }; }
    const a = ri(1, 3), s = ri(2, t >= 4 ? 4 : 3); const N = t >= 4 ? ri(6, 10) : pick([4, 5]); const ans = a + (N - 1) * s;
    const rows = range(1, 3).map(i => `<div class="gr"><small>Step ${i}</small><span>${em('🌸', 'sm').repeat(a + (i - 1) * s)}</span></div>`).join('') + `<div class="gr"><small>Step ${N}</small><b class="pq">?</b></div>`;
    return { text: `The flowers grow in a pattern. How many flowers will there be in step ${N}?`, vis: `<div class="grow">${rows}</div>`, ...numQ(ans, [ans + s, ans - s, N * s]), hint: 'How many more flowers are added each step?', explain: `Each step adds ${s}. Step 1 has ${a}, then ${N - 1} more steps add ${N - 1} × ${s} = ${(N - 1) * s}. ${a} + ${(N - 1) * s} = ${ans}.` };
  }
  // twoAttr
  const big = t >= 8; const shapes = sample(SH3, 3); const cols = sample(['red', 'blue', 'green', 'yellow'], big ? 4 : 2); const N = big ? ri(15, 30) : ri(8, 16);
  const sAt = i => shapes[i % 3], cAt = i => cols[i % cols.length]; const show = range(0, big ? 7 : 5);
  const ansS = sAt(N - 1), ansC = cAt(N - 1); const ans = `${ansC} ${ansS}`; const wrongC = cols.find(c => c !== ansC), wrongS = shapes.find(s => s !== ansS);
  return { text: `The pattern keeps going. The shapes change in one pattern and the colors change in another. What will the ${ord(N)} shape look like?`, vis: `<div class="pt">${show.map(i => shp(sAt(i), cAt(i), 54)).join('')}</div>`, ...optQ(ans, [`${wrongC} ${ansS}`, `${ansC} ${wrongS}`], v => { const [c, s] = v.split(' '); return shp(s, c, 70); }, v => 'a ' + v), hint: `The shapes repeat every 3. The colors repeat every ${cols.length}. Work them out one at a time.`, explain: `Shapes repeat every 3: the ${ord(N)} shape is a ${ansS}. Colors repeat every ${cols.length}: the ${ord(N)} color is ${ansC}. So it is a ${ans}.` };
}

/* =====================================================================
   6. COUNTING STRATEGIES — Chicken Coop
   ===================================================================== */
const FST = 'fill="#FFF3C4" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"';
const LST = 'stroke="#2B2340" stroke-width="4" stroke-linecap="round"';
const FIGS = [
  { d: 1, q: 'triangles', a: 3, mis: [2, 4], svg: `<polygon points="100,14 186,166 14,166" ${FST}/><line x1="100" y1="14" x2="100" y2="166" ${LST}/>`, ex: '2 small triangles, plus 1 big triangle made of both. 2 + 1 = 3.' },
  { d: 1, q: 'squares', a: 5, mis: [4, 6], svg: `<rect x="30" y="20" width="140" height="140" ${FST}/><line x1="100" y1="20" x2="100" y2="160" ${LST}/><line x1="30" y1="90" x2="170" y2="90" ${LST}/>`, ex: '4 small squares, plus 1 big square around all of them. 4 + 1 = 5.' },
  { d: 1, q: 'triangles', a: 6, mis: [3, 5], svg: `<polygon points="100,14 190,166 10,166" ${FST}/><line x1="100" y1="14" x2="70" y2="166" ${LST}/><line x1="100" y1="14" x2="130" y2="166" ${LST}/>`, ex: '3 small triangles, 2 triangles made of two small ones, and 1 big one. 3 + 2 + 1 = 6.' },
  { d: 2, q: 'triangles', a: 8, mis: [4, 6], svg: `<rect x="30" y="20" width="140" height="140" ${FST}/><line x1="30" y1="20" x2="170" y2="160" ${LST}/><line x1="170" y1="20" x2="30" y2="160" ${LST}/>`, ex: '4 small triangles meet in the middle. Then 4 bigger triangles are each half of the square. 4 + 4 = 8.' },
  { d: 2, q: 'squares', a: 8, mis: [6, 7], svg: `<rect x="10" y="40" width="180" height="120" ${FST}/><line x1="70" y1="40" x2="70" y2="160" ${LST}/><line x1="130" y1="40" x2="130" y2="160" ${LST}/><line x1="10" y1="100" x2="190" y2="100" ${LST}/>`, ex: '6 small squares, plus 2 bigger squares made of 4 small ones (one on the left, one on the right). 6 + 2 = 8.' },
  { d: 3, q: 'triangles', a: 10, mis: [4, 7], svg: `<polygon points="100,14 194,166 6,166" ${FST}/><line x1="100" y1="14" x2="53" y2="166" ${LST}/><line x1="100" y1="14" x2="100" y2="166" ${LST}/><line x1="100" y1="14" x2="147" y2="166" ${LST}/>`, ex: '4 small ones, 3 made of two, 2 made of three, and 1 big one. 4 + 3 + 2 + 1 = 10.' },
  { d: 3, q: 'rectangles', a: 10, mis: [4, 7], svg: `<rect x="6" y="70" width="188" height="47" ${FST}/><line x1="53" y1="70" x2="53" y2="117" ${LST}/><line x1="100" y1="70" x2="100" y2="117" ${LST}/><line x1="147" y1="70" x2="147" y2="117" ${LST}/>`, ex: 'Rectangles of 1 part: 4. Of 2 parts: 3. Of 3 parts: 2. Of 4 parts: 1. 4 + 3 + 2 + 1 = 10.', note: ' (Squares count as rectangles too.)' },
  { d: 4, q: 'squares', a: 14, mis: [9, 10], svg: `<rect x="25" y="15" width="150" height="150" ${FST}/><line x1="75" y1="15" x2="75" y2="165" ${LST}/><line x1="125" y1="15" x2="125" y2="165" ${LST}/><line x1="25" y1="65" x2="175" y2="65" ${LST}/><line x1="25" y1="115" x2="175" y2="115" ${LST}/>`, ex: '9 small squares, 4 medium squares (each made of 2 by 2 small ones, and they overlap), and 1 big square. 9 + 4 + 1 = 14.' },
  { d: 5, q: 'rectangles', a: 9, mis: [5, 4], svg: `<rect x="30" y="20" width="140" height="140" ${FST}/><line x1="100" y1="20" x2="100" y2="160" ${LST}/><line x1="30" y1="90" x2="170" y2="90" ${LST}/>`, ex: '4 small squares, 2 tall rectangles, 2 wide rectangles, and 1 big square. 4 + 2 + 2 + 1 = 9.', note: ' (Squares count as rectangles too.)' },
  { d: 6, q: 'triangles', a: 12, mis: [9, 6], svg: `<polygon points="100,10 190,166 10,166" ${FST}/><line x1="55" y1="88" x2="145" y2="88" ${LST}/><line x1="100" y1="10" x2="70" y2="166" ${LST}/><line x1="100" y1="10" x2="130" y2="166" ${LST}/>`, ex: 'Every triangle has the top point. Above the middle line there are 3 small + 2 double + 1 big = 6 triangles. The same 6 triangles also stretch all the way down to the bottom line: 6 more. 6 + 6 = 12.' }
];
function g6(L) {
  const t = tierOf(L);
  const k = kind(t, [['scatter', 1, 1], ['mixed', 1, 3], ['groups', 1, 6], ['fig', 1, 10, 1.4], ['inclusive', 3, 8], ['handshake', 4, 10], ['outfits', 4, 10], ['digitCount', 6, 10, 1.3]]);
  if (k === 'scatter') { const n = ri(13, 20); const e = pick(['🐥', '🐞', '🥚', '🐟']); return { text: `How many ${nm(e, 2)} are there? Tap each one as you count.`, vis: scatter(Array(n).fill(e)), tap: true, ...numQ(n, [n + 1, n - 1, n + 2]), hint: 'Tap each one when you count it, so you never count one twice.', explain: `Tapping each one once, we count ${n}.` }; }
  if (k === 'mixed') { const a = ri(3, 7), b = ri(5, 11), bugs = ri(1, 3); const items = shuffle(Array(a).fill('🐔').concat(Array(b).fill('🐥'), Array(bugs).fill('🐛'))); const both = Math.random() < 0.5; const ans = both ? a + b : b;
    return { text: both ? 'How many hens and chicks are there altogether? Do not count the bugs.' : 'How many chicks are there? Do not count the hens or the bugs!', vis: scatter(items), tap: true, ...numQ(ans, both ? [ans + bugs, ans - 1, b] : [a + b, b + 1, b - 1]), hint: 'Tap only the animals the question asks about.', explain: both ? `${a} hens + ${b} chicks = ${ans}.` : `There are ${b} chicks.` }; }
  if (k === 'groups') { const g = ri(t >= 5 ? 4 : 3, 4 + Math.min(2, t)), kk = ri(t >= 3 ? 3 : 2, 4 + Math.min(2, t)); const ans = g * kk; const e = pick(['🥚', '🍪']);
    return { text: `There are ${g} ${e === '🥚' ? 'nests' : 'plates'}. Each one has ${kk} ${nm(e, 2)}. How many ${nm(e, 2)} are there in all?`, vis: e === '🥚' ? nests(g, kk) : plates(g, kk), tap: true, ...numQ(ans, [g + kk, ans + kk, ans - kk]), hint: `Skip count by ${kk}s.`, explain: `Count by ${kk}s: ${range(1, g).map(i => i * kk).join(', ')}. That is ${ans}.` }; }
  if (k === 'fig') { const pool = FIGS.filter(x => x.d <= t && x.d >= Math.min(Math.max(1, t - 1), 4)); const f = pick(pool.length ? pool : FIGS);
    return { text: `How many ${f.q} can you find in this picture?${f.note || ''}`, vis: `<svg class="fig" viewBox="0 0 200 180" width="230" height="207" aria-hidden="true">${f.svg}</svg>`, ...numQ(f.a, f.mis), hint: `Count the small ${f.q} first. Then look for bigger ${f.q} made of small ones.`, explain: f.ex }; }
  if (k === 'inclusive') { const a = ri(5, 40), b = a + ri(8, 30); const ans = b - a + 1;
    return { text: `A story in a book starts on page ${a} and ends on page ${b}. How many pages long is the story?`, vis: `<div class="scene">${em('📖', 'big')}</div>`, ...numQ(ans, [b - a, b - a - 1, ans + 1]), hint: 'Both the first page and the last page are part of the story.', explain: `${b} − ${a} = ${b - a}. Add 1 because page ${a} counts too: ${ans} pages.` }; }
  if (k === 'handshake') { const n = ri(t <= 4 ? 3 : t <= 6 ? 4 : t <= 8 ? 5 : 6, t <= 4 ? 4 : t <= 6 ? 5 : t <= 8 ? 7 : 9); const P = people(n); const ans = n * (n - 1) / 2;
    const C = pick([['meet. Each friend shakes hands with every other friend one time. How many handshakes are there?', 'handshakes', 'shakes hands with'], ['finish a race. Each friend gives every other friend one high five. How many high fives are there?', 'high fives', 'high-fives'], ['play checkers. Each friend plays one game with every other friend. How many games are played?', 'games', 'plays']]);
    return { text: `${n} friends ${C[0]}`, vis: faces(P), ...numQ(ans, [n * (n - 1), n, ans + 1]), hint: `The first friend ${C[2]} everyone else. The next friend has one fewer new friend left, and so on.`, explain: `${range(1, n - 1).reverse().join(' + ')} = ${ans} ${C[1]}.` }; }
  if (k === 'outfits') { const three = t >= 8; const s = three ? ri(2, 4) : ri(t >= 6 ? 3 : 2, t >= 6 ? 4 : 3), p = ri(2, 3); const hat = three || p === 3 || Math.random() < 0.5; const W = hat ? ['hat', 'hats'] : ['bottom', 'bottoms'];
    const tops = ['👕', '👚', '🎽', '👔'].slice(0, s), bots = (hat ? ['🧢', '👒', '🎩'] : ['👖', '🩳']).slice(0, p), row = a => `<div class="fruits">${a.map(e => em(e)).join('')}</div>`;
    if (three) { const pairs = s * 2, ans = pairs * p;
      return { text: `You have ${s} tops, 2 bottoms and ${p} hats. An outfit is 1 top, 1 bottom and 1 hat. How many different outfits can you make?`, vis: `<div class="scene">${row(tops)}${row(['👖', '🩳'])}${row(bots)}</div>`, ...numQ(ans, [s + 2 + p, pairs, s * p]), hint: 'First find how many ways there are to pick a top and a bottom. Then each of those can go with every hat.', explain: `Each of the ${s} tops goes with 2 bottoms: ${range(1, s).map(() => 2).join(' + ')} = ${pairs} top-and-bottom pairs. Each of the ${p} hats goes with all ${pairs} pairs: ${range(1, p).map(() => pairs).join(' + ')} = ${ans} outfits.` }; }
    const ans = s * p;
    return { text: `You have ${s} tops and ${p} ${W[1]}. An outfit is 1 top and 1 ${W[0]}. How many different outfits can you make?`, vis: `<div class="scene">${row(tops)}${row(bots)}</div>`, ...numQ(ans, [s + p, ans + 1, ans - 1]), hint: `Each top can go with every ${W[0]}.`, explain: `Each of the ${s} tops goes with ${p} ${W[1]}: ${range(1, s).map(() => p).join(' + ')} = ${ans} outfits.` }; }
  const N = pick(t <= 6 ? [30, 40, 50, 60] : t === 7 ? [40, 50, 60, 80] : [50, 60, 80, 100]); const d = ri(1, Math.min(9, Math.floor((N - 9) / 10))); const writes = Math.random() < 0.5 && t >= 7;
  const nums = range(1, N); const have = nums.filter(x => String(x).includes(String(d))).length; const times = nums.reduce((s, x) => s + String(x).split('').filter(c => c === String(d)).length, 0);
  const ans = writes ? times : have;
  return { text: writes ? `You write all the numbers from 1 to ${N}. How many times do you write the digit ${d}?` : `How many numbers from 1 to ${N} have the digit ${d} in them?`, vis: '', ...numQ(ans, [writes ? have : times === have ? have + 1 : times, Math.floor(N / 10), ans + 1]), hint: `Count the numbers with ${d} in the ones place, then the numbers with ${d} in the tens place.` + (d * 11 <= N ? ` Be careful with ${d * 11}!` : '') + (d === 1 && N >= 100 ? ' Do not forget 100!' : ''), explain: `Ones place: ${range(1, N).filter(x => x % 10 === d).join(', ') || 'none'}. Tens place: ${range(1, N).filter(x => Math.floor(x / 10) % 10 === d).join(', ') || 'none'}.` + (d === 1 && N >= 100 ? ' Hundreds place: 100.' : '') + (d * 11 <= N ? ` ${d * 11} is in both lists${writes ? ', and it uses the digit twice' : ', so count it once'}.` : '') + ` Answer: ${ans}.` };
}

/* =====================================================================
   7. COMPARING QUANTITIES — Sheep Meadow
   ===================================================================== */
function g7(L) {
  const t = tierOf(L), M = NMAX(t);
  const k = kind(t, [['moreFewer', 1, 4], ['mostLeast', 1, 2], ['equalize', 1, 7], ['relational', 2, 10], ['giveTrap', 4, 10, 1.3], ['sumDiff', 6, 10, 1.3]]);
  const [P, Q, R] = people(3);
  if (k === 'moreFewer') {
    const [A, B] = pick([['🐑', '🐐'], ['🐄', '🐖'], ['🐔', '🦆'], ['🐰', '🐢']]); const pic = t <= 2; const a = pic ? ri(8, 14) : ri(20, M), b = pic ? ri(3, a - 2) : ri(8, a - 3); const ans = a - b; const fewer = Math.random() < 0.5;
    const row = (e, n) => `<div class="mtr"><span class="mtl">${nm(e, 2)}</span><span style="display:flex;flex-wrap:wrap;gap:2px;flex:1;min-width:0">${em(e, 'mc').repeat(n)}</span></div>`;
    const vis = pic ? `<div class="mt">${row(A, a)}${row(B, b)}</div>` : `<div class="bars"><div class="bar1"><span>${em(A)} ${a}</span><i style="width:100%"></i></div><div class="bar1"><span>${em(B)} ${b}</span><i style="width:${Math.round(b / a * 100)}%"></i></div></div>`;
    return { text: fewer ? `The farm has ${a} ${nm(A, a)} and ${b} ${nm(B, b)}. How many fewer ${nm(B, 2)} are there than ${nm(A, 2)}?` : `The farm has ${a} ${nm(A, a)} and ${b} ${nm(B, b)}. How many more ${nm(A, 2)} are there than ${nm(B, 2)}?`, vis, ...numQ(ans, [a + b, ans + 1, ans - 10 > 0 ? ans - 10 : ans + 10]), hint: pic ? 'Match them up. How many have no partner? Take away the smaller number.' : 'Take away the smaller number from the bigger number.', explain: `${a} − ${b} = ${ans}.` };
  }
  if (k === 'mostLeast') {
    const kinds3 = sample(['🐑', '🐐', '🐄', '🐖', '🐔', '🦆'], 3); const counts = sample(range(6, 14), 3); const most = Math.random() < 0.5; const idx = counts.indexOf(most ? Math.max(...counts) : Math.min(...counts)); const ans = kinds3[idx];
    return { text: `Which pen has the ${most ? 'most' : 'fewest'} animals?`, vis: `<div class="pens">${kinds3.map((e, i) => `<div class="pen">${em(e, 'tp').repeat(counts[i])}</div>`).join('')}</div>`, tap: true, ...optQ(ans, kinds3.filter(e => e !== ans), R_EM, v => 'the ' + nm(v, 2)), hint: 'Count each pen carefully. Tap to help.', explain: kinds3.map((e, i) => `${counts[i]} ${nm(e, counts[i])}`).join(', ') + `. The pen with the ${nm(ans, 2)} has the ${most ? 'most' : 'fewest'}.` };
  }
  if (k === 'equalize') {
    const x = ri(2, t <= 2 ? 5 : 9), b = ri(t <= 2 ? 3 : 2 + 3 * t, Math.min(Math.floor(M / 2), M - 2 * x)); const a = b + 2 * x;
    return { text: `${P.n} has ${a} shells. ${Q.n} has ${b} shells. How many shells must ${P.n} give to ${Q.n} so they both have the same number?`, vis: a <= 16 ? `<div class="mt"><div class="mtr"><span class="mtl">${P.n}</span><span style="display:flex;flex-wrap:wrap;gap:2px;flex:1;min-width:0">${em('🐚', 'mc').repeat(a)}</span></div><div class="mtr"><span class="mtl">${Q.n}</span><span style="display:flex;flex-wrap:wrap;gap:2px;flex:1;min-width:0">${em('🐚', 'mc').repeat(b)}</span></div></div>` : faces([P, Q], em('🐚', 'big')), ...numQ(x, [a - b, x + 1, x - 1], { min: 1 }), hint: `${P.n} has ${a - b} extra. Half of the extra goes to ${Q.n}.`, explain: `${P.n} has ${a - b} more. Split the ${a - b} into two equal parts: ${x} and ${x}. Give ${x}. Then both have ${b + x}.` };
  }
  if (k === 'relational') {
    const b = ri(5, Math.floor(M / 2)); const p = ri(2, 9); const q = ri(p + 1, p + 9); const a = b + p, c = a - q;
    if (c < 1) return g7(L);
    const ask = pick(['diff', 'most', 'least']);     const txt = `${P.n} has ${p} more marbles than ${Q.n}. ${R.n} has ${q} fewer marbles than ${P.n}.`;
    if (ask === 'diff') return { text: `${txt} How many more marbles does ${Q.n} have than ${R.n}?`, vis: faces([P, Q, R], em('🔵', 'big')) + clues([`${P.n} = ${Q.n} + ${p}`, `${R.n} = ${P.n} − ${q}`]), ...numQ(q - p, [q + p, q, p]), hint: `Pretend ${Q.n} has some marbles. Then ${P.n} has ${p} more, and ${R.n} has ${q} fewer than that.`, explain: `Try an example. If ${Q.n} has 20, then ${P.n} has 20 + ${p} = ${20 + p}, and ${R.n} has ${20 + p} − ${q} = ${20 + p - q}. 20 − ${20 + p - q} = ${q - p}. So ${Q.n} has ${q - p} more than ${R.n}.` };
    const ans = ask === 'most' ? P.n : R.n;
    return { text: `${txt} Who has the ${ask === 'most' ? 'most' : 'fewest'} marbles?`, vis: faces([P, Q, R], em('🔵', 'big')) + clues([`${P.n} = ${Q.n} + ${p}`, `${R.n} = ${P.n} − ${q}`]), ...optQ(ans, [P.n, Q.n, R.n].filter(n => n !== ans), R_TXT), hint: `Who has more: ${P.n} or ${Q.n}? Then where does ${R.n} fit?`, explain: `${P.n} has more than ${Q.n}. ${R.n} has ${q} fewer than ${P.n}, and ${q} is more than ${p}, so ${R.n} has fewer than ${Q.n} too. Order: ${P.n}, ${Q.n}, ${R.n}.` };
  }
  if (k === 'giveTrap') {
    const x = ri(t >= 7 ? 4 : 2, t >= 7 ? 12 : 8); const b = ri(5, 20); const a = b + 2 * x; const inv = Math.random() < 0.5; const [it, ie] = pick([['stickers', '⭐'], ['marbles', '🔵'], ['shells', '🐚'], ['toy cars', '🚗']]);
    if (!inv) return { text: `If ${P.n} gives ${Q.n} ${x} ${it}, they will have the same number. How many more ${it} does ${P.n} have than ${Q.n} right now?`, vis: faces([P, Q], em(ie, 'big')), ...numQ(2 * x, [x, x + 1, 2 * x + 1]), hint: `When ${P.n} gives ${x}, ${P.n} goes down by ${x} AND ${Q.n} goes up by ${x}.`, explain: `When ${P.n} gives ${x}, ${P.n} goes down ${x} and ${Q.n} goes up ${x}. That closes a gap of ${x} + ${x} = ${2 * x}. So ${P.n} has ${2 * x} more. For example, ${a} and ${b}: after giving ${x}, both have ${b + x}.` };
    return { text: `${P.n} has ${2 * x} more ${it} than ${Q.n}. How many ${it} should ${P.n} give ${Q.n} so they have the same number?`, vis: faces([P, Q], em(ie, 'big')), ...numQ(x, [2 * x, x + 1, x - 1], { min: 1 }), hint: 'Giving changes both people. Try a small example.', explain: `Give half of the difference. Half of ${2 * x} is ${x}, because ${x} + ${x} = ${2 * x}. ${P.n} goes down ${x} and ${Q.n} goes up ${x}, so they end up the same.` };
  }
  const D = ri(2, 12); const sm = ri(2 * t, 10 + 2 * t); const S = 2 * sm + D; const askBig = Math.random() < 0.5;
  return { text: `${P.n} and ${Q.n} have ${S} stickers together. ${P.n} has ${D} more than ${Q.n}. How many stickers does ${askBig ? P.n : Q.n} have?`, vis: faces([P, Q], em('⭐', 'big')), ...numQ(askBig ? sm + D : sm, [askBig ? sm : sm + D, Math.floor(S / 2), (askBig ? sm + D : sm) + 1]), hint: `Take away the ${D} extra first. Then share the rest equally.`, explain: `${S} − ${D} = ${S - D}. Shared equally: ${sm} each. ${Q.n} has ${sm} and ${P.n} has ${sm} + ${D} = ${sm + D}.` };
}

/* =====================================================================
   8. PICTURE-BASED PROBLEMS — Berry Bushes
   ===================================================================== */
function g8(L) {
  const t = tierOf(L);
  const k = kind(t, [['flew', 1, 3], ['sentence', 1, 2], ['basket', 1, 3], ['plates', 1, 4], ['tags', 1, 6], ['legs', 2, 7], ['hidden', 3, 10, 1.3], ['fillPlates', 4, 10, 1.3], ['bus', 5, 10, 1.3]]);
  if (k === 'flew' || k === 'sentence') {
    const kk = ri(4, 10), m = ri(3, 8); const rails = kk > 5 ? [Math.ceil(kk / 2), Math.floor(kk / 2)] : [kk]; // at most 5 birds per rail, so a rail never wraps and no sitting bird floats in the air
    const vis = `<div class="fpic"><div class="flyers">${em('🐦', 'fly').repeat(m)}</div>${rails.map(n => `<div class="fence">${em('🐦').repeat(n)}</div>`).join('')}</div>`;
    if (k === 'flew') return { text: 'Some birds were sitting on the fence. Then some of them flew away. How many birds were on the fence at first?', vis, ...numQ(kk + m, [kk, m, kk + m + 1]), hint: 'Count the birds still sitting AND the birds flying away.', explain: `${kk} still sitting + ${m} flew away = ${kk + m}.` };
    const ans = `${kk + m} − ${m} = ${kk}`; const d2 = kk >= m ? `${kk} − ${m} = ${kk - m}` : `${m} − ${kk} = ${m - kk}`;
    return { text: 'Some birds were sitting on the fence. Then some of them flew away. Which number sentence tells this story?', vis, ...optQ(ans, [`${kk + m} + ${m} = ${kk + 2 * m}`, d2], R_BIG), hint: 'How many birds were there at the start? How many flew away? How many stayed?', explain: `At first ${kk + m}. ${m} flew away. ${kk} stayed: ${ans}.` };
  }
  if (k === 'basket') { const P = people(1)[0]; const T = ri(14, t >= 3 ? 30 : 20); const have = ri(5, Math.min(14, T - 3)); const ans = T - have;
    return { text: `${P.n} wants ${T} strawberries in ${P.his} basket. How many more does ${P.he} need to pick?`, vis: `<div class="bk">${em('🍓', 'tp').repeat(have)}</div>`, tap: true, ...numQ(ans, [T + have, have, ans + 1]), hint: 'Count the basket first. Then count up to the number wanted.', explain: `The basket has ${have}. ${have} + ${ans} = ${T}.` }; }
  if (k === 'plates') { const g = ri(t <= 1 ? 2 : t <= 2 ? 3 : 4, t <= 2 ? 4 : 5), kk = ri(t <= 1 ? 2 : 3, t <= 2 ? 5 : 6); const ans = g * kk; return { text: 'How many cookies are on all the plates together?', vis: plates(g, kk), tap: true, ...numQ(ans, [g + kk, ans + 1, ans - kk]), hint: 'Every plate has the same number. Skip count.', explain: `${range(1, g).map(i => i * kk).join(', ')}: ${ans} cookies.` }; }
  if (k === 'tags') {
    const items = sample(['🍦', '🍪', '🧁', '🍩', '🍭', '🧃'], 3); const pr = sample(range(2, [9, 9, 6, 8, 10, 12][Math.min(t, 6) - 1]), 3); // multi-buy totals stay within the tier's number range
    if (t >= 3) { const [i, j] = sample([0, 1, 2], 2); const qi = ri(2, 3), qj = ri(1, 2); const ans = qi * pr[i] + qj * pr[j];
      return { text: `How much do ${qi} ${nm(items[i], qi)} and ${qj} ${nm(items[j], qj)} cost altogether?`, vis: `<div class="shelf">${items.map((e, q) => tag(e, pr[q])).join('')}</div>`, ...numQ(ans, [pr[i] + pr[j], qi * pr[i] + pr[j], ans + 1], { pre: '$' }), hint: 'Find each price. Add it once for every one you buy.', explain: `${qi} ${nm(items[i], qi)}: ${range(1, qi).map(() => '$' + pr[i]).join(' + ')} = $${qi * pr[i]}. ${qj} ${nm(items[j], qj)}: ${qj === 1 ? '$' + pr[j] : range(1, qj).map(() => '$' + pr[j]).join(' + ') + ' = $' + qj * pr[j]}. $${qi * pr[i]} + $${qj * pr[j]} = $${ans}.` }; }
    const [i, j] = sample([0, 1, 2], 2); const ans = pr[i] + pr[j]; const o = 3 - i - j;
    return { text: `How much do the ${nm(items[i], 1)} and the ${nm(items[j], 1)} cost together?`, vis: `<div class="shelf">${items.map((e, q) => tag(e, pr[q])).join('')}</div>`, ...numQ(ans, [pr[i] + pr[o], pr[j] + pr[o], ans + 1], { pre: '$' }), hint: 'Find the price tag on each one, then add.', explain: `$${pr[i]} + $${pr[j]} = $${ans}.` };
  }
  if (k === 'legs') { const a = ri(t <= 2 ? 1 : 2, t <= 2 ? 3 : 5), b = ri(t <= 2 ? 1 : 2, t <= 2 ? 3 : 4); const add = (n, l) => n === 1 ? `${l}` : `${range(1, n).map(() => l).join(' + ')} = ${n * l}`; const ans = 2 * a + 4 * b; const F = pick(['🐄', '🐖', '🐑', '🐐']), Fs = cap(nm(F, 2));
    return { text: 'How many legs do all the animals in the picture have together?', vis: `<div class="farmrow">${em('🐔').repeat(a)}${em(F).repeat(b)}</div><div class="cap">Hens have 2 legs. ${Fs} have 4 legs.</div>`, ...numQ(ans, [a + b, 2 * (a + b), ans + 2]), hint: `Count hen legs and ${nm(F, 1)} legs separately, then add.`, explain: `Hens: ${add(a, 2)}. ${Fs}: ${add(b, 4)}. ${2 * a} + ${4 * b} = ${ans}.` }; }
  if (k === 'hidden') { const vis = ri(6, 14); const hid = ri(2 + t, t >= 6 ? 25 : 12); const T = vis + hid;
    return { text: `There are ${T} eggs in all. Some eggs are hidden behind the box. How many eggs are hidden?`, vis: `<div class="hidebox">${em('🥚', 'tp').repeat(vis)}<span class="boxh">📦</span></div>`, tap: true, ...numQ(hid, [T, vis, hid + 1]), hint: 'Count the eggs you can see. The rest are hidden.', explain: `We can see ${vis}. ${T} − ${vis} = ${hid} hidden.` }; }
  if (k === 'fillPlates') { const g = ri(3, 4); const want = ri(t >= 8 ? 7 : t >= 6 ? 6 : 5, t >= 7 ? 9 : 7); const have = range(1, g).map(() => ri(1, want - 1)); const ans = sumA(have.map(h => want - h));
    return { text: `Every plate should have ${want} cookies. How many more cookies do we need altogether?`, vis: `<div class="nests">${have.map(h => `<div class="plate">${em('🍪').repeat(h)}</div>`).join('')}</div>`, tap: true, ...numQ(ans, [sumA(have), g * want, ans + 1]), hint: `For each plate, how many more make ${want}?`, explain: have.map(h => `${want} − ${h} = ${want - h}`).join(', ') + `. ${have.map(h => want - h).join(' + ')} = ${ans}.` }; }
  const start = ri(5, 12); const off1 = ri(1, start - 1), on1 = ri(2, 9), off2 = ri(1, start - off1 + on1 - 1), on2 = t >= 8 ? ri(1, 8) : 0; const ans = start - off1 + on1 - off2 + on2;
  const steps = [`Stop 1: ${off1} ${off1 === 1 ? 'child gets' : 'children get'} off and ${on1} get on.`, `Stop 2: ${off2} ${off2 === 1 ? 'child gets' : 'children get'} off${on2 ? ` and ${on2} ${on2 === 1 ? 'gets' : 'get'} on` : ''}.`];
  return { text: `The children in the picture are on the bus. ${steps.join(' ')} How many children are on the bus now?`, vis: `<div class="bus"><div class="busw">${em('🧒', 'tp').repeat(start)}</div><span class="em big">🚌</span></div>` + clues(steps), tap: true, ...numQ(ans, [start + on1 + on2, ans + 1, start - off1 - off2]), hint: 'First count the children on the bus. Then go stop by stop.', explain: `Start: ${start}. After stop 1: ${start} − ${off1} + ${on1} = ${start - off1 + on1}. After stop 2: ${start - off1 + on1} − ${off2}${on2 ? ' + ' + on2 : ''} = ${ans}.` };
}

/* =====================================================================
   9. STORY PROBLEMS — Cow Barn
   ===================================================================== */
const THINGS = [['🍎', 'apples'], ['🐚', 'shells'], ['🍪', 'cookies'], ['⭐', 'stickers'], ['🥚', 'eggs'], ['🌼', 'flowers'], ['🍓', 'strawberries'], ['🚗', 'toy cars'], ['🔵', 'marbles']];
function g9(L) {
  const t = tierOf(L), M = NMAX(t);
  const k = kind(t, [['addsub', 1, 2], ['twostep', 1, 6], ['moreThan', 1, 5], ['compare3', 1, 8], ['startUnknown', 2, 8], ['groups', 4, 10], ['busStart', 5, 10, 1.3], ['ages', 6, 10, 1.3], ['threeStep', 7, 10, 1.3]]);
  const [P, Q] = people(2); const [e, pl] = pick(THINGS); const scene = (two) => faces(two === false ? [P] : [P, Q], `<span class="em big">${e}</span>`);
  if (k === 'addsub') { const add = Math.random() < 0.5; const a = ri(8, M - 5), b = ri(4, add ? M - a : a - 2);
    if (add) return { text: `${P.n} had ${a} ${pl}. ${Q.n} gave ${P.him} ${b} more. How many ${pl} does ${P.n} have now?`, vis: scene(), ...numQ(a + b, [a + b + 1, a - b, a + b - 10]), hint: '“More” means the amount gets bigger. Add!', explain: `${a} + ${b} = ${a + b}.` };
    return { text: `${P.n} had ${a} ${pl}. ${P.He} gave ${b} to ${Q.n}. How many ${pl} does ${P.n} have left?`, vis: scene(), ...numQ(a - b, [a + b, a - b + 1, a - b - 1]), hint: '“Gave away” makes the amount smaller. Take away!', explain: `${a} − ${b} = ${a - b}.` }; }
  if (k === 'twostep') { const a = ri(Math.max(6, Math.floor(M / 3)), Math.max(12, M - 8)), b = ri(2, a - 3), c = ri(3, Math.min(12, M - a + b)); /* the answer stays within the tier's number range */ const ans = a - b + c;
    return { text: `${P.n} had ${a} ${pl}. ${P.He} lost ${b} of them. Then ${P.he} found ${c} more. How many ${pl} does ${P.he} have now?`, vis: scene(false), ...numQ(ans, [a + b + c, a - b, a + c]), hint: 'Two steps: first take away what was lost, then add what was found.', explain: `${a} − ${b} = ${a - b}. ${a - b} + ${c} = ${ans}.` }; }
  if (k === 'moreThan') { const more = Math.random() < 0.5; const b = ri(2, Math.min(15, Math.floor(M / 4))); const a = more ? ri(Math.max(5, Math.floor(M / 4)), Math.floor((M - b) / 2)) : ri(Math.max(b + 2, Math.floor(M / 4)), Math.floor((M + b) / 2)); /* the total stays within the tier's number range */ const ans = more ? a + b : a - b;
    return { text: `${P.n} has ${a} ${pl}. ${Q.n} has ${b} ${more ? 'more' : 'fewer'} ${pl} than ${P.n}. How many ${pl} do they have together?`, vis: scene(), ...numQ(a + ans, [ans, a + b, a + ans + 1]), hint: `First find how many ${Q.n} has. Then add both.`, explain: `${Q.n}: ${a} ${more ? '+' : '−'} ${b} = ${ans}. Together: ${a} + ${ans} = ${a + ans}.` }; }
  if (k === 'compare3') {
    const an = sample([['Fox', '🦊'], ['Panda', '🐼'], ['Monkey', '🐵'], ['Koala', '🐨'], ['Tiger', '🐯'], ['Lion', '🦁']], 3); const b = ri(1, 4), c = ri(1, 3 + t), a = ri(Math.max(5, 2 * t + 1), Math.min(5 + 2 * t, Math.floor((M + b - c) / 3))); /* the total stays within the tier's number range */ const x = a - b, y = a + c; const ans = a + x + y;
    return { text: `${an[0][0]}, ${an[1][0]} and ${an[2][0]} picked strawberries. ${an[0][0]} picked ${a}. ${an[1][0]} picked ${b} fewer than ${an[0][0]}. ${an[2][0]} picked ${c} more than ${an[0][0]}. How many strawberries did they pick altogether?`, vis: `<div class="scene">${an.map(z => `<span class="pp">${em(z[1])}<small>${z[0]}</small></span>`).join('')}<span class="em big">🍓</span></div>`, ...numQ(ans, [a + b + c, a + x, ans + 1]), hint: 'Find how many each animal picked. Then add all three.', explain: `${an[0][0]}: ${a}. ${an[1][0]}: ${a} − ${b} = ${x}. ${an[2][0]}: ${a} + ${c} = ${y}. ${a} + ${x} + ${y} = ${ans}.` };
  }
  if (k === 'startUnknown') { const b = ri(3, 12), c = ri(Math.max(b + 5, Math.floor(M / 3)), M); const ans = c - b; const gave = Math.random() < 0.5;
    if (gave) return { text: `${P.n} had some ${pl}. ${Q.n} gave ${P.him} ${b} more. Now ${P.n} has ${c} ${pl}. How many did ${P.n} have at first?`, vis: scene(), ...numQ(ans, [c + b, ans + 1, ans - 1]), hint: 'Work backwards. Undo adding by taking away.', explain: `At first + ${b} = ${c}. So at first = ${c} − ${b} = ${ans}.` };
    return { text: `${P.n} had some ${pl}. ${P.He} gave away ${b}. Now ${P.he} has ${ans} left. How many did ${P.he} have at first?`, vis: scene(false), ...numQ(c, [ans - b > 0 ? ans - b : ans + 1, c + 1, c - 1]), hint: 'Work backwards. Undo taking away by adding.', explain: `At first − ${b} = ${ans}. So at first = ${ans} + ${b} = ${c}.` }; }
  if (k === 'groups') { const g = ri(3, 5), n = ri(t >= 6 ? 4 : 3, t >= 6 ? 8 : 6), eaten = ri(t >= 6 ? 5 : 2, g * n - 3); const ans = g * n - eaten;
    return { text: `There are ${g} boxes with ${n} cupcakes in each box. The children eat ${eaten} cupcakes. How many cupcakes are left?`, vis: `<div class="scene">${em('📦', 'big').repeat(Math.min(g, 5))}${em('🧁', 'big')}</div>`, ...numQ(ans, [g * n, g + n - eaten > 0 ? g + n : ans + 2, ans + 1]), hint: 'First find how many cupcakes there are in all. Then take away.', explain: `${g} boxes of ${n}: ${range(1, g).map(() => n).join(' + ')} = ${g * n} cupcakes. ${g * n} − ${eaten} = ${ans}.` }; }
  if (k === 'busStart') { const off = ri(3, 9), on = ri(3, 12); const now = ri(on + 3, Math.min(M, 50) - Math.max(0, off - on)); const ans = now - on + off; // a bus holds at most 50 children
    return { text: `Some children were on the bus. At a bus stop, ${off} got off and ${on} got on. Now there are ${now} children on the bus. How many were on the bus at the start?`, vis: `<div class="scene">${em('🚌', 'big')}${em('🧒', 'big')}</div>`, ...numQ(ans, [now - on - off, now + on - off, ans + 1]), hint: 'Work backwards: undo the getting on, then undo the getting off.', explain: `Undo “${on} got on”: ${now} − ${on} = ${now - on}. Undo “${off} got off”: ${now - on} + ${off} = ${ans}.` }; }
  if (k === 'ages') { const typ = pick(['sib', 'future']);
    if (typ === 'sib') { const a = ri(5, 9), d = ri(2, 6), y = ri(2, 6); const ans = a + d + y; return { text: `${P.n} is ${a} years old. ${P.his.charAt(0).toUpperCase() + P.his.slice(1)} cousin is ${d} years older. How old will the cousin be in ${y} years?`, vis: faces([P], em('🎂', 'big')), ...numQ(ans, [a + d, a + y, ans + 1]), hint: 'First find the cousin’s age now. Then add the years.', explain: `Cousin now: ${a} + ${d} = ${a + d}. In ${y} years: ${a + d} + ${y} = ${ans}.` }; }
    const f = ri(9, 15), y1 = ri(2, 5); const now = f - y1; const y2 = ri(1, Math.min(4, now - 2)); const ans = now - y2;
    return { text: `In ${y1} years, ${P.n} will be ${f} years old. How old was ${P.he} ${y2} ${y2 === 1 ? 'year' : 'years'} ago?`, vis: faces([P], em('🎂', 'big')), ...numQ(ans, [now, f - y2, ans + 1]), hint: 'First find the age now.', explain: `Now: ${f} − ${y1} = ${now}. ${y2} ${y2 === 1 ? 'year' : 'years'} ago: ${now} − ${y2} = ${ans}.` }; }
  const a = ri(20, M - 15), b = ri(3, 10), c = ri(4, 15), d = ri(2, 9); const ans = a - b + c - d;
  return { text: `A farmer had ${a} eggs. He sold ${b}. His hens laid ${c} more. Then ${d} eggs broke. How many eggs does he have now?`, vis: `<div class="scene">${em('👨‍🌾', 'big')}${em('🥚', 'big')}</div>`, ...numQ(ans, [a + b + c - d, a - b - c - d > 0 ? a - b - c - d : ans + 2, ans + 1]), hint: 'Go step by step: take away, add, take away.', explain: `${a} − ${b} = ${a - b}. ${a - b} + ${c} = ${a - b + c}. ${a - b + c} − ${d} = ${ans}.` };
}

/* =====================================================================
   10. LOGICAL REASONING — Owl's Oak
   ===================================================================== */
function g10(L) {
  const t = tierOf(L);
  const k = kind(t, [['likes', 1, 3], ['boxes', 1, 3], ['tallest', 1, 3], ['seats', 1, 5], ['guess', 2, 6], ['tall4', 2, 8], ['race', 4, 10, 1.5], ['pets', 5, 10, 1.4], ['guess2d', 5, 10, 1.3]]);
  if (k === 'likes') { const P = people(3); const it = sample(['🍎', '🍌', '🍇', '🍓', '🍐', '🍊'], 3); const who = pick([1, 2]); const fp = shuffle(P); let sh; do { sh = shuffle(it); } while (fp.every((p, i) => sh[i] === it[P.indexOf(p)]));
    return { text: `${listAnd(fp.map(p => p.n))} each like a different fruit: ${listAnd(sh.map(e => FRUITW[e]))}. ${P[0].n} likes ${FRUITW[it[0]]}. ${P[1].n} does not like ${FRUITW[it[2]]}. What does ${P[who].n} like?`, vis: faces(fp, `<span class="fruits">${sh.map(e => em(e)).join('')}</span>`) + clues([`${P[0].n} likes ${FRUITW[it[0]]} ${it[0]}`, `${P[1].n} does NOT like ${FRUITW[it[2]]} ${it[2]}`]), ...optQ(it[who], it.filter((_, i) => i !== who), R_EM, v => FRUITW[v]), hint: `${cap(FRUITW[it[0]])} are taken. What can ${P[1].n} have?`, explain: `${P[0].n}: ${FRUITW[it[0]]}. ${P[1].n} cannot have ${FRUITW[it[2]]}, so ${FRUITW[it[1]]}. ${P[2].n}: ${FRUITW[it[2]]}.` }; }
  if (k === 'boxes') { const an = sample(['🐶', '🐱', '🐰', '🐭', '🐸', '🐥'], 3); const bx = shuffle(['red', 'blue', 'green']); const ao = shuffle(an);
    return { text: `${cap(listAnd(ao.map(e => 'a ' + nm(e, 1))))} hide in three boxes, one animal in each box. The ${nm(an[0], 1)} is in the ${bx[0]} box. The ${nm(an[1], 1)} is not in the ${bx[2]} box. Which box is the ${nm(an[2], 1)} in?`, vis: `<div class="scene"><span class="fruits">${ao.map(e => em(e)).join('')}</span><div class="bags">${['red', 'blue', 'green'].map(c => `<span class="lbox" style="--bc:${COL[c]}">?</span>`).join('')}</div></div>` + clues([`The ${nm(an[0], 1)} ${an[0]} is in the ${bx[0]} box.`, `The ${nm(an[1], 1)} ${an[1]} is NOT in the ${bx[2]} box.`]), ...optQ(bx[2], bx.slice(0, 2), v => `<span class="lbox sm" style="--bc:${COL[v]}"></span><span class="otxt">${v}</span>`, v => v + ' box'), hint: 'Start with the box we know for sure.', explain: `${cap(nm(an[0], 1))}: ${bx[0]}. ${cap(nm(an[1], 1))}: not ${bx[2]}, so ${bx[1]}. ${cap(nm(an[2], 1))}: ${bx[2]}.` }; }
  if (k === 'tallest') { const P = people(3); const tall = Math.random() < 0.5; const ans = tall ? P[0].n : P[2].n; const cl = shuffle([`${P[0].n} is taller than ${P[1].n}.`, `${P[2].n} is shorter than ${P[1].n}.`]);
    return { text: `${cl.join(' ')} Who is the ${tall ? 'tallest' : 'shortest'}?`, vis: faces(shuffle(P)) + clues(cl), ...optQ(ans, P.map(p => p.n).filter(n => n !== ans), R_TXT), hint: `Start with ${P[1].n}, who is in both clues.`, explain: `Tallest to shortest: ${P[0].n}, ${P[1].n}, ${P[2].n}.` }; }
  if (k === 'seats') { const P = people(3); const arr = shuffle(P); const askLeft = Math.random() < 0.5; const ans = askLeft ? arr[0].n : arr[2].n; let ls; do { ls = shuffle(P); } while (ls.every((p, i) => p === arr[i]));
    return { text: `${listAnd(ls.map(p => p.n))} sit in a row. ${arr[1].n} sits in the middle. ${arr[2].n} does not sit on the left. Who sits on the ${askLeft ? 'left' : 'right'}?`, vis: `<div class="seats">${['Left', 'Middle', 'Right'].map(s => `<div class="seat"><span class="em">❔</span><span class="em">🪑</span><small>${s}</small></div>`).join('')}</div>` + clues([`${arr[1].n} sits in the middle.`, `${arr[2].n} does NOT sit on the left.`]), ...optQ(ans, P.map(p => p.n).filter(n => n !== ans), R_TXT), hint: `Put ${arr[1].n} in the middle first.`, explain: `${arr[1].n}: middle. ${arr[2].n} is not on the left, so on the right. ${arr[0].n}: left.` }; }
  if (k === 'tall4') { const P = people(4); const q = pick(['tallest', 'shortest', 'second']); const ans = q === 'tallest' ? P[0].n : q === 'shortest' ? P[3].n : P[1].n;
    const cl = shuffle([`${P[1].n} is taller than ${P[2].n}.`, `${P[0].n} is taller than ${P[1].n}.`, `${P[3].n} is shorter than ${P[2].n}.`]);
    return { text: `${cl.join(' ')} ${q === 'second' ? 'Who is the second tallest?' : `Who is the ${q}?`}`, vis: faces(shuffle(P)) + clues(cl), ...optQ(ans, shuffle(P.map(p => p.n).filter(n => n !== ans)).slice(0, 2), R_TXT), hint: 'Line them up one clue at a time.', explain: `Tallest to shortest: ${P.map(p => p.n).join(', ')}.` }; }
  if (k === 'guess') { const lo = ri(3, 30); const cand = range(lo + 1, lo + 4); const tg = pick(cand); const par = tg % 2 === 0 ? 'even' : 'odd'; const same = cand.filter(x => x % 2 === tg % 2); const other = same.find(x => x !== tg); const c3 = tg > other ? `I am more than ${other}.` : `I am less than ${other}.`; const wrong = cand.filter(x => x % 2 !== tg % 2);
    const cl = [`I am more than ${lo} and less than ${lo + 5}.`, `I am an ${par} number.`, c3];
    return { text: `Guess my number! ${cl.join(' ')} What number am I?`, vis: `<div class="scene">${em('🦉', 'big')}</div>` + clues(cl), ...optQ(tg, [other, pick(wrong)], R_NUM), hint: 'List the numbers that fit the first clue, then cross some out.', explain: `Numbers: ${cand.join(', ')}. ${cap(par)}: ${same.join(' and ')}. ${c3} So ${tg}.` }; }
  if (k === 'guess2d') {
    for (let tries = 0; tries < 100; tries++) {
      const tg = ri(10, 99); const T = Math.floor(tg / 10), O = tg % 10; let cand = range(10, 99); const cl = [];
      const fams = [
        () => { const lo = Math.max(10, tg - ri(3, 15)), hi = Math.min(99, tg + ri(3, 15)); return [`I am more than ${lo} and less than ${hi}.`, x => x > lo && x < hi]; },
        () => [tg % 2 ? 'I am odd.' : 'I am even.', x => x % 2 === tg % 2],
        () => [`My digits add up to ${T + O}.`, x => Math.floor(x / 10) + x % 10 === T + O],
        () => T > O ? ['My tens digit is bigger than my ones digit.', x => Math.floor(x / 10) > x % 10] : T < O ? ['My ones digit is bigger than my tens digit.', x => Math.floor(x / 10) < x % 10] : ['My two digits are the same.', x => Math.floor(x / 10) === x % 10],
        () => [`My tens digit is ${T}.`, x => Math.floor(x / 10) === T],
        () => tg % 5 === 0 ? ['You say me when you count by 5s.', x => x % 5 === 0] : ['You do NOT say me when you count by 5s.', x => x % 5 !== 0]
      ];
      const fl = [], used = []; let g = 0; while (cand.length > 1 && cl.length < 4 && g++ < 30) { const fi = ri(0, fams.length - 1); if (used.includes(fi)) continue; const [txt, f] = fams[fi](); const nc = cand.filter(f); if (nc.length === cand.length || !nc.includes(tg)) continue; cl.push(txt); fl.push(f); used.push(fi); cand = nc; }
      if (cand.length !== 1) continue;
      // drop clues the others already imply (e.g. "You do NOT say me when you count by 5s." next to "My tens digit is 1." and "My two digits are the same."), so every clue is needed
      for (let i = cl.length - 1; i >= 0; i--) { const rest = fl.filter((_, j) => j !== i); if (range(10, 99).filter(x => rest.every(f => f(x))).length === 1) { cl.splice(i, 1); fl.splice(i, 1); } }
      if (cl.length < 3) continue;
      let lc = range(10, 99); const left = fl.map(f => (lc = lc.filter(f)).length);
      const near = range(10, 99).filter(x => x !== tg && Math.abs(x - tg) <= 12); const ds = sample(near, 2);
      return { text: `Guess my number! I am a two-digit number. ${cl.join(' ')} What number am I?`, vis: `<div class="scene">${em('🦉', 'big')}</div>` + clues(cl), ...optQ(tg, ds, R_NUM), hint: 'Use the clue that leaves the fewest numbers first. Then test them with the other clues.', explain: `Clue by clue, the two-digit numbers that still fit: ${left.map((n, i) => `after clue ${i + 1}, ${n} ${n === 1 ? 'number' : 'numbers'}`).join('; ')}. Only ${tg} fits every clue.` };
    }
    return g10(L);
  }
  if (k === 'race') {
    const n = t >= 8 ? 5 : 4;
    for (let tries = 0; tries < 300; tries++) {
      const P = people(n); const names = P.map(p => p.n); const order = shuffle(names); const pos = {}; order.forEach((x, i) => { pos[x] = i; });
      const fams = [
        () => { const [a, b] = sample(names, 2); return pos[a] < pos[b] ? [`${a} finished before ${b}.`, p => p.indexOf(a) < p.indexOf(b)] : [`${a} finished after ${b}.`, p => p.indexOf(a) > p.indexOf(b)]; },
        () => { const i = ri(0, n - 2); const a = order[i + 1], b = order[i]; return [`${a} finished right after ${b}.`, p => p.indexOf(a) === p.indexOf(b) + 1]; },
        () => { const a = pick(names); return pos[a] !== 0 ? [`${a} did not finish first.`, p => p.indexOf(a) !== 0] : null; },
        () => { const a = pick(names); return pos[a] !== n - 1 ? [`${a} did not finish last.`, p => p.indexOf(a) !== n - 1] : null; },
        () => { const i = ri(1, n - 2); const a = order[i], b = order[ri(0, i - 1)], c = order[ri(i + 1, n - 1)]; return [`${a} finished somewhere between ${b} and ${c}.`, p => { const x = p.indexOf(a), y = p.indexOf(b), z = p.indexOf(c); return (y < x && x < z) || (z < x && x < y); }]; }
      ];
      let cand = perms(names); const cl = []; let g = 0;
      while (cand.length > 1 && cl.length < n && g++ < 60) { const c = pick(fams)(); if (!c || cl.some(x => x[0] === c[0])) continue; const nc = cand.filter(c[1]); if (nc.length === cand.length) continue; cl.push(c); cand = nc; }
      if (cand.length !== 1) continue;
      // drop every clue the other clues already imply (it read oddly, e.g. "Kai finished after Sam." next to "Kai finished right after Sam.")
      const all = perms(names); for (let i = cl.length - 1; i >= 0; i--) { const rest = cl.filter((_, j) => j !== i); if (all.filter(p => rest.every(c => c[1](p))).length === 1) cl.splice(i, 1); }
      const q = pick(['first', 'last', 'second', n === 5 ? 'third' : 'second']); const qi = { first: 0, second: 1, third: 2, last: n - 1 }[q]; const ans = order[qi];
      let fo; do { fo = shuffle(P); } while (fo.every((p, i) => p.n === order[i]));
      return { text: `${listAnd(fo.map(p => p.n))} ran a race. ${cl.map(c => c[0]).join(' ')} Who finished ${q}?`, vis: faces(fo, em('🏁', 'big')) + clues(cl.map(c => c[0])), ...optQ(ans, sample(names.filter(x => x !== ans), 2), R_TXT), hint: 'Write the names in a row. Move them around until every clue is true.', explain: `The only order that fits every clue is: ${order.map((x, i) => `${ord(i + 1)} ${x}`).join(', ')}.` };
    }
    return g10(L - 5 > 0 ? L - 5 : 1);
  }
  // pets grid
  const n = t >= 8 ? 4 : 3;
  for (let tries = 0; tries < 300; tries++) {
    const P = people(n); const names = P.map(p => p.n); const pets = sample(['🐶', '🐱', '🐰', '🐢', '🐟', '🐦'], n); const own = shuffle(pets); const has = {}; names.forEach((x, i) => { has[x] = own[i]; });
    const fams = [
      () => { const a = pick(names); return [`${a} has the ${nm(has[a], 1)}.`, p => p[names.indexOf(a)] === has[a]]; },
      () => { const a = pick(names); const w = pick(pets.filter(e => e !== has[a])); return [`${a} does not have the ${nm(w, 1)}.`, p => p[names.indexOf(a)] !== w]; },
      () => { const [a, b] = sample(names, 2); const w = pick(pets.filter(e => e !== has[a] && e !== has[b])); return w ? [`Neither ${a} nor ${b} has the ${nm(w, 1)}.`, p => p[names.indexOf(a)] !== w && p[names.indexOf(b)] !== w] : null; }
    ];
    let cand = perms(pets); const cl = []; let g = 0;
    while (cand.length > 1 && cl.length < n && g++ < 60) { const c = pick(fams)(); if (!c || cl.some(x => x[0] === c[0])) continue; const nc = cand.filter(c[1]); if (nc.length === cand.length) continue; if (/ has the /.test(c[0]) && !/not|Neither/.test(c[0]) && cl.length === 0 && Math.random() < 0.6) continue; cl.push(c); cand = nc; }
    if (cand.length !== 1) continue;
    // drop clues the others already imply ("Sam does not have the fish." next to "Sam has the dog."), then insist on at least one "no" clue
    // (two "has" clues alone just leave the last pet) and on no "Neither" clue about a child whose pet a "has" clue already gives
    const all = perms(pets); for (let i = cl.length - 1; i >= 0; i--) { const rest = cl.filter((_, j) => j !== i); if (all.filter(p => rest.every(c => c[1](p))).length === 1) cl.splice(i, 1); }
    const given = names.filter(x => cl.some(c => c[0].startsWith(x + ' has the')));
    if (cl.length < 2 || !cl.some(c => /not|Neither/.test(c[0])) || cl.some(c => c[0].startsWith('Neither') && given.some(x => c[0].includes(x + ' ')))) continue;
    const who = pick(names.filter(x => !given.includes(x))); if (!who) continue; const ans = has[who];
    let pd; do { pd = shuffle(pets); } while (names.every((x, i) => has[x] === pd[i]));
    return { text: `${listAnd(names)} each have a different pet: ${listAnd(pd.map(e => 'a ' + nm(e, 1)))}. ${cl.map(c => c[0]).join(' ')} Which pet does ${who} have?`, vis: faces(P, `<span class="fruits">${pd.map(e => em(e)).join('')}</span>`) + clues(cl.map(c => c[0])), ...optQ(ans, sample(pets.filter(e => e !== ans), 2), R_EM, S_EM), hint: 'Make a little table in your head: who can have which pet? Cross out what the clues say no to.', explain: `Matching every clue: ${names.map(x => `${x} has the ${nm(has[x], 1)}`).join(', ')}.` };
  }
  return g10(1);
}

/* =====================================================================
   11. CLASSIFICATION AND GROUPING — Sorting Shed
   ===================================================================== */
const CATS = [
  { k: 'fruits', one: 'a fruit', items: ['🍎', '🍌', '🍇', '🍓', '🍐', '🍊', '🍉', '🍍'] },
  { k: 'vegetables', one: 'a vegetable', items: ['🥕', '🥦', '🌽', '🥒', '🍆', '🥔'] },
  { k: 'farm animals', one: 'a farm animal', items: ['🐄', '🐖', '🐑', '🐐', '🐔', '🐴'] },
  { k: 'sea animals', one: 'a sea animal', items: ['🐟', '🐙', '🦀', '🐬', '🐳', '🦈'] },
  { k: 'vehicles', one: 'a vehicle', items: ['🚌', '🚲', '🚂', '🚜', '🚑'] },
  { k: 'clothes', one: 'something you wear', items: ['👕', '👖', '🧦', '🧢', '👗', '🧤'] }
];
const SHAPES4 = ['circle', 'square', 'triangle', 'star'];
const PROPS = [
  { n: 'even numbers', f: x => x % 2 === 0, d: 1 }, { n: 'odd numbers', f: x => x % 2 === 1, d: 1 },
  { n: 'numbers more than 20', f: x => x > 20, d: 2 }, { n: 'numbers less than 15', f: x => x < 15, d: 2 },
  { n: 'numbers you say when counting by 5s', f: x => x % 5 === 0, d: 3 }, { n: 'numbers with a 3 in them', f: x => String(x).includes('3'), d: 4 },
  { n: 'numbers whose digits are the same', f: x => x > 10 && x % 11 === 0, d: 5 }, { n: 'numbers whose digits add up to 9', f: x => Math.floor(x / 10) + x % 10 === 9, d: 6 },
  { n: 'numbers you say when counting by 3s', f: x => x % 3 === 0, d: 7 }
];
function g11(L) {
  const t = tierOf(L);
  const k = kind(t, [['oddCat', 1, 3], ['oddShape', 1, 3], ['oddColor', 1, 4], ['oddNum', 1, 10, 1.3], ['countAttr', 1, 6], ['ruleSort', 3, 10, 1.3], ['venn', 5, 10, 1.3], ['vennStory', 7, 10]]);
  if (k === 'oddCat') { let A, B; do { [A, B] = sample(CATS, 2); } while ([A.k, B.k].includes('fruits') && [A.k, B.k].includes('vegetables') && t === 1);
    const three = sample(A.items, 3); const odd = pick(B.items); const all = shuffle(three.concat([odd]));
    return { text: 'Which one does NOT belong with the others?', vis: '', cols: 4, ...optQ(odd, all.filter(e => e !== odd), R_EM, S_EM, 4), hint: 'What kind of thing are three of them?', explain: `The ${listAnd(three.map(e => nm(e, 1)))} are all ${A.k}. The ${nm(odd, 1)} ${['👖', '🧦', '🧤'].includes(odd) ? 'are' : 'is'} ${B.one}.` }; }
  if (k === 'oddShape') { const [K, O] = sample(SHAPES4, 2); const cols = sample(['red', 'blue', 'green', 'yellow'], 3); const oc = pick(cols);
    const items = shuffle([{ k: K, c: cols[0] }, { k: K, c: cols[1] }, { k: K, c: cols[2] }, { k: O, c: oc, odd: 1 }]); const ans = String(items.findIndex(x => x.odd));
    return { text: 'Which shape does NOT belong?', vis: '', cols: 4, ...optQ(ans, ['0', '1', '2', '3'].filter(x => x !== ans), v => shp(items[+v].k, items[+v].c, 72), v => `${items[+v].c} ${items[+v].k}`, 4), hint: 'Do not look at the colors. Look at the shapes.', explain: `Three are ${K}s. The ${oc} ${O} is different.` }; }
  if (k === 'oddColor') { const kinds4 = sample(['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'], 4); const [C, D] = sample(['red', 'blue', 'green', 'yellow'], 2); const oi = ri(0, 3); const items = kinds4.map((kk, i) => ({ k: kk, c: i === oi ? D : C }));
    return { text: 'Which shape does NOT belong?', vis: '', cols: 4, ...optQ(String(oi), ['0', '1', '2', '3'].filter(x => x !== String(oi)), v => shp(items[+v].k, items[+v].c, 72), v => `${items[+v].c} ${items[+v].k}`, 4), hint: 'All the shapes are different. What else could be the same?', explain: `All the shapes are different, but three are ${C}. The ${D} ${items[oi].k} is different.` }; }
  if (k === 'oddNum') {
    const pool = PROPS.filter(p => p.d <= t && p.d >= t - 4 && p.n !== 'numbers less than 15'); const lim = t <= 2 ? 39 : 99;
    // reject sets where another rule a child knows would pick a different number: any PROPS rule, one-digit, counting by 10s (either way round),
    // three numbers sharing a tens digit, an ones digit or a digit while the intended odd one is among those three, or a number that is far
    // smaller or bigger than the rest (21 next to 57, 69, 85: its gap to the others is bigger than their whole spread) when it is not the odd one
    const SYM = PROPS.map(p => p.f).concat([x => x < 10, x => x % 10 === 0]), POS = range(0, 9).map(d => x => x >= 10 && Math.floor(x / 10) === d).concat(range(0, 9).map(d => x => x % 10 === d), range(0, 9).map(d => x => String(x).includes(String(d))));
    const far = s => (s[1] - s[0] > s[3] - s[1] && s[0] !== odd) || (s[3] - s[2] > s[2] - s[0] && s[3] !== odd);
    let P, three, odd, vals;
    for (let tries = 0; tries < 3000; tries++) {
      P = pick(pool); three = sample(range(2, lim).filter(P.f), 3); odd = pick(range(2, lim).filter(x => !P.f(x))); vals = shuffle(three.concat([odd]));
      if (!SYM.some(f => { const y = vals.filter(f); const s = y.length === 1 ? y[0] : y.length === 3 ? vals.find(v => !f(v)) : null; return s != null && s !== odd; }) && !POS.some(f => vals.filter(f).length === 3 && f(odd)) && !far(vals.slice().sort((a, b) => a - b))) break;
    }
    return { text: 'Which number does NOT belong?', vis: '', cols: 4, ...optQ(odd, vals.filter(v => v !== odd), R_NUM, null, 4), hint: 'Find something that three of the numbers share.', explain: `${three.sort((a, b) => a - b).join(', ')} are all ${P.n}. ${odd} is not.` };
  }
  if (k === 'countAttr') { let items, K, C, ans, nK, nC; do { items = range(1, ri(10, 14)).map(() => ({ k: pick(['circle', 'square', 'triangle']), c: pick(['red', 'blue', 'yellow']) })); K = pick(['circle', 'square', 'triangle']); C = pick(['red', 'blue', 'yellow']); ans = items.filter(x => x.k === K && x.c === C).length; nK = items.filter(x => x.k === K).length; nC = items.filter(x => x.c === C).length; } while (ans < 1 || ans > 6 || nK === ans || nC === ans);
    const not = t >= 4 && Math.random() < 0.5; if (not) { const a2 = items.filter(x => x.k !== K && x.c !== C).length; if (a2 >= 1) return { text: `How many shapes are NOT ${C} and NOT ${K}s?`, vis: `<div class="shgrid">${items.map(x => `<span class="tp sh">${shp(x.k, x.c, 48)}</span>`).join('')}</div>`, tap: true, ...numQ(a2, [items.length - nC, items.length - nK, a2 + 1]), hint: `Skip every ${C} shape and every ${K}. Count what is left.`, explain: `Shapes that are neither ${C} nor ${K}s: ${a2}.` }; }
    return { text: `How many shapes are ${C} AND ${K}s?`, say: `How many shapes are both ${C} and ${K}s?`, vis: `<div class="shgrid">${items.map(x => `<span class="tp sh">${shp(x.k, x.c, 48)}</span>`).join('')}</div>`, tap: true, ...numQ(ans, [nK, nC, ans + 1]), hint: `A shape must be ${C} and also a ${K}.`, explain: `${nC} are ${C} and ${nK} are ${K}s, but only ${ans} ${ans === 1 ? 'is' : 'are'} both.` }; }
  if (k === 'ruleSort') {
    for (let tries = 0; tries < 100; tries++) {
      const pool = PROPS.filter(p => p.d <= t + 1); const P = pick(pool); const A = sample(range(2, 60).filter(P.f), 4), B = sample(range(2, 60).filter(x => !P.f(x)), 4);
      const bad = pool.filter(p => p !== P && A.some(x => !p.f(x)));
      if (bad.length < 2) continue; const ds = sample(bad, 2).map(p => p.n);
      return { text: 'The numbers are sorted into two groups. What is the rule for Group A?', vis: `<div class="groups"><div class="grpbox"><b>Group A</b><span>${A.join(', ')}</span></div><div class="grpbox">${''}<b>Group B</b><span>${B.join(', ')}</span></div></div>`, ...optQ(cap(P.n), ds.map(cap), R_TXT), hint: 'Test each rule on every number in Group A. Then check that no number in Group B fits it.', explain: `Every number in Group A is one of the ${P.n}, and none in Group B is.` };
    }
    return g11(1);
  }
  if (k === 'venn') {
    for (let tries = 0; tries < 100; tries++) {
      const [P1, P2] = sample(PROPS.filter(p => p.d <= t), 2); const nums = sample(range(2, 50), 8); const both = nums.filter(x => P1.f(x) && P2.f(x)), only1 = nums.filter(x => P1.f(x) && !P2.f(x)), none = nums.filter(x => !P1.f(x) && !P2.f(x));
      if (both.length < 1 || only1.length < 1) continue; const R = { both, only1, none }; const q = pick(['both', 'only1', 'none'].filter(r => R[r].length > 0)); const ans = R[q].length;
      const qt = q === 'both' ? 'in the middle, where the two circles overlap' : q === 'only1' ? `in the left circle but NOT in the right circle` : 'outside both circles';
      // circle labels: wrapped onto up to 3 short lines (long rule names used to run into each other), coloured like their circle
      const wrap = s => { for (let n = 1; ; n++) { const lim = Math.ceil(s.length / n) + 3, W = []; s.split(' ').forEach(w => { const l = W[W.length - 1]; if (l && (l + ' ' + w).length <= lim) W[W.length - 1] = l + ' ' + w; else W.push(w); }); if ((W.length <= n && W.every(l => l.length <= 17)) || n > 3) return W; } };
      const lbl = (P, x, c) => `<text x="${x}" y="26" class="vt" style="fill:${c}">${wrap(cap(P.n)).map((l, i) => `<tspan x="${x}" dy="${i ? 18 : 0}">${l}</tspan>`).join('')}</text>`;
      return { text: `Sort the numbers into the circles. How many numbers go ${qt}?`, vis: `<div class="pt">${nums.map(v => `<span class="cn">${v}</span>`).join('')}</div><svg class="venn" viewBox="0 0 360 250" width="360" height="250" aria-hidden="true"><rect x="2" y="2" width="356" height="246" rx="16" class="vbox"/><circle cx="135" cy="160" r="78" class="v1"/><circle cx="225" cy="160" r="78" class="v2"/>${lbl(P1, 92, COL.red)}${lbl(P2, 268, COL.blue)}</svg>`, ...numQ(ans, [only1.length + both.length, both.length + 1, ans + 1].filter(x => x !== ans)), hint: 'Check each number with both rules: yes/yes, yes/no, no/yes or no/no.', explain: `Left circle (${P1.n}): ${nums.filter(P1.f).join(', ') || 'none'}. Right circle (${P2.n}): ${nums.filter(P2.f).join(', ') || 'none'}. ${q === 'both' ? 'In both circles' : q === 'only1' ? 'In the left circle only' : 'In neither circle'}: ${R[q].join(', ')}. So the answer is ${ans}.` };
    }
    return g11(1);
  }
  const a = ri(6, 15), b = ri(5, 12), both = ri(2, Math.min(a, b) - 1); const ans = a + b - both;
  return { text: `In a class, ${a} children have a cat and ${b} children have a dog. ${both} of them have both a cat and a dog. Every child in the class has a cat, a dog, or both. How many children are in the class?`, vis: `<svg class="venn" viewBox="0 0 360 180" width="360" height="180" aria-hidden="true"><circle cx="135" cy="95" r="76" class="v1"/><circle cx="225" cy="95" r="76" class="v2"/><text x="95" y="100" class="vn">🐱</text><text x="265" y="100" class="vn">🐶</text><text x="180" y="100" class="vn">${both}</text></svg>`, ...numQ(ans, [a + b, ans - both, ans + 1]), hint: `The ${both} children with both pets were counted twice.`, explain: `${a} + ${b} = ${a + b}, but ${both} children were counted twice. ${a + b} − ${both} = ${ans}.` };
}

/* =====================================================================
   12. GEOMETRY — Shape Field
   ===================================================================== */
const SFACT = { triangle: '3 straight sides and 3 corners', square: '4 equal sides and 4 square corners', circle: 'no corners and no straight sides', rectangle: '4 sides and 4 square corners', pentagon: '5 sides and 5 corners', hexagon: '6 sides and 6 corners' };
const PIC = {
  house: { svg: `<rect x="50" y="90" width="100" height="100" fill="#F5B400" stroke="#2B2340" stroke-width="4"/><polygon points="38,92 100,30 162,92" fill="#E5484D" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/><rect x="85" y="140" width="30" height="50" fill="#8E4EC6" stroke="#2B2340" stroke-width="4"/><rect x="60" y="104" width="22" height="22" fill="#A9DEF9" stroke="#2B2340" stroke-width="4"/><rect x="118" y="104" width="22" height="22" fill="#A9DEF9" stroke="#2B2340" stroke-width="4"/>`, c: { triangle: 1, square: 3, rectangle: 1, circle: 0 }, sq: true },
  rocket: { svg: `<polygon points="80,132 52,172 80,160" fill="#E5484D" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/><polygon points="120,132 148,172 120,160" fill="#E5484D" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/><rect x="80" y="62" width="40" height="110" fill="#3E7BFA" stroke="#2B2340" stroke-width="4"/><polygon points="80,62 100,16 120,62" fill="#F5B400" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="98" r="12" fill="#A9DEF9" stroke="#2B2340" stroke-width="4"/>`, c: { triangle: 3, rectangle: 1, circle: 1, square: 0 }, sq: false },
  robot: { svg: `<circle cx="100" cy="12" r="7" fill="#E5484D" stroke="#2B2340" stroke-width="4"/><rect x="70" y="20" width="60" height="60" fill="#A9DEF9" stroke="#2B2340" stroke-width="4"/><circle cx="88" cy="46" r="7" fill="#fff" stroke="#2B2340" stroke-width="4"/><circle cx="112" cy="46" r="7" fill="#fff" stroke="#2B2340" stroke-width="4"/><rect x="60" y="88" width="80" height="58" fill="#2FA35A" stroke="#2B2340" stroke-width="4"/><rect x="34" y="92" width="20" height="46" fill="#F5B400" stroke="#2B2340" stroke-width="4"/><rect x="146" y="92" width="20" height="46" fill="#F5B400" stroke="#2B2340" stroke-width="4"/><rect x="72" y="150" width="20" height="42" fill="#8E4EC6" stroke="#2B2340" stroke-width="4"/><rect x="108" y="150" width="20" height="42" fill="#8E4EC6" stroke="#2B2340" stroke-width="4"/>`, c: { circle: 3, square: 1, rectangle: 5, triangle: 0 }, sq: true },
  tree: { svg: `<rect x="90" y="164" width="20" height="34" fill="#A8693C" stroke="#2B2340" stroke-width="4"/><polygon points="100,112 160,164 40,164" fill="#2FA35A" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/><polygon points="100,60 152,110 48,110" fill="#2FA35A" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/><polygon points="100,10 142,58 58,58" fill="#2FA35A" stroke="#2B2340" stroke-width="4" stroke-linejoin="round"/>`, c: { triangle: 3, rectangle: 1, circle: 0, square: 0 }, sq: false },
  train: { svg: `<rect x="24" y="92" width="96" height="54" fill="#E5484D" stroke="#2B2340" stroke-width="4"/><rect x="84" y="52" width="40" height="40" fill="#F5B400" stroke="#2B2340" stroke-width="4"/><rect x="128" y="108" width="60" height="38" fill="#3E7BFA" stroke="#2B2340" stroke-width="4"/><circle cx="46" cy="158" r="13" fill="#5F5577" stroke="#2B2340" stroke-width="4"/><circle cx="98" cy="158" r="13" fill="#5F5577" stroke="#2B2340" stroke-width="4"/><circle cx="142" cy="158" r="13" fill="#5F5577" stroke="#2B2340" stroke-width="4"/><circle cx="172" cy="158" r="11" fill="#5F5577" stroke="#2B2340" stroke-width="4"/>`, c: { circle: 4, square: 1, rectangle: 2, triangle: 0 }, sq: true }
};
const MINI = { tt: '<polygon points="6,52 30,8 54,52" /><polygon points="66,52 90,8 114,52" />', rr: '<rect x="14" y="6" width="34" height="48"/><rect x="72" y="6" width="34" height="48"/>', ss: '<rect x="8" y="10" width="42" height="42"/><rect x="70" y="10" width="42" height="42"/>', hh: '<path d="M10 46 A24 24 0 0 1 58 46 Z"/><path d="M64 46 A24 24 0 0 1 112 46 Z"/>', ts: '<polygon points="6,52 30,8 54,52" /><rect x="70" y="10" width="42" height="42"/>' };
const MINIL = { tt: '2 triangles', rr: '2 rectangles', ss: '2 squares', hh: '2 half circles', ts: '1 triangle and 1 square' };
const CUTS = [
  { svg: `<rect x="40" y="10" width="120" height="120" ${FST}/><line x1="40" y1="10" x2="160" y2="130" class="cut"/>`, a: 'tt' }, { svg: `<rect x="40" y="10" width="120" height="120" ${FST}/><line x1="100" y1="2" x2="100" y2="138" class="cut"/>`, a: 'rr' },
  { svg: `<rect x="20" y="30" width="160" height="80" ${FST}/><line x1="100" y1="22" x2="100" y2="118" class="cut"/>`, a: 'ss' }, { svg: `<circle cx="100" cy="70" r="60" ${FST}/><line x1="100" y1="2" x2="100" y2="138" class="cut"/>`, a: 'hh' },
  { svg: `<polygon points="100,10 172,130 28,130" ${FST}/><line x1="100" y1="4" x2="100" y2="136" class="cut"/>`, a: 'tt' }
];
const MAKE = { square: '<rect x="25" y="10" width="70" height="70"/>', bigtri: '<polygon points="10,80 60,30 110,80"/>', para: '<polygon points="10,80 60,80 110,30 60,30"/>', longrect: '<rect x="8" y="26" width="104" height="52"/>', pentagon: `<polygon points="${ngon(5, 60, 50, 38)}"/>` };
const MAKEN = { square: 'a square', bigtri: 'a big triangle', para: 'a slanted shape (parallelogram)', longrect: 'a long rectangle', pentagon: 'a pentagon' };
const SOLQ = [
  { s: 'cube', p: 'faces', a: 6, d: 4 }, { s: 'cube', p: 'corners', a: 8, d: 4 }, { s: 'cube', p: 'edges', a: 12, d: 7 }, { s: 'box', p: 'faces', a: 6, d: 4 }, { s: 'box', p: 'corners', a: 8, d: 5 },
  { s: 'cylinder', p: 'flat faces', a: 2, d: 4 }, { s: 'cone', p: 'flat faces', a: 1, d: 5 }, { s: 'pyramid', p: 'faces', a: 5, d: 6 }, { s: 'pyramid', p: 'corners', a: 5, d: 6 }, { s: 'sphere', p: 'flat faces', a: 0, d: 5 }
];
const SNAME = { cube: 'cube', box: 'box', cylinder: 'cylinder', cone: 'cone', pyramid: 'pyramid with a square bottom', sphere: 'ball' };
// hidden back edges drawn dashed, so the square bottom of the pyramid (it looked like a 3-sided one) and the hidden corner of the cube and box can be seen
const HIDE = { cube: '<path d="M40 62 V22 M40 62 L22 80 M40 62 H80"/>', box: '<path d="M28 64 V30 M28 64 L10 80 M28 64 H84"/>', pyramid: '<path d="M48 52 L18 70 M48 52 L84 66 M48 52 L50 12"/>' };
const solidH = (k, s) => HIDE[k] ? solid(k, s).replace('</g></svg>', `<g fill="none" stroke-width="2" stroke-dasharray="4 4" opacity=".7">${HIDE[k]}</g></g></svg>`) : solid(k, s);
function g12(L) {
  const t = tierOf(L);
  const k = kind(t, [['name', 1, 2], ['corners', 1, 4], ['solid', 1, 3], ['cut', 1, 5], ['build', 1, 6], ['make', 2, 7], ['sides', 2, 6], ['solidFaces', 4, 10, 1.3], ['mirror', 4, 10, 1.3], ['area', 5, 10, 1.4], ['perimeter', 7, 10, 1.3]]);
  if (k === 'name') { const pool = ['triangle', 'square', 'circle', 'rectangle', 'pentagon', 'hexagon']; const T = pick(pool); const others = sample(pool.filter(x => x !== T && !(T === 'rectangle' && x === 'square')), 2); const cl = sample(['red', 'blue', 'green', 'yellow', 'purple'], 3); const cm = {}; [T].concat(others).forEach((x, i) => { cm[x] = cl[i]; });
    return { text: `Which one is a ${T}?`, vis: '', ...optQ(T, others, v => shp(v, cm[v], 80), v => 'the ' + cm[v] + ' shape'), hint: `A ${T} has ${SFACT[T]}.`, explain: `A ${T} has ${SFACT[T]}.` }; }
  if (k === 'corners') { const pool = t <= 2 ? [['pentagon', 5], ['hexagon', 6], ['triangle', 3]] : [['pentagon', 5], ['hexagon', 6], ['octagon', 8], ['lshape', 6]]; const [K, n] = pick(pool); const w = Math.random() < 0.5 ? 'corners' : 'sides';
    return { text: `How many ${w} does this shape have?`, vis: shp(K, pick(['red', 'blue', 'green', 'yellow', 'purple']), 150), ...numQ(n, [n + 1, n - 1]), hint: w === 'corners' ? 'Touch each corner once as you go around.' : 'Trace the edge and count each straight side once.', explain: `Going around, we count ${n} ${w}.` + (K === 'lshape' ? (w === 'corners' ? ' Do not forget the corner that points inward!' : ' Do not forget the two sides that meet at the corner that points inward!') : '') }; }
  if (k === 'solid') { const Q = pick([['Which one is shaped like a sphere?', '⚽', ['🎲', '🥫', '📦'], 'A sphere is round all over.'], ['Which one is shaped like a cube?', '🎲', ['⚽', '🥫'], 'A cube has 6 flat square faces.'], ['Which one is shaped like a cylinder?', '🥫', ['⚽', '🎲', '📦'], 'A cylinder has two flat circle ends and a curved side.'], ['Which one can NOT roll along the floor?', '📦', ['⚽', '🥫'], 'A box has only flat faces, so it cannot roll.'], ['Which one can roll AND can be stacked?', '🥫', ['⚽', '📦'], 'A can rolls on its curved side and stands flat on its ends.']]);
    return { text: Q[0], vis: '', ...optQ(Q[1], sample(Q[2], 2), R_EM, S_EM), hint: 'Are the faces flat or curved?', explain: Q[3] }; }
  if (k === 'cut') { const c = pick(CUTS); const others = sample(Object.keys(MINIL).filter(x => x !== c.a && !(c.a === 'ss' && x === 'rr')), 2);
    return { text: 'We cut the shape along the dotted line. What two shapes do we get?', vis: `<svg class="fig" viewBox="0 0 200 140" width="220" height="154" aria-hidden="true">${c.svg}</svg>`, ...optQ(c.a, others, v => `<svg class="mini" viewBox="0 0 120 60" width="96" height="48" aria-hidden="true">${MINI[v]}</svg><span class="otxt sm">${MINIL[v]}</span>`, v => MINIL[v]), hint: 'Imagine cutting with scissors along the dotted line.', explain: `The cut makes ${MINIL[c.a]}.` }; }
  if (k === 'build') { const key = pick(Object.keys(PIC)); const p = PIC[key]; const ok = Object.keys(p.c).filter(s => p.c[s] > 0 && !(s === 'rectangle' && p.sq)); const s = pick(ok); const ans = p.c[s]; const total = sumA(Object.values(p.c));
    return { text: `How many ${s}s are in this picture?`, vis: `<svg class="fig" viewBox="0 0 200 200" width="220" height="220" aria-hidden="true">${p.svg}</svg>`, ...numQ(ans, [ans + 1, ans - 1, total]), hint: `Only count the ${s}s. Point at each one.`, explain: `There ${ans === 1 ? 'is' : 'are'} ${ans} ${ans === 1 ? s : s + 's'}.` }; }
  if (k === 'make') { const can = Math.random() < 0.5; const yes = ['square', 'bigtri', 'para'], no = ['longrect', 'pentagon']; const ans = can ? pick(yes) : pick(no); const others = can ? no : sample(yes, 2);
    const vis = `<div class="cutpair"><svg class="fig" viewBox="0 0 100 100" width="110" height="110" aria-hidden="true"><rect x="12" y="12" width="76" height="76" ${FST}/><line x1="12" y1="12" x2="88" y2="88" class="cut"/></svg><span class="arr">➜</span><svg class="fig" viewBox="0 0 170 100" width="170" height="100" aria-hidden="true"><polygon points="10,12 10,88 86,88" ${FST}/><polygon points="84,12 160,12 160,88" ${FST}/></svg></div>`;
    return { text: `A square is cut into 2 triangles. Which shape can you ${can ? '' : 'NOT '}make using both triangles?`, vis, ...optQ(ans, others, v => `<svg class="mini" viewBox="0 0 120 90" width="104" height="78" aria-hidden="true">${MAKE[v]}</svg>`, v => MAKEN[v]), hint: 'Imagine sliding and flipping the two triangles.', explain: can ? `Put the triangles together to make ${MAKEN[ans]}.` : `These triangles cannot make ${MAKEN[ans]}.` }; }
  // from tier 4 there is always a pentagon too ("1 triangle and 1 square" at level 28 was easier than level 6)
  if (k === 'sides') { const a = ri(1, 3), b = ri(1, 3), c = t >= 4 ? ri(1, 2) : 0; const ans = 3 * a + 4 * b + 5 * c;
    return { text: `How many sides do ${a} ${a === 1 ? 'triangle' : 'triangles'}${c ? ',' : ' and'} ${b} ${b === 1 ? 'square' : 'squares'}${c ? ` and ${c} ${c === 1 ? 'pentagon' : 'pentagons'}` : ''} have altogether?`, vis: `<div class="shrow">${range(1, a).map(() => shp('triangle', 'yellow', 54)).join('')}${range(1, b).map(() => shp('square', 'blue', 54)).join('')}${range(1, c).map(() => shp('pentagon', 'green', 54)).join('')}</div>`, ...numQ(ans, [a + b + c, ans - 1, ans + 1]), hint: 'Triangle: 3 sides. Square: 4. Pentagon: 5.', explain: `${3 * a} + ${4 * b}${c ? ' + ' + 5 * c : ''} = ${ans}.` }; }
  if (k === 'solidFaces') { const q = pick(SOLQ.filter(x => x.d <= t)); return { text: `How many ${q.p} does a ${SNAME[q.s]} have?`, vis: solidH(q.s, 130), ...numQ(q.a, [q.a + 1, q.a + 2, Math.max(0, q.a - 2)], { min: 0 }), hint: 'Picture the shape in your hand. Turn it around and count, including the parts you cannot see.', explain: `A ${SNAME[q.s]} has ${q.a} ${q.a === 1 ? q.p.replace(/s$/, '') : q.p}.${q.a === 0 ? ' It is round all over.' : ''}` }; }
  if (k === 'mirror') {
    const n = t >= 7 ? 4 : 3; let p, fx, fy; let g = 0;
    do { p = range(0, n - 1).map(() => range(0, n - 1).map(() => Math.random() < 0.45 ? pick([1, 2]) : 0)); fx = p.map(r => r.slice().reverse()); fy = p.slice().reverse().map(r => r.slice()); } while ((JSON.stringify(p) === JSON.stringify(fx) || JSON.stringify(p) === JSON.stringify(fy) || JSON.stringify(fx) === JSON.stringify(fy)) && g++ < 100);
    const opts = { a: fx, b: p, c: fy };
    // read-aloud names the colors of one or two rows that tell the three pictures apart (it used to say "flipped left and right", which gave the answer away)
    const RN = n === 3 ? ['top row', 'middle row', 'bottom row'] : ['top row', 'second row', 'third row', 'bottom row'], diff = rs => new Set(['a', 'b', 'c'].map(v => rs.map(r => opts[v][r].join()).join('|'))).size === 3;
    const rs = range(0, n - 1).map(r => [r]).find(diff) || range(0, n - 1).flatMap(r => range(r + 1, n - 1).map(r2 => [r, r2])).find(diff) || range(0, n - 1);
    return { text: 'The picture is flipped in a mirror (the dotted line). What does the mirror picture look like?', vis: `<div class="cutpair">${mgrid(p, 30 * n, true)}<span class="pq">?</span></div>`, ...optQ('a', ['b', 'c'], v => mgrid(opts[v], 24 * n), v => rs.map(r => `${RN[r]}: ${opts[v][r].map(c => ['white', 'red', 'blue'][c]).join(', ')}`).join('; ')), hint: 'A mirror swaps left and right. The top stays at the top.', explain: 'In a side mirror, the left column goes to the right and the right column goes to the left. Top and bottom stay the same.' };
  }
  if (k === 'area') {
    const n = t <= 6 ? ri(6, 9) : ri(9, 13); const cells = polyo(n, 6, 5); const halves = [];
    // each half square is a triangle whose straight leg lies along the side it shares with the shape (o: 0 top+left, 1 top+right, 2 right+bottom, 3 left+bottom)
    if (t >= 8) { const set = new Set(cells.map(c => c.join(','))); const empt = [], legs = {}; cells.forEach(([x, y]) => [[1, 0, [0, 3]], [-1, 0, [1, 2]], [0, 1, [0, 1]], [0, -1, [2, 3]]].forEach(([dx, dy, os]) => { const nx = x + dx, ny = y + dy; const kk = nx + ',' + ny; if (nx >= 0 && nx < 6 && ny >= 0 && ny < 5 && !set.has(kk) && !empt.includes(kk)) { empt.push(kk); legs[kk] = os; } })); const hk = sample(empt, Math.min(empt.length - (empt.length % 2), 2)); hk.forEach(s => { const [x, y] = s.split(',').map(Number); halves.push([x, y, pick(legs[s])]); }); }
    const ans = n + halves.length / 2;
    return { text: halves.length ? 'Two half squares make one whole square. How many small squares does the blue shape cover?' : 'How many small squares make the blue shape?', vis: gridSVG(6, 5, cells, halves), ...numQ(ans, [ans + 1, ans - 1, n + halves.length]), hint: halves.length ? 'Count the whole squares, then put the half squares together in pairs.' : 'Count each blue square once. Go row by row.', explain: halves.length ? `${n} whole squares + ${halves.length} halves (= ${halves.length / 2} whole) = ${ans}.` : `Row by row we count ${ans} squares.` };
  }
  let cells; if (Math.random() < 0.5) { const w = ri(2, 5), h = ri(2, 4); cells = []; for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) cells.push([x, y]); } else cells = polyo(ri(5, 9), 6, 5);
  const ans = perim(cells);
  return { text: 'An ant walks all the way around the edge of the blue shape. Each side of a small square is 1 step. How many steps does the ant walk?', vis: gridSVG(6, 5, cells), ...numQ(ans, [cells.length, ans + 2, ans - 2]), hint: 'Count the outside edges only. Do not count the lines inside the shape.', explain: `Going all the way around the outside, we count ${ans} edges, so the ant walks ${ans} steps.` };
}

/* =====================================================================
   13. SPATIAL REASONING — Duck Pond
   ===================================================================== */
const LINE_AN = ['🐻', '🦁', '🐯', '🐼', '🐵', '🐰', '🐶', '🐱', '🦊', '🐨', '🐸', '🐷'];
function routeQ(t) {
  const N = t >= 7 ? 6 : t >= 3 ? 5 : 4; const kk = t === 1 ? 3 : t <= 3 ? 4 : t <= 6 ? 5 : 6; const multi = t >= 6;
  const DIRS = { R: [1, 0, 90, 'right'], L: [-1, 0, 270, 'left'], U: [0, -1, 0, 'up'], D: [0, 1, 180, 'down'] }; const rev = { R: 'L', L: 'R', U: 'D', D: 'U' };
  for (let tries = 0; tries < 500; tries++) {
    const sx = ri(0, N - 1), sy = ri(0, N - 1); const moves = []; let x = sx, y = sy;
    for (let i = 0; i < kk; i++) { const opts = Object.keys(DIRS).filter(m => x + DIRS[m][0] >= 0 && x + DIRS[m][0] < N && y + DIRS[m][1] >= 0 && y + DIRS[m][1] < N); const o2 = opts.filter(m => m !== rev[moves[moves.length - 1]]); const m = pick(o2.length ? o2 : opts); moves.push(m); x += DIRS[m][0]; y += DIRS[m][1]; }
    if (x === sx && y === sy) continue;
    let mx = sx, my = sy; moves.forEach(m => { const mm = { R: 'L', L: 'R', U: 'U', D: 'D' }[m]; mx = Math.min(N - 1, Math.max(0, mx + DIRS[mm][0])); my = Math.min(N - 1, Math.max(0, my + DIRS[mm][1])); });
    let s2x = sx, s2y = sy; moves.slice(0, -1).forEach(m => { s2x += DIRS[m][0]; s2y += DIRS[m][1]; });
    const used = new Map(); const key = (a, b) => a + ',' + b; used.set(key(sx, sy), '⭐');
    const an = sample(['🐸', '🐢', '🦆', '🐌', '🐞', '🐰', '🦋', '🐝', '🐟', '🍄'], 8);
    const place = (cx, cy, e) => { const k2 = key(cx, cy); if (used.has(k2)) return false; used.set(k2, e); return true; };
    place(x, y, an[0]); const opts = [an[0]]; let ai = 1;
    if (place(mx, my, an[ai])) opts.push(an[ai]); ai++; if (place(s2x, s2y, an[ai])) opts.push(an[ai]); ai++;
    let guard = 0; while (opts.length < 3 && guard++ < 200) { if (place(ri(0, N - 1), ri(0, N - 1), an[ai])) { opts.push(an[ai]); ai++; } }
    let ex = 0; guard = 0; while (ex < 3 && ai < an.length && guard++ < 200) { if (place(ri(0, N - 1), ri(0, N - 1), an[ai])) { ai++; ex++; } }
    if (opts.length < 3) continue;
    const groups = []; moves.forEach(m => { const g = groups[groups.length - 1]; if (multi && g && g.m === m) g.n++; else groups.push({ m, n: 1 }); });
    let g = ''; for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { const e = used.get(key(xx, yy)); g += `<span class="gc${e === '⭐' ? ' st' : ''}">${e ? em(e) : ''}</span>`; }
    const arws = groups.map(gp => `<span class="arwg">${arrow(DIRS[gp.m][2], 42)}${gp.n > 1 ? `<b>×${gp.n}</b>` : ''}</span>`).join('');
    const mg = groups.find(gp => gp.n > 1); // explain the ×n label that is actually drawn (some routes show only ×3 or no label at all)
    return { text: mg ? `Start at the star. Follow the arrows. “×${mg.n}” means move ${mg.n} squares that way. Where do you land?` : 'Start at the star. Follow the arrows, one square for each arrow. Where do you land?', vis: `<div class="route"><div class="gm" style="--n:${N}">${g}</div><div class="arws">${arws}</div></div>`, ...optQ(an[0], opts.slice(1), R_EM, S_EM), hint: 'Put your finger on the star and move square by square.', explain: `From the star: ${groups.map(gp => `${gp.n} ${gp.n === 1 ? 'step' : 'steps'} ${DIRS[gp.m][3]}`).join(', then ')}. You land on the ${nm(an[0], 1)}.` };
  }
  return null;
}
function g13(L) {
  const t = tierOf(L);
  const k = kind(t, [['lineBack', 1, 5], ['behind', 1, 4], ['leftright', 1, 2], ['shelf', 1, 4], ['between', 1, 5], ['route', 1, 10, 1.3], ['bothEnds', 3, 10, 1.3], ['turns', 4, 10, 1.3]]);
  if (k === 'lineBack' || k === 'behind' || k === 'between') {
    const n = ri(t === 1 ? 7 : 8, t === 1 ? 8 : 10); const an = sample(LINE_AN, n); const p = ri(2, n - 1); const tg = an[p - 1]; const back = n - p + 1;
    const vis = `<div class="ln" style="--n:${n}"><span class="lnl">Front</span><div class="lnr">${an.map(e => em(e)).join('')}</div><span class="lnl">Back</span></div>`;
    const near = (c, list) => [...new Set(list.filter(v => v >= 1 && v <= n && v !== c))].slice(0, 2).map(ord);
    if (k === 'lineBack') return { text: `The ${nm(tg, 1)} is ${ord(p)} from the front. What place is it from the back?`, vis, ...optQ(ord(back), near(back, [p, back + 1, back - 1, back + 2]), R_NUM), hint: 'Start counting at the Back sign.', explain: `There are ${n} animals. ${n} − ${p} + 1 = ${back}. The ${nm(tg, 1)} is ${ord(back)} from the back.` };
    if (k === 'behind') return { text: `How many animals are behind the ${nm(tg, 1)}?`, vis, ...numQ(n - p, [p - 1, back, n - p + 1 === back ? n - p - 1 : back]), hint: 'Behind means between this animal and the Back sign.', explain: `${n} animals, the ${nm(tg, 1)} is ${ord(p)}. Behind it: ${n} − ${p} = ${n - p}.` };
    let i = ri(0, n - 4), j = ri(i + 2, n - 1); const ans = j - i - 1;
    return { text: `How many animals are between the ${nm(an[i], 1)} and the ${nm(an[j], 1)}?`, vis, ...numQ(ans, [ans + 1, ans + 2, j - i]), hint: 'Do not count the two animals themselves.', explain: `Between them: ${an.slice(i + 1, j).map(e => nm(e, 1)).join(', ')}. That is ${ans}.` };
  }
  if (k === 'leftright') { const an = sample(LINE_AN, 5); const left = Math.random() < 0.5; const i = left ? ri(1, 4) : ri(0, 3); const tg = an[i]; const ans = an[left ? i - 1 : i + 1]; const wrong = an[left ? (i + 1 <= 4 ? i + 1 : i - 2) : (i - 1 >= 0 ? i - 1 : i + 2)];
    return { text: `Which animal is just to the ${left ? 'LEFT' : 'RIGHT'} of the ${nm(tg, 1)}, as you look at the picture?`, vis: `<div class="lr" style="--n:5"><div class="lnr">${an.map(e => em(e)).join('')}</div><div class="lrl"><span>⬅ left</span><span>right ➡</span></div></div>`, ...optQ(ans, [wrong, pick(an.filter(e => e !== ans && e !== tg && e !== wrong))], R_EM, S_EM), hint: `Find the ${nm(tg, 1)}, then look one step ${left ? 'left' : 'right'}.`, explain: `The ${nm(ans, 1)} is next to the ${nm(tg, 1)} on the ${left ? 'left' : 'right'}.` }; }
  if (k === 'shelf') { const it = sample(['🍎', '🍌', '🍇', '🍓', '🍐', '🍊', '🍉', '🥕', '🥦', '🌽', '🍍', '🍋'], 9); const dirs = { above: [-1, 0], below: [1, 0], left: [0, -1], right: [0, 1] };
    let dn, r, c; do { dn = pick(Object.keys(dirs)); r = ri(0, 2); c = ri(0, 2); } while (r + dirs[dn][0] < 0 || r + dirs[dn][0] > 2 || c + dirs[dn][1] < 0 || c + dirs[dn][1] > 2);
    const two = t >= 2 && Math.random() < 0.6; let dn2 = null, rr = r + dirs[dn][0], cc = c + dirs[dn][1];
    if (two) { const ok = Object.keys(dirs).filter(d => d !== { above: 'below', below: 'above', left: 'right', right: 'left' }[dn] && rr + dirs[d][0] >= 0 && rr + dirs[d][0] <= 2 && cc + dirs[d][1] >= 0 && cc + dirs[d][1] <= 2); if (ok.length) { dn2 = pick(ok); rr += dirs[dn2][0]; cc += dirs[dn2][1]; } }
    const ans = it[rr * 3 + cc]; const tg = it[r * 3 + c]; const ds = sample(it.filter(e => e !== ans && e !== tg), 2);
    const w = { above: 'up', below: 'down', left: 'left', right: 'right' };
    return { text: dn2 ? `Start at the ${nm(tg, 1)}. Move 1 space ${w[dn]}, then 1 space ${w[dn2]}. What do you find?` : `What is just ${dn === 'above' ? 'ABOVE' : dn === 'below' ? 'BELOW' : 'to the ' + dn.toUpperCase() + ' of'} the ${nm(tg, 1)}?`, vis: `<div class="shelf3">${it.map(e => `<span class="sc3">${em(e)}</span>`).join('')}</div>`, ...optQ(ans, ds, R_EM, S_EM), hint: `Put your finger on the ${nm(tg, 1)} and move.`, explain: `From the ${nm(tg, 1)}${dn2 ? `, ${w[dn]} then ${w[dn2]}` : ` ${w[dn]}`}: the ${nm(ans, 1)}.` }; }
  if (k === 'route') return routeQ(t) || g13(1);
  if (k === 'bothEnds') { const P = people(1)[0]; const lo = t >= 7 ? 7 : 4; /* longer lines at the top tiers (a 5th + 6th line at level 46 was easier than level 11) */ const f = ri(lo, 12 + t), b = ri(lo, 12 + t); const ans = f + b - 1; const ask = Math.random() < 0.6;
    const lv = `<div class="ln" style="--n:9"><span class="lnl">Front</span><div class="lnr">${em('🧒').repeat(3)}${f > 4 ? '<b class="dots">…</b>' : ''}${em(P.face)}${b > 4 ? '<b class="dots">…</b>' : ''}${em('🧒').repeat(3)}</div><span class="lnl">Back</span></div>`; // show the dots only when more than 3 children stand on that side
    if (ask) return { text: `Children stand in a line. ${P.n} is ${ord(f)} from the front and ${ord(b)} from the back. How many children are in the line?`, vis: lv, ...numQ(ans, [f + b, f + b + 1, ans - 1]), hint: `${P.n} is counted from the front AND from the back. Do not count ${P.him} twice.`, explain: `${f} + ${b} = ${f + b}, but ${P.n} was counted twice. ${f + b} − 1 = ${ans}.` };
    return { text: `There are ${ans} children in a line. ${P.n} is ${ord(f)} from the front. What place is ${P.he} from the back?`, vis: lv, ...optQ(ord(b), [ord(b + 1), ord(b - 1 >= 1 ? b - 1 : b + 2)], R_NUM), hint: 'Take away the children in front, then count from the back.', explain: `${ans} − ${f} + 1 = ${b}. ${P.n} is ${ord(b)} from the back.` }; }
  const nT = t >= 8 ? ri(3, 4) : 2; const opts = ['right', 'left', 'around']; const turns = range(1, nT).map(() => t >= 7 ? pick(opts) : pick(['right', 'left'])); const a0 = 90 * ri(0, 3);
  let a = a0; const steps = []; turns.forEach(tu => { a = (a + (tu === 'right' ? 90 : tu === 'left' ? 270 : 180)) % 360; steps.push(`Turn ${tu}: now facing ${DIRN[a]}.`); });
  const ds = shuffle([0, 90, 180, 270].filter(x => x !== a)).slice(0, 2);
  return { text: `The farmer is facing ${DIRN[a0]} (look at the arrow). The farmer turns ${turns.map((x, i) => x !== 'around' ? x : turns.indexOf('around') < i ? 'around again' : 'around to face the other way').join(', then ')}. Which way is the farmer facing now?`, vis: `<div class="scene">${em('🧑‍🌾', 'big')}${arrow(a0, 80)}</div>`, ...optQ(String(a), ds.map(String), v => arrow(+v, 66), v => 'facing ' + DIRN[v]), hint: 'Stand up and try it! Right turns go the way clock hands move.', explain: `Start facing ${DIRN[a0]}. ` + steps.join(' ') };
}

/* =====================================================================
   14. MEASUREMENT — Sunflower Field
   ===================================================================== */
function g14(L) {
  const t = tierOf(L);
  // slimmer weights so two fit side by side in one pan (a .wt is 62px wide and a .pan only 124px, so they stacked in one tall column over the question text)
  const wtc = g => `<span class="wt" style="min-width:34px">${g} g</span>`;
  // full-width row for several scales (a shrink-to-fit .twobal collapses its .bal children to zero width)
  const two = h => `<div class="twobal" style="width:100%;gap:26px 132px">${h}</div>`; // wide column gap: the pans stick out 62px past each scale
  const k = kind(t, [['tallDiff', 1, 3], ['compareLen', 1, 4], ['balance', 1, 5], ['seesaw', 1, 6], ['glass', 1, 2], ['balance2', 2, 8], ['swap', 2, 10], ['rulerOffset', 3, 10, 1.4], ['unitConvert', 5, 10, 1.3], ['order4', 6, 10], ['balanceMulti', 6, 10, 1.3]]);
  if (k === 'tallDiff') { const h = sample(range(2, 9), 3); const L2 = ['A', 'B', 'C']; const [i, j] = sample([0, 1, 2], 2); const [a, b] = h[i] > h[j] ? [i, j] : [j, i]; const ans = h[a] - h[b];
    return { text: `How many blocks taller is sunflower ${L2[a]} than sunflower ${L2[b]}?`, vis: `<div class="flowers">${h.map((v, q) => `<div class="fcol"><span class="em">🌻</span><div class="stk2">${'<i></i>'.repeat(v)}</div><b>${L2[q]}</b></div>`).join('')}</div>`, ...numQ(ans, [h[a], h[a] + h[b], ans + 1], { min: 1 }), hint: 'Count each stack, then take away.', explain: `${L2[a]}: ${h[a]}. ${L2[b]}: ${h[b]}. ${h[a]} − ${h[b]} = ${ans}.` }; }
  if (k === 'compareLen') { const N = 12; const a = ri(5, N), b = ri(2, a - 2); const ans = a - b;
    return { text: 'How many blocks longer is the red ribbon than the blue ribbon?', vis: `<div class="ruler" style="--n:${N}"><div class="rib red" style="--l:${a};box-sizing:border-box"></div><div class="rib blue" style="--l:${b};box-sizing:border-box"></div><div class="units">${'<i></i>'.repeat(N)}</div></div>`, ...numQ(ans, [a, a + b, ans + 1], { min: 1 }), hint: 'Count each ribbon, then take away.', explain: `Red ${a}, blue ${b}. ${a} − ${b} = ${ans}.` }; }
  if (k === 'balance') { const n = t === 1 ? 3 : 4; const ws = range(1, n).map(() => ri(1, t === 1 ? 6 : 9)); /* level 1-5 totals stay within 20 */ const ans = sumA(ws); const it = pick(['🍓', '🍪', '🍭', '🐌']);
    return { text: `The scale is balanced. How heavy is the ${nm(it, 1)}?`, vis: bal(em(it, 'big'), ws.map(wtc).join(''), 0), ...numQ(ans, [ans + 1, ans - 1, ans - ws[0]], { post: ' g' }), hint: 'Balanced means both sides weigh the same. Add up the weights.', explain: `${ws.join(' g + ')} g = ${ans} g.` }; }
  if (k === 'balance2') { const ws = [ri(3 + t, 8 + t), ri(1 + t, 6 + t)]; const a = ri(2, Math.min(4 + t, sumA(ws) - 2)); const ans = sumA(ws) - a; // grows with the tier: within 20 at tier 2, up to 30 at tier 8
    return { text: 'The scale is balanced. How heavy is the box marked X?', vis: bal(`<span class="mb">X</span>${wtc(a)}`, ws.map(wtc).join(''), 0), ...numQ(ans, [sumA(ws), sumA(ws) + a, ans + 1], { post: ' g', min: 1 }), hint: 'X and the small weight together equal the right side.', explain: `Right: ${ws[0]} + ${ws[1]} = ${sumA(ws)} g. X = ${sumA(ws)} − ${a} = ${ans} g.` }; }
  if (k === 'glass') { const lv = sample([18, 30, 42, 54, 66, 76], 3); /* 76% max keeps the water below the A/B/C label */ const most = Math.random() < 0.5; const idx = lv.indexOf(most ? Math.max(...lv) : Math.min(...lv)); const L2 = ['A', 'B', 'C'];
    return { text: `All the glasses are the same size. Which glass has the ${most ? 'most' : 'least'} water?`, vis: `<div class="glasses">${lv.map((v, i) => `<div class="gl"><div class="wtr" style="height:${v}%"></div><b>${L2[i]}</b></div>`).join('')}</div>`, ...((o) => { o.opts.sort((x, y) => x.val < y.val ? -1 : 1); return o; })(optQ(L2[idx], L2.filter(x => x !== L2[idx]), R_NUM, v => 'glass ' + v)), hint: 'Same size glasses: look at how high the water is.', explain: `Glass ${L2[idx]} has the ${most ? 'highest' : 'lowest'} water.` }; }
  if (k === 'seesaw' || k === 'order4') {
    const n = k === 'order4' ? 4 : 3; const cs = sample(['red', 'blue', 'green', 'yellow'], n); const sc = [];
    for (let i = 0; i < n - 1; i++) sc.push(Math.random() < 0.5 ? bal(bag(cs[i]), bag(cs[i + 1]), 'L') : bal(bag(cs[i + 1]), bag(cs[i]), 'R'));
    const q = pick(n === 4 ? ['heaviest', 'lightest', 'second', ...(t >= 9 ? ['secondL'] : [])] : ['heaviest', 'lightest']); const ans = q === 'heaviest' ? cs[0] : q === 'lightest' ? cs[n - 1] : q === 'secondL' ? cs[n - 2] : cs[1]; // 'second lightest' from tier 9 gives the top levels new order questions
    return { text: `Look at the scales. Which bag is the ${q === 'second' ? 'second heaviest' : q === 'secondL' ? 'second lightest' : q}?`, vis: two(shuffle(sc).join('')), ...optQ(ans, sample(cs.filter(c => c !== ans), 2), v => `<span class="bag sm" style="--bc:${COL[v]}">${v}</span>`, v => v + ' bag'), hint: 'The heavier side goes DOWN. Put the bags in order one scale at a time.', explain: `Heaviest to lightest: ${cs.join(', ')}.` };
  }
  // 🍈 is a whole melon (🍉 shows only a slice); 🍓 is one berry (🍒 shows two cherries)
  if (k === 'swap') { if (t >= 7) { const p = ri(2, 3), q = ri(2, 3), r = ri(2, 3); const ans = p * q * r;
      return { text: `1 melon weighs the same as ${p} pineapples. 1 pineapple weighs the same as ${q} apples. 1 apple weighs the same as ${r} strawberries. How many strawberries weigh the same as 1 melon?`, vis: two(bal(em('🍈', 'big'), em('🍍').repeat(p), 0) + bal(em('🍍', 'big'), em('🍎').repeat(q), 0) + bal(em('🍎', 'big'), em('🍓').repeat(r), 0)), ...numQ(ans, [p + q + r, p * q, ans + r]), hint: 'Swap step by step: melon, then pineapples, then apples, then strawberries.', explain: `1 melon weighs the same as ${p} pineapples. They weigh the same as ${p} × ${q} = ${p * q} apples. Those weigh the same as ${p * q} × ${r} = ${ans} strawberries.` }; }
    const p = ri(2, 4), q = ri(2, 4); const ans = p * q;
    return { text: `1 melon weighs the same as ${p} apples. 1 apple weighs the same as ${q} strawberries. How many strawberries weigh the same as 1 melon?`, vis: two(bal(em('🍈', 'big'), em('🍎').repeat(p), 0) + bal(em('🍎', 'big'), em('🍓').repeat(q), 0)), ...numQ(ans, [p + q, ans + 1, q]), hint: 'Swap each apple for strawberries.', explain: `${p} apples, each worth ${q} strawberries: ${range(1, p).map(() => q).join(' + ')} = ${ans}.` }; }
  if (k === 'rulerOffset') { const len = t >= 9 ? 15 : 12; const s = ri(t >= 9 ? 2 : 1, t >= 9 ? 7 : 5), e = ri(s + (t >= 9 ? 6 : t >= 6 ? 5 : 3), len); /* a longer ruler from tier 9, so its pictures never repeat an earlier level's ruler */ const ans = e - s; // longer ribbons from tier 6 (a 1-to-4 ribbon at level 41 was easier than level 14)
    const who = t >= 9 ? PEOPLE[(s + e) % PEOPLE.length][0] : ''; // from tier 9 a child lays the ribbon down; the name follows the ribbon's ends, so two rulers with the same length get different words (the bank no-repeat rule had used up every ruler answer by level 41, leaving levels 42-50 all cookie balances)
    return { text: who ? `${who} puts a ribbon next to a ruler. How long is the ribbon? Look carefully at where it starts!` : 'How long is the ribbon? Look carefully at where it starts!', vis: rulerSVG(len, s, e), ...numQ(ans, [e, ans + 1, ans - 1], { post: ' cm' }), hint: 'The ribbon does not start at 0. Take away the start number from the end number.', explain: `The ribbon goes from ${s} to ${e}. ${e} − ${s} = ${ans} cm.` }; }
  if (k === 'unitConvert') { if (t >= 9) { const p = ri(2, 4), q = ri(2, 3), r = ri(2, 3); const pc = p * q, ans = pc * r; // three steps at the top tiers, like the melon swap (the bank no-repeat rule had used up the two-step versions by level 41)
      return { text: `A crayon is as long as ${p} paper clips. A pencil is as long as ${q} crayons. A ruler is as long as ${r} pencils. How many paper clips long is the ruler?`, vis: `<div class="scene">${em('📎', 'big')}${em('🖍️', 'big')}${em('✏️', 'big')}${em('📏', 'big')}</div>`, ...numQ(ans, [p + q + r, pc, ans + pc]), hint: 'Swap step by step: pencils into crayons, then crayons into paper clips.', explain: `1 pencil is as long as ${q} crayons, that is ${q} × ${p} = ${pc} paper clips. The ruler is ${r} pencils long: ${r} × ${pc} = ${ans} paper clips.` }; }
    const a = t >= 8 ? ri(3, 6) : ri(2, 5), b = t >= 8 ? ri(3, 5) : ri(2, 4); const ans = a * b; // bigger from tier 8 (2 × 4 clips at level 43 was as easy as level 22)
    return { text: `A pencil is as long as ${a} paper clips. A ruler is as long as ${b} pencils. How many paper clips long is the ruler?`, vis: `<div class="scene">${em('📎', 'big')}${em('✏️', 'big')}${em('📏', 'big')}</div>`, ...numQ(ans, [a + b, ans + a, ans - 1]), hint: 'Each pencil is the same as some paper clips. Swap every pencil.', explain: `Each pencil is as long as ${a} paper clips. The ruler is ${b} pencils long: ${range(1, b).map(() => a).join(' + ')} = ${ans} paper clips.` }; }
  // small things so the weights are realistic (a small cookie weighs a few grams, a strawberry about 6 to 15 g); not 🍒, whose picture shows two cherries
  const ap = ri(4, 9), na = ri(2, 3), pe = ri(6, 15); const tot = na * ap + pe;
  return { text: `${na} cookies and 1 strawberry weigh ${tot} g together. Each cookie weighs ${ap} g. How heavy is the strawberry?`, vis: bal(em('🍪').repeat(na) + em('🍓'), wtc(tot), 0), ...numQ(pe, [tot - ap, tot, pe + ap], { post: ' g' }), hint: 'First find how much all the cookies weigh.', explain: `Cookies: ${na} × ${ap} = ${na * ap} g. Strawberry: ${tot} − ${na * ap} = ${pe} g.` };
}

/* =====================================================================
   15. TIME AND SEQUENCE — Windmill Clock
   ===================================================================== */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SEQS = [{ s: ['🥚', '🐣', '🐥', '🐔'], t: 'a chick growing up' }, { s: ['🌱', '🌿', '🌻'], t: 'a sunflower growing' }, { s: ['🌅', '🌞', '🌇', '🌙'], t: 'one day' }, { s: ['🧱', '🏗️', '🏠'], t: 'building a house' }];
const h12 = h => ((h - 1) % 12 + 12) % 12 + 1;
const tstr = (h, m) => m === 0 ? `${h} o'clock` : m === 30 ? `half past ${h}` : m === 15 ? `quarter past ${h}` : m === 45 ? `quarter to ${h12(h + 1)}` : `${h}:${String(m).padStart(2, '0')}`;
function g15(L) {
  const t = tierOf(L);
  const k = kind(t, [['clock', 1, 2], ['half', 1, 4], ['days', 1, 3], ['order', 1, 2], ['elapsed', 1, 10], ['daysAfter', 2, 6], ['months', 2, 6], ['quarter', 4, 10, 1.3], ['weeks', 4, 8], ['calendar', 5, 10, 1.3], ['fiveMin', 7, 10, 1.3], ['duration', 6, 10]]);
  if (k === 'clock' || k === 'half' || k === 'quarter' || k === 'fiveMin') {
    const h = ri(1, 12); const m = k === 'clock' ? 0 : k === 'half' ? 30 : k === 'quarter' ? pick([15, 45]) : 5 * pick([1, 2, 4, 5, 7, 8, 10, 11]); // fiveMin never lands on :15, :30 or :45 (those are the easier half/quarter kinds)
    let ds;
    if (m === 0) ds = [`12 o'clock`, `${h12(h + 1)} o'clock`, `${h12(h - 1)} o'clock`];
    else if (m === 30) ds = [`half past ${h12(h + 1)}`, h === 6 ? `${h12(h + 1)} o'clock` : `6 o'clock`];
    else if (m === 15) ds = [`quarter to ${h}`, `${h}:03`];
    else if (m === 45) ds = [`quarter past ${h12(h + 1)}`, `quarter to ${h}`];
    else ds = [`${h}:${String(m / 5).padStart(2, '0')}`, `${h12(h + 1)}:${String(m).padStart(2, '0')}`];
    return { text: 'What time does the clock show?', vis: clock(h, m), ...optQ(tstr(h, m), [...new Set(ds)].filter(x => x !== tstr(h, m)).slice(0, 2), R_TXT), hint: m === 0 ? 'The long hand on 12 means o’clock. The short red hand shows the hour.' : 'The long hand shows the minutes: each number is 5 minutes. The short red hand shows the hour it has just passed.', explain: m === 0 ? `Long hand on 12, short hand on ${h}: ${h} o’clock.` : m === 30 ? `Long hand on 6 is half past. The short hand is halfway between ${h} and ${h12(h + 1)}: half past ${h}.` : m === 15 ? `Long hand on 3 is 15 minutes. The short hand is just past ${h}: quarter past ${h}.` : m === 45 ? `Long hand on 9 is 45 minutes. The short hand is almost at ${h12(h + 1)}, but not there yet. 15 more minutes until ${h12(h + 1)}: quarter to ${h12(h + 1)}.` : `The long hand is on ${m / 5}, so ${m / 5} × 5 = ${m} minutes. The short hand is ${m < 15 ? `just past ${h}` : `between ${h} and ${h12(h + 1)}, so the hour is still ${h}`}: ${tstr(h, m)}.` };
  }
  if (k === 'days' || k === 'daysAfter') { const td = ri(0, 6); let q, off; if (k === 'days') { q = pick(['the day after tomorrow', 'the day before yesterday', 'tomorrow', 'yesterday']); off = { tomorrow: 1, yesterday: -1, 'the day after tomorrow': 2, 'the day before yesterday': -2 }[q]; } else { off = ri(3, 10); q = `${off} days from today`; }
    const ans = DAYS[((td + off) % 7 + 7) % 7]; const ds = [...new Set([DAYS[((td - off) % 7 + 7) % 7], DAYS[((td + off + 1) % 7 + 7) % 7], DAYS[((td + off - 1) % 7 + 7) % 7]])].filter(x => x !== ans).slice(0, 2);
    return { text: k === 'days' ? `Today is ${DAYS[td]}. What day ${off > 0 ? 'is' : 'was'} ${q}?` : `Today is ${DAYS[td]}. What day will it be ${off} days from today?`, vis: `<div class="days">${DAYS.map((x, i) => `<span class="dy${i === td ? ' td' : ''}">${x.slice(0, 3)}</span>`).join('')}</div>`, ...optQ(ans, ds), hint: off >= 7 ? '7 days later is the same day of the week again.' : 'Move along the days strip.', explain: off >= 7 ? `${off} days = 7 days${off > 7 ? ` + ${off - 7} more` : ''}. 7 days later is ${DAYS[td]} again${off > 7 ? `, then ${off - 7} more: ${ans}` : ''}.` : `Move ${Math.abs(off)} ${Math.abs(off) === 1 ? 'day' : 'days'} ${off > 0 ? 'forward' : 'back'} from ${DAYS[td]}: ${ans}.` }; }
  if (k === 'order') { const S = pick(SEQS); const i = ri(0, S.s.length - 2); const ans = S.s[i + 1];
    // the sunrise and sunset glyphs look alike, so never offer sunrise when the answer is sunset
    return { text: `The pictures show ${S.t}, but they are mixed up. What comes right after the ${nm(S.s[i], 1)}?`, vis: `<div class="pt">${shuffle(S.s).map(e => em(e)).join('')}</div>`, ...optQ(ans, sample(S.s.filter(e => e !== ans && !(ans === '🌇' && e === '🌅')), 2), R_EM, S_EM), hint: 'What happens first, next and last?', explain: `Order: ${S.s.map(e => nm(e, 1)).join(', then ')}.` }; }
  if (k === 'elapsed') { // grows with the tier: whole hours, then half hours (always from tier 7), then quarter-hour starts from tier 8
    const half = t >= 7 || (t >= 4 && Math.random() < 0.5); const h = ri(1, 10); const m0 = t >= 8 ? pick([0, 15, 30, 45]) : half ? pick([0, 30]) : 0; const dh = ri(1, t >= 6 ? 4 : 3), dm = half ? 30 : 0;
    const at = x => tstr(h12(Math.floor(x / 60)), x % 60); const st = h * 60 + m0, T = st + dh * 60 + dm; const ans = at(T); const hh = `${dh} ${dh === 1 ? 'hour' : 'hours'}`;
    const dur = dm ? `${dh} and a half hours` : hh; const ds = [...new Set([T + 60, dm ? T - 30 : T + 30, T - 60].map(x => at((x + 720) % 720)))].filter(x => x !== ans); // one hour too many, the half hour forgotten (or added), one hour too few
    return { text: `The farm show starts at ${tstr(h, m0)}. It lasts ${dur}. What time does it end?`, vis: clock(h, m0, 150), ...optQ(ans, ds.slice(0, 2), R_TXT), hint: 'Move the hour hand on one hour at a time. A half hour moves the long hand halfway round.', explain: `It starts at ${tstr(h, m0)}. ${hh} later it is ${at(st + dh * 60)}.${dm ? ` 30 more minutes: ${ans}.` : ''}` }; }
  if (k === 'months') { const m = ri(0, 11); const n = t >= 4 ? ri(2, 5) : 1; const after = Math.random() < 0.5; const ans = MONTHS[((m + (after ? n : -n)) % 12 + 12) % 12];
    return { text: n === 1 ? `Which month comes just ${after ? 'after' : 'before'} ${MONTHS[m]}?` : `Which month is ${n} months ${after ? 'after' : 'before'} ${MONTHS[m]}?`, vis: '', ...optQ(ans, [MONTHS[((m + (after ? n + 1 : -n + 1)) % 12 + 12) % 12], MONTHS[((m + (after ? -n : n)) % 12 + 12) % 12]]), hint: 'Say the months in order: January, February, March…', explain: `Counting ${n} ${n === 1 ? 'month' : 'months'} ${after ? 'forward' : 'back'} from ${MONTHS[m]}: ${ans}.` }; }
  if (k === 'weeks') { const w = ri(2, 4), d = ri(1, 6); const ans = 7 * w + d;
    return { text: `How many days are there in ${w} weeks and ${d} ${d === 1 ? 'day' : 'days'}?`, vis: `<div class="days">${DAYS.map(x => `<span class="dy">${x.slice(0, 3)}</span>`).join('')}</div><div class="cap">1 week = 7 days</div>`, ...numQ(ans, [w + d, 7 * w, ans + 1]), hint: 'One week has 7 days.', explain: `${w} weeks = ${range(1, w).map(() => 7).join(' + ')} = ${7 * w} days. ${7 * w} + ${d} = ${ans}.` }; }
  if (k === 'calendar') { const mo = pick(MONTHS), d1 = ri(1, 10), wd = ri(0, 6), add = ri(5, Math.min(20, (mo === 'February' ? 28 : 30) - d1)); const d2 = d1 + add; const ans = DAYS[(wd + add) % 7];
    const wk = Math.floor(add / 7), r = add % 7, dd = n => `${n} ${n === 1 ? 'day' : 'days'}`;
    // a mini calendar card drawn in HTML (the 📅 emoji shows its own fixed date, e.g. "JULY 17", which can contradict the text)
    return { text: `${mo} ${d1} is a ${DAYS[wd]}. What day of the week is ${mo} ${d2}?`, vis: `<table class="dt"><thead><tr><th colspan="2">${mo}</th></tr></thead><tbody><tr><th>${d1}</th><td>${DAYS[wd]}</td></tr><tr><th>${d2}</th><td>?</td></tr></tbody></table>`, ...optQ(ans, [...new Set([DAYS[(wd + add + 1) % 7], DAYS[(wd + add + 6) % 7], DAYS[wd]])].filter(x => x !== ans).slice(0, 2)), hint: 'Every 7 days it is the same day of the week again.', explain: `${d2} − ${d1} = ${add} days. ` + (wk ? `${add} days = ${wk} ${wk === 1 ? 'week' : 'weeks'}${r ? ` and ${dd(r)}` : ''}. ${wk === 1 ? '1 week' : wk + ' weeks'} later it is ${DAYS[wd]} again${r ? `, then ${dd(r)} more: ${ans}` : ''}.` : `Count ${add} days on from ${DAYS[wd]}: ${ans}.`) }; }
  const h = ri(7, 10), m0 = t >= 8 && Math.random() < 0.5 ? 30 : 0, dh = ri(1, 3), half = Math.random() < 0.6; const en = h * 60 + m0 + dh * 60 + (half ? 30 : 0), eh = h12(Math.floor(en / 60)), em2 = en % 60; const ans = half ? `${dh} and a half hours` : `${dh} ${dh === 1 ? 'hour' : 'hours'}`; // from tier 8 the class may start at half past
  const hrs = n => n === 1 ? '1 hour' : n + ' hours'; const ds = half ? [`${dh + 1} and a half hours`, hrs(dh)] : [hrs(dh + 1), `${dh} and a half hours`];
  return { text: `School art class starts at ${tstr(h, m0)} and ends at ${tstr(eh, em2)}. How long is the class?`, vis: `<div class="scene">${clock(h, m0, 120)}<span class="arr">➜</span>${clock(eh, em2, 120)}</div>`, ...optQ(ans, ds, R_TXT), hint: 'Count the hours from start to end, then any half hour.', explain: `From ${tstr(h, m0)} to ${tstr(h12(h + dh), m0)} is ${hrs(dh)}${half ? `. Then 30 more minutes: ${ans}` : ''}.` };
}

/* =====================================================================
   16. MONEY — Farm Market
   ===================================================================== */
const SHOPIT = ['🧸', '🎈', '🍦', '🍪', '🧃', '🍭', '🚗', '⚽'];
function moneySet(t) { return t <= 2 ? [1, 2, 5, 10] : t <= 5 ? [1, 2, 5, 10, 20] : [1, 2, 5, 10, 20, 50]; }
function g16(L) {
  const t = tierOf(L), set = moneySet(t), M = NMAX(t);
  // the item drawn must suit its price (no $83 juice box): snacks stay cheap, big prices go on toys, books and clothes
  const pool = p => p <= 10 ? SHOPIT : p <= 30 ? ['🧸', '🚗', '⚽', '📘', '🏀', '🧢'] : ['🧸', '🚗', '🚲', '🏀', '🧥', '👗'];
  const itemsFor = ps => { const used = []; return ps.map(p => { const e = pick(pool(p).filter(x => !used.includes(x))); used.push(e); return e; }); };
  // repeated addition instead of ×, which Grade 1 children have not met yet
  const rep = (n, p) => n === 1 ? `$${p}` : `${Array(n).fill('$' + p).join(' + ')} = $${n * p}`;
  const k = kind(t, [['pay', 1, 10], ['total', 1, 3], ['group', 1, 5], ['change', 1, 10], ['afford', 1, 4], ['qtyTotal', 3, 10, 1.3], ['fewest', 4, 10, 1.3], ['compareBuy', 5, 10], ['ways', 6, 10, 1.3]]);
  if (k === 'pay') { let T; do { T = t <= 2 ? ri(8, 20) : t <= 5 ? ri(15, Math.min(45, M)) : ri(30, Math.min(99, M)); } while (set.includes(T)); const it = itemsFor([T])[0];
    return { type: 'coins', target: T, coins: set, text: `The ${nm(it, 1)} costs $${T}. Tap the coins and notes to pay exactly $${T}.`, vis: `<div class="shelf">${tag(it, T)}</div>`, hint: 'Start with the biggest note that is not too much. Then add smaller ones.', explain: `One way: ${greedy(T, set).map(v => '$' + v).join(' + ')} = $${T}.` }; }
  if (k === 'total') { let pr, ans; do { pr = [0, 1, 2].map(() => ri(2, t >= 3 ? 12 : 9)); ans = sumA(pr); } while (ans > M || ans < [6, 12, 18][t - 1]); const its = itemsFor(pr); const ten = pr[0] + pr[1] === 10 || pr[0] + pr[2] === 10 || pr[1] + pr[2] === 10;
    return { text: `How much do the ${listAnd(its.map(e => nm(e, 1)))} cost altogether?`, vis: `<div class="shelf">${its.map((e, i) => tag(e, pr[i])).join('')}</div>`, ...numQ(ans, [ans + 1, ans - 1, ans - pr[2]], { pre: '$' }), hint: ten ? 'Add the prices. Two of them make 10, so add those first.' : 'Add the prices one at a time. Start with the biggest one.', explain: `${pr.map(p => '$' + p).join(' + ')} = $${ans}.` }; }
  if (k === 'group') { const T = ri(t <= 2 ? 8 : 6 + 3 * t, t <= 2 ? 20 : Math.min(40, M)); let good; let g = 0; do { good = []; let r = T; while (r > 0) { const c = pick(set.filter(v => v <= r)); good.push(c); r -= c; } } while ((good.length > 5 || good.length < 2) && g++ < 200);
    const mk = dl => { const gg = good.slice(); const i = ri(0, gg.length - 1); const sw = { 1: 2, 2: dl > 0 ? 5 : 1, 5: dl > 0 ? 10 : 2, 10: dl > 0 ? 20 : 5, 20: 10, 50: 20 }; gg[i] = sw[gg[i]]; if (!set.includes(gg[i])) gg[i] = 2; return gg; };
    const groups = [good]; g = 0; while (groups.length < 3 && g++ < 60) { const gg = mk(pick([1, -1])); const s = sumA(gg); if (s !== T && !groups.some(x => sumA(x) === s)) groups.push(gg); } while (groups.length < 3) groups.push(good.concat([1, 1].slice(0, groups.length)));
    return { text: `Which group of money makes exactly $${T}?`, vis: '', ...optQ('0', ['1', '2'], v => `<span class="cgrp">${groups[+v].slice().sort((a, b) => b - a).map(coin).join('')}</span>`, v => groups[+v].slice().sort((a, b) => b - a).map(x => x === 1 ? '1 dollar' : x + ' dollars').join(', ')), hint: 'Add up each group, biggest first.', explain: `${good.slice().sort((a, b) => b - a).map(v => '$' + v).join(' + ')} = $${T}.`, groups }; }
  if (k === 'change') { const H = t <= 2 ? pick([10, 20]) : t <= 5 ? pick([20, 50]) : pick([50, 100]); const p = ri(Math.max(2, Math.floor(H / 4)), H - 1); const it = itemsFor([p])[0]; const ans = H - p;
    return { text: `You pay with $${H}. The ${nm(it, 1)} costs $${p}. How much change do you get?`, vis: `<div class="shelf">${coin(H)}<span class="arr">➜</span>${tag(it, p)}</div>`, ...numQ(ans, [H + p > 200 ? ans + 10 : H + p, ans + 1, ans - 10 > 0 ? ans - 10 : ans + 10], { pre: '$', max: 300 }), hint: `Count up from $${p} to $${H}.`, explain: `$${H} − $${p} = $${ans}. Check: $${p} + $${ans} = $${H}.` }; }
  if (k === 'afford') { const H = ri(8, t <= 2 ? 16 : 20); const notBuy = Math.random() < 0.5; const hi = () => ri(H + 1, Math.min(H + 8, M)); const pr = notBuy ? [hi(), ri(2, H), ri(2, H)] : [ri(2, H), hi(), hi()]; const its = itemsFor(pr);
    return { text: `You have $${H}. Which one can you ${notBuy ? 'NOT ' : ''}buy?`, vis: `<div class="shelf">${shuffle([0, 1, 2]).map(i => tag(its[i], pr[i])).join('')}</div>`, ...optQ(its[0], its.slice(1), R_EM, S_EM), hint: notBuy ? `Find the price more than $${H}.` : `Find the price that is $${H} or less.`, explain: `The ${nm(its[0], 1)} costs $${pr[0]}. ${notBuy ? `That is more than $${H}.` : `You have $${H}, so that is enough. The others cost more than $${H}.`}` }; }
  if (k === 'qtyTotal') { let pa, pb, qa, qb, ans; do { pa = ri(2, 6 + t); pb = ri(2, 6 + t); qa = ri(2, 4); qb = ri(1, 3); ans = qa * pa + qb * pb; } while (ans > M); const [a, b] = itemsFor([pa, pb]);
    const art = w => (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
    return { text: `${cap(art(nm(a, 1)))} costs $${pa} and ${art(nm(b, 1))} costs $${pb}. How much do ${qa} ${nm(a, qa)} and ${qb} ${nm(b, qb)} cost?`, vis: `<div class="shelf">${tag(a, pa)}${tag(b, pb)}</div>`, ...numQ(ans, [pa + pb, qa * pa + pb, ans + pa], { pre: '$', max: 300 }), hint: 'Find each total separately, then add.', explain: `${qa} ${nm(a, qa)}: ${rep(qa, pa)}. ${qb} ${nm(b, qb)}: ${rep(qb, pb)}. Together: $${qa * pa} + $${qb * pb} = $${ans}.` }; }
  if (k === 'fewest') { const T = ri(13, Math.min(t >= 7 ? 99 : 49, M)); const gr = greedy(T, set); const ans = gr.length;
    return { text: `What is the FEWEST number of coins and notes you need to make $${T}? You can use: ${set.map(v => '$' + v).join(', ')}.`, vis: `<div class="cgrp">${set.map(coin).join('')}</div>`, ...numQ(ans, [ans + 1, ans + 2, ans - 1], { min: 1 }), hint: 'Use the biggest note you can, again and again, then smaller ones.', explain: `${gr.map(v => '$' + v).join(' + ')} = $${T}. That is ${ans === 1 ? 'just 1 note' : ans + ' coins and notes'}.` }; }
  if (k === 'compareBuy') { const [a, b] = sample(['✏️', '📘', '🧃', '🍭', '🎈'], 2); const na = ri(2, 5), nb = ri(2, 5), pa = ri(2, 9), pb = ri(2, 9); const A = na * pa, B = nb * pb; const ans = A > B ? `the ${nm(a, 2)}` : A < B ? `the ${nm(b, 2)}` : 'they cost the same';
    return { text: `Which costs more: ${na} ${nm(a, na)} at $${pa} each, or ${nb} ${nm(b, nb)} at $${pb} each?`, vis: `<div class="shelf">${tag(a, pa)}${tag(b, pb)}</div>`, ...optQ(ans, [`the ${nm(a, 2)}`, `the ${nm(b, 2)}`, 'they cost the same'].filter(x => x !== ans), R_TXT), hint: 'Work out each total first.', explain: `${na} ${nm(a, na)}: ${rep(na, pa)}. ${nb} ${nm(b, nb)}: ${rep(nb, pb)}. ${A === B ? 'Same!' : `$${Math.max(A, B)} is more.`}` }; }
  // the amount is set by the level, so it only grows and no level repeats the one before; from level 36 the sets alternate
  // ($1/$2/$5 on even levels, $1/$5/$10 on odd ones) and every coin or note in the set can be used
  const Lc = Math.min(L, 50), odd = t >= 8 && Lc % 2 === 1; const coins = t >= 8 ? (odd ? [1, 5, 10] : [1, 2, 5]) : [1, 2];
  const T = t < 8 ? Lc - 22 : odd ? [10, 13, 15, 17, 20, 22, 25][(Lc - 37) / 2] : 5 + (Lc - 36) / 2;
  const ds = coins.slice().sort((x, y) => y - x), list = []; const go = (i, r, acc) => { if (i === ds.length - 1) { list.push(acc.concat([r])); return; } for (let n = Math.floor(r / ds[i]); n >= 0; n--) go(i + 1, r - n * ds[i], acc.concat([n])); }; go(0, T, []); const ways = list.length;
  // notes ($5 and up) are never called coins; the explanation lists the ways biggest-first, as the hint says
  return { text: `How many different ways can you make $${T} using only ${coins.length === 3 ? (odd ? '$1 coins, $5 notes and $10 notes' : '$1 coins, $2 coins and $5 notes') : '$1 and $2 coins'}?`, vis: `<div class="cgrp">${coins.map(coin).join('')}</div>`, ...numQ(ways, [ways + 1, ways - 1, T], { min: 1 }), hint: 'Be organized: start with as many of the biggest one as you can, then use one fewer each time.', explain: list.map(ns => ns.map((n, i) => n ? `${n}×$${ds[i]}` : '').filter(Boolean).join(' + ')).join('; ') + `. That is ${ways} ways.` };
}

/* =====================================================================
   17. TABLES AND SIMPLE DATA — Beehive Board
   ===================================================================== */
const PGSETS = [{ t: 'Fruits picked at the farm', n: 'fruit', i: ['🍎', '🍌', '🍓', '🍐'] }, { t: 'Animals we saw', n: 'animal', i: ['🐄', '🐑', '🐔', '🐖'] }, { t: 'Flowers in the garden', n: 'flower', i: ['🌷', '🌻', '🌼', '🌸'] }];
function g17(L) {
  const t = tierOf(L), M = NMAX(t); // every sum a question asks for stays within the tier's number range (20 on levels 1-10)
  // tally stays on to level 50 so that every level has three different kinds of chart question
  const k = kind(t, [['pic', 1, 3], ['tally', 1, 10], ['table', 1, 5], ['picKey', 3, 10, 1.4], ['table3', 5, 10, 1.3]]);
  if (k === 'pic' || k === 'tally') {
    const S = k === 'pic' ? pick(PGSETS) : { t: 'Votes for favorite farm animal', n: 'animal', i: sample(['🐄', '🐑', '🐔', '🐖', '🐴', '🦆'], 4) }; const n = 4; const it = S.i.slice(0, n);
    const counts = sample(range(k === 'pic' ? 2 : t >= 7 ? 2 * t - 8 : 3, k === 'pic' ? 9 : 9 + 2 * t), n); // tally counts grow with the tier, so late levels are not easier than early ones
    const vis = `<div class="pg"><div class="pgt">${S.t}</div>${it.map((e, i) => `<div class="pgr"><span class="pgl">${em(e)}</span><span class="pgi">${k === 'pic' ? em(e, 'sm').repeat(counts[i]) : tally(counts[i])}</span></div>`).join('')}</div>`;
    let q = pick(['most', 'moreThan', 'total2', 'totalAll', 'diffSum']); const V = k === 'tally'; // the tally chart counts votes, not animals
    if (q === 'totalAll' && sumA(counts) > M) q = pick(['moreThan', 'total2', 'diffSum']);
    if (q === 'most') { const most = Math.random() < 0.5; const idx = counts.indexOf(most ? Math.max(...counts) : Math.min(...counts)); const ans = it[idx]; return { text: V ? `Look at the chart. Which animal got the ${most ? 'most' : 'fewest'} votes?` : `Look at the chart. Which ${S.n} has the ${most ? 'most' : 'fewest'} pictures?`, vis, ...optQ(ans, sample(it.filter(e => e !== ans), 2), R_EM, v => nm(v, 2)), hint: k === 'tally' ? 'Each bundle of tally marks is 5.' : 'Count each row.', explain: cap(it.map((e, i) => `${nm(e, 2)}: ${counts[i]}`).join(', ')) + `. ${cap(nm(ans, 2))} ${V ? 'got' : 'have'} the ${most ? 'most' : 'fewest'}${V ? ' votes' : ''}.` }; }
    if (q === 'total2') { const pairs = []; range(0, n - 1).forEach(a => range(a + 1, n - 1).forEach(b => { if (counts[a] + counts[b] <= M) pairs.push(shuffle([a, b])); }));
      if (pairs.length) { const [i, j] = pick(pairs); const ans = counts[i] + counts[j]; return { text: V ? `How many votes did ${nm(it[i], 2)} and ${nm(it[j], 2)} get altogether?` : `How many ${nm(it[i], 2)} and ${nm(it[j], 2)} are there altogether?`, vis, ...numQ(ans, [ans + 1, ans - 1, Math.abs(counts[i] - counts[j])]), hint: 'Find both numbers, then add.', explain: `${counts[i]} + ${counts[j]} = ${ans}.` }; }
      q = 'moreThan'; }
    if (q === 'diffSum') { const tri = []; range(0, n - 1).forEach(a => range(0, n - 1).forEach(b => range(0, n - 1).forEach(c => { if (a !== b && c !== a && c !== b && counts[a] + counts[b] <= M && counts[a] + counts[b] > counts[c]) tri.push([a, b, c]); })));
      if (tri.length) { const s = pick(tri); const ans = counts[s[0]] + counts[s[1]] - counts[s[2]]; return { text: V ? `Put the votes for ${nm(it[s[0]], 2)} and ${nm(it[s[1]], 2)} together. How many more is that than the votes for ${nm(it[s[2]], 2)}?` : `Put the ${nm(it[s[0]], 2)} and the ${nm(it[s[1]], 2)} together. How many more is that than the ${nm(it[s[2]], 2)}?`, vis, ...numQ(ans, [counts[s[0]] + counts[s[1]], ans + 1, ans - 1]), hint: 'Two steps: add, then take away.', explain: `${counts[s[0]]} + ${counts[s[1]]} = ${counts[s[0]] + counts[s[1]]}. ${counts[s[0]] + counts[s[1]]} − ${counts[s[2]]} = ${ans}.` }; }
      q = 'moreThan'; }
    if (q === 'moreThan') { const [i, j] = sample(range(0, n - 1), 2); const [a, b] = counts[i] > counts[j] ? [i, j] : [j, i]; const ans = counts[a] - counts[b]; return { text: V ? `How many more votes did ${nm(it[a], 2)} get than ${nm(it[b], 2)}?` : `How many more ${nm(it[a], 2)} than ${nm(it[b], 2)} are there?`, vis, ...numQ(ans, [counts[a] + counts[b], ans + 1, counts[a]], { min: 1 }), hint: 'Find both numbers, then take away.', explain: `${counts[a]} − ${counts[b]} = ${ans}.` }; }
    const ans = sumA(counts); return { text: V ? 'How many votes are there in all?' : 'How many are there in all?', vis, ...numQ(ans, [ans + 1, ans - 1, ans - counts[0]]), hint: 'Count each row, then add them all.', explain: `${counts.join(' + ')} = ${ans}.` };
  }
  if (k === 'picKey') {
    const S = pick(PGSETS); const key = t >= 7 ? 5 : 2; const it = S.i.slice(0, 4); const counts = sample(range(1, 7).map(x => x * key).concat(t >= 5 ? range(1, 6).map(x => x * key + key / 2).filter(x => Number.isInteger(x)) : []), 4);
    const icons = (e, c) => em(e, 'sm').repeat(Math.floor(c / key)) + (c % key ? half(e) : '');
    // the key names no single fruit, so it clearly holds for every row
    const vis = `<div class="pg"><div class="pgt">${S.t}</div><div class="pgkey">Each picture = ${key} ${S.n}s${counts.some(c => c % key) ? ` · half a picture = ${key / 2}` : ''}</div>${it.map((e, i) => `<div class="pgr"><span class="pgl">${em(e)}</span><span class="pgi">${icons(e, counts[i])}</span></div>`).join('')}</div>`;
    let q = pick(['how', 'more', 'total']); if (q === 'total' && sumA(counts) > M) q = pick(['how', 'more']);
    if (q === 'how') { const i = ri(0, 3); const c = counts[i]; const w = Math.floor(c / key); return { text: `Each picture means ${key}. How many ${nm(it[i], 2)} are there?`, vis, ...numQ(c, [Math.ceil(c / key), c + key, c - 1 > 0 ? c - 1 : c + 1]), hint: `Count by ${key}s for each whole picture.${c % key ? ' A half picture is ' + key / 2 + '.' : ''}`, explain: `${w === 1 ? `1 whole picture is ${key}.` : `${w} whole pictures, count by ${key}s: ${range(1, w).map(x => x * key).join(', ')}.`}${c % key ? ` The half picture is ${key / 2} more: ${w * key} + ${key / 2} = ${c}.` : ''} So there are ${c} ${nm(it[i], 2)}.` }; }
    if (q === 'more') { const [i, j] = sample([0, 1, 2, 3], 2); const [a, b] = counts[i] > counts[j] ? [i, j] : [j, i]; const ans = counts[a] - counts[b]; return { text: `Each picture means ${key}. How many more ${nm(it[a], 2)} than ${nm(it[b], 2)} are there?`, vis, ...numQ(ans, [Math.round(ans / key) || ans + 1, ans + key, counts[a]], { min: 1 }), hint: `Find both numbers first. Remember each picture is ${key}.`, explain: `${cap(nm(it[a], 2))}: ${counts[a]}. ${cap(nm(it[b], 2))}: ${counts[b]}. ${counts[a]} − ${counts[b]} = ${ans}.` }; }
    const ans = sumA(counts); return { text: `Each picture means ${key}. How many are there in all?`, vis, ...numQ(ans, [Math.round(ans / key), ans + key, ans - key]), hint: `Count all the pictures, then count by ${key}s.`, explain: cap(it.map((e, i) => `${nm(e, 2)}: ${counts[i]}`).join(', ')) + `. ${counts.join(' + ')} = ${ans}.` };
  }
  if (k === 'table') { const lo = t >= 3 ? 4 : 2, hi = t <= 2 ? 10 : t === 3 ? 12 : 15; const v = [[ri(lo, hi), ri(lo, hi)], [ri(lo, hi), ri(lo, hi)]]; while (v[0][0] + v[0][1] === v[1][0] + v[1][1]) v[1][1] = ri(lo, hi);
    const vis = `<table class="dt"><thead><tr><th></th><th>${em('🔴', 'sm')} red</th><th>${em('🔵', 'sm')} blue</th></tr></thead><tbody><tr><th>Box A</th><td>${v[0][0]}</td><td>${v[0][1]}</td></tr><tr><th>Box B</th><td>${v[1][0]}</td><td>${v[1][1]}</td></tr></tbody></table>`;
    let q = pick(['box', 'color', 'which', 'all']); if (q === 'all' && sumA(v[0]) + sumA(v[1]) > M) q = pick(['box', 'color', 'which']);
    if (q === 'box') { const b = ri(0, 1); const ans = v[b][0] + v[b][1]; return { text: `How many balls are in Box ${b ? 'B' : 'A'}?`, vis, ...numQ(ans, [v[b][0], v[b][1], ans + 1]), hint: 'Read across the row and add.', explain: `${v[b][0]} + ${v[b][1]} = ${ans}.` }; }
    if (q === 'color') { const c = ri(0, 1); const ans = v[0][c] + v[1][c]; return { text: `How many ${c ? 'blue' : 'red'} balls are there in the two boxes altogether?`, vis, ...numQ(ans, [v[0][c], v[1][c], ans + 1]), hint: 'Read down the column and add.', explain: `${v[0][c]} + ${v[1][c]} = ${ans}.` }; }
    if (q === 'all') { const ans = v[0][0] + v[0][1] + v[1][0] + v[1][1]; return { text: 'How many balls are there in the two boxes altogether?', vis, ...numQ(ans, [ans + 1, ans - 1, v[0][0] + v[1][1]]), hint: 'Add all four numbers. Look for easy pairs first.', explain: `${v[0][0]} + ${v[0][1]} + ${v[1][0]} + ${v[1][1]} = ${ans}.` }; }
    const tA = v[0][0] + v[0][1], tB = v[1][0] + v[1][1]; const ans = tA > tB ? 'Box A' : 'Box B'; return { text: 'Which box has more balls in all?', vis, ...optQ(ans, [ans === 'Box A' ? 'Box B' : 'Box A', 'They are the same']), hint: 'Add up each row first.', explain: `A: ${tA}. B: ${tB}. ${ans} has more.` }; }
  const rows = ['Box A', 'Box B', 'Box C']; let v; do { v = rows.map(() => [ri(t - 2, 3 * t), ri(t - 2, 3 * t), ri(t - 2, 3 * t)]); } while (new Set(v.map(r => r.join())).size < 3); const cn = ['red', 'blue', 'green']; // no two boxes look identical; numbers grow with the tier and a box total is at most 9t, inside the tier's range
  const vis = `<table class="dt"><thead><tr><th></th>${cn.map((c, i) => `<th>${em(['🔴', '🔵', '🟢'][i], 'sm')} ${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr><th>${r}</th>${v[i].map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const q = pick(['cross', 'boxTotal', 'needed']);
  if (q === 'cross') { let [r1, r2] = sample([0, 1, 2], 2), [c1, c2] = sample([0, 1, 2], 2); if (v[r1][c1] < v[r2][c2]) { [r1, r2] = [r2, r1]; [c1, c2] = [c2, c1]; } const ans = v[r1][c1] - v[r2][c2]; if (ans > 0) return { text: `How many more ${cn[c1]} balls are in ${rows[r1]} than ${cn[c2]} balls in ${rows[r2]}?`, vis, ...numQ(ans, [v[r1][c1] + v[r2][c2], ans + 1, Math.abs(v[r1][c2] - v[r2][c1]) || ans + 2]), hint: 'Find each number where the row and column meet.', explain: `${v[r1][c1]} − ${v[r2][c2]} = ${ans}.` }; }
  if (q === 'needed') { const r = ri(0, 2); const tot = sumA(v[r]); const other = (r + 1) % 3; const tO = sumA(v[other]); if (tO > tot) return { text: `How many more balls must go into ${rows[r]} so it has as many balls as ${rows[other]}?`, vis, ...numQ(tO - tot, [tO, tot, tO - tot + 1]), hint: 'Find each box total first.', explain: `${rows[r]}: ${tot}. ${rows[other]}: ${tO}. ${tO} − ${tot} = ${tO - tot}.` }; }
  const r = ri(0, 2); const ans = sumA(v[r]); return { text: `How many balls are in ${rows[r]}?`, vis, ...numQ(ans, [ans + 1, ans - 1, v[r][0] + v[r][1]]), hint: 'Add across the row.', explain: `${v[r].join(' + ')} = ${ans}.` };
}

/* =====================================================================
   18. MULTI-STEP THINKING — Treasure Barn
   ===================================================================== */
function g18(L) {
  const t = tierOf(L), M = NMAX(t); // answers and the numbers on the way stay within the tier's range (20 on levels 1-10)
  const k = kind(t, [['chain', 1, 6], ['legs', 1, 5], ['missing', 1, 8], ['cards', 1, 10], ['backwards', 1, 10, 1.3], ['share', 4, 8], ['headsLegs', 6, 10, 1.4], ['frog', 7, 10, 1.3]]);
  if (k === 'chain') { const P = people(3); let c, x, y; do { c = ri(6 + 2 * t, 10 + 3 * t); x = ri(1, 5); y = ri(1, 6); } while (c - x + y > M); const b = c - x, a = b + y;
    return { text: `${P[2].n} has ${c} shells. ${P[1].n} has ${x} fewer ${x === 1 ? 'shell' : 'shells'} than ${P[2].n}. ${P[0].n} has ${y} more ${y === 1 ? 'shell' : 'shells'} than ${P[1].n}. How many shells does ${P[0].n} have?`, vis: faces([P[2], P[1], P[0]], em('🐚', 'big')), ...numQ(a, [c + x + y, b, a + 1]), hint: `First find ${P[1].n}, then ${P[0].n}.`, explain: `${P[1].n}: ${c} − ${x} = ${b}. ${P[0].n}: ${b} + ${y} = ${a}.` }; }
  if (k === 'legs') { let a, b, ans; do { a = ri(2, 3 + t); b = ri(1, 2 + t); ans = 2 * a + 4 * b; } while (ans > M || ans < [6, 10, 14, 18, 22][t - 1]); const by = (n, v) => n === 1 ? `${v}` : `count by ${v}s: ${range(1, n).map(i => i * v).join(', ')}`;
    return { text: `On the farm there are ${a} hens and ${b} ${nm('🐄', b)}. Hens have 2 legs and cows have 4 legs. How many legs are there altogether?`, vis: `<div class="farmrow">${em('🐔').repeat(a)}${em('🐄').repeat(b)}</div>`, ...numQ(ans, [a + b, 2 * (a + b), ans + 2]), hint: 'Hen legs, then cow legs, then add.', explain: `Hen legs, ${by(a, 2)}. Cow legs, ${by(b, 4)}. ${2 * a} + ${4 * b} = ${ans}.` }; }
  if (k === 'missing') { const its = sample(['🍦', '🍪', '🧁', '🍩', '🍭', '🧃'], 4); const pr = sample(range(1, Math.min(10, 4 + t)), 4); const skip = ri(0, 3); const T = sumA(pr) - pr[skip]; const P = people(1)[0]; // snack prices stay small
    return { text: `${P.n} bought 3 of these 4 snacks and paid $${T}. Which snack did ${P.he} NOT buy?`, vis: `<div class="shelf">${its.map((e, i) => tag(e, pr[i])).join('')}</div>`, ...optQ(its[skip], sample(its.filter((_, i) => i !== skip), 2), R_EM, S_EM), hint: 'Add all 4 prices. How much more is that than what was paid?', explain: `All 4: $${sumA(pr)}. $${sumA(pr)} − $${T} = $${pr[skip]}, the price of the ${nm(its[skip], 1)}.` }; }
  if (k === 'cards') {
    const three = t >= 7 && Math.random() < 0.5; const cons = t >= 4 ? pick(['', 'even', 'odd']) : ''; const small = Math.random() < 0.5; let dg;
    do { dg = sample(range(0, 9), 4); } while (dg.filter(x => x > 0).length < 3);
    const len = three ? 3 : 2; const all = perms(dg).map(p => p.slice(0, len)).filter(p => p[0] !== 0).map(p => Number(p.join(''))).filter(x => !cons || (cons === 'even' ? x % 2 === 0 : x % 2 === 1));
    if (!all.length) return g18(L);
    const uniq = [...new Set(all)].sort((a, b) => a - b); const ans = small ? uniq[0] : uniq[uniq.length - 1]; const ds = small ? uniq.slice(1, 3) : uniq.slice(-3, -1);
    const free = [...new Set(perms(dg).map(p => p.slice(0, len)).filter(p => p[0] !== 0).map(p => Number(p.join(''))))].sort((a, b) => a - b); const U = small ? free[0] : free[free.length - 1]; const sb = small ? 'smallest' : 'biggest'; const d = String(ans).split('');
    return { text: `Use ${len} of these cards to make the ${small ? 'smallest' : 'biggest'} ${cons ? cons + ' ' : ''}${len === 3 ? 'three' : 'two'}-digit number you can. Each card can be used only once.`, vis: cardsRow(shuffle(dg)), ...optQ(ans, ds.length === 2 ? ds : [ans + 1, ans + 2], R_NUM), hint: cons ? `The last card must be ${cons}, so keep an ${cons} card for the end. Then put the ${small ? 'smallest card you can at the front (not 0)' : 'biggest card you can at the front'}.` : small ? 'Put the smallest card you can at the front, but a number cannot start with 0.' : 'Put the biggest card at the front.',
      explain: !cons ? (small ? `${d[0]} is the smallest card${dg.includes(0) ? ' that is not 0' : ''}, so it goes first. Then the smallest ${len === 3 ? 'cards' : 'card'} left: ${d.slice(1).join(', ')}. So ${ans}.` : `Biggest cards first, in order: ${d.join(', ')}. So ${ans}.`) : U === ans ? `The ${sb} number you can make is ${ans}, and it ends in ${ans % 10}, an ${cons} digit.` : `The ${sb} number you can make is ${U}, but it ends in ${U % 10}, which is not ${cons}. The ${sb} ${cons} number is ${ans}.` };
  }
  if (k === 'backwards') {
    const P = people(1)[0];
    if (t >= 6) { let end, spent, got, afterHalf; do { end = ri(t, 2 * t + 4); spent = ri(2, t); got = ri(2, t + 2); afterHalf = end + spent - got; } while (afterHalf < 3 || 2 * afterHalf > M); const ans = afterHalf * 2;
      return { text: `${P.n} had some coins. ${P.He} gave half of them to ${P.his} sister. Then ${P.he} got ${got} coins from Grandma. Then ${P.he} spent ${spent} coins. Now ${P.he} has ${end} coins. How many coins did ${P.he} have at first?`, vis: `<div class="scene">${em('🪙', 'big')}${em('🐷', 'big')}</div>`, ...numQ(ans, [afterHalf, end + spent + got, ans + 2]), hint: 'Work backwards from the end. Undo each step in reverse order.', explain: `Undo spending: ${end} + ${spent} = ${end + spent}. Undo getting: ${end + spent} − ${got} = ${afterHalf}. Undo giving half away: ${afterHalf} + ${afterHalf} = ${ans}.` }; }
    let a, b; do { a = ri(2, Math.min(8, 2 + 2 * t)); b = ri(1, 1 + 3 * t); } while (a + b > M / 2 || a + b < [3, 5, 8, 10, 12][t - 1]); const halfv = a + b; const ans = 2 * halfv;
    return { text: `${P.n} had some money. ${P.He} put half of it in ${P.his} piggy bank. With the other half, ${P.he} bought a snack for $${a} and had $${b} left. How much money did ${P.he} have at first?`, vis: `<div class="scene">${em('🐷', 'big')}${tag('🍪', a)}</div>`, ...numQ(ans, [halfv, a + b + a, ans + 2], { pre: '$' }), hint: 'First find the half that was spent and left over.', explain: `Other half: $${a} + $${b} = $${halfv}. Both halves: $${halfv} + $${halfv} = $${ans}.` };
  }
  if (k === 'share') { const g = ri(2, Math.min(5, t)), each = ri(t - 1, t + 4); const T = g * each;
    return { text: `${T} cookies are shared equally on ${g} plates. How many cookies are on each plate?`, vis: `<div class="nests">${range(1, g).map(() => '<div class="plate"><span class="pq">?</span></div>').join('')}</div>`, ...numQ(each, [T - g, each + 1, each - 1], { min: 1 }), hint: `Deal them out one at a time, or find what number added ${g} times makes ${T}.`, explain: `${range(1, g).map(() => each).join(' + ')} = ${T}. So each plate has ${each}.` }; }
  if (k === 'headsLegs') { // the animal pair and the herd size vary, so later levels do not repeat the same few puzzles
    const [two, four] = pick([['🐔', '🐄'], ['🦆', '🐖'], ['🐔', '🐐'], ['🦆', '🐑']]); const T2 = nm(two, 2), F2 = nm(four, 2), F1 = nm(four, 1); const n = ri(t - 2, t + 4), cows = ri(1, n - 1); const legs = 2 * (n - cows) + 4 * cows;
    return { text: `There are ${n} animals on the farm. Some are ${T2} and some are ${F2}. Together they have ${legs} legs. How many ${F2} are there?`, vis: `<div class="farmrow">${em(two)}<b class="en">?</b>${em(four)}<b class="en">?</b></div><div class="cap">${cap(T2)} have 2 legs. ${cap(F2)} have 4 legs.</div>`, ...numQ(cows, [n - cows, cows + 1, Math.floor(legs / 4)]), hint: `Pretend they are all ${T2}. How many legs would that be? Each ${F1} adds 2 more legs.`, explain: `If all ${n} were ${T2}: ${2 * n} legs. We have ${legs}, which is ${legs - 2 * n} more. Each ${F1} adds 2 extra legs, and half of ${legs - 2 * n} is ${cows}, so there ${cows === 1 ? 'is' : 'are'} ${cows} ${nm(four, cows)}.` }; }
  let up, down, H, turns; do { up = ri(3, 5); down = ri(1, up - 1); H = ri(t + 3, t + 8); let pos = 0; turns = 0; while (true) { turns++; pos += up; if (pos >= H) break; pos -= down; } } while (turns < 4 || turns > 10); // the ladder grows with the tier; 4 to 10 turns keeps it a real puzzle with a readable explanation
  // ladder drawn with exactly H numbered steps (the 🪜 emoji has its own fixed number of rungs)
  const sp = 12, lh = (H + 1) * sp + 6; let rg = '', rn = ''; for (let i = 1; i <= H; i++) { const y = lh - 4 - i * sp; rg += `<line class="rung" x1="20" y1="${y}" x2="52" y2="${y}"/>`; rn += `<text x="58" y="${y + 3.5}">${i}</text>`; }
  const ladder = `<svg viewBox="0 0 76 ${lh}" width="76" height="${lh}" aria-hidden="true"><g stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"><line x1="20" y1="4" x2="20" y2="${lh - 4}"/><line x1="52" y1="4" x2="52" y2="${lh - 4}"/></g><g stroke="#B07A45" stroke-width="3.5" stroke-linecap="round">${rg}</g><g font-family="sans-serif" font-size="10" font-weight="700" fill="#2B2340">${rn}</g></svg>`;
  return { text: `A frog is at the bottom of a ladder with ${H} steps. Each turn it jumps up ${up} steps, then slips down ${down}. If it reaches the top during a jump, it stops. How many turns does the frog need?`, vis: `<div class="scene">${em('🐸', 'big')}${ladder}</div>`, ...numQ(turns, [Math.ceil(H / (up - down)), turns + 1, turns - 1], { min: 1 }), hint: 'Act it out step by step. Careful: on the last turn it does not slip.', explain: (() => { let p = 0, s = []; for (let i = 1; i <= turns; i++) { p += up; if (p >= H) { s.push(`Turn ${i}: up to ${Math.min(p, H)}, top!`); break; } s.push(`Turn ${i}: up to ${p}, slips to ${p - down}`); p -= down; } return s.join('. '); })() };
}

/* =====================================================================
   FARM LIST — order follows the JISMO Grade 1 course outline
   ===================================================================== */
const TOPICS = [
  { topic: 'Number Sense', farm: 'Carrot Patch', icon: '🥕', crop: '🥕', color: '#F08A24', gen: g1 },
  { topic: 'Addition and Subtraction', farm: 'Apple Orchard', icon: '🍎', crop: '🍎', color: '#D9483B', gen: g2 },
  { topic: 'Missing Numbers', farm: 'Pumpkin Patch', icon: '🎃', crop: '🎃', color: '#E8891E', gen: g3 },
  { topic: 'Missing Patterns', farm: 'Corn Rows', icon: '🌽', crop: '🌽', color: '#D9A520', gen: g4 },
  { topic: 'Picture Patterns', farm: 'Flower Garden', icon: '🌷', crop: '🌷', color: '#D9568F', gen: g5 },
  { topic: 'Counting Strategies', farm: 'Chicken Coop', icon: '🐔', crop: '🥚', color: '#B9773A', gen: g6 },
  { topic: 'Comparing Quantities', farm: 'Sheep Meadow', icon: '🐑', crop: '🐑', color: '#7D6CC9', gen: g7 },
  { topic: 'Picture-Based Problems', farm: 'Berry Bushes', icon: '🍓', crop: '🍓', color: '#C8325A', gen: g8 },
  { topic: 'Story Problems', farm: 'Cow Barn', icon: '🐄', crop: '🥛', color: '#A9483A', gen: g9 },
  { topic: 'Logical Reasoning', farm: "Owl's Oak", icon: '🦉', crop: '🌰', color: '#7A5A3C', gen: g10 },
  { topic: 'Classification and Grouping', farm: 'Sorting Shed', icon: '🧺', crop: '🍐', color: '#3F8F3A', gen: g11 },
  { topic: 'Geometry', farm: 'Shape Field', icon: '📐', crop: '🌾', color: '#3474C9', gen: g12 },
  { topic: 'Spatial Reasoning', farm: 'Duck Pond', icon: '🦆', crop: '🐟', color: '#2A93C9', gen: g13 },
  { topic: 'Measurement', farm: 'Sunflower Field', icon: '🌻', crop: '🌻', color: '#C99A10', gen: g14 },
  { topic: 'Time and Sequence', farm: 'Windmill Clock', icon: '⏰', crop: '🍞', color: '#5B6BC2', gen: g15 },
  { topic: 'Money', farm: 'Farm Market', icon: '💰', crop: '💰', color: '#2F9A5E', gen: g16 },
  { topic: 'Tables and Simple Data', farm: 'Beehive Board', icon: '🐝', crop: '🍯', color: '#C78A12', gen: g17 },
  { topic: 'Multi-Step Thinking', farm: 'Treasure Barn', icon: '🗝️', crop: '💎', color: '#8A3FB5', gen: g18 }
];

/* =====================================================================
   PREPARED QUESTION BANK
   Every farm on every level has 3 fixed, pre-checked variants. They are made
   from a fixed seed, so they are the same on every device and every replay,
   and the game picks one Adley has not seen yet. The 3 variants are chosen to
   be different kinds of question whenever the level offers enough kinds.
   A level's Golden Challenge farm has its own 3 variants, 5 levels harder.
   ===================================================================== */
function seededRun(seed, fn) {
  const orig = Math.random; let a = seed >>> 0;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = orig; }
}
const seedOf = (...n) => n.reduce((h, x) => { h = Math.imul(h ^ (x + 0x9E3779B9), 0x85EBCA6B) >>> 0; return (h ^ (h >>> 13)) >>> 0; }, 0x1234567);
const goldTopic = L => seedOf(L, 99) % TOPICS.length;
const goldLevel = L => L + 5;
const BANK = {}, BANK_ERR = [];
/* Builds the whole bank for one topic in a fixed order (levels 1–50, then the golden sets), so that no
   question (same text and answer, or same text, answer and picture) appears twice anywhere in the topic. */
function buildTopic(ti) {
  if (BANK['done' + ti]) return; BANK['done' + ti] = 1;
  const usedFull = new Set(), usedTA = new Set();
  const ansOf = q => q.ans != null ? q.ans : q.target;
  /* Order of preference for the 3 variants of a farm on a level:
     A) a kind of question not used yet on this level, never seen anywhere in this topic, with a different answer;
     B) a new kind with a different answer, even if the same wording+answer appeared on another level with a different picture;
     C) any kind, as long as it is not an exact repeat and not the same wording+answer on this level.
     An exact repeat (same wording, answer and picture) is never allowed anywhere in the topic. */
  const make = (L, gold) => {
    const lv = gold ? goldLevel(L) : L, out = [], kinds = new Set(), levelTA = new Set(), answers = new Set();
    for (let s = 0; s < 260 && out.length < 3; s++) {
      let q = null; kind.last = null;
      try { q = seededRun(seedOf(L, ti, s, gold ? 7 : 3), () => TOPICS[ti].gen(lv)); } catch (e) { BANK_ERR.push(`${TOPICS[ti].farm} level ${lv}: ${e.message}`); q = null; }
      if (!q || !q.text) continue;
      const a = String(ansOf(q)), full = q.text + '|' + a + '|' + (q.vis || ''), ta = q.text + '|' + a;
      if (usedFull.has(full) || levelTA.has(ta)) continue;
      const newKind = !kinds.has(kind.last), newAns = !answers.has(a);
      if (s < 70) { if (!newKind || !newAns || usedTA.has(ta)) continue; }
      else if (s < 160) { if (!newKind || !newAns) continue; }
      q.kind = kind.last; q.variant = out.length; usedFull.add(full); usedTA.add(ta); levelTA.add(ta); kinds.add(kind.last); answers.add(a); out.push(q);
    }
    if (out.length < 3) BANK_ERR.push(`${TOPICS[ti].farm} level ${lv}${gold ? ' golden' : ''}: only ${out.length} variants`);
    return out;
  };
  for (let L = 1; L <= 50; L++) BANK[L + ':' + ti] = make(L, false);
  for (let L = 1; L <= 50; L++) if (goldTopic(L) === ti) BANK['g' + L + ':' + ti] = make(L, true);
}
/* bankSet(L, topic, gold): the prepared variants for that farm. Levels after 50 (Legend) reuse the 15
   reviewed top-level puzzles of levels 46–50, so every puzzle the child sees has been checked. */
function bankSet(L, ti, gold) {
  buildTopic(ti);
  if (L > 50) { const key = 'legend:' + ti; if (!BANK[key]) { BANK[key] = []; for (let l = 46; l <= 50; l++) BANK[l + ':' + ti].forEach(q => BANK[key].push(q)); } return BANK[key]; }
  if (gold) { const g = BANK['g' + L + ':' + ti]; if (g) return g; buildGoldExtra(L, ti); return BANK['g' + L + ':' + ti]; }
  return BANK[L + ':' + ti];
}
/* golden sets are only pre-built where that topic is the golden farm; any other request is made the same way */
function buildGoldExtra(L, ti) {
  const lv = goldLevel(L), out = [];
  for (let s = 0; s < 60 && out.length < 3; s++) { let q = null; kind.last = null; try { q = seededRun(seedOf(L, ti, s, 7), () => TOPICS[ti].gen(lv)); } catch (e) { q = null; } if (q && q.text && !out.some(o => o.text === q.text)) { q.kind = kind.last; q.variant = out.length; out.push(q); } }
  BANK['g' + L + ':' + ti] = out;
}
/* practice puzzles come from the reviewed bank too: any variant from the last five levels */
function practiceSet(L, ti) { const out = []; if (L > 50) return bankSet(L, ti); for (let l = Math.max(1, L - 4); l <= L; l++) bankSet(l, ti).forEach(q => out.push(q)); return out; }

if (typeof module !== 'undefined') module.exports = { TOPICS, greedy, tierOf, kind, bankSet, goldTopic, goldLevel, seededRun, practiceSet, BANK_ERR };
