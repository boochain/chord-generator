/* 和弦进行生成引擎 — 纯函数，无 DOM 依赖（浏览器与 Node 通用） */
'use strict';
const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETPC = [0, 2, 4, 5, 7, 9, 11];
const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MODES = {
  major: { n: '大调 (Ionian)', s: [0, 2, 4, 5, 7, 9, 11], ref: 'M' },
  minor: { n: '自然小调 (Aeolian)', s: [0, 2, 3, 5, 7, 8, 10], ref: 'm' },
  harmonic: { n: '和声小调', s: [0, 2, 3, 5, 7, 8, 11], ref: 'm' },
  melodic: { n: '旋律小调', s: [0, 2, 3, 5, 7, 9, 11], ref: 'm' },
  dorian: { n: '多利亚 (Dorian)', s: [0, 2, 3, 5, 7, 9, 10], ref: 'm' },
  phrygian: { n: '弗里几亚 (Phrygian)', s: [0, 1, 3, 5, 7, 8, 10], ref: 'm' },
  lydian: { n: '利底亚 (Lydian)', s: [0, 2, 4, 6, 7, 9, 11], ref: 'M' },
  mixolydian: { n: '混合利底亚 (Mixolydian)', s: [0, 2, 4, 5, 7, 9, 10], ref: 'M' },
  locrian: { n: '洛克里亚 (Locrian)', s: [0, 1, 3, 5, 6, 8, 10], ref: 'm' },
};
const REFS = { M: [0, 2, 4, 5, 7, 9, 11], m: [0, 2, 3, 5, 7, 8, 10] };
const KEYS_M = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEYS_m = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const FUNC = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
const FUNC_CN = { T: '主功能', S: '下属功能', D: '属功能' };
const Q = {
  '': { sym: '', t: [[0, 0], [4, 2], [7, 4]], cls: 'M', r: '' },
  m: { sym: 'm', t: [[0, 0], [3, 2], [7, 4]], cls: 'm', r: '' },
  dim: { sym: 'dim', t: [[0, 0], [3, 2], [6, 4]], cls: 'd', r: '°' },
  aug: { sym: 'aug', t: [[0, 0], [4, 2], [8, 4]], cls: 'A', r: '+' },
  sus2: { sym: 'sus2', t: [[0, 0], [2, 1], [7, 4]], cls: 'M', r: 'sus2' },
  sus4: { sym: 'sus4', t: [[0, 0], [5, 3], [7, 4]], cls: 'M', r: 'sus4' },
  add9: { sym: 'add9', t: [[0, 0], [4, 2], [7, 4], [14, 1]], cls: 'M', r: 'add9' },
  madd9: { sym: 'm(add9)', t: [[0, 0], [3, 2], [7, 4], [14, 1]], cls: 'm', r: 'add9' },
  6: { sym: '6', t: [[0, 0], [4, 2], [7, 4], [9, 5]], cls: 'M', r: '6' },
  m6: { sym: 'm6', t: [[0, 0], [3, 2], [7, 4], [9, 5]], cls: 'm', r: '6' },
  69: { sym: '6/9', t: [[0, 0], [4, 2], [9, 5], [14, 1]], cls: 'M', r: '6/9' },
  maj7: { sym: 'maj7', t: [[0, 0], [4, 2], [7, 4], [11, 6]], cls: 'M', r: 'maj7' },
  7: { sym: '7', t: [[0, 0], [4, 2], [7, 4], [10, 6]], cls: 'M', r: '7', dom: 1 },
  m7: { sym: 'm7', t: [[0, 0], [3, 2], [7, 4], [10, 6]], cls: 'm', r: '7' },
  m7b5: { sym: 'm7b5', t: [[0, 0], [3, 2], [6, 4], [10, 6]], cls: 'd', r: 'ø7' },
  dim7: { sym: 'dim7', t: [[0, 0], [3, 2], [6, 4], [9, 6]], cls: 'd', r: '°7' },
  mMaj7: { sym: 'mMaj7', t: [[0, 0], [3, 2], [7, 4], [11, 6]], cls: 'm', r: '(maj7)' },
  'maj7#5': { sym: 'maj7#5', t: [[0, 0], [4, 2], [8, 4], [11, 6]], cls: 'A', r: '+maj7' },
  '7sus4': { sym: '7sus4', t: [[0, 0], [5, 3], [7, 4], [10, 6]], cls: 'M', r: '7sus4', dom: 1 },
  maj9: { sym: 'maj9', t: [[0, 0], [4, 2], [7, 4], [11, 6], [14, 1]], cls: 'M', r: 'maj9' },
  9: { sym: '9', t: [[0, 0], [4, 2], [7, 4], [10, 6], [14, 1]], cls: 'M', r: '9', dom: 1 },
  m9: { sym: 'm9', t: [[0, 0], [3, 2], [7, 4], [10, 6], [14, 1]], cls: 'm', r: '9' },
  m11: { sym: 'm11', t: [[0, 0], [3, 2], [10, 6], [14, 1], [17, 3]], cls: 'm', r: '11' },
  13: { sym: '13', t: [[0, 0], [4, 2], [10, 6], [14, 1], [21, 5]], cls: 'M', r: '13', dom: 1 },
  'maj7#11': { sym: 'maj7#11', t: [[0, 0], [4, 2], [7, 4], [11, 6], [18, 3]], cls: 'M', r: 'maj7♯11' },
  '7b9': { sym: '7b9', t: [[0, 0], [4, 2], [7, 4], [10, 6], [13, 1]], cls: 'M', r: '7♭9', dom: 1 },
  '7#9': { sym: '7#9', t: [[0, 0], [4, 2], [7, 4], [10, 6], [15, 1]], cls: 'M', r: '7♯9', dom: 1 },
  '7#11': { sym: '7#11', t: [[0, 0], [4, 2], [10, 6], [14, 1], [18, 3]], cls: 'M', r: '7♯11', dom: 1 },
  '7b13': { sym: '7b13', t: [[0, 0], [4, 2], [10, 6], [20, 5]], cls: 'M', r: '7♭13', dom: 1 },
  '7#5': { sym: '7#5', t: [[0, 0], [4, 2], [8, 4], [10, 6]], cls: 'A', r: '+7', dom: 1 },
  '7alt': { sym: '7alt', t: [[0, 0], [4, 2], [10, 6], [13, 1], [20, 5]], cls: 'M', r: '7alt', dom: 1 },
};
function mkRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function wpick(rng, obj) {
  const ks = Object.keys(obj).filter((k) => obj[k] > 0);
  let tot = 0;
  for (const k of ks) tot += obj[k];
  let r = rng() * tot;
  for (const k of ks) { r -= obj[k]; if (r <= 0) return k; }
  return ks[ks.length - 1];
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mod = (x, n) => ((x % n) + n) % n;
const METERS = {
  '2/4': { n: 2, d: 4, g: [1, 1] },
  '3/4': { n: 3, d: 4, g: [1, 1, 1] },
  '4/4': { n: 4, d: 4, g: [1, 1, 1, 1] },
  '5/4': { n: 5, d: 4, g: [3, 2] },
  '6/8': { n: 6, d: 8, g: [3, 3] },
  '7/8': { n: 7, d: 8, g: [2, 2, 3] },
  '9/8': { n: 9, d: 8, g: [3, 3, 3] },
  '12/8': { n: 12, d: 8, g: [3, 3, 3, 3] },
};
function unitSec(meter, bpm) {
  const M = METERS[meter];
  if (M.d === 4) return 60 / bpm;
  if (M.n % 3 === 0 && M.n > 3) return 60 / bpm / 3;
  return 60 / bpm / 2;
}
function beatGroups(meter) {
  const M = METERS[meter];
  if (M.d === 4) return Array.from({ length: M.n }, (_, i) => i);
  const out = []; let p = 0;
  for (const g of M.g) { out.push(p); p += g; }
  return out;
}
function splitBar(meter, cpb) {
  const M = METERS[meter];
  if (cpb <= 1) return [M.n];
  if (M.d === 4 && M.n === 4 && cpb === 2) return [2, 2];
  const g = M.d === 4 && M.n === 5 ? [1, 1, 1, 1, 1] : M.g.slice();
  if (g.length % cpb === 0) {
    const k = g.length / cpb, out = [];
    for (let i = 0; i < cpb; i++) out.push(g.slice(i * k, i * k + k).reduce((a, b) => a + b, 0));
    return out;
  }
  if (cpb > g.length) return Array(cpb).fill(M.n / cpb);
  const target = M.n / cpb, out = []; let acc = 0;
  for (let i = 0; i < g.length; i++) {
    acc += g[i];
    const left = g.length - i - 1, need = cpb - out.length - 1;
    if (need > 0 && (acc >= target - 1e-9 || left <= need)) { out.push(acc); acc = 0; }
  }
  if (acc > 0) out.push(acc);
  while (out.length > cpb) { const x = out.pop(); out[out.length - 1] += x; }
  return out;
}
/* ---------- 风格数据库 ---------- */
const BASE = { modes: { major: 3, minor: 2 }, tpl: [], tplP: 0.5, ext: 1, tempo: [80, 130], meters: ['4/4'], pat: 'block', borrow: 0.1, sec: 0.1, tri: 0, slash: 0.2, sus: 0.05, penta: false, hr: { 1: 3, 2: 1 } };
const GENRES = [
  ['流行 Pop', { modes: { major: 4, minor: 2, mixolydian: 0.5 }, tpl: ['1 5 6 4', '6 4 1 5', '1 6 4 5', '4 5 3 6', '1 4 6 5', '4 1 5 6', '1 3 4 5'], tplP: 0.6, ext: 1, tempo: [88, 128], pat: 'pulse', slash: 0.35, sec: 0.12, borrow: 0.12, desc: '流行音乐以 I–V–vi–IV 等四和弦循环为核心，强调悦耳与重复。' }, [
    ['主流流行 Mainstream', {}],
    ['K-pop', { modes: { minor: 3, major: 2, dorian: 1 }, tpl: ['6 4 1 5', '1 5 6 4', '6 4 5 3', '4 5 6 6'], tempo: [95, 132], ext: 2, sec: 0.2 }],
    ['J-pop', { tpl: ['4 5 3 6', '4 5 6 6', '6 4 5 1', '4 5 3 6 2 5 1 1'], ext: 2, sec: 0.25, tempo: [100, 150], desc: 'J-pop 偏爱“王道进行” IV–V–iii–vi 与丰富的七和弦、副属和弦。' }],
    ['华语流行 Mandopop', { tpl: ['1 5 6 3 4 1 4 5', '1 6 4 5', '6 4 5 1', '1 3 6 5 4 3 2 5'], tempo: [68, 110], slash: 0.5, desc: '华语流行常用卡农式下行低音与 1–5–6–3–4–1–4–5 “卡农进行”。' }],
    ['City Pop', { ext: 2, tpl: ['4 5 3 6', '2 5 1 6', '4 3 2 5'], tempo: [92, 120], sec: 0.35, tri: 0.1, pat: 'funk', desc: 'City Pop 融合爵士与放克：大七、九和弦，ii–V 与王道进行。' }],
    ['合成器流行 Synthpop', { modes: { minor: 3, major: 2 }, tpl: ['1 6 3 7', '6 4 1 5', 'i bVI bIII bVII'], ext: 0, tempo: [110, 130], sus: 0.15 }],
    ['梦幻流行 Dream Pop', { modes: { major: 2, lydian: 2, minor: 1 }, ext: 2, tempo: [70, 100], pat: 'pad', sus: 0.2 }],
    ['独立流行 Indie Pop', { tpl: ['1 4 1 5', '1 3 4 4', '6 5 4 1'], ext: 1, tempo: [95, 125], pat: 'strum' }],
    ['电子流行 Electropop', { modes: { minor: 3, major: 2 }, ext: 0, tempo: [110, 128], sus: 0.15 }],
    ['抒情慢歌 Ballad', { tempo: [60, 80], ext: 2, slash: 0.6, pat: 'arp', sec: 0.2, meters: ['4/4', '6/8', '12/8'], hr: { 1: 2, 2: 2 } }],
    ['青少年流行 Teen Pop', { ext: 0, tempo: [110, 130] }],
    ['迪斯科流行 Disco Pop', { ext: 2, tempo: [112, 124], pat: 'funk', tpl: ['2 5 1 6', '6 2 5 1'] }],
    ['泡泡糖流行 Bubblegum', { ext: 0, tempo: [115, 135], tpl: ['1 6 4 5', '1 4 5 4'] }],
  ]],
  ['摇滚 Rock', { modes: { major: 2, mixolydian: 2, minor: 2, dorian: 0.5 }, tpl: ['I bVII IV I', '1 4 5 4', 'i bVI bVII i', '1 5 4 4', '1 4', 'i bVII bVI bVII'], tplP: 0.6, ext: 0, tempo: [100, 160], pat: 'drive', sus: 0.15, borrow: 0.25, desc: '摇滚和声大量使用借用和弦（♭VII、♭VI），混合利底亚 ♭VII–IV–I 是经典进行。' }, [
    ['经典摇滚 Classic Rock', {}],
    ['硬摇滚 Hard Rock', { tempo: [110, 150], modes: { minor: 2, mixolydian: 2 } }],
    ['朋克 Punk', { tempo: [150, 200], tpl: ['1 4 5', '1 5 6 4'], borrow: 0.1 }],
    ['流行朋克 Pop Punk', { tempo: [150, 190], tpl: ['1 5 6 4', '6 4 1 5'], modes: { major: 4, minor: 1 } }],
    ['另类摇滚 Alternative', { modes: { minor: 2, major: 2, dorian: 1 }, ext: 1, tempo: [90, 140] }],
    ['独立摇滚 Indie Rock', { ext: 1, tempo: [100, 140], pat: 'strum' }],
    ['垃圾摇滚 Grunge', { modes: { minor: 3, phrygian: 1 }, tempo: [90, 130], tpl: ['i bIII IV IV', 'i bVI bVII i'] }],
    ['前卫摇滚 Prog Rock', { ext: 1, meters: ['7/8', '5/4', '4/4', '9/8'], modes: { dorian: 2, lydian: 1, minor: 2, major: 1 }, sec: 0.2, tplP: 0.3 }],
    ['迷幻摇滚 Psychedelic', { modes: { mixolydian: 2, dorian: 2, phrygian: 1 }, ext: 1, tempo: [80, 120], tpl: ['I bVII IV I', 'i IV'] }],
    ['后摇 Post-rock', { ext: 1, tempo: [70, 120], pat: 'arp', sus: 0.3, modes: { major: 2, lydian: 1, minor: 2 } }],
    ['英伦摇滚 Britpop', { tempo: [95, 130], tpl: ['1 3 4 1', '1 5 6 4', '1 4 1 5'] }],
    ['软摇滚 Soft Rock', { ext: 1, tempo: [75, 110], slash: 0.4, modes: { major: 4, minor: 1 }, pat: 'strum' }],
  ]],
  ['爵士 Jazz', { modes: { major: 3, minor: 1, dorian: 1 }, tpl: ['2 5 1 1', '2 5 1 6', '1 6 2 5', '3 6 2 5', '1 V/2 2 5', '4 7 3 6 2 5 1 1'], tplP: 0.55, ext: 2, sec: 0.35, tri: 0.3, borrow: 0.15, tempo: [100, 220], pat: 'swing', slash: 0.1, desc: '爵士核心是 ii–V–I 与五度圈运动，大量使用七/九/十三和弦、副属与三全音替代（SubV）。' }, [
    ['比波普 Bebop', { tempo: [170, 220], tri: 0.4, hr: { 2: 3, 1: 1 } }],
    ['摇摆 Swing', { tempo: [120, 180] }],
    ['波萨诺瓦 Bossa Nova', { tempo: [110, 140], pat: 'bossa', tpl: ['1 V/2 2 5', '2 5 1 1', '1 1 2 5'], tri: 0.15, desc: '波萨诺瓦：轻柔切分节奏，大七和弦、ii–V 与半音下行。' }],
    ['调式爵士 Modal Jazz', { modes: { dorian: 4, mixolydian: 1, lydian: 1 }, tplP: 0.1, sec: 0.05, tri: 0.05, tempo: [110, 170], hr: { 1: 1, 0.5: 3 }, desc: '调式爵士（如 So What）以长时值的调式和弦为基础，弱化功能和声。' }],
    ['平滑爵士 Smooth Jazz', { tempo: [80, 110], pat: 'pulse', tri: 0.1 }],
    ['冷爵士 Cool Jazz', { tempo: [100, 150] }],
    ['硬波普 Hard Bop', { modes: { minor: 2, major: 2, dorian: 1 }, tempo: [140, 200] }],
    ['爵士抒情 Jazz Ballad', { tempo: [50, 75], pat: 'arp', hr: { 1: 1, 2: 2 } }],
    ['融合爵士 Fusion', { ext: 3, modes: { mixolydian: 2, dorian: 2, lydian: 1 }, meters: ['4/4', '7/8', '5/4'], pat: 'funk', tempo: [100, 140] }],
    ['吉普赛爵士 Gypsy Jazz', { modes: { minor: 2, harmonic: 2, major: 1 }, tpl: ['1 4 5 1', '1 1 5 5', 'i iv V i'], tempo: [150, 210], ext: 1 }],
    ['拉丁爵士 Latin Jazz', { pat: 'latin', modes: { minor: 2, major: 2, dorian: 1 }, tempo: [140, 200] }],
  ]],
  ['布鲁斯 Blues', { modes: { major: 1 }, tpl: ['I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', 'I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7'], fixed: true, tplP: 1, ext: 1, tempo: [70, 130], meters: ['4/4', '12/8'], pat: 'shuffle', borrow: 0, sec: 0, hr: { 1: 1 }, desc: '12 小节布鲁斯：I7–IV7–V7 三个属七和弦构成，结尾用 V7 作“回转”（turnaround）。' }, [
    ['三角洲布鲁斯 Delta', { ext: 0, tempo: [70, 100] }],
    ['芝加哥布鲁斯 Chicago', { tempo: [90, 130] }],
    ['德州布鲁斯 Texas', { tempo: [100, 140] }],
    ['爵士布鲁斯 Jazz Blues', { tpl: ['I7 IV7 I7 v7 IV7 IV7 I7 VI7 ii7 V7 I7 V7'], ext: 2, pat: 'swing', tempo: [120, 180] }],
    ['小调布鲁斯 Minor Blues', { modes: { minor: 1 }, tpl: ['i7 i7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7'], tempo: [60, 100] }],
    ['慢布鲁斯 Slow Blues', { meters: ['12/8'], tempo: [45, 70] }],
    ['布吉伍吉 Boogie-woogie', { tempo: [140, 180], pat: 'drive' }],
  ]],
  ['R&B / 灵魂乐 Soul', { modes: { major: 2, minor: 2, dorian: 1 }, tpl: ['2 5 1 6', '4 3 2 1', 'IV iv I I', '1 3 4 5', '4 5 3 6'], ext: 2, sec: 0.25, borrow: 0.2, tempo: [65, 100], pat: 'pulse', slash: 0.3, desc: 'R&B/灵魂乐使用大量七、九和弦与下行级进（IV–iii–ii–I），借用小 iv 带来“灵魂感”。' }, [
    ['经典灵魂乐 Classic Soul', { ext: 1 }],
    ['摩城 Motown', { tempo: [100, 130], ext: 1, modes: { major: 4 } }],
    ['当代 R&B', { tempo: [60, 95] }],
    ['新灵魂乐 Neo-soul', { ext: 3, modes: { dorian: 3, minor: 1, major: 1 }, tempo: [65, 90], tri: 0.1, desc: 'Neo-soul：多利亚色彩、九/十一和弦、慵懒的摇摆律动。' }],
    ['静谧风暴 Quiet Storm', { tempo: [60, 80], pat: 'pad' }],
    ['新杰克摇摆 New Jack Swing', { tempo: [100, 115], pat: 'funk', modes: { minor: 3, dorian: 1 } }],
  ]],
  ['放克 Funk', { modes: { dorian: 3, mixolydian: 2, minor: 1 }, tpl: ['i7 IV7', 'I7 IV7', '1 1 4 4', 'i7 i7 bVII7 IV7'], tplP: 0.6, ext: 2, tempo: [95, 120], pat: 'funk', borrow: 0.1, sec: 0.05, hr: { 1: 2, 0.5: 2 }, desc: '放克以单和弦或两和弦属七/小七 vamp 为主，重点在 16 分切分律动。' }, [
    ['经典放克 Classic Funk', {}],
    ['P-Funk', { tempo: [95, 110] }],
    ['迪斯科 Disco', { modes: { major: 2, minor: 2, dorian: 1 }, tpl: ['2 5 1 6', '6 2 5 1', 'i7 iv7'], tempo: [112, 128], pat: 'pulse' }],
    ['放克摇滚 Funk Rock', { ext: 1, tempo: [100, 125] }],
    ['新迪斯科 Nu-Disco', { tempo: [115, 125], tpl: ['6 4 1 5', '2 5 1 6'], pat: 'pulse' }],
  ]],
  ['嘻哈 Hip-hop', { modes: { minor: 3, dorian: 1, harmonic: 0.5 }, tpl: ['1 6', '6 4 1 5', 'i bVI', 'i iv', 'i bVI bIII bVII'], tplP: 0.6, ext: 2, tempo: [80, 100], pat: 'boom', hr: { 1: 2, 0.5: 2 }, desc: '嘻哈和声多为 2–4 和弦的采样式循环（loop），小调为主。' }, [
    ['老派 Boom Bap', {}],
    ['低保真 Lo-fi', { ext: 3, tempo: [70, 90], sec: 0.3, tpl: ['2 5 1 1', '4 3 6 6', '4 3 2 1', '1 6 2 5'], modes: { major: 2, minor: 2, dorian: 1 }, desc: 'Lo-fi：爵士化的七/九和弦循环，慵懒的摇摆与略带怀旧的音色。' }],
    ['陷阱 Trap', { tempo: [130, 160], modes: { minor: 3, harmonic: 2, phrygian: 1 }, ext: 0, pat: 'pad' }],
    ['钻头 Drill', { tempo: [138, 145], modes: { harmonic: 2, phrygian: 2, minor: 1 }, ext: 0, pat: 'pad' }],
    ['爵士说唱 Jazz Rap', { ext: 3, sec: 0.2, tpl: ['2 5 1 6', '1 6 2 5'] }],
    ['云说唱 Cloud Rap', { tempo: [60, 80], pat: 'pad', modes: { minor: 2, lydian: 1, major: 1 } }],
  ]],
  ['电子 EDM', { modes: { minor: 3, major: 2 }, tpl: ['6 4 1 5', 'i bVI bIII bVII', '1 5 6 4', 'i bVII bVI bVII'], tplP: 0.65, ext: 1, tempo: [120, 140], pat: 'pulse', sus: 0.2, desc: '电子舞曲常用 vi–IV–I–V 或小调 i–♭VI–♭III–♭VII 循环，配合八分音符脉冲。' }, [
    ['浩室 House', { tempo: [122, 128], ext: 2 }],
    ['深浩室 Deep House', { tempo: [118, 124], ext: 2, modes: { dorian: 2, minor: 2 }, pat: 'skank' }],
    ['科技舞曲 Techno', { tempo: [125, 140], tpl: ['1 1 1 1', 'i bVII', 'i iv'], ext: 0 }],
    ['迷幻舞曲 Trance', { tempo: [136, 140], tpl: ['6 4 1 5', 'i bVI bIII bVII', 'i bVI bVII i'] }],
    ['前卫浩室 Progressive House', { tempo: [124, 130] }],
    ['未来贝斯 Future Bass', { tempo: [140, 160], ext: 2, sus: 0.3, modes: { major: 3, minor: 2 }, tpl: ['4 5 3 6', '1 5 6 4', '4 1 5 6'] }],
    ['回响贝斯 Dubstep', { tempo: [140, 150], modes: { minor: 3, phrygian: 1, harmonic: 1 }, ext: 0, pat: 'pad' }],
    ['鼓打贝斯 Drum & Bass', { tempo: [170, 176], ext: 2, pat: 'pad' }],
    ['合成器浪潮 Synthwave', { tempo: [80, 118], tpl: ['i bVI bIII bVII', '1 6 3 7', 'i bVI bVII i'], ext: 0 }],
    ['冷浪 Chillwave', { tempo: [80, 100], ext: 2, pat: 'pad', modes: { major: 2, lydian: 1, minor: 1 } }],
    ['英式车库 UK Garage', { tempo: [130, 136], ext: 2, pat: 'skank' }],
    ['硬派舞曲 Hardstyle', { tempo: [150, 155], modes: { minor: 3, harmonic: 1 } }],
    ['电子摇摆 Electro Swing', { tempo: [120, 130], modes: { minor: 2, harmonic: 1, major: 1 }, pat: 'swing', sec: 0.25 }],
  ]],
  ['古典 Classical', { modes: { major: 3, minor: 1, harmonic: 2 }, tpl: ['1 4 5 1', '1 6 2 5', '1 4 1 5', '1 4 7 3 6 2 5 1', '1 2 5 1'], tplP: 0.45, ext: 0, sec: 0.25, borrow: 0.1, tempo: [60, 132], meters: ['4/4', '3/4', '2/4', '6/8'], pat: 'arp', slash: 0.6, desc: '古典和声遵循 T–S–D–T 功能序进，终止式（正格/变格/半终止）与平稳的声部进行是核心。' }, [
    ['巴洛克 Baroque', { ext: 1, sec: 0.35, tpl: ['1 4 7 3 6 2 5 1', '1 5 6 3 4 1 4 5', '1 4 5 1'], desc: '巴洛克：五度圈模进、卡农低音、通奏低音式的转位运用。' }],
    ['古典主义 Classical era', { pat: 'alberti', tpl: ['1 4 5 1', '1 2 5 1', '1 6 4 5'] }],
    ['浪漫主义 Romantic', { ext: 1, borrow: 0.3, sec: 0.4, tempo: [50, 100], modes: { major: 2, minor: 2, harmonic: 2 }, desc: '浪漫主义：频繁的借用和弦、副属和弦与半音化，情感色彩浓烈。' }],
    ['印象派 Impressionist', { ext: 2, modes: { lydian: 2, dorian: 1, major: 1, mixolydian: 1 }, borrow: 0.3, sec: 0.05, pat: 'pad', tplP: 0.15, slash: 0.2, tempo: [50, 90], desc: '印象派（德彪西、拉威尔）：调式色彩、平行九和弦、弱化功能进行。' }],
    ['卡农 Canon', { tpl: ['1 5 6 3 4 1 4 5'], tplP: 0.9 }],
    ['圣咏 Chorale', { pat: 'block', tempo: [60, 80], slash: 0.7, sec: 0.3 }],
    ['极简主义 Minimalism', { tplP: 0.3, tempo: [100, 140], hr: { 0.5: 2, 1: 2 }, modes: { minor: 2, major: 2, dorian: 1 } }],
    ['歌剧 Opera', { modes: { harmonic: 2, major: 2, minor: 1 }, sec: 0.35, borrow: 0.2, ext: 1 }],
  ]],
  ['民谣/乡村 Folk & Country', { modes: { major: 4, mixolydian: 1, minor: 1 }, tpl: ['1 4 5 1', '1 5 4 1', '1 4 1 5', '1 6 4 5'], tplP: 0.6, ext: 0, tempo: [80, 130], meters: ['4/4', '3/4', '6/8'], pat: 'strum', sus: 0.1, slash: 0.3, desc: '民谣与乡村以 I、IV、V 三和弦为骨架，强调扫弦律动与旋律叙事。' }, [
    ['美式民谣 American Folk', {}],
    ['乡村 Country', { tempo: [90, 130], sec: 0.15 }],
    ['蓝草 Bluegrass', { tempo: [120, 180], meters: ['2/4', '4/4'], sec: 0.2 }],
    ['凯尔特 Celtic', { modes: { mixolydian: 2, dorian: 2, major: 2 }, meters: ['6/8', '9/8', '3/4'], tempo: [90, 140] }],
    ['校园民谣', { ext: 1, tempo: [70, 100], slash: 0.5, tpl: ['1 5 6 3 4 1 4 5', '1 6 4 5'] }],
    ['独立民谣 Indie Folk', { ext: 1, tempo: [80, 115], modes: { major: 3, minor: 2 } }],
    ['美式乡土 Americana', { modes: { major: 3, mixolydian: 2 }, tempo: [80, 115] }],
  ]],
  ['拉丁 Latin', { modes: { minor: 2, major: 2, harmonic: 1 }, tpl: ['i iv V i', 'i bVII bVI V', '1 4 5 4', '1 5 5 1'], tplP: 0.55, ext: 1, tempo: [90, 130], pat: 'latin', sec: 0.15, desc: '拉丁音乐融合西班牙和声（安达卢西亚终止 i–♭VII–♭VI–V）与非洲节奏。' }, [
    ['萨尔萨 Salsa', { tempo: [160, 200], tpl: ['1 4 5 4', 'i iv V i'] }],
    ['巴恰塔 Bachata', { tempo: [125, 140], modes: { minor: 2, major: 2 } }],
    ['雷鬼顿 Reggaeton', { tempo: [88, 100], tpl: ['i bVI bIII bVII', '6 4 1 5'], ext: 0, modes: { minor: 3 } }],
    ['探戈 Tango', { modes: { harmonic: 3, minor: 1 }, meters: ['2/4', '4/4'], tempo: [110, 130], pat: 'block' }],
    ['弗拉门戈 Flamenco', { modes: { phrygian: 3, harmonic: 1 }, tpl: ['i bVII bVI V', 'iv bIII bII I'], tplP: 0.8, meters: ['3/4', '12/8', '4/4'], ext: 0, desc: '弗拉门戈：弗里几亚调式与安达卢西亚终止，♭II–I 是标志性的终止。' }],
    ['桑巴 Samba', { meters: ['2/4'], tempo: [95, 105], ext: 2, modes: { major: 3, minor: 1 } }],
    ['恰恰 Cha-cha-cha', { tempo: [110, 125] }],
    ['昆比亚 Cumbia', { meters: ['2/4', '4/4'], tempo: [85, 100], ext: 0, tpl: ['1 5 5 1', '1 4 5 1'] }],
  ]],
  ['金属 Metal', { modes: { minor: 2, phrygian: 3, harmonic: 2, locrian: 0.5 }, tpl: ['i bII i i', 'i bVI bVII i', 'i bVII bVI bVII', 'i bVI bIII bVII'], tplP: 0.6, ext: 0, tempo: [100, 200], pat: 'drive', sus: 0, borrow: 0.2, sec: 0.05, desc: '金属多用小调、弗里几亚（♭II）与和声小调，强力和弦与半音移动制造压迫感。' }, [
    ['重金属 Heavy Metal', {}],
    ['鞭击金属 Thrash', { tempo: [160, 220] }],
    ['死亡金属 Death Metal', { modes: { phrygian: 2, locrian: 2, harmonic: 1 }, tempo: [140, 220] }],
    ['黑金属 Black Metal', { tempo: [150, 220], modes: { minor: 3, harmonic: 1 }, pat: 'pad' }],
    ['力量金属 Power Metal', { modes: { harmonic: 2, minor: 2, major: 1 }, tempo: [150, 200], tpl: ['i bVI bVII i', 'i bVII bVI V'] }],
    ['前卫金属 Prog Metal', { meters: ['7/8', '5/4', '9/8', '4/4'], ext: 1, tplP: 0.3 }],
    ['金属核 Metalcore', { tempo: [120, 180], tpl: ['i bVI bIII bVII', '6 4 1 5'] }],
    ['Djent', { meters: ['7/8', '9/8', '4/4'], ext: 1, tempo: [100, 140] }],
    ['交响金属 Symphonic Metal', { modes: { harmonic: 2, minor: 2 }, sec: 0.2, pat: 'pad' }],
  ]],
  ['游戏/影视配乐 Score', { modes: { minor: 2, major: 2, lydian: 1, dorian: 1 }, tpl: ['i bVI bIII bVII', 'I bVI bVII I', 'I III IV iv', 'i bVI iv V', 'I II iv I'], tplP: 0.5, ext: 1, borrow: 0.35, sec: 0.15, tempo: [60, 140], meters: ['4/4', '3/4', '6/8'], pat: 'pad', slash: 0.3, desc: '配乐强调色彩与情绪：借用和弦（♭VI–♭VII–I “英雄终止”）、利底亚的 II 大三和弦带来奇幻感。' }, [
    ['史诗预告片 Epic Trailer', { modes: { minor: 3, harmonic: 1 }, tempo: [80, 140], tpl: ['i bVI bIII bVII', 'i bVI iv V'] }],
    ['RPG 冒险', { modes: { major: 2, mixolydian: 1, dorian: 1 }, tpl: ['I bVI bVII I', '1 4 5 6'] }],
    ['8-bit 芯片音乐 Chiptune', { tempo: [120, 160], pat: 'arp', ext: 0, tpl: ['I bVI bVII I', '1 5 6 4', '6 4 5 1'] }],
    ['恐怖 Horror', { modes: { locrian: 2, phrygian: 2, harmonic: 1 }, tempo: [50, 80], tplP: 0.2 }],
    ['动画配乐 Anime', { modes: { major: 3, minor: 2 }, tpl: ['4 5 3 6', '4 5 6 6', '6 4 5 1'], sec: 0.3 }],
    ['奇幻 Fantasy', { modes: { lydian: 3, major: 1 }, tpl: ['I II iv I', '1 2 1 2'] }],
    ['科幻 Sci-fi', { modes: { lydian: 2, dorian: 1, minor: 1 }, ext: 2, tempo: [70, 110] }],
    ['战斗 Battle', { modes: { harmonic: 3, minor: 2 }, tempo: [140, 180], pat: 'drive', tpl: ['i bVI bVII i', 'i bII i i'] }],
    ['剧情 Drama', { tempo: [60, 90], pat: 'arp', modes: { minor: 2, major: 2 } }],
  ]],
  ['国风/五声 Chinese', { modes: { major: 3, minor: 2 }, tpl: ['1 5 6 3', '4 5 3 6', '6 3 4 1', '1 6 2 5'], tplP: 0.5, ext: 0, sus: 0.3, penta: true, borrow: 0, sec: 0.05, tempo: [60, 110], meters: ['4/4', '2/4', '3/4'], pat: 'arp', desc: '国风以五声音阶（宫商角徵羽）为旋律基础，和声避开偏音（4、7 级）为根音，多用挂留与加九和弦。' }, [
    ['古风 Gufeng', {}],
    ['中国风流行', { ext: 1, tpl: ['4 5 3 6', '1 5 6 3 4 1 4 5'], tempo: [70, 100], pat: 'pulse' }],
    ['戏腔流行', { modes: { minor: 3, major: 1 }, tempo: [65, 90] }],
    ['江南丝竹', { meters: ['2/4', '4/4'], tempo: [70, 100], modes: { major: 4 } }],
    ['五声调式 宫商角徵羽', { tplP: 0.2 }],
    ['和风 Japanese', { penta: false, modes: { phrygian: 2, minor: 2 }, tpl: ['i bII i i', 'iv bIII bII i'], sus: 0.2 }],
  ]],
  ['福音 Gospel', { modes: { major: 4, minor: 1 }, tpl: ['1 6 2 5', '4 5 3 6', 'IV iv I I', '1 3 4 4', '4 #iv° 1 6'], ext: 2, sec: 0.4, borrow: 0.3, tempo: [70, 140], pat: 'block', slash: 0.5, desc: '福音音乐：丰富的副属与借用（iv、#iv°），大量转位与半音化的低音线。' }, [
    ['传统福音 Traditional', { ext: 1, meters: ['4/4', '12/8', '6/8'] }],
    ['当代福音 Contemporary', { ext: 3 }],
    ['灵歌 Spiritual', { ext: 1, tempo: [60, 90] }],
  ]],
  ['雷鬼 Reggae', { modes: { major: 2, minor: 2, dorian: 1 }, tpl: ['1 4', '1 5 4 1', 'i iv', '1 4 5 4'], tplP: 0.65, ext: 0, tempo: [70, 90], pat: 'skank', hr: { 1: 3, 0.5: 1 }, desc: '雷鬼：两三个和弦的循环，吉他在反拍“skank”。' }, [
    ['根源雷鬼 Roots', {}],
    ['达布 Dub', { tempo: [65, 80], ext: 1, pat: 'pad' }],
    ['斯卡 Ska', { tempo: [140, 180], modes: { major: 3 } }],
    ['舞厅雷鬼 Dancehall', { tempo: [90, 100], modes: { minor: 3 } }],
    ['摇滚稳定 Rocksteady', { tempo: [75, 95], ext: 1 }],
  ]],
  ['氛围 Ambient', { modes: { lydian: 2, major: 2, dorian: 1, minor: 1 }, tpl: ['1 4', '1 2', '1 6 4 4'], tplP: 0.3, ext: 2, tempo: [50, 90], pat: 'pad', sus: 0.3, sec: 0, hr: { 0.5: 3, 1: 2 }, desc: '氛围音乐：长时值、慢变化的调式和弦，挂留与延伸音营造空间感。' }, [
    ['氛围 Ambient', {}],
    ['新世纪 New Age', { modes: { major: 3, lydian: 1 }, pat: 'arp', tplP: 0.5, tpl: ['1 5 6 4', '4 1 5 6'] }],
    ['嗡鸣 Drone', { tplP: 0.6, tpl: ['1 1 1 1', '1 2 1 2'], ext: 1 }],
    ['冥想 Meditation', { tempo: [40, 70], modes: { lydian: 2, major: 2, mixolydian: 1 } }],
    ['新古典 Neo-classical', { pat: 'arp', modes: { minor: 2, major: 2 }, tplP: 0.5, tpl: ['1 5 6 4', '6 4 1 5', '1 3 6 4'], ext: 1, slash: 0.5 }],
  ]],
];
const STYLES = [];
for (const [gname, gdef, subs] of GENRES) {
  for (const [sname, sdef] of subs) {
    const st = Object.assign({}, BASE, gdef, sdef, { genre: gname, name: sname });
    st.id = STYLES.length;
    STYLES.push(st);
  }
}
const MOODS = {
  欢快: { m: { major: 2, lydian: 1.4, mixolydian: 1.3, minor: 0.4, harmonic: 0.3, phrygian: 0.2, locrian: 0.1 }, t: 0, tempo: 1.15, borrow: 0, sec: 0.05, d: '明亮的大调色彩、较快的速度' },
  悲伤: { m: { minor: 2, harmonic: 1.3, dorian: 1.2, major: 0.5, lydian: 0.5 }, t: 0.5, tempo: 0.8, borrow: 0.1, sec: 0, d: '小调色彩、更慢的速度、借用和弦带来的暗淡感' },
  史诗: { m: { minor: 1.6, harmonic: 1.4, major: 1, mixolydian: 1.2 }, t: 0, tempo: 1, borrow: 0.2, sec: 0, d: '♭VI、♭VII 借用和弦与宏大的终止' },
  浪漫: { m: { major: 1.5, lydian: 1.2 }, t: 1, tempo: 0.9, borrow: 0.1, sec: 0.15, d: '七/九和弦与副属和弦增加温柔与渴望感' },
  紧张: { m: { phrygian: 2, harmonic: 1.8, locrian: 1.5, minor: 1.3, major: 0.3, lydian: 0.4 }, t: 1, tempo: 1.15, borrow: 0.15, sec: 0.1, d: '弗里几亚/和声小调的半音与不协和张力' },
  治愈: { m: { major: 1.8, lydian: 1.4, minor: 0.6 }, t: 0.5, tempo: 0.85, borrow: 0, sec: 0.05, sus: 0.15, d: '大调、挂留和加九和弦，柔和稳定' },
  梦幻: { m: { lydian: 2.5, major: 1.2, dorian: 1 }, t: 1, tempo: 0.9, borrow: 0.15, sec: 0, sus: 0.15, d: '利底亚 #4 的漂浮感与延伸音' },
  黑暗: { m: { phrygian: 2, locrian: 1.5, minor: 1.5, harmonic: 1.5, major: 0.2, lydian: 0.2, mixolydian: 0.4 }, t: 0.5, tempo: 0.95, borrow: 0.2, sec: 0, d: '暗色调式、♭II 与减和弦' },
  怀旧: { m: { major: 1.3, mixolydian: 1.3, dorian: 1.2 }, t: 0.5, tempo: 0.9, borrow: 0.15, sec: 0.15, d: '借用小 iv 与副属和弦带来“回忆感”' },
  神秘: { m: { dorian: 1.6, phrygian: 1.5, lydian: 1.3, harmonic: 1.2, major: 0.6 }, t: 0.5, tempo: 0.9, borrow: 0.2, sec: 0, d: '调式色彩与不确定的终止' },
  激昂: { m: { major: 1.4, mixolydian: 1.4, minor: 1.2 }, t: 0, tempo: 1.2, borrow: 0.1, sec: 0.05, d: '强烈的属功能推动与较快的速度' },
  平静: { m: { major: 1.3, lydian: 1.3, minor: 0.8 }, t: 0.5, tempo: 0.75, borrow: 0, sec: 0, sus: 0.1, d: '慢速度、稳定的主功能' },
  忧郁: { m: { dorian: 1.8, minor: 1.6, major: 0.5 }, t: 1, tempo: 0.85, borrow: 0.1, sec: 0.05, d: '多利亚/小调与七和弦的灰色调' },
  慵懒: { m: { dorian: 1.8, minor: 1.3, mixolydian: 1.2 }, t: 1.5, tempo: 0.9, borrow: 0.05, sec: 0.1, d: '九/十一和弦与多利亚色彩' },
  中性: { m: {}, t: 0, tempo: 1, borrow: 0, sec: 0, d: '不额外修饰' },
};
/* ---------- 基础乐理 ---------- */
function keyName(pc, mode) { return (MODES[mode].ref === 'M' ? KEYS_M : KEYS_m)[mod(pc, 12)]; }
function keyLetter(pc, mode) { return LET.indexOf(keyName(pc, mode)[0]); }
function spell(pc, letter) {
  pc = mod(pc, 12); letter = mod(letter, 7);
  let d = mod(pc - LETPC[letter], 12);
  if (d > 6) d -= 12;
  if (Math.abs(d) > 1) return KEYS_M[pc];
  return LET[letter] + (d > 0 ? '#' : d < 0 ? 'b' : '');
}
function diatonicQ(scale, step, seventh) {
  const r = scale[step];
  const th = mod(scale[(step + 2) % 7] - r, 12), fi = mod(scale[(step + 4) % 7] - r, 12), se = mod(scale[(step + 6) % 7] - r, 12);
  const t = th === 4 && fi === 7 ? '' : th === 3 && fi === 7 ? 'm' : th === 3 && fi === 6 ? 'dim' : th === 4 && fi === 8 ? 'aug' : th === 4 ? '' : 'm';
  if (!seventh) return t;
  const map = { '': { 11: 'maj7', 10: '7' }, m: { 10: 'm7', 11: 'mMaj7' }, dim: { 10: 'm7b5', 9: 'dim7' }, aug: { 11: 'maj7#5', 10: '7' } };
  return map[t][se] || { '': '7', m: 'm7', dim: 'm7b5', aug: 'aug' }[t];
}
function romanOf(ctx, rel, step, q) {
  const ref = REFS[MODES[ctx.mode].ref];
  let acc = mod(rel - ref[step], 12); if (acc > 6) acc -= 12;
  const pre = acc < 0 ? '♭'.repeat(-acc) : acc > 0 ? '♯'.repeat(acc) : '';
  const cls = Q[q].cls;
  const num = cls === 'm' || cls === 'd' ? NUM[step].toLowerCase() : NUM[step];
  return pre + num + Q[q].r;
}
function funcOfStep(ctx, i) { return MODES[ctx.mode].ref === 'm' && i === 6 ? 'S' : FUNC[i]; }
function dia(ctx, step) {
  const s = MODES[ctx.mode].s;
  return { rel: s[step], step, q: diatonicQ(s, step, false), func: funcOfStep(ctx, step), tag: '', diat: true };
}
function tonic(ctx) { return dia(ctx, 0); }
function secDom(ctx, t) {
  const s = MODES[ctx.mode].s, tq = diatonicQ(s, t, false);
  return { rel: mod(s[t] + 7, 12), step: (t + 4) % 7, q: '', dom: true, func: 'D', tag: '副属', sec: romanOf(ctx, s[t], t, tq) };
}
function tritoneOf(c) {
  return Object.assign({}, c, { rel: mod(c.rel + 6, 12), step: (c.step + 4) % 7, q: '7', fixedQ: false, dom: true, tag: '三全音替代', sub: true, diat: false, sec: c.sec || 'I' });
}
function cadV(ctx) {
  const s = MODES[ctx.mode].s;
  const c = { rel: 7, step: 4, q: '', dom: true, func: 'D', tag: '', diat: s[4] === 7 && diatonicQ(s, 4, false) === '' };
  if (!c.diat) c.tag = MODES[ctx.mode].ref === 'm' ? '和声小调属' : '借用';
  return c;
}
function parseTok(tok, ctx) {
  let m = tok.match(/^([1-7])$/);
  if (m) return dia(ctx, +m[1] - 1);
  m = tok.match(/^V\/([1-7])$/);
  if (m) return secDom(ctx, +m[1] - 1);
  m = tok.match(/^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|ø)?(maj7|7)?$/);
  if (!m) throw new Error('bad token ' + tok);
  const step = NUM.indexOf(m[2].toUpperCase());
  const rel = mod(MAJ[step] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0), 12);
  const upper = m[2] === m[2].toUpperCase();
  let q;
  if (m[3] === '°') q = m[4] ? 'dim7' : 'dim';
  else if (m[3] === 'ø') q = 'm7b5';
  else if (upper) q = m[4] === '7' ? '7' : m[4] === 'maj7' ? 'maj7' : '';
  else q = m[4] ? 'm7' : 'm';
  const s = MODES[ctx.mode].s;
  const nat = MODES.minor.s;
  const diat = (s[step] === rel && Q[diatonicQ(s, step, false)].cls === Q[q].cls) || (['harmonic', 'melodic'].includes(ctx.mode) && nat[step] === rel && Q[diatonicQ(nat, step, false)].cls === Q[q].cls);
  const c = { rel, step, q, func: funcOfStep(ctx, step), tag: diat ? '' : '借用', diat, fixedQ: !!m[4] };
  if (q === '7') c.dom = true;
  if (rel === 7 && Q[q].cls === 'M') { c.dom = true; c.func = 'D'; if (!diat) c.tag = MODES[ctx.mode].ref === 'm' ? '和声小调属' : '借用'; }
  return c;
}

