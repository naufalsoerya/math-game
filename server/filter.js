'use strict';
/*
 * Chat and name filter for a children's game (players are about 6 years old).
 *
 * A message is refused (never shown to other children) when it contains:
 *   - unkind or rude words, in English or Indonesian                 -> reason "kind"
 *   - a web link                                                       -> reason "link"
 *   - personal details: phone number, email, @username, home address,
 *     school name                                                      -> reason "contact"
 *
 * Every check runs on normalised text: full-width and other digit forms become 0-9,
 * accents, keycap marks and invisible characters are removed, Cyrillic and Greek
 * look-alike letters become Latin letters. Words are also tested with look-alike
 * digits/symbols turned into letters (0->o, 1->i, 3->e, 4->a, 5->s, 7->t, @->a, $->s),
 * with masking removed (f*ck, f.u.c.k), spaced-out letters joined (f u c k),
 * neighbouring pieces joined (fu ck, stu🌻pid) and stretched letters squashed (stuuupid).
 *
 * Grown-ups can extend the word list without changing code: put extra words or phrases,
 * one per line, in data/extra-blocked-words.txt (read at start-up).
 */
const fs = require('node:fs');
const path = require('node:path');

// Whole words. Kept deliberately strict: a refused message only asks the child to say it more kindly.
const WORDS_EN = [
  // unkind words the game itself never uses
  'stupid', 'stupidest', 'stoopid', 'stupud', 'dumb', 'dumber', 'dumbest', 'dumbo', 'dumbass', 'dummy', 'idiot', 'idiots', 'idiotic',
  'ugly', 'ugliest', 'loser', 'losers', 'hater', 'haters', 'hate', 'hates', 'hated', 'hating', 'terrible', 'awful', 'moron', 'morons',
  'fatso', 'fatty', 'crybaby', 'stfu', 'shutup', 'kys', 'weirdo', 'freak', 'freaks', 'lame', 'pathetic', 'worthless', 'noob', 'noobs',
  'jerk', 'jerks', 'dork', 'dorks', 'sux', 'yousuck', 'fatass',
  // rude words
  'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking', 'fck', 'fk', 'fuk', 'fuking', 'fking', 'fcking', 'fvck', 'fcuk', 'phuck', 'phuk',
  'wtf', 'omfg', 'ffs', 'shit', 'shits', 'shitty', 'bullshit', 'sht', 'bitch', 'bitches', 'biatch', 'bastard', 'bastards', 'asshole',
  'assholes', 'ass', 'arse', 'arsehole', 'damn', 'dammit', 'goddamn', 'crap', 'crappy', 'dick', 'dicks', 'dickhead', 'pussy', 'cunt',
  'cunts', 'slut', 'sluts', 'whore', 'whores', 'piss', 'pissed', 'bollocks', 'wanker', 'twat', 'prick', 'sex', 'sexy', 'porn', 'porno',
  'nude', 'nudes', 'naked', 'boob', 'boobs', 'tits', 'titty', 'penis', 'vagina', 'horny', 'rape', 'raped', 'nazi', 'hitler', 'suicide',
  // slurs
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'fag', 'fags', 'retard', 'retards', 'retarded', 'tranny',
  'chink', 'chinks', 'spic', 'spics', 'kike', 'kikes', 'gook', 'paki', 'coon', 'dyke'
];
const WORDS_ID = [
  'anjir', 'anjrit', 'anjay', 'anjim', 'anjeng', 'anjg', 'ajg', 'njing', 'njir', 'bangsat', 'bngst', 'bgst', 'bngsat', 'bajingan',
  'brengsek', 'berengsek', 'goblok', 'goblog', 'gblk', 'gblg', 'tolol', 'tlol', 'tll', 'bego', 'bodoh', 'dungu', 'kampret', 'keparat',
  'sialan', 'taik', 'tahi', 'kontol', 'kntl', 'kontl', 'kntol', 'memek', 'mmk', 'mmek', 'ngentot', 'ngentod', 'ngntt', 'ngntd', 'ngewe',
  'entot', 'jancok', 'jancuk', 'jancik', 'cok', 'cuk', 'pantek', 'pepek', 'perek', 'lonte', 'pelacur', 'sundal', 'bencong', 'banci',
  'kafir', 'jelek', 'benci', 'gendut', 'mampus', 'modar', 'bacot', 'bacod', 'cupu', 'pecun', 'bokep', 'telanjang', 'toket', 'titit',
  'pler', 'peler', 'jembut', 'kimak', 'pukimak', 'puki', 'bejat', 'bangke', 'bangkai', 'sinting', 'autis', 'cacat', 'norak',
  'kampungan', 'najis', 'bloon', 'oon', 'dongo', 'matilah', 'coli', 'pantat', 'lemot', 'nyebelin', 'butthead', 'poophead'
];
// Ordinary words (animals, a sport) that are insults only when aimed at someone:
// "Aku punya anjing" (I have a dog) is fine, "dasar anjing" or a lone "anjing!" is not.
const AIMED = ['anjing', 'babi', 'monyet', 'asu', 'setan', 'iblis', 'tai', 'pig', 'piggy', 'monkey', 'donkey', 'rat', 'dog', 'cow', 'worm', 'baboon', 'goat', 'kambing', 'kerbau', 'sapi', 'tikus', 'cacing', 'keledai'];
const PERSON = new Set(['kamu', 'kau', 'lu', 'lo', 'loe', 'elu', 'elo', 'gue', 'dasar', 'dia', 'you', 'u', 'ur', 'your', 'youre', 'kalian', 'km', 'situ', 'kmu']);
// Multi-word phrases (matched on whole words).
const PHRASES = [
  'shut up', 'shut it', 'you suck', 'u suck', 'it sucks', 'kill you', 'kill u', 'kill yourself', 'kill urself', 'kill ur self', 'go die',
  'drop dead', 'i hate you', 'i hate u', 'nobody likes you', 'nobody likes u', 'no one likes you', 'no one likes u', 'son of a',
  'want to die', 'wanna die', 'i will kill', 'ill kill', 'gonna kill', 'go away loser',
  'tutup mulut', 'diam lu', 'diam lo', 'diam kau', 'mati aja', 'mati lu', 'mati lo', 'mati kau', 'mati sana', 'mati kamu', 'bunuh diri',
  'bunuh kamu', 'bunuh lu', 'bunuh lo', 'aku bunuh', 'gue bunuh', 'mau mati', 'pengen mati', 'ingin mati', 'dasar bodoh', 'anak haram', 'otak udang',
  'you are fat', 'ur fat', 'u r fat', 'you r fat', 'you smell', 'u smell', 'you stink', 'u stink', 'you are trash', 'ur trash', 'i hate u', 'u sux', 'you sux',
  'kamu jahat', 'kamu bau', 'lu bau', 'lo bau', 'diem lu', 'diem lo', 'pergi sana', 'pergi lu', 'pergi lo', 'gak ada yang suka kamu', 'ga ada yang suka kamu',
  'nggak ada yang suka kamu', 'tidak ada yang suka kamu', 'gak ada yang suka sama kamu', 'nobody wants to play with you', 'no one wants to play with you',
  'nobody wants to play with u', 'go away', 'i dont like you', 'i dont like u', 'i do not like you', 'you are not my friend', 'ur not my friend', 'u r not my friend',
  'not your friend', 'shut your mouth', 'poopy head', 'poop head', 'butt head', 'kamu payah', 'kamu aneh', 'kamu lambat', 'payah lu', 'aneh lu', 'gak mau temenan',
  'ga mau temenan', 'nggak mau temenan', 'tidak mau berteman', 'gak mau berteman', 'bukan temanku', 'bukan temenku', 'bukan teman aku', 'bukan temen aku'
];
// Searched inside words too (so "fuckface" or "kamujelek" are caught). Only long, unambiguous words.
const INSIDE = [
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'porn', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'asshole', 'dickhead',
  'kontol', 'memek', 'ngentot', 'ngewe', 'jancok', 'jancuk', 'bangsat', 'bajingan', 'pepek', 'lonte', 'pelacur', 'goblok',
  'goblog', 'tolol', 'kampret', 'keparat', 'bokep', 'telanjang', 'toket', 'jembut', 'pukimak', 'brengsek', 'stupid', 'idiot', 'jelek', 'bodoh'
];