/* ---------- 功能马尔可夫链 ---------- */
const TRANS = { T: { T: 0.2, S: 0.5, D: 0.3 }, S: { T: 0.15, S: 0.25, D: 0.6 }, D: { T: 0.7, S: 0.15, D: 0.15 } };
const STEPW = [5, 3, 1, 4, 5, 3, 1];
const CHAR = { dorian: 3, mixolydian: 6, lydian: 1, phrygian: 1, locrian: 4, harmonic: 4, melodic: 3 };
const MODAL = ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'];
function stepWeights(ctx, style) {
  const s = MODES[ctx.mode].s, w = STEPW.slice();
  for (let i = 0; i < 7; i++) {
    const q = diatonicQ(s, i, false);
    if (q === 'dim' || q === 'aug') w[i] *= ctx.mode === 'locrian' && i === 0 ? 1 : 0.15;
  }
  if (CHAR[ctx.mode] !== undefined) w[CHAR[ctx.mode]] *= 3;
  if (MODAL.includes(ctx.mode)) w[4] *= 0.4;
  if (style.penta) {
    const ok = MODES[ctx.mode].ref === 'M' ? [0, 1, 2, 4, 5] : [0, 2, 3, 4, 6];
    for (let i = 0; i < 7; i++) if (!ok.includes(i)) w[i] = 0;
  }
  return w;
}
function markov(ctx, style, n, rng, startFunc) {
  const w = stepWeights(ctx, style), out = [];
  let f = startFunc || 'T', prev = -1;
  for (let i = 0; i < n; i++) {
    const cand = {};
    for (let k = 0; k < 7; k++) if (funcOfStep(ctx, k) === f && k !== prev && w[k] > 0) cand[k] = w[k];
    if (!Object.keys(cand).length) for (let k = 0; k < 7; k++) if (k !== prev && w[k] > 0) cand[k] = w[k];
    let step = +wpick(rng, cand);
    if (i === 0 && !startFunc && rng() < 0.75) step = 0;
    out.push(dia(ctx, step)); prev = step;
    f = wpick(rng, TRANS[f]);
  }
  return out;
}
function borrowOf(ctx, c, rng) {
  const ref = MODES[ctx.mode].ref;
  const opts = ref === 'M'
    ? { 3: [{ rel: 5, q: 'm' }], 5: [{ rel: 8, q: '' }], 6: [{ rel: 10, q: '' }], 2: [{ rel: 3, q: '' }], 1: [{ rel: 2, q: 'dim' }] }
    : { 4: [{ rel: 7, q: '', dom: true }], 3: [{ rel: 5, q: '' }], 1: [{ rel: 1, q: '' }] };
  const o = opts[c.step];
  if (!o) return null;
  const b = pick(rng, o);
  const s = MODES[ctx.mode].s;
  if (s[c.step] === b.rel && diatonicQ(s, c.step, false) === b.q) return null;
  if (ctx.mode === 'locrian' || ctx.mode === 'phrygian') return null;
  return { rel: b.rel, step: c.step, q: b.q, func: b.dom ? 'D' : c.func, tag: b.dom ? '和声小调属' : '借用', dom: !!b.dom, diat: false };
}
function cadence(ctx, style, rng, type) {
  const T = tonic(ctx);
  if (!type) {
    if (MODAL.includes(ctx.mode)) type = rng() < 0.75 || ['phrygian', 'locrian', 'lydian'].includes(ctx.mode) ? 'modal' : 'auth';
    else type = rng() < 0.78 ? 'auth' : 'plagal';
  }
  if (type === 'auth') return { type, ch: [cadV(ctx), T], n: '正格终止 V→I' };
  if (type === 'plagal') return { type, ch: [dia(ctx, 3), T], n: '变格终止 IV→I' };
  if (type === 'half') return { type, ch: [cadV(ctx)], n: '半终止（停在 V）' };
  const cs = { dorian: 3, mixolydian: 6, lydian: 1, phrygian: 1, locrian: 1 }[ctx.mode];
  if (cs === undefined) return cadence(ctx, style, rng, 'auth');
  const c = dia(ctx, cs); c.tag = '调式特征';
  return { type: 'modal', ch: [c, T], n: '调式终止 ' + romanOf(ctx, c.rel, c.step, c.q) + '→' + romanOf(ctx, 0, 0, T.q) };
}
function buildProg(ctx, style, n, rng, o = {}) {
  let chords, tplUsed = null;
  if (o.tplOK !== false && style.tpl.length && rng() < style.tplP) {
    tplUsed = pick(rng, style.tpl);
    const toks = tplUsed.split(' ');
    chords = []; for (let i = 0; i < n; i++) chords.push(parseTok(toks[i % toks.length], ctx));
  } else chords = markov(ctx, style, n, rng, o.startFunc);
  const fixedForm = !!(style.fixed && tplUsed);
  let cad = null, k = 0;
  if (fixedForm) {
    if (n >= 2) { chords[n - 2] = parseTok('V7', ctx); chords[n - 1] = parseTok(tplUsed.split(' ')[0], ctx); }
    cad = { type: 'blues', n: '布鲁斯回转 V7→I7' };
  } else if (o.end !== 'none' && n >= 2) {
    cad = cadence(ctx, style, rng, !o.end || o.end === 'cad' ? null : o.end);
    k = cad.ch.length;
    for (let i = 0; i < k; i++) chords[n - k + i] = Object.assign({}, cad.ch[i]);
  }
  if (!fixedForm) {
    const bp = clamp(style.borrow + (o.borrowAdd || 0), 0, 0.8);
    for (let i = 1; i < n - k; i++) if (chords[i].diat && rng() < bp * 0.5) { const b = borrowOf(ctx, chords[i], rng); if (b) chords[i] = b; }
    const sp = clamp(style.sec + (o.secAdd || 0), 0, 0.8);
    // 从后往前插入副属，保证每个 V/x 的目标和弦不会再被替换
    for (let i = n - k - 1; i >= 1; i--) {
      const nx = chords[i + 1];
      if (nx && nx.diat && nx.step !== 0 && Q[nx.q].cls !== 'd' && Q[nx.q].cls !== 'A' && rng() < sp) chords[i] = secDom(ctx, nx.step);
    }
  }
  if (!fixedForm && style.tri > 0) {
    for (let i = n - 2; i >= 1; i--) {
      const c = chords[i], nx = chords[i + 1];
      if (c.dom && Q[c.q].cls === 'M' && (c.tag === '副属' || c.rel === 7) && mod(nx.rel - c.rel, 12) === 5 && nx.tag !== '三全音替代' && chords[i - 1].tag !== '副属' && rng() < style.tri) {
        chords[i] = tritoneOf(c);
        if (i === n - 2 && cad) cad.n += '（属和弦用三全音替代）';
      }
    }
  }
  repairSecondary(chords, ctx);
  return { chords, tplUsed, cad };
}
// 保证每个副属/三全音替代确实解决到下一个和弦（模板循环或终止式替换后可能失配）
function repairSecondary(chords, ctx) {
  for (let i = chords.length - 2; i >= 0; i--) {
    const c = chords[i], nx = chords[i + 1], d = mod(nx.rel - c.rel, 12);
    if ((c.tag === '副属' && d !== 5) || (c.tag === '三全音替代' && d !== 11)) {
      const t = MODES[ctx.mode].s.indexOf(nx.rel);
      chords[i] = c.tag === '副属' && nx.diat && t > 0 && Q[nx.q].cls !== 'd' ? Object.assign(secDom(ctx, t), { q: c.q, done: c.done }) : dia(ctx, c.step);
    }
  }
  const last = chords[chords.length - 1];
  if (last && (last.tag === '副属' || last.tag === '三全音替代')) chords[chords.length - 1] = dia({ tonic: ctx.tonic, mode: ctx.mode }, last.step);
}

/* ---------- 复杂度 ---------- */
const COMPLEX = ['三和弦', '七和弦', '九/十一/十三', '变化和弦 (altered)'];
function applyComplexity(chords, ctx, style, level, rng, susAdd) {
  const s = MODES[ctx.mode].s;
  for (const c of chords) {
    if (c.fixedQ || c.seed || c.done) continue;
    c.done = true;
    let L = level;
    if (L > 0 && rng() < 0.2) L--;
    const cls = Q[c.q].cls;
    let q = c.q;
    if (L >= 1) {
      if (c.diat && !c.dom) {
        const useNat = (ctx.mode === 'harmonic' && c.step !== 4 && c.step !== 6) || (ctx.mode === 'melodic' && ![3, 4, 6].includes(c.step));
        const sc = useNat && MODES.minor.s[c.step] === c.rel ? MODES.minor.s : s;
        q = diatonicQ(sc, c.step, true);
      }
      else if (cls === 'M') q = c.dom || c.rel === 10 ? '7' : 'maj7';
      else if (cls === 'm') q = 'm7';
      else if (cls === 'd') q = c.dom ? 'dim7' : 'm7b5';
      else q = 'aug';
      if (c.dom && Q[q].cls === 'M') q = '7';
    }
    if (L >= 2) {
      const up = { maj7: ['maj9', 'maj9', '69', 'maj7'], 7: ['9', '13', '9'], m7: ['m9', 'm11', 'm9'] };
      if (up[q]) q = pick(rng, up[q]);
      if (ctx.mode === 'lydian' && c.rel === 0 && q.startsWith('maj')) q = 'maj7#11';
    }
    if (L >= 3 && Q[q].dom && c.rel !== 0 && c.rel !== 10) q = pick(rng, ['7b9', '7#9', '7alt', '7#11', '13', '7b13']);
    if (L === 0 && style.penta && cls === 'M' && rng() < 0.3) q = pick(rng, ['add9', 'sus2', '6']);
    if (cls === 'M' && !c.sub && q === (L >= 1 ? q : '') && rng() < (style.sus + (susAdd || 0)) * (c.rel === 0 ? 0.4 : 1)) {
      q = Q[q].dom ? (L >= 1 ? '7sus4' : 'sus4') : (L >= 1 ? q : pick(rng, ['sus2', 'sus4']));
    }
    c.q = q;
  }
}
/* ---------- 实现与声部进行 ---------- */
function realize(c, ctx) {
  const kl = keyLetter(ctx.tonic, ctx.mode);
  c.pc = mod(ctx.tonic + c.rel, 12); c.letter = mod(kl + c.step, 7);
  c.root = spell(c.pc, c.letter);
  if (c.xb) { c.xbPc = mod(ctx.tonic + c.xb.rel, 12); c.xbName = spell(c.xbPc, kl + c.xb.step); }
  if (c.sub) c.roman = 'subV7/' + c.sec;
  else if (c.sec) c.roman = 'V' + (Q[c.q].dom ? Q[c.q].r : '') + '/' + c.sec;
  else c.roman = romanOf(ctx, c.rel, c.step, c.q);
  return c;
}
function chordName(c) {
  let n = c.root + Q[c.q].sym;
  if (c.xb) n += '/' + c.xbName;
  else if (c.bass > 0) { const t = Q[c.q].t[c.bass]; n += '/' + spell(c.pc + t[0], c.letter + t[1]); }
  return n;
}
function voiceAll(list, style, rng) {
  let prevU = null, prevB = null;
  list.forEach((c, i) => {
    const T = Q[c.q].t;
    let tones = T.map((x) => x[0]);
    if (tones.length > 4) tones = tones.filter((x) => x !== 7);
    const pcs = tones.map((x) => mod(c.pc + x, 12));
    let best = null, bc = 1e9;
    for (let r = 0; r < pcs.length; r++) {
      for (const lo of [52, 57, 62]) {
        const rot = pcs.slice(r).concat(pcs.slice(0, r));
        let cur = lo + mod(rot[0] - lo, 12); const notes = [cur];
        for (let k = 1; k < rot.length; k++) { cur = cur + (mod(rot[k] - cur, 12) || 12); notes.push(cur); }
        if (notes[notes.length - 1] > 81) continue;
        let cost = 0;
        if (prevU) {
          for (const nn of notes) cost += Math.min(...prevU.map((p) => Math.abs(p - nn)));
          for (const p of prevU) cost += Math.min(...notes.map((nn) => Math.abs(p - nn)));
        } else cost = Math.abs(notes[0] - 57) + (r ? 2 : 0);
        cost += Math.abs((notes[0] + notes[notes.length - 1]) / 2 - 64) * 0.15 + rng() * 0.5;
        if (cost < bc) { bc = cost; best = notes; }
      }
    }
    c.upper = best; prevU = best;
    const next = list[i + 1];
    const edge = i === 0 || !next || next.section !== c.section || (list[i - 1] && list[i - 1].section !== c.section);
    const cand = [0];
    if (!edge && Q[c.q].cls !== 'd') for (let k = 1; k < T.length; k++) if ([2, 4, 6].includes(T[k][1])) cand.push(k);
    const pen = { 2: 3, 4: 5, 6: 6 };
    let bb = 0, bcost = 1e9, bnote = 0;
    for (const k of cand) {
      const pc = mod(c.pc + T[k][0], 12);
      const note = 38 + mod(pc - 38, 12);
      const cost = (prevB === null ? 0 : Math.abs(note - prevB)) + (k ? pen[T[k][1]] : 0) * (1.6 - style.slash) * 1.6 + rng();
      if (cost < bcost) { bcost = cost; bb = k; bnote = note; }
    }
    if (c.seedBass !== undefined && c.seedBass < T.length) { bb = c.seedBass; bnote = 38 + mod(c.pc + T[bb][0] - 38, 12); }
    if (c.lb !== undefined && c.lb < T.length) { bb = c.lb; bnote = 38 + mod(c.pc + T[bb][0] - 38, 12); }
    if (c.xb) { bb = 0; bnote = 38 + mod(c.xbPc - 38, 12); }
    c.bass = bb; c.bassNote = bnote; prevB = bnote;
    while (Math.min(...c.upper) <= bnote + 2) c.upper = c.upper.map((x) => x + 12);
    c.name = chordName(c);
  });
}