// words that make "dasar ..." an insult ("dasar matematika" = basic maths stays fine)
const DASAR_NEXT = new Set(['gila', 'bodoh', 'jelek', 'lemot', 'aneh', 'payah', 'anak', 'kampungan', 'norak', 'pelit', 'cengeng', 'lebay', 'alay', 'sok', 'curang', 'nakal', 'jahat', 'bau', 'gendut', 'cupu', 'oon', 'bloon', 'manja', 'pemalas', 'malas', 'penakut', 'nyebelin', 'goblok', 'tolol', 'bego']);
const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '6': 'g' };
// Cyrillic, Greek and small-capital letters that look like Latin ones
const CONFUSABLE = {
  'а': 'a', 'б': 'b', 'в': 'b', 'г': 'r', 'д': 'd', 'е': 'e', 'ё': 'e', 'з': '3', 'и': 'u', 'й': 'u', 'к': 'k', 'л': 'n', 'м': 'm', 'н': 'h', 'о': 'o',
  'п': 'n', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'ф': 'f', 'х': 'x', 'ц': 'u', 'ч': '4', 'ш': 'w', 'щ': 'w', 'ъ': 'b', 'ы': 'bi', 'ь': 'b',
  'э': 'e', 'ю': 'io', 'я': 'r', 'і': 'i', 'ї': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ӏ': 'l', 'ү': 'y', 'һ': 'h', 'ԛ': 'q', 'ԝ': 'w', 'ɡ': 'g',
  'ɑ': 'a', 'ɪ': 'i', 'ʏ': 'y', 'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ɢ': 'g', 'ʜ': 'h', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l',
  'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p', 'ʀ': 'r', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ᴢ': 'z',
  'α': 'a', 'β': 'b', 'γ': 'y', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'n', 'θ': 'o', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'u', 'ν': 'v', 'ξ': 'e',
  'ο': 'o', 'π': 'n', 'ρ': 'p', 'σ': 'o', 'ς': 's', 'τ': 't', 'υ': 'u', 'φ': 'f', 'χ': 'x', 'ψ': 'w', 'ω': 'w'
};

const WORDS = new Set([...WORDS_EN, ...WORDS_ID]);
function loadExtra(dataDir) {
  try {
    const f = path.join(dataDir, 'extra-blocked-words.txt');
    if (!fs.existsSync(f)) return 0;
    const extra = fs.readFileSync(f, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(s => norm(s).replace(/\s+/g, ' ').trim()).filter(Boolean);
    extra.forEach(w => { if (w.includes(' ')) PHRASES.push(w); else WORDS.add(w); });
    return extra.length;
  } catch (e) { return 0; }
}

/* ---------------------------------------------------------------- normalising */
const str = v => typeof v === 'string' ? v : '';
function digitValue(ch) {
  if (ch >= '0' && ch <= '9') return ch;
  let cp = ch.codePointAt(0), k = 0;
  while (k < 9 && /\p{Nd}/u.test(String.fromCodePoint(cp - 1))) { cp--; k++; }
  return String(k);
}
/** Lower case, NFKC (full-width, circled, superscript forms), no accents or keycap marks, no invisible characters,
 *  look-alike letters made Latin, every kind of decimal digit made 0-9. */
function norm(text) {
  let s = str(text).normalize('NFKC').replace(/[。｡․‧・]/g, '.');
  s = s.normalize('NFKD').replace(/\p{M}/gu, '');
  s = s.replace(/[\p{Cf}\u3164\u115F\u1160\uFFA0\u00AD\u034F\u180E\u2800]/gu, '').replace(/\p{Cc}/gu, ' ');
  s = s.toLowerCase().replace(/[ɐ-ʯͰ-ϿЀ-ԯᴀ-ᴫ]/g, c => CONFUSABLE[c] || c);
  return s.replace(/\p{Nd}/gu, digitValue);
}

const squash = (s, keep) => s.replace(/([a-z])\1+/g, (m, c) => c.repeat(Math.min(keep, m.length)));
const variants = tok => [...new Set([tok, squash(tok, 2), squash(tok, 1)])];
// for the "inside a word" check, only squash letters stretched 3+ times ("shiiit"), so "shiitake" stays clean
const insideVariants = tok => [...new Set([tok, squash(tok, 2), tok.replace(/([a-z])\1{2,}/g, '$1')])];

// Two readings of the words: with look-alike digits turned into letters ("l0s3r" -> loser) and with digits
// as separators ("loser1" -> loser). Punctuation at the ends of a word never counts as a letter ("loser!").
function tokenLists(n) {
  const leet = [], plain = [];
  for (let ch of n.split(/\s+/)) {
    ch = ch.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''); if (!ch) continue;
    ch = ch.replace(/^h8(r|rs|ers?)?$/, (m, e) => 'hate' + (e ? (e.endsWith('s') ? 'rs' : 'r') : ''));
    const hasLetter = /[a-z]/.test(ch);
    const a = (hasLetter ? ch.replace(/[0-9!|@$+]/g, c => LEET[c] || c) : ch).replace(/[*._\-~'’"`^]+/g, '');
    a.split(/[^a-z]+/).filter(Boolean).forEach(t => leet.push(t));
    ch.replace(/[*._\-~'’"`^]+/g, '').split(/[^a-z]+/).filter(Boolean).forEach(t => plain.push(t));
  }
  const join = list => { const out = []; let run = ''; for (const t of list) { if (t.length === 1) { run += t; continue; } if (run) { out.push(run); run = ''; } out.push(t); } if (run) out.push(run); return out; };
  return [join(leet), join(plain)];
}
const isWord = t => variants(t).some(v => WORDS.has(v));
const hasInside = t => insideVariants(t).some(v => v.length >= 4 && INSIDE.some(w => v.includes(w)));
const aimedWord = t => variants(t).find(v => AIMED.includes(v));
// "aku punya anjing", "you have a pig?" talk about animals; "kayak babi", "muka monyet", "you are a pig" aim them at someone
const PETVERB = new Set(['punya', 'beli', 'suka', 'lihat', 'liat', 'pelihara', 'piara', 'ada', 'mau', 'sayang', 'kasih', 'makan', 'gambar', 'foto', 'have', 'has', 'got', 'like', 'love', 'see', 'saw', 'pet', 'feed', 'fed', 'bought', 'buy', 'want', 'found', 'find', 'hutan', 'liar', 'seekor', 'ekor']);
const ARTICLE = new Set(['a', 'an', 'the', 'si', 'satu', 'seekor', 'sebuah', 'little', 'baby', 'big', 'kecil', 'besar', 'cute']);
const LIKEN = new Set(['kayak', 'kaya', 'seperti', 'mirip', 'muka', 'otak', 'dasar', 'kek', 'kyk', 'bau', 'banget', 'bgt', 'face', 'head', 'brain', 'mukamu']);
const OWNER = new Set(['your', 'ur', 'yr', 'his', 'her', 'their', 'our', 'my']);
const DESCRIBE = new Set(['lucu', 'imut', 'kecil', 'besar', 'gede', 'namanya', 'warnanya', 'cute', 'keren', 'bagus', 'lagi', 'udah', 'sudah', 'suka', 'makan', 'tidur', 'main', 'lari', 'dimana', 'di', 'mana', 'apa', 'berapa', 'is', 'so', 'sangat', 'banyak', 'yang', 'warna', 'umur', 'pintar', 'jinak']);
const LONE = new Set(['anjing', 'babi', 'monyet', 'asu', 'setan', 'iblis', 'tai']);

function aimedAt(toks, i, people) {
  const at = k => toks[i + k];
  const isPerson = w => !!w && (PERSON.has(w) || people.has(nameKey(w)));
  let p = at(-1), pp = at(-2); if (p && ARTICLE.has(p)) { p = pp; pp = at(-3); }
  const looksLike = (p === 'like' || p === 'liek') && ['look', 'looks', 'smell', 'smells', 'just', 'act', 'acts'].includes(pp);
  if (looksLike || LIKEN.has(p) || LIKEN.has(at(1))) return true;                    // kayak babi, otak monyet, pig face, looks like a monkey
  if (p === 'anak') {                                                                 // "anak anjing" is a puppy, unless aimed: "kamu anak anjing", "dasar anak monyet"
    const before = pp; if (isPerson(before) || before === 'dasar' || !before && !at(1)) return true;
    return false;
  }
  if (p && PETVERB.has(p)) return false;                                              // aku punya anjing, you have a pig?
  if (p && OWNER.has(p) && !isPerson(at(-2)) && !isPerson(at(-3))) return false;      // your pig is cute (but "you are my pig" is aimed)
  if (at(1) && PERSON.has(at(1)) && at(2) && DESCRIBE.has(at(2))) return false;        // anjing kamu lucu (your dog is cute)
  if (toks.length === 1) return LONE.has(variants(toks[0]).find(v => AIMED.includes(v))); // a lone "anjing!" is a swear word; a lone "dog!" is not
  return [at(-3), at(-2), at(-1), at(1)].some(isPerson);                              // dasar anjing, rina babi, you are a pig, anjing lu
}

/** opts.names: Set of the group's names (folded keys), counted as people for "Rina babi". */
function isUnkind(text, names) {
  const n = norm(text); const people = names || new Set();
  for (const toks of tokenLists(n)) {
    if (toks[0] === 'dasar' && toks[1] && (PERSON.has(toks[1]) || people.has(nameKey(toks[1])) || DASAR_NEXT.has(toks[1]) || AIMED.includes(toks[1]) || isWord(toks[1]))) return true; // "dasar gila"
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (isWord(t) || hasInside(t)) return true;
      if (aimedWord(t) && aimedAt(toks, i, people)) return true;
      // a word broken in two: "fu ck", "stu pid", "stu🌻pid", "anj ing"
      if (i + 1 < toks.length) {
        const j = t + toks[i + 1];
        if (j.length >= 4 && (isWord(j) || INSIDE.includes(j) || INSIDE.includes(squash(j, 1)))) return true;
        if (aimedWord(j) && t.length < 4 && toks[i + 1].length < 4) return true;
      }
    }
    const flat2 = ' ' + toks.map(t => squash(t, 2)).join(' ') + ' ', flat1 = ' ' + toks.map(t => squash(t, 1)).join(' ') + ' ';
    if (PHRASES.some(p => flat2.includes(' ' + p + ' ') || flat1.includes(' ' + p + ' '))) return true;
  }
  return false;
}

/* ---------------------------------------------------------------- personal details and links */
// sentence-style dots ("home.In the park", "hi.my", "Fine.so") are not taken for links
const TLD_SAFE = 'com|net|org|id|io|co|ly|gg|xyz|app|tv|info|biz|link|site|online|club|top|sg|uk|ru|cn|au|ca|de|fr|jp|kr|live|shop|store|page|dev|ai|chat|social|website|cc|ws|vip|pro|edu|gov|games|game|tk|ml|ga|cf|gq|fun|space|tech|blog|email|mobi|xxx';
// .me is popular for personal links; other two-letter endings that are everyday words (in, my, so, to, be, us) are left out
const TLD_WORD = 'me';
const DOT = '(?:\\.|·|•|‧|∙|,|/|\\(\\s*\\.\\s*\\)|\\[\\s*\\.\\s*\\]|\\(dot\\)|\\[dot\\]|\\bdot\\b|\\btitik\\b)';
const RX_LINK = [
  /(https?|ftp)\s*:\s*\/\//, /\bwww\s*[.·•,]/,
  new RegExp(`\\b[a-z0-9][a-z0-9-]*\\.(?:${TLD_SAFE})\\b`),
  new RegExp(`\\b[a-z0-9-]{2,}\\s?${DOT}\\s?(?:com|net|org|id|io|co|gg|tv|app|games|game|tk|ly|xyz|link|site|online|info|biz|sg|store|shop|club|fun)\\b`),
  /\b[a-z0-9-]{2,}\.[a-z]{2,}\/\S/,                                              // anything.like/a-path
  /(bit\s*\.\s*ly|tinyurl|t\s*\.\s*me|wa\s*\.\s*me|discord\s*\.\s*gg|linktr\s*\.\s*ee|youtu\s*\.\s*be)/
];
const RX_LINK_WORD = new RegExp(`\\b[a-z0-9-]{3,}\\.(?:${TLD_WORD})\\b`);
const RX_EMAIL = [new RegExp(`[a-z0-9._%+-]+\\s*@\\s*[a-z0-9-]+\\s*${DOT}\\s*[a-z]{2,}`), /[a-z0-9._%+-]+\s*(\(at\)|\[at\])\s*[a-z0-9-]+/];
const RX_HANDLE = /(^|[^a-z0-9@._])@(\s?)([a-z0-9_.]{2,})/g;
const AT_WORDS = new Set(['home', 'school', 'level', 'levels', 'lvl', 'everyone', 'everybody', 'all', 'here', 'there', 'the', 'my', 'your', 'farm', 'island', 'rumah', 'sekolah', 'semua', 'guys', 'kalian', 'night', 'noon', 'lunch']);
const PLATFORM = 'ig|insta|instagram|tiktok|tt|roblox|discord|wa|whatsapp|line|telegram|tele|snap|snapchat|fb|facebook|youtube|yt|twitter|threads|minecraft|fortnite|steam|psn|xbox|kik|wechat';
const RX_SOCIAL = [
  new RegExp(`\\b(add me|follow me|friend me|dm me|text me|message me|find me on|search me|my (${PLATFORM}|channel|account|acc|username|user name|gamertag|number|phone|email|mail|id))\\b`),
  new RegExp(`\\b(${PLATFORM})\\s+@?[a-z0-9]*[0-9_.][a-z0-9_.]*\\b`), new RegExp(`\\b(search|find|look for|cari)\\s+\\S+\\s+(on|in|di)\\s+(${PLATFORM})\\b`),
  // asking someone for personal details, a photo, or to meet
  /\b(can i have|give me|send me|tell me|whats|what is|what's|wats|wat is|wat's) (your|ur|u r|yr) (number|phone|phone number|wa|whatsapp|address|home address|house|school|real name|full name|last name|photo|picture|pic|selfie|email|ig|instagram|tiktok|roblox|username|id)\b/,
  /\bwhere (do|d) (you|u) live\b/, /\bwhere (is|s) (your|ur) (house|home|school)\b/, /\bwhat school (do|d) (you|u)\b/, /\bwhich school\b/,
  /\bsend (me )?(a |your |ur )?(photo|pic|picture|selfie|foto)\b/, /\b(meet me|meet up|lets meet|let s meet|come to my house)\b/,
  /\b(rumah|alamat|sekolah|nomor|nomer|nmr|hp|wa|ig|tiktok|foto|fotomu|nama asli|nama lengkap)\s+(kamu|lu|lo|kau|km|elu|mu)\b/, /\b(rumahmu|alamatmu|sekolahmu|nomormu|fotomu)\b/,
  /\btinggal (di\s*)?mana\b/, /\bminta (nomor|nomer|no|wa|alamat|foto|ig)\b/, /\bkirim (foto|selfie)\b/, /\bketemuan\b/, /\bketemu (yuk|yok|di (taman|mall|rumah|sekolah))\b/,
  new RegExp(`\\b(${PLATFORM})\\s*[:=]`), /\b(username|user name|gamertag|nickname|nick name|my ign)\b/,
  new RegExp(`\\b((akun|acc|nomor|nomer|nmr|no hp|hp|wa|ig|tiktok|roblox|username|id|email|alamat) (aku|ku|saya|gue|gw|ane)|nomorku|nomerku|akunku|follow aku|add aku|cari aku di|hubungi aku|telpon aku|telepon aku|chat aku di)\\b`)
];
const RX_PLACE = [
  // home address (English)
  /\b(i live (at|near|next to|on [a-z]+ (street|road|avenue|lane))|my address|my house is (at|near|next to|on [a-z]+ (street|road))|my home is (at|near|next to)|come to my house at)\b/,
  /\b\d+[a-z]?\s+[a-z]+(\s+[a-z]+)?\s+(street|road|avenue|lane|drive|boulevard|blvd|court|crescent)\b/,
  /\b(street|road|avenue|lane|blok)\s+[a-z]?\d+/,
  // home address (Indonesian)
  /\b(alamat|alamatku|alamatnya|rumahku (di|dekat|ada di|deket)|rumah (aku|saya|ku|gue|gw|kami) (di|ada di|dekat|deket)|(aku|saya|gue|gw|kami) tinggal di|tinggal di jalan)\b/,
  /\b(jalan|jln|jl)\.?\s+(?!(jalan|ke|bareng|terus|yuk|ayo|sama|dulu|lagi|kaki|pagi|sore|santai|aja|bersama)\b)[a-z]+(\s+[a-z]+)?\s*(no|nomor|nr|blok)\.?\s*\d/,
  /\b(gang|gg)\.?\s+(?!(wp|ez|rina|guys)\b)[a-z]+\s*(no|nomor)\.?\s*\d/, /\b(jl|jln)\.?\s+[a-z]+\s*\d/,
  /\b(jalan|jl|jln)\.?\s+[a-z]+\s+(no|nomor|nr)\.?\s*(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/, /\brt\s*\.?\s*0*\d+\s*\/?\s*rw\s*\.?\s*0*\d+/,
  /\b(komplek|kompleks|perumahan|perum|apartemen|apartment|cluster|kelurahan|kecamatan)\s+[a-z]/,
  // school names
  /\b(sd|sdn|sdit|sds|smp|smpn|tk|tkit|paud)\s*(negeri|n|swasta|islam|it|kristen|katolik|al|bina|\d)\b/,
  /\bsekolah(ku| aku| saya| gue| gw)\s+(di|namanya|nya di)\b/, /\bmy school('?s name)? is (called|named)\b/, /\bmy school'?s name\b/,
  /\bi go to [a-z]+( [a-z]+)? (school|academy|elementary|primary|international)\b/
];
// written with capitals, a place name gives itself away: "Jl. Melati 5", "SD Tarakanita", "I go to Al Azhar", "sekolahku Al Azhar"
const RX_PLACE_CAPS = [
  /\b(?:[Jj]alan|[Jj]ln?|[Gg]ang)\.?\s+[A-Z][a-z]+[^\n]{0,20}\d/, /\b(?:SD|SDN|SDIT|SMP|SMPN|TK|Sd|Smp)\s+[A-Z][a-z]{2,}/,
  /\b[Ii] go to (?:the )?[A-Z][A-Za-z]+/, /\b[Mm]y school is (?:the )?[A-Z][A-Za-z]+/, /\b[Ss]ekolah(?:ku| aku| saya)\s+[A-Z][a-z]+/
];
const NUMWORD = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, nol: 0, kosong: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, lapan: 8, sembilan: 9 };
// counting like "1 2 3 4 5 6 7 8", "100 200 300" or "3 3 3 3 3 3 3" is maths, not a phone number
function isCounting(nums) {
  if (nums.length < 3) return false; const d = nums[1] - nums[0];
  for (let i = 2; i < nums.length; i++) if (nums[i] - nums[i - 1] !== d) return false; return true;
}
const UNIT = /^(level|levels|lvl|lv|star|stars|coin|coins|point|points|pts|farm|farms|trophy|trophies|island|islands|puzzle|puzzles|bintang|koin|poin|kali|times|x|year|years|tahun|min|mins|minute|minutes|menit|jam|hour|hours|pm|am|th|st|nd|rd|kg|cm|km|m|percent|persen|rupiah|rp|dollar|dollars|ribu|juta)$/;
const CONNECT = new Set(['lalu', 'terus', 'trus', 'and', 'then', 'dan', 'habis', 'abis', 'itu', 'kemudian', 'ya', 'yg', 'yang', 'ok', 'oke', 'next', 'after', 'that', 'is', 'my', 'number', 'nomor', 'nomer', 'no', 'wa', 'hp', 'nya', 'dash', 'strip', 'spasi', 'space']);
/** Digits that look like part of a phone number: groups of 3+ digits or starting with 0/+, not round scores,
 *  not next to a unit word ("340 stars") and not in a sum ("6 + 6 = 12"), plus runs of number words. */
function phoneDigits(n) {
  const toks = n.replace(/[^a-z0-9+=×÷*]+/g, ' ').trim().split(' ');
  let total = 0;
  toks.forEach((w, i) => {
    const m = w.match(/^\+?(\d+)$/); if (!m) return; const d = m[1];
    if (d.length < 3 && !(d.length >= 2 && (d[0] === '0' || w[0] === '+'))) return;
    if (/^[1-9]0+$/.test(d)) return;
    if (UNIT.test(toks[i - 1] || '') || UNIT.test(toks[i + 1] || '')) return;
    if (/[=×÷*]/.test((toks[i - 1] || '') + (toks[i + 1] || '')) || (toks[i + 1] === '+' || (toks[i - 1] === '+'))) return;
    total += d.length;
  });
  let run = [];
  const end = () => { if (run.length >= 3 && !isCounting(run)) total += run.length; run = []; };
  for (const w of n.replace(/[^a-z]+/g, ' ').split(' ')) { if (Object.prototype.hasOwnProperty.call(NUMWORD, w)) run.push(NUMWORD[w]); else if (w && !CONNECT.has(w)) end(); }
  end();
  return total;
}
/** Digits and number words read as one stream, skipping little joining words ("0812 lalu 3456", "zero eight one two 3 4 5 6"). */
function phoneStream(n) {
  let vals = [], digits = 0, comma = false, maths = false, prevNum = false, op = false;
  const end = () => {
    const small = vals.length >= 3 && vals.every(v => v.s.length <= 2 && v.s[0] !== '0' && !v.w);
    const hit = digits >= 7 && !maths && !isCounting(vals.map(v => v.n)) && !(small && comma) && !(vals.length === 1 && /^[1-9]0+$/.test(vals[0].s));
    vals = []; digits = 0; comma = false; maths = false; prevNum = false; op = false; return hit;
  };
  for (const t of n.match(/\d+|[a-z]+|[,=+×÷*]/g) || []) {
    if (/^\d+$/.test(t)) { if (op && prevNum && t.length <= 3) maths = true; vals.push({ n: +t, s: t }); digits += t.length; prevNum = true; op = false; continue; }
    if (Object.prototype.hasOwnProperty.call(NUMWORD, t)) { vals.push({ n: NUMWORD[t], s: String(NUMWORD[t]), w: true }); digits++; prevNum = true; op = false; continue; }
    if (t === ',') { comma = true; continue; }
    if (t === '=') { maths = true; continue; }
    if (t === '+' || t === '×' || t === '÷' || t === '*' || t === 'x') { if (prevNum && vals.length && vals[vals.length - 1].s.length <= 3) op = true; continue; }
    if (CONNECT.has(t)) continue;
    if (end()) return true;
  }
  return end();
}
function hasPhone(n) {
  // 7 or more digits with at most 3 other characters between neighbouring digits ("0812a3456a789", "0812 🌻 3456")
  for (const mm of n.matchAll(/\d(?:[^\d]{0,3}\d){6,}/g)) {
    const m = mm[0]; const before = n.slice(Math.max(0, mm.index - 7), mm.index);
    const parts = m.match(/\d+/g); const nums = parts.map(Number);
    // a sum: "6 + 6 = 12", "3 x 3 = 9" (but "0812x3456x7890" is not maths)
    if (/[=×÷]/.test(m) || (/\d\s*[+*x]\s*\d/.test(m) && parts.every(p => p.length <= 3 && p[0] !== '0'))) continue;
    if (isCounting(nums)) continue;
    if (parts.length === 1 && /^[1-9]0+$/.test(parts[0])) continue;                // a round score like 1000000
    // a list of small scores "12, 15, 18, 20" (with commas, and not after "+", "wa", "no" or "number")
    if (parts.length >= 3 && m.includes(',') && parts.every(p => p.length <= 2 && p[0] !== '0') && !/(\+|wa|no|nomor|number|hp)\W*$/.test(before)) continue;
    return true;
  }
  return phoneStream(n) || phoneDigits(n) >= 7;
}
/** What one message adds to a phone number sent in pieces: phone-like digits, the digits of a short number-only message,
 *  and whether it looks like the start of a number ("08…", "+62…", "8 1 2"). */
function pieceInfo(text) {
  const n = norm(text); const compact = n.replace(/\s+/g, ''); const dCount = (compact.match(/\d/g) || []).length;
  const short = compact.length && compact.length <= 12 && dCount / compact.length >= 0.5 ? dCount : 0;
  const singles = (n.match(/\b\d\b/g) || []).map(Number);
  const marker = !!short && (/^(\+|0|62)/.test(compact) || (singles.length >= 3 && !isCounting(singles)));
  return { digits: phoneDigits(n), short, marker };
}

function contactOrLink(raw, names) {
  const n = norm(raw), nfkc = str(raw).normalize('NFKC');
  // a capital letter right after a full stop is a new sentence, not a web address ("I won.Yay", "home.In the park")
  const nl = norm(nfkc.replace(/([A-Za-z0-9])\.(?=[A-Z])/g, '$1. '));
  // single letters spaced out ("dot c o m") are joined for the link check
  const nj = n.replace(/\b[a-z](?:\s+[a-z]\b)+/g, m => m.replace(/\s+/g, ''));
  if (RX_EMAIL.some(r => r.test(n))) return 'contact';
  for (const m of n.matchAll(RX_HANDLE)) {
    if (names && names.has(nameKey(m[3]))) continue;
    if (/[0-9_.]/.test(m[3]) || !AT_WORDS.has(m[3])) return 'contact';
  }
  if (hasPhone(n) || RX_PLACE.some(r => r.test(n)) || RX_PLACE_CAPS.some(r => r.test(nfkc)) || RX_SOCIAL.some(r => r.test(n))) return 'contact';
  if (RX_LINK.some(r => r.test(n) || r.test(nj)) || RX_LINK_WORD.test(nl)) return 'link';
  return null;
}

/** Checks a chat message. opts.names: Set of group names (folded keys) that may be @mentioned and count as people.
 *  Returns { ok: true, text } or { ok: false, reason, text }. */
function checkMessage(raw, maxLen, opts) {
  const text = str(raw).replace(/[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || !norm(text).trim()) return { ok: false, reason: 'empty' };
  if ([...text].length > maxLen) return { ok: false, reason: 'long' };
  const names = opts && opts.names;
  const why = contactOrLink(text, names);
  if (why) return { ok: false, reason: why, text };
  if (isUnkind(text, names)) return { ok: false, reason: 'kind', text };
  return { ok: true, text };
}

// names that only differ by look-alike characters (AdIey with a capital i, Ad1ey, R0sa) count as the same name; Lia and Ila stay different
function nameKey(s) { return norm(str(s).replace(/[I1|]/g, 'l').replace(/0/g, 'o')).replace(/[^a-z0-9]+/g, ''); }
/** Checks a player or group name: Latin letters (with accents), spaces, ' - . and at most `maxDigits` digits.
 *  Returns { ok: true, name, key } or { ok: false, reason }. key is the look-alike-proof form used to keep names unique. */
function checkName(raw, maxLen, maxDigits) {
  const name = str(raw).normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, reason: 'empty' };
  if ([...name].length > maxLen) return { ok: false, reason: 'long' };
  if (!/^[\p{Script=Latin}0-9 '’.\-]+$/u.test(name) || !/\p{Script=Latin}/u.test(name)) return { ok: false, reason: 'chars' };
  if ((name.match(/\d/g) || []).length > (maxDigits == null ? 3 : maxDigits)) return { ok: false, reason: 'digits' };
  if (contactOrLink(name, null)) return { ok: false, reason: 'contact' };
  if (isUnkind(name)) return { ok: false, reason: 'kind' };
  return { ok: true, name, key: nameKey(name) };
}
/** Masks digits and the part after @ in a refused message before it is kept for the child's grown-up. */
const mask = t => str(t).replace(/\p{Nd}/gu, '•').replace(/@\s*\S+/g, '@•••');

module.exports = { checkMessage, checkName, nameKey, isUnkind, pieceInfo, mask, loadExtra, norm, _tokens: tokenLists };