/* ---------- 设置解析 ---------- */
const BAR_OPTS = [4, 8, 12, 16, 24, 32];
const HR_OPTS = [0.5, 1, 2, 4];
const isSet = (v) => v !== undefined && v !== null && v !== '' && v !== 'rand' && v !== 'auto';
function resolve(o, rng) {
  const r = {};
  let cands = STYLES;
  if (isSet(o.genre)) cands = STYLES.filter((s) => s.genre === o.genre);
  r.style = isSet(o.style) ? STYLES[+o.style] : pick(rng, cands);
  const st = r.style;
  r.mood = isSet(o.mood) ? o.mood : pick(rng, Object.keys(MOODS));
  const md = MOODS[r.mood];
  if (isSet(o.mode)) r.mode = o.mode;
  else {
    const w = {};
    for (const k of Object.keys(MODES)) { const base = st.modes[k] || ((md.m[k] || 0) > 1.2 ? 0.25 : 0); w[k] = base * (md.m[k] || 1); }
    if (st.penta) for (const k of Object.keys(w)) if (!['major', 'minor'].includes(k)) w[k] = 0;
    if (!Object.values(w).some((x) => x > 0)) w.major = 1;
    r.mode = wpick(rng, w);
  }
  r.tonic = isSet(o.key) ? mod(+o.key, 12) : Math.floor(rng() * 12);
  r.meter = isSet(o.meter) ? o.meter : pick(rng, st.meters);
  if (isSet(o.bpm)) r.bpm = clamp(+o.bpm, 40, 220);
  else {
    let lo = st.tempo[0] * md.tempo, hi = st.tempo[1] * md.tempo;
    const span = hi - lo;
    if (o.feel === '慢') hi = lo + span / 3; else if (o.feel === '快') lo = hi - span / 3; else if (o.feel === '中') { lo += span / 3; hi -= span / 3; }
    r.bpm = clamp(Math.round(lo + rng() * (hi - lo)), 40, 220);
  }
  r.feel = r.bpm < 80 ? '慢' : r.bpm < 125 ? '中' : '快';
  r.bars = isSet(o.bars) ? clamp(+o.bars, 1, 64) : (st.fixed ? pick(rng, [12, 12, 24]) : pick(rng, [4, 8, 8, 8, 16]));
  r.complexity = isSet(o.complexity) ? clamp(+o.complexity, 0, 3) : clamp(Math.round(st.ext + md.t * rng() + (rng() - 0.5) * 0.8), 0, 3);
  if (isSet(o.hr)) r.hr = +o.hr;
  else {
    const w = Object.assign({}, st.hr);
    if (r.bpm > 150) { w[2] = (w[2] || 0) * 0.3; w[0.5] = (w[0.5] || 0) + 0.5; }
    if (r.bpm < 75) w[2] = (w[2] || 0) + 1;
    r.hr = +wpick(rng, w);
  }
  if (r.hr === 0.5 && r.bars % 2) r.hr = 1;
  if (r.hr > METERS[r.meter].n) r.hr = METERS[r.meter].n;
  return r;
}
function layout(nCh, cpb, meter, firstIdx) {
  const bars = [], N = METERS[meter].n;
  if (cpb === 0.5) {
    for (let i = 0; i < nCh; i++) { bars.push([{ ci: firstIdx + i, start: 0, dur: N }]); bars.push([{ ci: firstIdx + i, start: 0, dur: N, cont: true }]); }
    return bars;
  }
  const parts = splitBar(meter, cpb);
  let ci = firstIdx;
  for (let b = 0; b < nCh / cpb; b++) {
    const bar = []; let st = 0;
    for (const p of parts) { bar.push({ ci: ci++, start: st, dur: p }); st += p; }
    bars.push(bar);
  }
  return bars;
}
function finalize(song, rng) {
  const all = [];
  song.sections.forEach((sec, si) => sec.chords.forEach((c) => { c.section = si; realize(c, sec); all.push(c); }));
  voiceAll(all, song.style, rng);
  let idx = 0;
  song.sections.forEach((sec) => {
    sec.keyLabel = keyName(sec.tonic, sec.mode) + ' ' + MODES[sec.mode].n;
    sec.bars = layout(sec.chords.length, song.hr, song.meter, idx);
    idx += sec.chords.length;
  });
  song.flat = all;
  for (const c of all) if (c.tag === '转调属' && song.sections[c.section + 1]) c.roman = 'V7/→' + keyName(song.sections[c.section + 1].tonic, song.sections[c.section + 1].mode);
  return song;
}
function settingsOut(r) {
  return { style: r.style.name, genre: r.style.genre, styleId: r.style.id, mood: r.mood, mode: r.mode, modeName: MODES[r.mode].n, tonic: r.tonic, key: keyName(r.tonic, r.mode), meter: r.meter, bpm: r.bpm, feel: r.feel, bars: r.bars, complexity: r.complexity, complexityName: COMPLEX[r.complexity], hr: r.hr, pattern: PATTERNS[r.style.pat] };
}
function describeChords(chords, ctx) {
  const out = [], uniq = (a) => [...new Set(a)].join('、');
  const by = (t) => chords.filter((c) => c.tag === t);
  const bor = chords.filter((c) => c.tag === '借用' || c.tag === '和声小调属');
  if (bor.length) out.push('借用/变化和弦：' + uniq(bor.map((c) => `${c.name}（${c.roman}）`)) + '，借自平行调式（小调中的 V 来自和声小调），为进行增添色彩。');
  if (by('副属').length) out.push('副属和弦：' + uniq(by('副属').map((c) => `${c.name}（${c.roman}）`)) + '，临时把下一个和弦当作“主”，制造更强的解决倾向。');
  if (by('三全音替代').length) out.push('三全音替代：' + uniq(by('三全音替代').map((c) => `${c.name}（${c.roman}）`)) + '，与原属和弦共享三全音，低音半音下行解决。');
  if (by('调式特征').length) out.push(`调式特征和弦：${uniq(by('调式特征').map((c) => c.name))}，凸显 ${MODES[ctx.mode].n} 的特征音。`);
  if (by('转调属').length) out.push('转调：' + uniq(by('转调属').map((c) => c.name)) + ' 是新调的属七和弦，作为转入上方大二度新调的枢纽。');
  const inv = chords.filter((c) => c.bass > 0);
  if (inv.length) out.push('转位：' + uniq(inv.map((c) => c.name)) + '，根据声部进行选择转位，让低音线更平滑（级进或保持）。');
  return out;
}

/* ---------- 模式一：随机生成 ---------- */
function generate(o = {}) {
  const seed = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 2 ** 31);
  const rng = mkRng(seed);
  const r = resolve(o, rng), st = r.style, md = MOODS[r.mood];
  const ctx = { tonic: r.tonic, mode: r.mode };
  const n = Math.max(2, Math.round(r.bars * r.hr));
  const p = buildProg(ctx, st, n, rng, { borrowAdd: md.borrow, secAdd: md.sec });
  applyComplexity(p.chords, ctx, st, r.complexity, rng, md.sus);
  const song = { kind: 'random', seed, style: st, meter: r.meter, bpm: r.bpm, hr: r.hr, settings: settingsOut(r), sections: [{ name: '和弦进行', tonic: ctx.tonic, mode: ctx.mode, chords: p.chords }] };
  finalize(song, rng);
  const ex = [];
  ex.push(`调性：${keyName(ctx.tonic, ctx.mode)} ${MODES[ctx.mode].n}；风格：${st.genre} › ${st.name}；情绪：${r.mood}（${md.d}）。`);
  if (st.desc) ex.push(st.desc);
  ex.push(p.tplUsed ? `以风格模板「${p.tplUsed}」为骨架（数字=调内级数），再按风格/情绪概率做借用、副属等替换。` : '使用 主(T)→下属(S)→属(D)→主(T) 的功能和声马尔可夫链加权生成，并突出调式特征和弦。');
  if (p.cad) ex.push('结尾：' + p.cad.n + '。');
  ex.push(...describeChords(song.flat, ctx));
  ex.push(`复杂度：${COMPLEX[r.complexity]}；和声节奏：每小节 ${r.hr} 个和弦；拍号 ${r.meter}，${r.bpm} BPM（${r.feel}）；伴奏型：${PATTERNS[st.pat]}。`);
  song.explanation = ex;
  return song;
}
/* ---------- 模式二：根据给定和弦扩展 ---------- */
const SUF = { '': '', M: '', maj: '', m: 'm', min: 'm', '-': 'm', dim: 'dim', '°': 'dim', o: 'dim', aug: 'aug', '+': 'aug', 7: '7', dom7: '7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', m7: 'm7', min7: 'm7', '-7': 'm7', m7b5: 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', 'm7-5': 'm7b5', dim7: 'dim7', '°7': 'dim7', o7: 'dim7', mMaj7: 'mMaj7', mM7: 'mMaj7', 'm(maj7)': 'mMaj7', sus2: 'sus2', sus4: 'sus4', sus: 'sus4', '7sus4': '7sus4', '7sus': '7sus4', add9: 'add9', add2: 'add9', madd9: 'madd9', 'm(add9)': 'madd9', 6: '6', m6: 'm6', 69: '69', '6/9': '69', 9: '9', maj9: 'maj9', M9: 'maj9', m9: 'm9', 11: '9', m11: 'm11', 13: '13', '7b9': '7b9', '7#9': '7#9', '7#11': '7#11', '7b13': '7b13', '7alt': '7alt', alt: '7alt', 'maj7#11': 'maj7#11', 'maj7#5': 'maj7#5', 5: '', '7#5': '7#5', '7+5': '7#5', aug7: '7#5', '+7': '7#5', '△': 'maj7', '△7': 'maj7', 'maj7(#11)': 'maj7#11', mi: 'm', mi7: 'm7', min9: 'm9', 'm(b5)': 'dim', mb5: 'dim', 'min(maj7)': 'mMaj7', sus24: 'sus4', '7(b9)': '7b9', '7(#9)': '7#9', dom9: '9', 'add(9)': 'add9', 'madd2': 'madd9', '(add9)': 'add9', 'm(add2)': 'madd9', 'm7-b5': 'm7b5', 'm7(b5)': 'm7b5', 'mi7b5': 'm7b5' };
function parseChord(sym) {
  const s = sym.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[Ａ-Ｚａ-ｚ０-９＃]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/（/g, '(').replace(/）/g, ')').replace(/／/g, '/');
  const m = s.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return null;
  let rest = m[3], bass = null;
  const sl = rest.match(/^(.*)\/([A-Ga-g][#b]?)$/);
  if (sl) { rest = sl[1]; bass = sl[2]; }
  if (!Object.prototype.hasOwnProperty.call(SUF, rest)) return null;
  const letter = LET.indexOf(m[1].toUpperCase());
  const pc = mod(LETPC[letter] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), 12);
  let bassPc = null;
  let bassLetter = null;
  if (bass) { bassLetter = LET.indexOf(bass[0].toUpperCase()); bassPc = mod(LETPC[bassLetter] + (bass[1] === '#' ? 1 : bass[1] === 'b' ? -1 : 0), 12); }
  return { pc, letter, q: SUF[rest], bassPc, bassLetter, text: s };
}
function parseSeeds(text) {
  const toks = String(text).replace(/6\/9/g, '69').split(/[\s,，、|｜;；→>·]+|[-–—](?=[A-G]|[a-g](?![0-9]))/).filter(Boolean);
  const out = [], bad = [];
  for (const t of toks) { const c = parseChord(t); if (c) out.push(c); else bad.push(t); }
  return { chords: out, bad };
}
const INFER_MODES = { major: 0.6, minor: 0.5, dorian: 0, mixolydian: 0, harmonic: -0.2, phrygian: -0.4, lydian: -0.4 };
function inferKey(seeds) {
  const res = [];
  for (let t = 0; t < 12; t++) for (const mode of Object.keys(INFER_MODES)) {
    const s = MODES[mode].s; let sc = INFER_MODES[mode];
    seeds.forEach((c, i) => {
      const rel = mod(c.pc - t, 12), step = s.indexOf(rel);
      if (step >= 0) {
        const dq = diatonicQ(s, step, false);
        const match = Q[dq].cls === Q[c.q].cls || (Q[c.q].sym.startsWith('sus') && dq !== 'dim');
        sc += match ? 3 : 0.8;
        if (Q[c.q].dom && diatonicQ(s, step, true) !== '7') sc -= rel === 7 ? 0.3 : 0.8;
        if (rel === 0 && match) sc += i === 0 ? 2 : i === seeds.length - 1 ? 1.5 : 0.3;
      } else sc -= 1.5;
    });
    res.push({ tonic: t, mode, score: Math.round(sc * 100) / 100, name: keyName(t, mode) + ' ' + MODES[mode].n });
  }
  res.sort((a, b) => b.score - a.score);
  return res;
}
function seedToRel(c, ctx) {
  const rel = mod(c.pc - ctx.tonic, 12), step = mod(c.letter - keyLetter(ctx.tonic, ctx.mode), 7);
  const s = MODES[ctx.mode].s;
  const diat = s[step] === rel && Q[diatonicQ(s, step, false)].cls === Q[c.q].cls;
  const o = { rel, step, q: c.q, seed: true, diat, func: funcOfStep(ctx, step), tag: diat ? '' : '借用' };
  if (Q[c.q].dom) o.dom = true;
  if (!diat && Q[c.q].dom) {
    const t = (step + 3) % 7;
    if (s[t] === mod(rel + 5, 12) && t !== 0) { o.tag = '副属'; o.func = 'D'; o.sec = romanOf(ctx, s[t], t, diatonicQ(s, t, false)); }
  }
  if (rel === 7 && Q[c.q].cls === 'M') { o.func = 'D'; o.dom = true; if (!diat) o.tag = MODES[ctx.mode].ref === 'm' ? '和声小调属' : '借用'; }
  if (c.bassPc !== null) {
    const k = Q[c.q].t.findIndex((x) => mod(c.pc + x[0], 12) === c.bassPc);
    if (k > 0) o.seedBass = k;
    else if (k < 0) o.xb = { rel: mod(c.bassPc - ctx.tonic, 12), step: mod(c.bassLetter - keyLetter(ctx.tonic, ctx.mode), 7) };
  }
  return o;
}
const SECTION_PLANS = {
  短: ['Intro', 'Verse', 'Chorus', 'Outro'],
  标准: ['Intro', 'Verse', 'Pre-chorus', 'Chorus', 'Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  长: ['Intro', 'Verse', 'Pre-chorus', 'Chorus', 'Interlude', 'Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Pre-chorus', 'Chorus', 'Chorus', 'Outro'],
};
const SECTION_CN = { Intro: '前奏 Intro', Verse: '主歌 Verse', 'Pre-chorus': '导歌 Pre-chorus', Chorus: '副歌 Chorus', Bridge: '桥段 Bridge', Interlude: '间奏 Interlude', Outro: '尾奏 Outro' };
const cp = (c) => Object.assign({}, c);
function expand(o = {}) {
  const seed = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 2 ** 31);
  const rng = mkRng(seed);
  const parsed = parseSeeds(o.seeds || '');
  if (!parsed.chords.length) throw new Error('无法识别输入的和弦：' + (o.seeds || '（空）'));
  const inf = inferKey(parsed.chords);
  let best = inf[0];
  if (isSet(o.key) && isSet(o.mode)) best = { tonic: mod(+o.key, 12), mode: o.mode };
  else if (isSet(o.key)) best = inf.find((x) => x.tonic === mod(+o.key, 12));
  else if (isSet(o.mode)) best = inf.find((x) => x.mode === o.mode) || { tonic: inf[0].tonic, mode: o.mode };
  const auto = !isSet(o.key) && !isSet(o.mode);
  const tonicPc = best.tonic, mode = best.mode;
  const r = resolve(Object.assign({}, o, { key: tonicPc, mode }), rng);
  const st = Object.assign({}, r.style, { fixed: false }), md = MOODS[r.mood];
  const ctx = { tonic: tonicPc, mode };
  const B = clamp(isSet(o.bars) ? +o.bars : pick(rng, [4, 8]), 2, 16);
  r.bars = B;
  let hr = r.hr; if (hr === 0.5 && B % 2) hr = 1; r.hr = hr;
  const plan = SECTION_PLANS[o.length] || SECTION_PLANS['标准'];
  const modulate = o.modulate !== false && o.modulate !== 'false';
  const seeds = parsed.chords.map((c) => seedToRel(c, ctx));
  const slots = (bars) => { let b = Math.max(1, bars); if (hr === 0.5 && b % 2) b++; return Math.max(2, Math.round(b * hr)); };
  const loop = (n) => { const a = []; for (let i = 0; i < n; i++) a.push(cp(seeds[i % seeds.length])); return a; };
  const minorish = MODES[mode].ref === 'm' && !['minor', 'harmonic', 'melodic'].includes(mode);
  const cadEnd = (arr, type) => { const cd = cadence(ctx, st, rng, type); const k = Math.min(cd.ch.length, arr.length); for (let i = 0; i < k; i++) arr[arr.length - k + i] = cp(cd.ch[cd.ch.length - k + i]); return cd; };
  const gen = (n, oo) => { const p = buildProg(ctx, st, n, rng, Object.assign({ tplOK: false, borrowAdd: md.borrow, secAdd: md.sec }, oo)); applyComplexity(p.chords, ctx, st, r.complexity, rng, md.sus); return p; };
  const fill = (arr) => applyComplexity(arr, ctx, st, r.complexity, rng, md.sus);
  const subst = { 0: 5, 5: 0, 3: 1, 1: 3, 2: 0 };
  const sections = [];
  let chorusBase = null, chorusNote = '';
  const lastChorus = plan.lastIndexOf('Chorus'), nChorus = plan.filter((x) => x === 'Chorus').length;
  let shifted = false;
  plan.forEach((name, pi) => {
    const sec = { name: SECTION_CN[name], key: name, tonic: shifted ? mod(tonicPc + 2, 12) : tonicPc, mode, chords: [] };
    const n = name === 'Intro' || name === 'Outro' || name === 'Interlude' ? slots(Math.min(4, B)) : name === 'Pre-chorus' || name === 'Bridge' ? slots(Math.max(2, Math.round(B / 2))) : slots(B);
    if (name === 'Intro' || name === 'Interlude') {
      sec.chords = loop(n);
      if (rng() < 0.5) { sec.chords[n - 1] = cp(cadV(ctx)); fill([sec.chords[n - 1]]); sec.note = '呈示种子和弦动机，末尾用属和弦（半终止）引入下一段。'; } else sec.note = '直接呈示种子和弦动机。';
    } else if (name === 'Verse') {
      sec.chords = loop(n);
      if (n >= 4 && rng() < 0.5) { sec.chords[n - 1] = cp(cadV(ctx)); fill([sec.chords[n - 1]]); sec.note = '主歌循环种子和弦，句尾半终止（V）。'; } else sec.note = '主歌原样循环种子和弦，确立动机。';
    } else if (name === 'Pre-chorus') {
      sec.chords = gen(n, { startFunc: 'S', end: 'half' }).chords; sec.note = '导歌从下属功能开始累积张力，停在属和弦（半终止）推向副歌。';
    } else if (name === 'Chorus') {
      if (!chorusBase) {
        const v = rng();
        if (v < 0.4 && seeds.length > 1) {
          let k = seeds.findIndex((c) => c.func === 'S'); if (k <= 0) k = 1;
          chorusBase = seeds.slice(k).concat(seeds.slice(0, k)).map(cp); chorusNote = `副歌将种子和弦轮转（从第 ${k + 1} 个和弦开始），换一个功能起点提升能量。`;
        } else if (v < 0.75) {
          chorusBase = [];
          seeds.forEach((c, k) => {
            const t = subst[c.step], prevStep = k ? chorusBase[k - 1].step : -1, nextStep = seeds[(k + 1) % seeds.length].step;
            chorusBase.push(c.diat && t !== undefined && t !== prevStep && t !== nextStep && rng() < 0.45 ? dia(ctx, t) : cp(c));
          });
          fill(chorusBase); chorusNote = '副歌对种子和弦做功能代理替换（I↔vi、IV↔ii 等）。';
        } else {
          const p = gen(Math.max(2, 4 - Math.min(seeds.length, 2)), { end: 'none' });
          chorusBase = seeds.map(cp).concat(p.chords); chorusNote = '副歌以种子和弦开头，再用功能和声扩展出新的乐句。';
        }
      }
      const arr = []; for (let i = 0; i < n; i++) arr.push(cp(chorusBase[i % chorusBase.length]));
      const cd = cadEnd(arr, minorish ? null : 'auth'); fill(arr);
      sec.chords = arr; sec.note = (pi === plan.indexOf('Chorus') ? chorusNote : '再现副歌。') + ' 结尾' + cd.n + '。';
      if (modulate && pi === lastChorus && nChorus > 1) {
        sec.tonic = mod(tonicPc + 2, 12); sec.modulated = true; shifted = true;
        sec.note = '最后一次副歌整体上移大二度转调（Truck-driver modulation），上一段末尾用新调的属七和弦作为过渡。' + ' 结尾' + cd.n + '。';
        const prev = sections[sections.length - 1];
        if (prev) { prev.chords[prev.chords.length - 1] = { rel: 9, step: 5, q: '7', fixedQ: true, dom: true, func: 'D', tag: '转调属' }; prev.note += ' 末尾 V7/新调 引出转调。'; }
      }
    } else if (name === 'Bridge') {
      const p = gen(n, { startFunc: 'S', end: 'half', borrowAdd: md.borrow + 0.3 });
      if (n > 2 && rng() < 0.6) { p.chords[0] = dia(ctx, 5); fill([p.chords[0]]); }
      sec.chords = p.chords; sec.note = '桥段离开主和弦，转向 vi/借用和弦的对比色彩，最后停在属和弦等待解决。';
    } else {
      const arr = loop(n); const cd = cadEnd(arr, minorish ? null : rng() < 0.5 ? 'plagal' : 'auth'); fill(arr);
      sec.chords = arr; sec.note = '尾奏回顾种子和弦' + (shifted ? '（保持在转调后的新调）' : '') + '，以' + cd.n + '结束全曲。';
    }
    sections.push(sec);
  });
  const song = { kind: 'expand', seed, style: st, meter: r.meter, bpm: r.bpm, hr, settings: settingsOut(Object.assign(r, { tonic: tonicPc, mode })), sections, inference: inf.slice(0, 6), autoKey: auto, seedsParsed: parsed };
  finalize(song, rng);
  const ex = [];
  ex.push(`输入种子：${parsed.chords.map((c) => c.text).join(' ')}${parsed.bad.length ? '（无法识别，已忽略：' + parsed.bad.join(' ') + '）' : ''}。`);
  ex.push(`调性推断（得分）：${inf.slice(0, 3).map((x) => `${x.name}（${x.score}）`).join('、')}；${auto ? '自动' : '手动指定'}采用 ${keyName(tonicPc, mode)} ${MODES[mode].n}。`);
  ex.push('种子和弦分析：' + seeds.map((c, i) => { const x = realize(cp(c), ctx); return `${parsed.chords[i].text} = ${x.roman}（${FUNC_CN[c.func] || c.func}${c.tag ? '·' + c.tag : ''}）`; }).join('；') + '。');
  ex.push(`风格：${st.genre} › ${st.name}；情绪：${r.mood}（${md.d}）；结构：${plan.join(' – ')}。`);
  if (st.desc) ex.push(st.desc);
  ex.push(...describeChords(song.flat, ctx));
  ex.push(`复杂度：${COMPLEX[r.complexity]}（种子和弦保留原样）；和声节奏：每小节 ${hr} 个和弦；拍号 ${r.meter}，${r.bpm} BPM。`);
  song.explanation = ex;
  return song;
}
/* ---------- 节奏型与事件 ---------- */
const PATTERNS = { block: '柱式和弦', pulse: '八分音符脉冲', arp: '分解和弦', pad: '长音铺底', swing: '摇摆走路贝斯', skank: '反拍 skank', shuffle: '布鲁斯 shuffle', drive: '八分音符强力推进', strum: '民谣扫弦', funk: '十六分切分', latin: '拉丁切分', bossa: '波萨诺瓦', boom: 'Boom-bap 律动', alberti: '阿尔贝蒂低音', waltz: '圆舞曲 嘭-嚓-嚓' };
function chordEvents(c, start, dur, meter, pat, out) {
  const M = METERS[meter], sub = M.d === 4 ? 0.5 : 1, U = c.upper, B = c.bassNote, end = start + dur - 1e-6;
  const add = (t, d, notes, vel, part) => { if (t >= start - 1e-9 && t < end) out.push({ t, d: Math.min(d, start + dur - t), notes, vel, part }); };
  const L = M.d === 4 ? 4 : M.n;
  switch (pat) {
    case 'pad': add(start, dur, U, 0.45, 'chord'); add(start, dur, [B], 0.6, 'bass'); break;
    case 'pulse':
      for (let t = start; t < end; t += sub) add(t, sub * 0.9, U, mod(t - start, sub * 2) ? 0.4 : 0.55, 'chord');
      for (let t = start; t < end; t += sub * 2) add(t, sub * 1.8, [B], 0.7, 'bass');
      break;
    case 'arp': case 'alberti': {
      const seq = pat === 'alberti' ? [U[0], U[U.length - 1], U[1] || U[0], U[U.length - 1]] : [B + 12, ...U, ...U.slice(1, -1).reverse()];
      let k = 0; add(start, dur, [B], 0.55, 'bass');
      for (let t = start; t < end; t += sub) add(t, sub * 1.6, [seq[k++ % seq.length]], 0.5, 'chord');
      break;
    }
    case 'swing': {
      const T = Q[c.q].t, walk = [B, mod(c.pc + T[1][0] - B, 12) + B, mod(c.pc + T[2][0] - B, 12) + B, B + 12 - 1];
      let k = 0; for (let t = start; t < end; t += 1) add(t, 0.95, [walk[k++ % 4]], 0.65, 'bass');
      add(start, 0.6, U, 0.5, 'chord'); if (dur > 2) add(start + 1.5, 0.5, U, 0.45, 'chord'); if (dur > 3) add(start + 3, 0.5, U, 0.4, 'chord');
      break;
    }
    case 'skank': add(start, dur, [B], 0.65, 'bass'); for (let t = start; t < end; t += sub * 2) add(t + sub, sub * 0.6, U, 0.55, 'chord'); break;
    case 'shuffle':
      if (M.d === 8) { for (let t = start; t < end; t += 3) { add(t, 2, U, 0.55, 'chord'); add(t + 2, 1, U, 0.4, 'chord'); add(t, 2, [B], 0.6, 'bass'); add(t + 2, 1, [B + 7], 0.45, 'bass'); } }
      else for (let t = start; t < end; t += 1) { add(t, 0.6, U, 0.55, 'chord'); add(t + 2 / 3, 0.3, U, 0.4, 'chord'); add(t, 0.6, [B], 0.6, 'bass'); add(t + 2 / 3, 0.3, [mod(Math.floor(t), 2) ? B + 9 : B + 7], 0.45, 'bass'); }
      break;
    case 'drive': for (let t = start; t < end; t += sub) add(t, sub * 0.9, [B], 0.7, 'bass'); add(start, dur, [U[0], U[0] + 7, U[0] + 12], 0.5, 'chord'); break;
    case 'strum': { const h = M.d === 4 ? [0, 1, 1.5, 2.5, 3, 3.5] : [0, 2, 3, 5]; for (let b = start; b < end; b += L) for (const x of h) add(b + x, 0.5, U, x % 1 ? 0.38 : 0.55, 'chord'); add(start, dur, [B], 0.6, 'bass'); break; }
    case 'funk': for (let b = start; b < end; b += 4) { for (const x of [0, 0.75, 1.5, 2.25, 2.5, 3.5]) add(b + x, 0.2, U, 0.55, 'chord'); for (const x of [0, 1.75, 2.5, 3]) add(b + x, 0.4, [x === 2.5 ? B + 12 : B], 0.7, 'bass'); } break;
    case 'latin': case 'bossa': {
      const h = pat === 'bossa' ? [0, 1.5, 3] : [0, 1.5, 2.5, 3.5];
      for (let b = start; b < end; b += 4) { for (const x of h) add(b + x, 0.45, U, 0.5, 'chord'); add(b, 1.4, [B], 0.65, 'bass'); add(b + 1.5, 0.5, [B + 7], 0.5, 'bass'); add(b + 2, 1.4, [B], 0.6, 'bass'); add(b + 3.5, 0.5, [B + 7], 0.5, 'bass'); }
      break;
    }
    case 'boom': for (let b = start; b < end; b += 4) { add(b, 2.4, U, 0.5, 'chord'); add(b + 2.5, 1, U, 0.4, 'chord'); add(b, 1.5, [B], 0.7, 'bass'); add(b + 1.75, 0.5, [B], 0.55, 'bass'); add(b + 2.5, 1, [B], 0.6, 'bass'); } break;
    case 'waltz': add(start, 1, [B], 0.7, 'bass'); for (let t = start + 1; t < end; t += 1) add(t, 0.9, U, mod(t, 3) === 0 ? 0.5 : 0.42, 'chord'); break;
    default: {
      const groups = []; let pos = 0; for (const g of M.g) { groups.push(pos); pos += g; }
      for (let t = start; t < end; t += M.d === 4 ? 1 : 1) { const ib = mod(t, M.n); if (M.d === 4 || groups.some((g) => Math.abs(g - ib) < 1e-6)) add(t, M.d === 4 ? 0.9 : 2.7, U, Math.abs(ib) < 1e-6 ? 0.6 : 0.45, 'chord'); }
      if (!out.length || out[out.length - 1].t < start) add(start, dur, U, 0.55, 'chord');
      add(start, dur, [B], 0.65, 'bass');
    }
  }
}
const DRUM = { kick: 36, snare: 38, clap: 39, rim: 37, hat: 42, ohat: 46, ride: 51 };
function grooveOf(pat) {
  return { pulse: 'four', drive: 'rock', strum: 'rock', block: 'rock', boom: 'boom', swing: 'swing', skank: 'onedrop', latin: 'latin', bossa: 'bossa', funk: 'funk', shuffle: 'shuffle', waltz: 'waltz', pad: 'soft', arp: 'soft', alberti: 'soft' }[pat] || 'rock';
}
function drumBar(groove, meter, t0, out) {
  const M = METERS[meter], n = M.n, hit = (t, note, vel) => { if (t < t0 + n - 1e-6) out.push({ t, d: 0.1, notes: [note], vel, part: 'drum' }); };
  if (M.d === 8) { // 复合/不规则拍：组首底鼓，第二组军鼓，每个八分音符踩镲
    let p = 0; M.g.forEach((g, i) => { hit(t0 + p, i % 2 ? DRUM.snare : DRUM.kick, i ? 0.6 : 0.8); p += g; });
    for (let u = 0; u < n; u++) hit(t0 + u, DRUM.hat, u % 3 ? 0.25 : 0.4);
    return;
  }
  if (groove === 'waltz' || n === 3) { hit(t0, DRUM.kick, 0.8); for (let b = 1; b < n; b++) hit(t0 + b, DRUM.hat, 0.4); return; }
  for (let b = 0; b < n; b++) {
    const t = t0 + b, odd = b % 2 === 1;
    switch (groove) {
      case 'four': hit(t, DRUM.kick, 0.85); if (odd) hit(t, DRUM.clap, 0.6); hit(t + 0.5, DRUM.ohat, 0.35); break;
      case 'boom': if (!odd) hit(t, DRUM.kick, 0.85); if (b === 2) hit(t + 0.5, DRUM.kick, 0.6); if (odd) hit(t, DRUM.snare, 0.75); hit(t, DRUM.hat, 0.35); hit(t + 0.6, DRUM.hat, 0.25); break;
      case 'swing': hit(t, DRUM.ride, 0.45); if (odd) { hit(t + 2 / 3, DRUM.ride, 0.3); hit(t, DRUM.hat, 0.35); } if (b === 0) hit(t, DRUM.kick, 0.4); break;
      case 'onedrop': hit(t, DRUM.hat, 0.3); hit(t + 0.5, DRUM.hat, 0.25); if (b === 2) { hit(t, DRUM.kick, 0.8); hit(t, DRUM.rim, 0.6); } break;
      case 'latin': hit(t, DRUM.hat, 0.3); hit(t + 0.5, DRUM.hat, 0.25); if (!odd) hit(t, DRUM.kick, 0.7); if (b === 1 || b === 3) hit(t + 0.5, DRUM.rim, 0.5); break;
      case 'bossa': if (!odd) { hit(t, DRUM.kick, 0.6); hit(t + 1.5, DRUM.kick, 0.45); } hit(t, DRUM.hat, 0.25); hit(t + 0.5, DRUM.hat, 0.2); if (b === 0 || b === 3) hit(t, DRUM.rim, 0.45); if (b === 1) hit(t + 0.5, DRUM.rim, 0.45); break;
      case 'funk': for (let k = 0; k < 4; k++) hit(t + k * 0.25, DRUM.hat, k % 2 ? 0.2 : 0.35); if (b === 0) { hit(t, DRUM.kick, 0.85); hit(t + 0.75, DRUM.kick, 0.6); } if (b === 2) hit(t + 0.5, DRUM.kick, 0.7); if (odd) hit(t, DRUM.snare, 0.8); break;
      case 'shuffle': hit(t, DRUM.hat, 0.35); hit(t + 2 / 3, DRUM.hat, 0.25); if (!odd) hit(t, DRUM.kick, 0.75); else hit(t, DRUM.snare, 0.7); break;
      case 'soft': if (b === 0) hit(t, DRUM.kick, 0.45); hit(t, DRUM.hat, 0.18); break;
      default: hit(t, DRUM.hat, 0.35); hit(t + 0.5, DRUM.hat, 0.25); if (!odd) hit(t, DRUM.kick, 0.8); if (b === 2 && n >= 4) hit(t + 0.5, DRUM.kick, 0.5); if (odd) hit(t, DRUM.snare, 0.75);
    }
  }
}
// 简易旋律提示：强拍取和弦音，弱拍取调内经过音
function melodyFor(song, seed) {
  const rng = mkRng((seed || song.seed || 1) ^ 0x5bd1e995), M = METERS[song.meter], step = M.d === 4 ? 0.5 : 1;
  const out = []; let prev = 72;
  return {
    span(c, sec, t0, dur) {
      const scale = MODES[sec.mode].s.map((x) => mod(sec.tonic + x, 12));
      const ct = Q[c.q].t.map((x) => mod(c.pc + x[0], 12));
      const near = (pcs, around) => { let best = around, bd = 99; for (let n = 64; n <= 84; n++) if (pcs.includes(mod(n, 12))) { const d = Math.abs(n - around) + rng() * 2; if (d < bd) { bd = d; best = n; } } return best; };
      for (let t = t0; t < t0 + dur - 1e-6; t += step) {
        const strong = Math.abs((t - t0) % (step * 2)) < 1e-6;
        if (!strong && rng() < 0.3) continue;
        const target = prev + Math.round((rng() - 0.5) * (strong ? 6 : 4));
        const n = near(strong ? ct : scale, target);
        const len = strong && rng() < 0.4 ? step * 2 : step;
        out.push({ t, d: Math.min(len, t0 + dur - t) * 0.95, notes: [n], vel: strong ? 0.6 : 0.45, part: 'melody' });
        prev = n; if (len > step) t += step;
      }
    },
    out,
  };
}
function buildEvents(song, opts = {}) {
  const M = METERS[song.meter], ev = [], timeline = [];
  let bar0 = 0;
  let pat = opts.pattern && opts.pattern !== 'style' ? opts.pattern : song.style.pat;
  if (pat === 'block' && M.n === 3 && M.d === 4) pat = 'waltz';
  const mel = opts.melody ? melodyFor(song, opts.seed) : null;
  const groove = grooveOf(pat);
  song.sections.forEach((sec, si) => {
    if (opts.section !== undefined && opts.section !== null && opts.section !== si) return;
    for (const bar of sec.bars) {
      for (const cell of bar) {
        const t0 = bar0 * M.n + cell.start, c = song.flat[cell.ci];
        if (cell.cont) { timeline.push({ t: t0, d: cell.dur, ci: cell.ci, cont: true }); continue; }
        const dur = song.hr === 0.5 ? cell.dur * 2 : cell.dur;
        timeline.push({ t: t0, d: cell.dur, ci: cell.ci });
        chordEvents(c, t0, dur, song.meter, pat, ev);
        if (mel) mel.span(c, sec, t0, dur);
      }
      if (opts.metronome) for (const g of beatGroups(song.meter)) ev.push({ t: bar0 * M.n + g, d: 0.1, notes: [g === 0 ? 84 : 77], vel: g === 0 ? 0.8 : 0.5, part: 'click' });
      if (opts.drums) drumBar(groove, song.meter, bar0 * M.n, ev);
      bar0++;
    }
  });
  if (mel) ev.push(...mel.out);
  ev.sort((a, b) => a.t - b.t);
  return { events: ev, timeline, totalUnits: bar0 * M.n, unitSec: unitSec(song.meter, song.bpm), bars: bar0, pattern: pat, groove };
}

/* ---------- MIDI 导出 ---------- */
function vlq(n) { const b = [n & 0x7f]; while ((n >>>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
function toMidi(song, opts = {}) {
  const { events } = buildEvents(song, opts);
  const M = METERS[song.meter], ppq = 480, unitTicks = (ppq * 4) / M.d;
  const qpm = M.d === 4 ? song.bpm : M.n % 3 === 0 && M.n > 3 ? song.bpm * 1.5 : song.bpm;
  const mpq = Math.round(60000000 / qpm);
  const raw = [];
  for (const e of events) {
    const ch = e.part === 'bass' ? 1 : e.part === 'melody' ? 2 : e.part === 'click' || e.part === 'drum' ? 9 : 0;
    const t0 = Math.round(e.t * unitTicks), t1 = Math.max(t0 + 1, Math.round((e.t + e.d) * unitTicks) - 1);
    for (const n of e.notes) {
      const note = clamp(Math.round(n), 0, 127), vel = clamp(Math.round(e.vel * 127), 1, 127);
      raw.push([t0, 1, [0x90 | ch, note, vel]]); raw.push([t1, 0, [0x80 | ch, note, 0]]);
    }
  }
  raw.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const tr = [], push = (dt, bytes) => { for (const x of vlq(dt)) tr.push(x); for (const x of bytes) tr.push(x); };
  push(0, [0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255]);
  push(0, [0xff, 0x58, 0x04, M.n, Math.log2(M.d), M.d === 8 && M.n % 3 === 0 ? 36 : 24, 8]);
  const title = 'Chord Generator'.split('').map((ch) => ch.charCodeAt(0));
  push(0, [0xff, 0x03, title.length, ...title]);
  // 和弦标记（Marker）
  const prog = { piano: 0, epiano: 4, pad: 89, guitar: 25, organ: 16, synth: 81 }[opts.instrument] || 0;
  push(0, [0xc0, prog]); push(0, [0xc1, 33]); push(0, [0xc2, 73]);
  let last = 0;
  for (const [t, , b] of raw) { push(t - last, b); last = t; }
  push(0, [0xff, 0x2f, 0x00]);
  const L = tr.length;
  const out = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255, 0x4d, 0x54, 0x72, 0x6b, (L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255];
  const u = new Uint8Array(out.length + L); u.set(out, 0); u.set(tr, out.length);
  return u;
}

/* ---------- 文本导出 ---------- */
function toText(song) {
  const s = song.settings, L = [];
  L.push(`和弦进行 — ${s.genre} › ${s.style} | 情绪 ${s.mood} | ${s.key} ${s.modeName} | ${s.meter} | ${s.bpm} BPM | ${s.complexityName}`);
  for (const sec of song.sections) {
    L.push('', `【${sec.name}】 ${sec.keyLabel}${sec.modulated ? '（转调 +2 半音）' : ''}`);
    const bars = sec.bars.map((b) => b.map((x) => (x.cont ? '%' : song.flat[x.ci].name)).join(' '));
    const rom = sec.bars.map((b) => b.map((x) => (x.cont ? '%' : song.flat[x.ci].roman)).join(' '));
    for (let i = 0; i < bars.length; i += 4) { L.push('| ' + bars.slice(i, i + 4).join(' | ') + ' |'); L.push('  ' + rom.slice(i, i + 4).join(' | ')); }
  }
  L.push('', '乐理说明：', ...song.explanation.map((x) => '· ' + x));
  return L.join('\n');
}


/* ---------- 编辑：序列化 / 移调 / 替换 / 锁定重生成 / 吉他指法 ---------- */
const KEEP = ['rel', 'step', 'q', 'func', 'tag', 'sec', 'sub', 'dom', 'diat', 'seed', 'seedBass', 'fixedQ', 'xb', 'lock', 'done', 'lb'];
function cleanChord(c) { const o = {}; for (const k of KEEP) if (c[k] !== undefined && c[k] !== false && c[k] !== '') o[k] = c[k]; o.q = c.q; if (o.tag === undefined) o.tag = ''; return o; }
function serialize(song) {
  return { v: 2, k: song.kind, s: song.seed, st: song.style.id, meter: song.meter, bpm: song.bpm, hr: song.hr, set: song.settings, ex: song.explanation, inf: song.inference, sp: song.seedsParsed,
    secs: song.sections.map((x) => ({ n: x.name, key: x.key, t: x.tonic, m: x.mode, mod: !!x.modulated, note: x.note || '', c: x.chords.map(cleanChord) })) };
}
function deserialize(d) {
  if (!d || !d.secs || !STYLES[d.st] || !METERS[d.meter]) throw new Error('无效的进行数据');
  const st = d.k === 'expand' ? Object.assign({}, STYLES[d.st], { fixed: false }) : STYLES[d.st];
  const song = { kind: d.k, seed: d.s, style: st, meter: d.meter, bpm: clamp(+d.bpm, 40, 220), hr: d.hr, settings: Object.assign({}, d.set, { bpm: clamp(+d.bpm, 40, 220) }), explanation: d.ex || [], inference: d.inf, seedsParsed: d.sp,
    sections: d.secs.map((x) => {
      if (!MODES[x.m]) throw new Error('无效调式');
      return { name: x.n, key: x.key, tonic: mod(+x.t, 12), mode: x.m, modulated: x.mod, note: x.note, chords: x.c.map((c) => { if (!Q[c.q] || !(c.step >= 0 && c.step < 7)) throw new Error('无效和弦'); return Object.assign({ tag: '' }, c); }) };
    }) };
  return finalize(song, mkRng((d.s || 1) ^ 0x2545f491));
}
const cloneSong = (song) => deserialize(JSON.parse(JSON.stringify(serialize(song))));
function refresh(song) { song.sections.forEach((sec) => { sec.chords = sec.chords.map(cleanChord); }); return finalize(song, mkRng((song.seed || 1) ^ 0x2545f491)); }
function setBpm(song, bpm) { song.bpm = clamp(Math.round(+bpm), 40, 220); song.settings.bpm = song.bpm; song.settings.feel = song.bpm < 80 ? '慢' : song.bpm < 125 ? '中' : '快'; return song; }
function transpose(song, n) {
  n = mod(Math.round(n), 12); if (!n) return song;
  song.sections.forEach((sec) => { sec.tonic = mod(sec.tonic + n, 12); });
  song.settings.tonic = mod(song.settings.tonic + n, 12);
  song.settings.key = keyName(song.settings.tonic, song.settings.mode);
  refresh(song);
  song.explanation = song.explanation.filter((x) => !x.startsWith('已移调')).concat(`已移调至 ${song.settings.key} ${MODES[song.settings.mode].n}（和弦的级数与功能保持不变）。`);
  return song;
}
function locate(song, ci) { let k = ci; for (let si = 0; si < song.sections.length; si++) { const n = song.sections[si].chords.length; if (k < n) return [si, k]; k -= n; } return null; }
const ALT_TIPS = {
  同功能: '与原和弦属于同一和声功能（T/S/D），可直接互换而不改变进行走向。',
  三度代理: '根音相差三度的和弦共享两个音，是最常见的和弦代理。',
  副属: '把下一个和弦当作临时主和弦，用它的属和弦去解决，增强推动力。',
  三全音替代: '属七和弦换成根音相距三全音的属七，二者共享 3 音与 7 音，低音半音下行。',
  借用: '从同主音的平行调式借来的和弦，带来明暗色彩变化。',
  性质: '保持根音不变，只改变和弦性质或延伸音。',
};
function alternatives(song, ci) {
  const loc = locate(song, ci); if (!loc) return [];
  const [si, k] = loc, sec = song.sections[si], ctx = { tonic: sec.tonic, mode: sec.mode }, c = sec.chords[k];
  const next = sec.chords[k + 1], s = MODES[ctx.mode].s, out = [], seen = new Set([c.rel + ':' + c.q + ':' + (c.sec || '')]);
  const add = (alt, kind, why) => { const key = alt.rel + ':' + alt.q + ':' + (alt.sec || ''); if (seen.has(key)) return; seen.add(key); const r = realize(Object.assign({}, alt), ctx); r.name = chordName(Object.assign({}, r, { bass: 0, xb: null })); out.push({ chord: cleanChord(alt), name: r.name, roman: r.roman, kind, why: why || ALT_TIPS[kind] }); };
  const lvl = song.settings.complexity || 0;
  const withLvl = (x) => { if (lvl >= 1 && !x.dom) x.q = diatonicQ(s, x.step, true); else if (lvl >= 1 && x.dom) x.q = '7'; x.done = true; return x; };
  for (let st = 0; st < 7; st++) if (st !== c.step && funcOfStep(ctx, st) === c.func && Q[diatonicQ(s, st, false)].cls !== 'A') add(withLvl(dia(ctx, st)), '同功能');
  for (const d of [2, 5]) { const st = (c.step + d) % 7; if (Q[diatonicQ(s, st, false)].cls !== 'A') add(withLvl(dia(ctx, st)), '三度代理'); }
  if (next && next.rel !== c.rel) {
    const t = s.indexOf(next.rel);
    if (t > 0 && t !== undefined) { const sd = secDom(ctx, t); sd.q = '7'; sd.done = true; add(sd, '副属', `V7/${romanOf(ctx, next.rel, t, diatonicQ(s, t, false))}：解决到下一个和弦。`); }
    if (t >= 0) { const sd = secDom(ctx, t); sd.q = '7'; const tt = tritoneOf(sd); add(tt, '三全音替代', '下一个和弦的三全音替代属七（subV7），低音半音下行进入。'); }
  }
  if (c.dom || (Q[c.q].dom)) add(tritoneOf(Object.assign({}, c, { sec: c.sec || 'I' })), '三全音替代');
  for (const alt of (MODES[ctx.mode].ref === 'M' ? [[3, 5, 'm'], [5, 8, ''], [6, 10, ''], [2, 3, ''], [1, 1, '']] : [[4, 7, ''], [3, 5, ''], [1, 1, ''], [6, 11, 'dim']])) {
    const [st, rel, q] = alt; if (s[st] === rel && diatonicQ(s, st, false) === q) continue;
    add({ rel, step: st, q, func: rel === 7 ? 'D' : funcOfStep(ctx, st), tag: rel === 7 ? '和声小调属' : '借用', dom: rel === 7, done: true }, '借用');
  }
  const cls = Q[c.q].cls;
  const qs = cls === 'M' ? (c.dom ? ['', '7', '9', '13', '7sus4', '7b9', '7#9', '7alt'] : ['', 'maj7', '6', 'add9', 'sus2', 'sus4', 'maj9', '69', '7']) : cls === 'm' ? ['m', 'm7', 'm9', 'm11', 'm6', 'madd9', 'mMaj7'] : cls === 'd' ? ['dim', 'm7b5', 'dim7'] : ['aug', '7#5', 'maj7#5'];
  for (const q of qs) add(Object.assign(cleanChord(c), { q, done: true, fixedQ: true }), '性质', `把 ${Q[c.q].sym || '大三'} 换成 ${Q[q].sym || '大三和弦'}。`);
  return out;
}
function replaceChord(song, ci, chord) {
  const loc = locate(song, ci); if (!loc) return song;
  const old = song.sections[loc[0]].chords[loc[1]];
  const nc = cleanChord(chord); delete nc.lb; nc.lock = old.lock; if (old.lock) nc.lb = 0;
  song.sections[loc[0]].chords[loc[1]] = nc;
  return refresh(song);
}
function toggleLock(song, ci) { const loc = locate(song, ci); if (loc) { const c = song.sections[loc[0]].chords[loc[1]]; c.lock = !c.lock; song.flat[ci].lock = c.lock; if (c.lock) c.lb = song.flat[ci].bass; else delete c.lb; } return song; }
function endTypeOf(c) { return c.rel === 0 ? 'cad' : c.func === 'D' || c.tag === '转调属' ? 'half' : 'none'; }
// 重新生成：只替换未锁定的和弦；section 为空时作用于全部段落
function regenerate(song, o = {}) {
  const seed = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 2 ** 31), rng = mkRng(seed);
  const md = MOODS[song.settings.mood] || MOODS['中性'];
  song.sections.forEach((sec, si) => {
    if (o.section !== undefined && o.section !== null && o.section !== si) return;
    const n = sec.chords.length, ctx = { tonic: sec.tonic, mode: sec.mode };
    if (sec.chords.every((c) => c.lock)) return;
    const last = sec.chords[n - 1];
    const p = buildProg(ctx, song.style, n, rng, { tplOK: song.kind === 'random', end: endTypeOf(last), borrowAdd: md.borrow, secAdd: md.sec, startFunc: sec.chords[0].lock ? undefined : (sec.key === 'Pre-chorus' || sec.key === 'Bridge' ? 'S' : undefined) });
    applyComplexity(p.chords, ctx, song.style, song.settings.complexity || 0, rng, md.sus);
    if (last.tag === '转调属' && !last.lock) p.chords[n - 1] = cleanChord(last);
    sec.chords = sec.chords.map((c, k) => (c.lock ? c : p.chords[k]));
  });
  song.seed = seed;
  return refresh(song);
}
const GUITAR = [40, 45, 50, 55, 59, 64];
function guitarShape(c) {
  const T = Q[c.q].t, pcs = T.map((x) => mod(c.pc + x[0], 12));
  const bassPc = c.xb ? c.xbPc : mod(c.pc + T[c.bass || 0][0], 12);
  const need = new Set([pcs[0], pcs[1], pcs.length > 3 ? pcs[3] : pcs[2]]);
  let best = null, bs = -1e9;
  for (let w = 0; w <= 10; w++) {
    const opts = GUITAR.map((open) => { const o = [-1]; for (let f = 0; f <= 15; f++) if ((f === 0 || (f >= w && f <= w + 3)) && pcs.includes(mod(open + f, 12))) o.push(f); return o; });
    const cur = [];
    const dfs = (i) => {
      if (i === 6) {
        const sounding = cur.map((f, j) => (f < 0 ? null : GUITAR[j] + f)).filter((x) => x !== null);
        if (sounding.length < 3) return;
        const firstIdx = cur.findIndex((f) => f >= 0);
        if (cur.slice(firstIdx).some((f) => f < 0) && cur.slice(firstIdx).filter((f) => f < 0).length > 1) return;
        if (mod(GUITAR[firstIdx] + cur[firstIdx], 12) !== bassPc) return;
        const got = new Set(sounding.map((x) => mod(x, 12)));
        for (const x of need) if (!got.has(x)) return;
        const fr = cur.filter((f) => f > 0); const span = fr.length ? Math.max(...fr) - Math.min(...fr) : 0;
        if (span > 3) return;
        if (fr.length && Math.max(...fr) > 4 && cur.some((f) => f === 0)) return;
        const score = sounding.length * 3 + got.size * 2 - span * 1.5 - (fr.length ? Math.min(...fr) : 0) * 0.6 + cur.filter((f) => f === 0).length * 0.8 - cur.slice(firstIdx).filter((f) => f < 0).length * 4;
        if (score > bs) { bs = score; best = cur.slice(); }
        return;
      }
      for (const f of opts[i]) { cur.push(f); dfs(i + 1); cur.pop(); }
    };
    dfs(0);
  }
  if (!best) return null;
  const fr = best.filter((f) => f > 0), lo = fr.length ? Math.min(...fr) : 1;
  return { frets: best, base: Math.max(...best) > 4 ? lo : 1, notes: best.map((f, j) => (f < 0 ? null : GUITAR[j] + f)) };
}

const ChordEngine = { LET, MODES, METERS, STYLES, GENRES, MOODS, Q, COMPLEX, KEYS_M, BAR_OPTS, HR_OPTS, FUNC_CN, PATTERNS, SECTION_PLANS, mkRng, generate, expand, parseChord, parseSeeds, inferKey, buildEvents, toMidi, toText, splitBar, unitSec, keyName, spell, diatonicQ, serialize, deserialize, cloneSong, refresh, transpose, setBpm, alternatives, replaceChord, toggleLock, regenerate, guitarShape, locate, ALT_TIPS, DRUM };
if (typeof module !== 'undefined' && module.exports) module.exports = ChordEngine;
if (typeof window !== 'undefined') window.ChordEngine = ChordEngine;
