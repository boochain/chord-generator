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
  5: { sym: '5', t: [[0, 0], [7, 4]], cls: 'M', r: '5' },
  add11: { sym: 'add11', t: [[0, 0], [4, 2], [7, 4], [17, 3]], cls: 'M', r: 'add11' },
  11: { sym: '11', t: [[0, 0], [7, 4], [10, 6], [14, 1], [17, 3]], cls: 'M', r: '11', dom: 1 },
  maj13: { sym: 'maj13', t: [[0, 0], [4, 2], [11, 6], [14, 1], [21, 5]], cls: 'M', r: 'maj13' },
  m13: { sym: 'm13', t: [[0, 0], [3, 2], [10, 6], [14, 1], [21, 5]], cls: 'm', r: '13' },
  '7b5': { sym: '7b5', t: [[0, 0], [4, 2], [6, 4], [10, 6]], cls: 'M', r: '7♭5', dom: 1 },
  '9sus4': { sym: '9sus4', t: [[0, 0], [5, 3], [7, 4], [10, 6], [14, 1]], cls: 'M', r: '9sus4', dom: 1 },
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
    ['抖音/网络流行 Douyin Pop', { tpl: ['4 5 3 6', '1 5 6 4', '6 4 1 5', '4 5 3 6 2 5 1 1'], tplP: 0.8, ext: 1, tempo: [85, 105], desc: '抖音/网络流行：以 4536251 / 王道进行、1564 为骨架，副歌重复度高、旋律记忆点强。' }],
    ['术力口 Vocaloid', { tpl: ['4 5 3 6', '4 5 6 6', '2 5 1 6'], ext: 1, sec: 0.2, tempo: [140, 190], pat: 'pulse', desc: 'Vocaloid（术力口）：高速、王道进行与丸サ进行常见，转调和副属较多。' }],
    ['超流行 Hyperpop', { tempo: [140, 170], ext: 0, pat: 'pulse' }],
    ['非洲节拍 Afrobeats', { tempo: [100, 115], modes: { major: 2, minor: 2 }, tpl: ['1 4', '6 4 1 5', '2 5 1 1'], ext: 1, pat: 'latin' }],
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
    ['自赏 Shoegaze', { tempo: [90, 130], sus: 0.25, pat: 'pad' }],
    ['情绪摇滚 Emo', { tempo: [130, 175], modes: { major: 2, minor: 2 } }],
    ['日系摇滚 J-rock', { tpl: ['4 5 3 6', '6 4 5 1', '4 5 6 6'], modes: { major: 2, minor: 2 }, tempo: [140, 185], ext: 0, sec: 0.15 }],
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
    ['中文说唱 Chinese Rap', { tpl: ['6 4 1 5', '1 6', 'i bVI bIII bVII'], tempo: [85, 100] }],
    ['陷阱 Trap', { tempo: [130, 160], modes: { minor: 3, harmonic: 2, phrygian: 1 }, ext: 0, pat: 'pad' }],
    ['钻头 Drill', { tempo: [138, 145], modes: { harmonic: 2, phrygian: 2, minor: 1 }, ext: 0, pat: 'pad' }],
    ['爵士说唱 Jazz Rap', { ext: 3, sec: 0.2, tpl: ['2 5 1 6', '1 6 2 5'] }],
    ['云说唱 Cloud Rap', { tempo: [60, 80], pat: 'pad', modes: { minor: 2, lydian: 1, major: 1 } }],
  ]],
  ['低保真 Lo-fi', { modes: { major: 3, minor: 1.2, dorian: 1.5 }, tpl: ['2 5 1 1', '4 3 6 6', '1 6 2 5', '4 3 2 1', '4 5 3 6'], tplP: 0.75, ext: 2, tempo: [70, 90], pat: 'lofi', hr: { 1: 3, 0.5: 1 }, sec: 0.15, borrow: 0.08, slash: 0.05, sus: 0.03, desc: 'Lo-fi：取自爵士与灵魂乐采样的七/九和弦循环（ii7–V7–Imaj7、IVmaj7–iii7–vi7），配合慵懒摇摆的 boom-bap 鼓与 Rhodes 电钢琴，速度 70–90 BPM。' }, [
    ['低保真嘻哈 Lo-fi Hip-hop', {}],
    ['爵士嘻哈 Jazzhop（Nujabes 风格）', { ext: 3, sec: 0.25, tpl: ['2 5 1 6', '2 5 3 6', '4 5 3 6', '4 3 2 1'], tempo: [82, 92], desc: 'Jazzhop：Nujabes 式的 ii7–V7–iii7–vi7 与 IVmaj7–V7–iii7–vi7 循环，九和弦与副属色彩更多。' }],
    ['Chillhop', { tpl: ['4 5 3 6', '1 3 4 4', '6 4 1 5', '2 5 1 1'], tempo: [78, 90] }],
    ['低保真浩室 Lo-fi House', { tempo: [118, 124], pat: 'pulse', modes: { minor: 2, dorian: 2, major: 1 }, tpl: ['6 4 1 5', '1 4', '2 5 1 1'], hr: { 1: 1, 0.5: 2 }, desc: 'Lo-fi House：带磁带质感的浩室，四拍底鼓，速度 118–124 BPM（与其他 Lo-fi 不同）。' }],
    ['学习/助眠 Lo-fi Study & Sleep', { tempo: [64, 78], tpl: ['1 4', '4 1', '6 4', '4 3 6 6'], ext: 2, sec: 0.05, borrow: 0.03, hr: { 0.5: 2, 1: 1 }, desc: '学习/助眠 Lo-fi：两和弦大七/小七长循环，速度慢、色彩少，适合做背景音乐。' }],
    ['卧室流行 Lo-fi Bedroom Pop', { tpl: ['1 3 4 4', '4 1 5 6', '1 6 4 5', '1 5 6 4'], ext: 1, tempo: [75, 95], modes: { major: 3, minor: 1 } }],
    ['日系 Lo-fi Anime / Japanese', { tpl: ['4 5 3 6', '4 5 6 6', '4 3 6 1', '2 5 3 6'], ext: 2, sec: 0.2, tempo: [76, 90], desc: '日系 Lo-fi：以王道进行 IVmaj7–V7–iii7–vi7、丸サ等日系流行进行为骨架。' }],
    ['蒸汽波 Vaporwave', { tpl: ['4 3 2 5', '2 5 1 4', '4 5 3 6'], ext: 2, tempo: [70, 90], pat: 'pad', desc: 'Vaporwave：放慢的 80 年代都市流行/平滑爵士采样，大七/九和弦循环。' }],
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
    ['Phonk 芬克', { tempo: [130, 145], modes: { minor: 3, phrygian: 1 }, ext: 0, pat: 'boom', tpl: ['i bVI', 'i iv bVI V'] }],
    ['阿马皮亚诺 Amapiano', { tempo: [110, 115], ext: 2, modes: { minor: 2, dorian: 2, major: 1 }, tpl: ['2 5 1 6', '6 4 1 5'] }],
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
    ['音乐剧 Musical / Broadway', { modes: { major: 3, minor: 1 }, ext: 1, sec: 0.25, tempo: [80, 140], pat: 'block' }],
    ['剧情 Drama', { tempo: [60, 90], pat: 'arp', modes: { minor: 2, major: 2 } }],
  ]],
  ['国风/五声 Chinese', { modes: { major: 3, minor: 2 }, tpl: ['1 5 6 3', '4 5 3 6', '6 3 4 1', '1 6 2 5'], tplP: 0.5, ext: 0, sus: 0.3, penta: true, borrow: 0, sec: 0.05, tempo: [60, 110], meters: ['4/4', '2/4', '3/4'], pat: 'arp', desc: '国风以五声音阶（宫商角徵羽）为旋律基础，和声避开偏音（4、7 级）为根音，多用挂留与加九和弦。' }, [
    ['古风 Gufeng', {}],
    ['中国风流行', { ext: 1, tpl: ['4 5 3 6', '1 5 6 3 4 1 4 5'], tempo: [70, 100], pat: 'pulse' }],
    ['戏腔流行', { modes: { minor: 3, major: 1 }, tempo: [65, 90] }],
    ['江南丝竹', { meters: ['2/4', '4/4'], tempo: [70, 100], modes: { major: 4 } }],
    ['五声调式 宫商角徵羽', { tplP: 0.2 }],
    ['戏曲 京剧风 Peking Opera', { penta: true, tpl: ['1 5 6 6', '6 5 1 1', '1 6 5 1'], tempo: [60, 96], ext: 0, desc: '戏曲/京剧风：五声调式旋律为主，和声简洁，多用主–属–下属的五声和弦。' }],
    ['和风 Japanese', { penta: false, modes: { phrygian: 2, minor: 2 }, tpl: ['i bII i i', 'iv bIII bII i'], sus: 0.2 }],
  ]],
  ['福音 Gospel', { modes: { major: 4, minor: 1 }, tpl: ['1 6 2 5', '4 5 3 6', 'IV iv I I', '1 3 4 4', '4 #iv° 1 6'], ext: 2, sec: 0.4, borrow: 0.3, tempo: [70, 140], pat: 'block', slash: 0.5, desc: '福音音乐：丰富的副属与借用（iv、#iv°），大量转位与半音化的低音线。' }, [
    ['传统福音 Traditional', { ext: 1, meters: ['4/4', '12/8', '6/8'] }],
    ['当代福音 Contemporary', { ext: 3 }],
    ['敬拜 Worship / CCM', { tpl: ['1 5 6 4', '4 1 5 6', '1 4 6 5', '6 4 1 5'], tplP: 0.8, ext: 0, sus: 0.25, tempo: [68, 80], pat: 'arp', borrow: 0.03, sec: 0.05, desc: '当代敬拜（CCM）：I–V–vi–IV 等四和弦循环、大量 sus/add9 色彩、渐强式编曲。' }],
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
    if (sdef.tpl) st.ownTpl = sdef.tpl;
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
  if (!c.diat && MODES[ctx.mode].ref !== 'm' && ctx.mode !== 'major') { const d = dia(ctx, 4); d.func = 'D'; return d; } // 调式（如混合利底亚）用自然的 v，不硬借大三和弦属
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
// 级数转移概率（行=当前级数 I..vii，列=下一个级数）。大调数据依据 Hooktheory Trends 公布值
// （I 之后 V≈31%；IV 之后 I 33.2% / V 26.6% / vi 6.6% / iii 3.5%）与 de Clercq & Temperley (2011) 摇滚语料的排序
// （IV 是 I 之前最常见的和弦；V→IV 倒退常见），小调依据 Biamonte (2010)、Open Music Theory 小调图式（i–♭VI–♭III–♭VII、i–♭VII–♭VI–V）。
const MARKOV = {
  M: [
    [0, 0.08, 0.05, 0.3, 0.31, 0.22, 0],     // I
    [0.08, 0, 0.06, 0.1, 0.66, 0.1, 0],      // ii
    [0.05, 0.05, 0, 0.4, 0.05, 0.45, 0],     // iii
    [0.36, 0.05, 0.04, 0, 0.36, 0.08, 0],    // IV（Hooktheory：I 33.2%、V 26.6%，其余按比例）
    [0.45, 0.03, 0.04, 0.18, 0, 0.3, 0],     // V（含 V→vi 阻碍终止、V→IV 摇滚倒退）
    [0.08, 0.15, 0.12, 0.45, 0.2, 0, 0],     // vi
    [0.85, 0, 0.1, 0, 0, 0.05, 0],           // vii°
  ],
  m: [
    [0, 0, 0.1, 0.25, 0.15, 0.25, 0.25],     // i
    [0.1, 0, 0, 0, 0.9, 0, 0],               // ii°
    [0.15, 0, 0, 0.25, 0, 0.3, 0.3],         // III
    [0.3, 0, 0.1, 0, 0.25, 0.1, 0.25],       // iv
    [0.75, 0, 0, 0, 0, 0.25, 0],             // v / V
    [0.15, 0, 0.2, 0.15, 0.1, 0, 0.4],       // VI
    [0.4, 0, 0.35, 0.1, 0, 0.15, 0],         // VII
  ],
};
function markov(ctx, style, n, rng, startFunc) {
  const ref = MODES[ctx.mode].ref, M = MARKOV[ref], w0 = stepWeights(ctx, style), out = [];
  let step = 0;
  if (startFunc) { const c = {}; for (let k = 0; k < 7; k++) if (funcOfStep(ctx, k) === startFunc && w0[k] > 0 && Q[diatonicQ(MODES[ctx.mode].s, k, false)].cls !== 'd') c[k] = w0[k]; if (Object.keys(c).length) step = +wpick(rng, c); }
  for (let i = 0; i < n; i++) {
    out.push(dia(ctx, step));
    const row = {}; for (let k = 0; k < 7; k++) { const q = diatonicQ(MODES[ctx.mode].s, k, false); if (M[step][k] > 0 && w0[k] > 0 && Q[q].cls !== 'd') row[k] = M[step][k] * Math.sqrt(w0[k]); }
    step = Object.keys(row).length ? +wpick(rng, row) : 0;
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
/* ---------- 进行语料库 v4（真实歌曲 / 教材常见进行，罗马数字以大调或自然小调为参照） ----------
   依据：Hooktheory Trends 与 TheoryTab 高频进行、de Clercq & Temperley (2011) 摇滚语料、
   Biamonte (2010) 摇滚中的调式/五声进行、Open Music Theory 图式（卡农、王道、安达卢西亚、Royal Road 等）、
   Mark Levine《爵士理论》与 Real Book 常见和声单元、日系/华语流行常见套路。注释为代表曲目或图式名。 */
const CORPUS = {
  M: {
    _: [
      'I V vi IV', 'I vi IV V', 'vi IV I V', 'I IV vi V', 'I IV V IV', 'IV V iii vi', 'I iii IV V', 'I V vi iii IV I IV V', 'I IV I V',
      'I V IV I', 'I IV V V', 'I vi ii V', 'IV I V vi', 'I ii IV V', 'I IV ii V', 'ii IV I V', 'vi V IV V', 'I V IV V',
    ],
    '流行': [
      'I V vi IV', // Let It Be / Someone Like You（Axis 进行）
      'vi IV I V', // Zombie / Apologize
      'I vi IV V', // Stand by Me（'50s 进行）
      'IV V iii vi', // 王道进行
      'I V vi iii IV I IV V', // 卡农进行
      'I IV vi V', 'IV I V vi', 'I V vi V IV I IV V', 'I iii vi IV',
      'I IV I V', 'vi IV V I', 'I V IV V', 'IV vi V I', 'I ii vi IV', 'I V ii IV', 'vi V IV I',
      'I IV iv I', // 借用小 iv
      'I V/6 IV iv', // Creep（I–III–IV–iv）
      'I bVII IV I', // 混合利底亚色彩
      'I vi iii IV', 'IV I vi V', 'ii IV I V', 'I V vi IV I V IV IV', 'vi IV I V vi IV V V',
      'I iii IV iv', 'IV V vi I', 'I IV vi IV', 'I V IV vi',
    ],
    '摇滚': [
      'I IV V IV', 'I V IV IV', 'I bVII IV I', 'I IV I V', 'I V vi IV', 'IV I V V',
      'I bVII IV IV', // Sympathy for the Devil 型双下属
      'I bIII IV I', // 布鲁斯摇滚 I–♭III–IV
      'I bVI bVII I', // ♭VI–♭VII–I
      'I IV bVII IV', 'I V IV I', 'IV I IV V', 'I bVII bVI bVII', 'I IV bIII IV',
      'I bIII bVII IV', 'vi IV I V', 'I iii IV IV', 'I V bVII IV', // Hey Jude 尾声
      'I IV vi V', 'bVI bVII I I', 'IV bVII I I',
    ],
    '爵士': [
      'ii7 V7 Imaj7 Imaj7', 'Imaj7 vi7 ii7 V7', 'iii7 vi7 ii7 V7', 'Imaj7 IVmaj7 iii7 vi7 ii7 V7 Imaj7 Imaj7', 'Imaj7 V/2 ii7 V7',
      'Imaj7 V/6 vi7 V/5', 'ii7 V7 iii7 vi7', 'Imaj7 V/2 ii7 V7 iii7 V/2 ii7 V7', 'IVmaj7 iv7 iii7 vi7', // Misty 型下属小调化
      'ii7 V7 Imaj7 vi7', 'Imaj7 I7 IVmaj7 iv7', 'iii7 V/2 ii7 V7', 'Imaj7 ii7 iii7 IVmaj7', 'IVmaj7 V7 iii7 vi7',
      'Imaj7 iv7 bVII7 Imaj7', // 后门 ii–V
      'iiø V/2 ii7 V7', 'Imaj7 vi7 ii7 bVII7', 'ii7 V7 V/2 V/5',
    ],
    'R&B': [
      'ii7 V7 Imaj7 vi7', 'IVmaj7 V7 iii7 vi7', 'IVmaj7 iii7 ii7 Imaj7', 'Imaj7 iii7 IVmaj7 V7',
      'IVmaj7 V/6 vi7 vi7', // Just the Two of Us
      'IVmaj7 iii7 vi7 V7', 'ii7 iii7 IVmaj7 V7', 'Imaj7 vi7 IVmaj7 V7', 'vi7 ii7 V7 Imaj7', 'IVmaj7 Imaj7 ii7 V7',
      'Imaj7 V/6 vi7 IVmaj7', 'ii7 V7 iii7 vi7', 'IVmaj7 iv7 iii7 vi7', 'Imaj7 bVII7 IVmaj7 iv7',
    ],
    '放克': ['I7 IV7 I7 IV7', 'I7 I7 IV7 I7', 'ii7 V7 ii7 V7', 'I7 bVII7 I7 bVII7', 'I7 IV7 bVII7 IV7', 'I7 I7 bVII7 IV7', 'ii7 ii7 V7 V7'],
    'Lo-fi': [
      'ii7 V7 Imaj7 Imaj7', 'IVmaj7 iii7 vi7 vi7', 'IVmaj7 V7 iii7 vi7', 'Imaj7 vi7 ii7 V7', 'IVmaj7 iii7 ii7 Imaj7', 'ii7 V7 iii7 vi7', 'Imaj7 IVmaj7 Imaj7 IVmaj7',
      'IVmaj7 V/6 vi7 vi7', 'ii7 iii7 IVmaj7 V7', 'Imaj7 iii7 IVmaj7 iv7', 'IVmaj7 iv7 Imaj7 Imaj7', 'vi7 ii7 V7 Imaj7', 'Imaj7 V/6 vi7 V/5',
      'IVmaj7 Imaj7 iii7 vi7', 'ii7 V7 Imaj7 vi7', 'iii7 vi7 ii7 V7', 'IVmaj7 V7 Imaj7 vi7', 'Imaj7 bVII7 IVmaj7 IVmaj7',
    ],
    '嘻哈': ['ii7 V7 Imaj7 vi7', 'IVmaj7 iii7 vi7 vi7', 'Imaj7 vi7 IVmaj7 V7', 'vi7 IVmaj7 Imaj7 V7', 'Imaj7 IVmaj7 vi7 V7', 'IVmaj7 V7 vi7 vi7', 'ii7 Imaj7 ii7 Imaj7', 'vi IV I V', 'I iii IV iv'],
    '电子': [
      'vi IV I V', 'IV V vi vi', 'I V vi IV', 'IV I V vi',
      'vi IV V I', 'IV V vi I', 'vi V IV V', 'I V IV IV', 'IV vi V I', 'vi IV I iii', 'IV I vi V', 'I vi V IV', 'vi iii IV V', 'IV V iii vi',
    ],
    '古典': [
      'I IV V I', 'I vi ii V', 'I IV ii V', 'I V vi iii IV I IV V', 'I ii V I', 'I vi IV V',
      'I V vi iii IV I ii V', 'I IV vii° iii vi ii V I', // 五度循环
      'I ii V/5 V', 'I vi ii V/5 V I', 'I V vi IV ii V', 'I iii vi IV V I', 'I IV I V', 'I V/5 V I', 'I vi IV ii V', 'I ii vi V',
    ],
    '民谣': [
      'I IV I V', 'I V IV I', 'I IV V I', 'I vi IV V', 'I V vi IV',
      'I I IV I', 'I IV I IV', 'I V/5 V I', // 乡村常见 II7→V
      'I iii IV I', 'IV I V I', 'I vi V IV', 'I IV vi V', 'I V IV V', 'vi IV I V', 'I bVII IV I', 'I ii IV I',
    ],
    '拉丁': ['ii7 V7 Imaj7 Imaj7', 'I IV V IV', 'Imaj7 vi7 ii7 V7', 'Imaj7 V/2 ii7 V7', 'I V V I', 'I IV V I', 'ii7 V7 iii7 vi7', 'Imaj7 bVII7 Imaj7 bVII7'],
    '配乐': [
      'I V vi IV', 'vi IV I V', 'I iii IV iv', 'IV V vi vi',
      'I bVI bVII I', 'I IV bVI bVII', 'I V/6 vi IV', 'I bVII IV iv', 'vi IV V iii', 'IV vi V I', 'I iii vi IV', 'I bIII IV iv', 'I IV vi IV', 'I V IV iv',
    ],
    '国风': [
      'I V vi iii', 'IV V iii vi', 'vi iii IV I', 'I vi ii V', 'IV V vi vi',
      'vi IV V I', 'I iii vi V', 'IV V iii vi ii V I I', 'vi V IV V', 'I V vi V', 'IV iii ii I', 'vi ii V I', 'I ii vi V',
    ],
    '福音': [
      'I IV I V', 'I iii IV V', 'IVmaj7 V7 iii7 vi7', 'I I7 IV iv',
      'I V/6 vi IV', 'I iii7 IV V', 'IV V iii vi ii V I I', 'I IV iv I', 'ii7 V7 iii7 vi7', 'I V/2 ii V', 'IV iv iii vi',
    ],
    '雷鬼': ['I IV V IV', 'I V vi IV', 'I IV I V', 'I ii I ii', 'I IV I IV', 'vi IV I V', 'I V IV V'],
    '氛围': ['I IV I IV', 'I vi IV I', 'IV I IV I', 'I iii vi IV', 'Imaj7 IVmaj7 Imaj7 IVmaj7', 'I V vi IV', 'IV vi I V', 'vi IV I I', 'I ii IV I'],
  },
  m: {
    _: [
      'i bVI bIII bVII', 'i iv bVII bIII', 'i bVII bVI V', 'i iv V i', 'i bVI bVII i', 'i iv bVI V', 'i bVII bVI bVII',
      'i bVII iv i', 'i iv bVII i', 'i bIII bVII iv', 'i bVI iv V', 'i iv i V', 'i bVII bIII iv', 'bVI bVII i i',
    ],
    '流行': [
      'i bVI bIII bVII', 'i bVII bVI bVII', 'i iv bVI bVII', 'i bVI bVII i', 'i bIII bVII iv', 'bVI bVII i i', 'i bVII iv bVI', 'i iv bVII bIII',
      'bVI bIII bVII i', 'i bVI iv V', 'i bIII bVI bVII', 'iv bVI bVII i',
    ],
    '摇滚': ['i bVII bVI bVII', 'i bIII bVII iv', 'i bVI bVII i', 'i iv bVII i', 'i bIII iv bVI', 'i bVII bVI V', 'i iv i bVII', 'i bVI bIII bVII', 'i bIII bVII bVI'],
    '爵士': ['iiø V7 i7 i7', 'i7 iv7 iiø V7', 'i7 bVImaj7 iiø V7', 'i7 iv7 bVII7 bIIImaj7', 'bVImaj7 iiø V7 i7', 'i7 i7 iv7 V7', 'iiø V7 i7 iv7'],
    'R&B': ['i7 iv7 i7 iv7', 'i7 bVImaj7 bVII7 i7', 'i7 iv7 bVImaj7 V7', 'i7 bIIImaj7 iv7 bVII7', 'bVImaj7 bVII7 i7 i7', 'i7 iv7 bVII7 bIIImaj7', 'iv7 V7 i7 bVImaj7'],
    '放克': ['i7 i7 iv7 i7', 'i7 iv7 i7 iv7', 'i7 bVII7 i7 bVII7', 'i7 i7 bVII7 iv7'],
    'Lo-fi': [
      'i7 iv7 i7 iv7', 'i7 bVImaj7 bIIImaj7 bVII7', 'i7 iv7 bVImaj7 V7', 'iv7 bVII7 bIIImaj7 bVImaj7',
      'i7 bIIImaj7 iv7 V7', 'bVImaj7 V7 i7 i7', 'i7 iv7 bVII7 bIIImaj7', 'iv7 V7 i7 i7', 'i7 bVImaj7 iv7 V7', 'bVImaj7 bVII7 i7 iv7',
    ],
    '嘻哈': ['i7 iv7 i7 iv7', 'i bVI bIII bVII', 'i7 bVImaj7 iv7 V7', 'i bVI i bVI', 'i iv bVI V', 'i bVII bVI bVII', 'i7 i7 bVImaj7 V7'],
    '电子': ['i bVI bIII bVII', 'i bVII bVI bVII', 'bVI bVII i i', 'i bIII bVII bVI', 'i iv bVI bVII', 'bVI bIII bVII i', 'i bVI bVII bIII', 'iv bVI bVII i'],
    '古典': ['i iv V i', 'i bVI iv V', 'i iv bVII bIII bVI iiø V i', 'i iiø V i', 'i iv iiø V', 'i V i iv', 'i bVI iiø V', 'i iv V bVI', 'i bIII iv V', 'i bVII bIII bVI iv V i i'],
    '民谣': ['i bVII bVI bVII', 'i bIII bVII i', 'i iv i bVII', 'i bVI bIII bVII', 'i bVII iv i'],
    '拉丁': ['i bVII bVI V', 'i iv V i', 'iiø V7 i7 i7', 'i iv bVII bIII', 'i7 iv7 V7 i7', 'i bVII bVI V i iv V i'],
    '金属': ['i bVI bVII i', 'i bVII bVI bVII', 'i iv bVI V', 'i bVI bIII bVII', 'i bIII bVI V', 'i bVI iv V', 'i iv bVII bVI', 'i bVII bVI iv'],
    '配乐': ['i bVI bIII bVII', 'i bVI bVII i', 'i iv bVI V', 'i bIII bVII iv', 'i bVI iv bVII', 'bVI bIII bVII i', 'i iv bIII bVII', 'i bVII bVI iv', 'i bVI bVII bVII'],
    '国风': ['i bVII bIII i', 'i iv bVII bIII', 'i bVI bVII i', 'i bIII bVII i', 'i iv bVII i', 'bVI bVII i i'],
    '福音': ['i iv V i', 'i bVI bVII i', 'i7 iv7 i7 V7'],
    '雷鬼': ['i iv i iv', 'i bVII i bVII', 'i iv bVII i'],
    '氛围': ['i bVI i bVI', 'i bIII bVI bVII', 'i iv bVI i'],
  },
};
// 色彩：借用 / 副属 / 三全音替代 —— 按复杂度严格限量
function colorize(chords, ctx, style, rng, o) {
  const cx = o.complexity === undefined ? 1 : o.complexity;
  const bp = cx === 0 ? 0 : clamp((style.borrow + (o.borrowAdd || 0)) * (cx === 1 ? 0.2 : 0.35), 0, 0.25);
  const sp = cx < 2 ? 0 : clamp((style.sec + (o.secAdd || 0)) * 0.5, 0, 0.3);
  const tp = cx < 2 ? 0 : style.tri * (cx === 3 ? 0.8 : 0.4);
  let used = 0; const cap = Math.max(1, Math.floor(chords.length / 4));
  for (let i = 1; i < chords.length - 1; i++) if (used < cap && chords[i].diat && rng() < bp) { const b = borrowOf(ctx, chords[i], rng); if (b) { chords[i] = b; used++; } }
  for (let i = chords.length - 2; i >= 1; i--) {
    const nx = chords[i + 1];
    if (used < cap && nx && nx.diat && nx.step !== 0 && Q[nx.q].cls !== 'd' && Q[nx.q].cls !== 'A' && chords[i].step !== 0 && rng() < sp) { chords[i] = Object.assign(secDom(ctx, nx.step), { q: Q[chords[i].q].dom ? chords[i].q : '' }); used++; }
  }
  for (let i = chords.length - 2; i >= 1; i--) {
    const c = chords[i], nx = chords[i + 1];
    if (c.dom && Q[c.q].cls === 'M' && (c.tag === '副属' || c.rel === 7) && mod(nx.rel - c.rel, 12) === 5 && chords[i - 1].tag !== '副属' && rng() < tp) chords[i] = tritoneOf(c);
  }
}
// 乐句终止：句尾落主（正格/变格/调式）或停在属（半终止）
function endPhrase(arr, ctx, style, rng, type) {
  const n = arr.length; if (n < 2) { if (type === 'half') arr[n - 1] = cadV(ctx); else if (type) arr[n - 1] = tonic(ctx); return null; }
  if (type === 'half') { if (arr[n - 1].rel !== 7) { arr[n - 1] = cadV(ctx); if (arr[n - 2].rel === 7) arr[n - 2] = dia(ctx, 3); } return { n: '半终止（停在 V）' }; }
  const lastT = arr[n - 1].rel === 0 && arr[n - 1].diat, pen = arr[n - 2];
  if (lastT && (pen.rel === 7 || pen.rel === 5 || (pen.rel === 10 && ctxRef(ctx) === 'm'))) return { n: pen.rel === 7 ? '正格终止 V→I' : pen.rel === 5 ? '变格终止 IV→I' : '♭VII→i 终止' };
  const cd = cadence(ctx, style, rng, type === 'cad' ? null : type);
  const k = cd.ch.length;
  for (let i = 0; i < k; i++) arr[n - k + i] = Object.assign({}, cd.ch[i]);
  if (n >= 3 && arr[n - 3].rel === arr[n - 2].rel) arr[n - 3] = dia(ctx, arr[n - 2].rel === 7 ? (ctxRef(ctx) === 'm' ? 3 : 1) : 5);
  return cd;
}
// 合规化：把未通过规则的生成和弦换成同功能的调内和弦，并打散 3 连同和弦（种子/锁定和弦不动）
function legalize(chords, ctx, style) {
  const subs = { T: [0, 5, 2], S: [3, 1, 5], D: [4, 6] };
  const vamp = style.fixed || /Drone|嗡鸣|放克|Funk|冥想/.test(style.name + style.genre);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < chords.length; i++) {
      const c = chords[i]; if (c.seed || c.lock || c.tag === '转调属') continue;
      const bad = chordIssues(c, chords[i + 1] || null, ctx, style, i === chords.length - 1).length > 0;
      const run = !vamp && i >= 2 && chords[i - 1].rel === c.rel && chords[i - 2].rel === c.rel && chords[i - 1].q === c.q;
      if (!bad && !run) continue;
      const f = c.func && subs[c.func] ? c.func : 'T';
      for (const st of subs[f]) {
        const d = dia(ctx, st);
        if (Q[d.q].cls === 'd' && !(chords[i + 1] && [1, 5].includes(mod(chords[i + 1].rel - d.rel, 12)))) continue;
        if ((chords[i - 1] && chords[i - 1].rel === d.rel) || (run && d.rel === c.rel)) continue;
        if (chordIssues(d, chords[i + 1] || null, ctx, style, false).length) continue;
        chords[i] = Object.assign(d, { done: false }); break;
      }
    }
  }
}
const PROG_LIB = CORPUS;
const LIB_KEYS = Object.keys(PROG_LIB.M).concat(Object.keys(PROG_LIB.m)).filter((k, i, a) => k !== '_' && a.indexOf(k) === i);
const styleKey = (style) => LIB_KEYS.find((k) => style.genre.includes(k)) || '';
const ownFor = (style, ref) => (style.ownTpl || style.tpl || []).filter((t) => !/^[A-Za-z]/.test(t) || ref === (/^i/.test(t) ? 'm' : 'M'));
function libFor(style, ref) {
  const lib = PROG_LIB[ref], own = lib[styleKey(style)] || [];
  return { main: own.length ? own : lib._, extra: lib._.concat(ownFor(style, ref)), own: ownFor(style, ref) };
}
const ctxRef = (ctx) => MODES[ctx.mode].ref;
function tplChords(t, ctx) { return t.split(' ').map((x) => parseTok(x, ctx)); }
function tplLegal(t, ctx, style) {
  try { const cs = tplChords(t, ctx); return cs.every((c, i) => !chordIssues(c, cs[i + 1] || null, ctx, style, false).length); } catch (e) { return false; }
}
// 从语料中挑一条合规进行（扩展模式补全种子时使用）
function pickTpl(ctx, style, rng, o = {}) {
  const L = libFor(style, ctxRef(ctx));
  let pool = L.main.concat(L.own).filter((t) => tplLegal(t, ctx, style));
  if (!pool.length) pool = PROG_LIB[ctxRef(ctx)]._.filter((t) => tplLegal(t, ctx, style));
  if (!pool.length) pool = ['1 4 1 1'];
  if (o.avoid) { const p2 = pool.filter((t) => t !== o.avoid); if (p2.length) pool = p2; }
  if (o.startFunc) { const p2 = pool.filter((t) => parseTok(t.split(' ')[0], ctx).func === o.startFunc); if (p2.length) pool = p2; }
  return pick(rng, pool);
}

/* =====================================================================
   和声规划器 v4：分层规划（曲式 → 乐句 → 终止目标）+ 候选生成 + 软约束打分采样（详见 docs/architecture.md）
   ===================================================================== */
const TOKRE = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|ø)?(maj7|7)?$/;
const skelTok = (t) => { const m = String(t).match(TOKRE); return m ? m[1] + m[2] + (m[3] || '') : String(t); };
const DIG = { M: [0, 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], m: [0, 'i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII'] };
const skelR = (t, ref) => (/^[1-7]$/.test(t) ? DIG[ref][+t] : skelTok(t));
const SEVENTH = { M: { I: 'maj7', ii: '7', iii: '7', IV: 'maj7', V: '7', vi: '7', bVII: '7', bIII: 'maj7', bVI: 'maj7', iv: '7' }, m: { i: '7', iv: '7', bIII: 'maj7', bVI: 'maj7', bVII: '7', V: '7', v: '7', ii: '7', IV: '7' } };
const withSev = (sk, ref) => { const s = SEVENTH[ref][sk]; return s === undefined ? sk : sk + s; };
const SUBS = { M: { I: ['vi', 'iii'], vi: ['I', 'IV'], IV: ['ii', 'vi'], ii: ['IV'], iii: ['I', 'vi'], V: ['iii'] }, m: { i: ['bIII', 'bVI'], bVI: ['iv', 'i'], iv: ['bVI', 'iiø'], bIII: ['i', 'bVI'], bVII: ['v'], V: ['bVII'] } };
const LOOPY = /Lo-fi|嘻哈|电子|氛围|放克|雷鬼/;
const MODEL = new Map();
// 风格可变阶马尔可夫模型（3/2/1/0 阶插值回退），由该风格语料 + 子风格自带进行 + 通用语料训练，模板按循环处理
function lmFor(style, ref) {
  const key = styleKey(style) + '|' + ref + '|' + style.id;
  if (MODEL.has(key)) return MODEL.get(key);
  const L = libFor(style, ref), cnt = [new Map(), new Map(), new Map(), new Map()], starts = new Map();
  const add = (t, w) => {
    const s = t.split(' ').map((x) => skelR(x, ref)), n = s.length;
    starts.set(s[0], (starts.get(s[0]) || 0) + w);
    for (let i = 0; i < n; i++) for (let k = 0; k <= 3; k++) {
      const ctxs = []; for (let j = k; j >= 1; j--) ctxs.push(s[(i - j + n * 4) % n]);
      const m = cnt[k], c = ctxs.join(' ');
      m.set(c + '>' + s[i], (m.get(c + '>' + s[i]) || 0) + w); m.set(c + '>*', (m.get(c + '>*') || 0) + w);
    }
  };
  L.main.forEach((t) => add(t, 1)); L.own.forEach((t) => add(t, 1.5)); PROG_LIB[ref]._.forEach((t) => add(t, 0.3));
  const sev = L.main.filter((t) => /7/.test(t)).length / Math.max(1, L.main.length);
  const vocab = [...new Set([...cnt[0].keys()].map((k) => k.split('>')[1]).filter((x) => x !== '*'))];
  const md = { cnt, starts, sev, vocab };
  MODEL.set(key, md); return md;
}
function lmP(md, hist, t) {
  let p = 0, wsum = 0; const W = [0.08, 0.32, 0.35, 0.25];
  for (let k = 0; k <= 3 && k <= hist.length; k++) {
    const c = hist.slice(hist.length - k).join(' '), tot = md.cnt[k].get(c + '>*');
    if (!tot) continue;
    p += W[k] * ((md.cnt[k].get(c + '>' + t) || 0) / tot); wsum += W[k];
  }
  return wsum ? p / wsum : 0;
}
function lmScore(md, sk) {
  let s = 0; const n = sk.length;
  for (let i = 0; i < n; i++) s += Math.log(lmP(md, i ? sk.slice(Math.max(0, i - 3), i) : sk.slice(-3), sk[i]) + 0.01);
  return s / n;
}
function lmWalk(md, n, rng, temp) {
  const out = [wpick(rng, Object.fromEntries(md.starts))];
  while (out.length < n) {
    const w = {}; for (const t of md.vocab) { const p = lmP(md, out.slice(-3), t); if (p > 0 && t !== out[out.length - 1]) w[t] = Math.pow(p, 1 / temp); }
    if (!Object.keys(w).length) break;
    out.push(wpick(rng, w));
  }
  return out;
}
// 情绪 → 进行特征偏好（软约束权重）
const MOOD_FEAT = {
  欢快: { bor: -0.8, minStart: -0.6, dom: 0.3, plagal: 0.2 }, 悲伤: { minStart: 0.9, bor: 0.2, dom: -0.2, minor: 0.5 }, 史诗: { flat67: 1.0, bor: 0.3, dom: 0.2 },
  浪漫: { sec: 0.6, sev: 0.4, iiV: 0.5, minStart: 0.1 }, 紧张: { dom: 0.5, dim: 0.6, bor: 0.3, minor: 0.3 }, 治愈: { plagal: 0.7, sec: -0.4, bor: -0.3, IV: 0.4 },
  梦幻: { IV: 0.6, sev: 0.4, plagal: 0.3, dom: -0.4 }, 黑暗: { bor: 0.7, minor: 0.6, flat67: 0.4, minStart: 0.4 }, 怀旧: { iv: 0.9, sec: 0.5, plagal: 0.2 },
  神秘: { bor: 0.4, iii: 0.6, dom: -0.3 }, 激昂: { dom: 0.6, IV: 0.3, flat67: 0.3 }, 平静: { plagal: 0.5, IV: 0.3, dom: -0.4, moves: -0.3 },
  忧郁: { minStart: 0.7, iv: 0.4, minor: 0.4, sev: 0.2 }, 慵懒: { sev: 0.6, iiV: 0.3, dom: -0.2 }, 中性: {},
};
// 拍号 → 偏好：三拍/复合拍更常用下属与变格，奇数拍偏好少量和弦的调式循环
const METER_FEAT = { '3/4': { plagal: 0.6, IV: 0.4, sec: -0.3 }, '6/8': { plagal: 0.5, minStart: 0.3, IV: 0.3 }, '12/8': { plagal: 0.4, dom: 0.3, sev: 0.3 }, '5/4': { moves: -0.8, bor: 0.4 }, '7/8': { moves: -0.8, flat67: 0.5 }, '2/4': { dom: 0.5 } };
function features(t, ref) {
  const sk = t.map((x) => skelR(x, ref)), n = sk.length, f = {};
  f.bor = sk.filter((x) => /^b|^V\//.test(x) || (ref === 'M' && x === 'iv')).length / n;
  f.minStart = /^(vi|i|iii|ii)$/.test(sk[0]) ? 1 : 0;
  f.dom = sk.filter((x) => x === 'V' || /^V\//.test(x)).length / n;
  f.plagal = sk.some((x, i) => (x === 'IV' || x === 'iv') && /^(I|i)$/.test(sk[(i + 1) % n])) ? 1 : 0;
  f.flat67 = sk.filter((x) => x === 'bVI' || x === 'bVII').length / n;
  f.sec = sk.filter((x) => /^V\//.test(x)).length / n;
  f.iiV = sk.some((x, i) => /^ii/.test(x) && sk[(i + 1) % n] === 'V') ? 1 : 0;
  f.dim = sk.filter((x) => /[°ø]/.test(x)).length / n;
  f.minor = sk.filter((x) => /^[b#]?[iv]+$/.test(x)).length / n;
  f.IV = sk.filter((x) => x === 'IV').length / n;
  f.iv = sk.includes('iv') && ref === 'M' ? 1 : 0;
  f.iii = sk.includes('iii') ? 1 : 0;
  f.sev = t.filter((x) => /7/.test(x)).length / n;
  f.moves = new Set(sk).size / n;
  return f;
}
const RECENT = new Map(); // styleId → 最近生成的乐句骨架（反重复记忆，只对“不指定 seed”的生成生效）
function remember(song) {
  const id = song.style.id, arr = RECENT.get(id) || [];
  for (const p of song.phrases || []) arr.push(p);
  RECENT.set(id, arr.slice(-48));
}
const FORM_W = {
  1: { A: 1 }, 2: { AA: 0.6, "AA'": 1.2, AB: 1.4 }, 3: { AAB: 1, ABA: 1, "AA'B": 1, ABC: 0.6, "ABA'": 0.8 },
  4: { AABA: 1.2, ABAB: 1, ABAC: 1, "AA'BA'": 1.2, "AA'BA": 1, ABCA: 0.6, AAAB: 0.4, ABCD: 0.5, "ABAB'": 0.8, "AABB'": 0.5 },
};
function pickForm(nP, style, rng) {
  if (FORM_W[nP]) {
    const w = Object.assign({}, FORM_W[nP]);
    if (LOOPY.test(style.genre)) for (const k of Object.keys(w)) if (/C|D/.test(k)) w[k] *= 0.4; else if (/^AA/.test(k)) w[k] *= 1.8;
    return wpick(rng, w).match(/[A-D]'?/g);
  }
  const a = pickForm(4, style, rng), b = pickForm(Math.min(4, nP - 4), style, rng);
  const out = a.concat(b.map((x) => (rng() < 0.5 ? x : x[0] + "'")));
  while (out.length < nP) out.push(...pickForm(Math.min(4, nP - out.length), style, rng).map((x) => x[0] + "'"));
  return out.slice(0, nP);
}
// 乐句候选：长度 P（和弦格数）
function phraseCands(ctx, style, P, rng, o) {
  const ref = ctxRef(ctx), md = lmFor(style, ref), L = libFor(style, ref), out = [];
  const sevOn = o.complexity !== 0 && md.sev > 0.5;
  const fit = (toks, src, prior) => {
    let t = toks.slice();
    if (t.length > P) { const k = Math.floor(rng() * Math.floor(t.length / P)) * P; t = t.slice(k, k + P); }
    if (t.length * 2 === P) { // 和声节奏变化：部分和弦延长两格，部分插入经过/辅助和弦（经过和弦须在语料中能衔接前后）
      const r = [];
      t.forEach((x, i) => {
        r.push(x); const nx = t[(i + 1) % t.length];
        if (rng() < 0.45) {
          const w = {}; for (const c of md.vocab) { const p = lmP(md, [skelR(x, ref)], c) * lmP(md, [c], skelR(nx, ref)); if (p > 0 && c !== skelR(x, ref) && c !== skelR(nx, ref)) w[c] = p; }
          r.push(Object.keys(w).length ? (sevOn ? withSev(wpick(rng, w), ref) : wpick(rng, w)) : x);
        } else r.push(x);
      });
      t = r;
    }
    while (t.length < P) t = t.concat(t);
    out.push({ t: t.slice(0, P), src, prior });
  };
  const legalLib = (arr) => arr.filter((t) => tplLegal(t, ctx, style));
  const main = legalLib(L.main), own = legalLib(L.own), glob = legalLib(PROG_LIB[ref]._);
  const pool = main.length ? main : glob;
  const rot = (t) => { const a = t.split(' '); if (a.length !== 4 || rng() < 0.6) return a; const k = 1 + Math.floor(rng() * 3); return a.slice(k).concat(a.slice(0, k)); };
  for (let i = 0; i < 9 && pool.length; i++) fit(rot(pick(rng, pool)), 'tpl', 0.5);
  for (let i = 0; i < 4 && own.length; i++) fit(rot(pick(rng, own)), 'own', 0.9);
  for (let i = 0; i < 3 && glob.length; i++) fit(rot(pick(rng, glob)), 'glob', 0.1);
  for (let i = 0; i < 4 && pool.length > 1; i++) { // 拼接：A 前半 + B 后半，接缝须在风格语料中出现过
    const a = pick(rng, pool).split(' '), b = pick(rng, pool).split(' '), h = Math.floor(a.length / 2);
    if (a.length !== b.length || h < 1) continue;
    if (lmP(md, [skelR(a[h - 1], ref)], skelR(b[h], ref)) > 0) fit(a.slice(0, h).concat(b.slice(h)), 'splice', 0.3);
  }
  for (let i = 0; i < 5 && pool.length; i++) { // 功能代理替换（同功能和弦互换）
    const a = pick(rng, pool).split(' '), k = Math.floor(rng() * a.length), s = SUBS[ref][skelR(a[k], ref)];
    if (s) { const ns = pick(rng, s); a[k] = /7/.test(a[k]) ? withSev(ns, ref) : ns; fit(a, 'sub', 0.3); }
  }
  for (let i = 0; i < 5; i++) { // 风格马尔可夫游走
    const w = lmWalk(md, Math.min(P, 8), rng, 0.9 + rng() * 0.5).map((x) => (sevOn ? withSev(x, ref) : x));
    if (w.length >= 2) fit(w, 'markov', 0);
  }
  return out.filter((c) => tplLegal(c.t.join(' '), ctx, style));
}
function scoreCand(c, ctx, style, o, others) {
  const ref = ctxRef(ctx), md = lmFor(style, ref), sk = c.t.map((x) => skelR(x, ref));
  let s = 1.2 * lmScore(md, sk) + c.prior;
  const f = features(c.t, ref);
  for (const W of [MOOD_FEAT[o.mood] || {}, METER_FEAT[o.meter] || {}]) for (const k of Object.keys(W)) s += W[k] * (f[k] || 0) * 1.4;
  const cx = o.complexity === undefined ? 1 : o.complexity;
  s += cx === 0 ? -1.2 * f.sec - 0.6 * f.dim - 0.4 * f.bor : cx >= 2 ? 0.9 * f.sec + 0.4 * f.sev + 0.3 * f.bor : 0;
  const reps = sk.filter((x, i) => i && x === sk[i - 1]).length;
  if (!LOOPY.test(style.genre)) s -= 0.35 * reps;
  if (new Set(sk).size < Math.min(3, sk.length)) s -= 0.6;
  const key = sk.join(' ');
  if (o.recent) s -= 2.2 * o.recent.filter((r) => r === key).length;
  for (const x of others) if (x.join(' ') === key) s -= 1.5;
  if (o.startFunc) { try { if (parseTok(c.t[0], ctx).func !== o.startFunc) s -= 1.5; } catch (e) { /* 忽略 */ } }
  return s;
}
function choosePhrase(ctx, style, P, rng, o, others) {
  const cands = phraseCands(ctx, style, P, rng, o);
  if (!cands.length) return null;
  const sc = cands.map((c) => scoreCand(c, ctx, style, o, others)), mx = Math.max(...sc), tau = 0.55;
  const w = {}; sc.forEach((s, i) => (w[i] = Math.exp((s - mx) / tau)));
  return cands[+wpick(rng, w)];
}
function variantOf(t, ctx, style, rng) { // A'：保留轮廓，替换 1 个和弦（多在句尾）
  const ref = ctxRef(ctx);
  for (let tries = 0; tries < 6; tries++) {
    const a = t.slice(), k = rng() < 0.5 ? a.length - 1 - Math.floor(rng() * Math.min(2, a.length)) : Math.floor(rng() * a.length), s = SUBS[ref][skelR(a[k], ref)];
    if (!s) continue;
    const ns = pick(rng, s); a[k] = /7/.test(a[k]) ? withSev(ns, ref) : ns;
    if (tplLegal(a.join(' '), ctx, style)) return a;
  }
  return t.slice();
}
// 终止式目标
const CAD_TOK = {
  M: { auth: ['V', 'I'], iiVI: ['ii', 'V', 'I'], IVVI: ['IV', 'V', 'I'], plagal: ['IV', 'I'], minplagal: ['iv', 'I'], backdoor: ['iv', 'bVII', 'I'], mario: ['bVI', 'bVII', 'I'], IIVI: ['V/5', 'V', 'I'] },
  m: { auth: ['V', 'i'], iiVI: ['iiø', 'V', 'i'], plagal: ['iv', 'i'], aeol: ['bVII', 'i'], mario: ['bVI', 'bVII', 'i'], andal: ['bVII', 'bVI', 'V', 'i'], ivVi: ['iv', 'V', 'i'] },
};
const CAD_CN = { auth: '正格终止 V→I', iiVI: 'ii–V–I 终止', IVVI: 'IV–V–I 终止', plagal: '变格终止 IV→I', minplagal: '小调变格（借用 iv→I）', backdoor: '后门终止 iv–♭VII–I', mario: '♭VI–♭VII–I 终止', IIVI: '重属 II–V–I 终止', aeol: '♭VII→i 终止', andal: '安达卢西亚终止 ♭VII–♭VI–V–i', ivVi: 'iv–V–i 终止' };
const CAD_W = { M: { auth: 3, iiVI: 1.4, IVVI: 1.2, plagal: 1, minplagal: 0.5, backdoor: 0.35, mario: 0.4, IIVI: 0.5 }, m: { auth: 2.4, iiVI: 0.8, plagal: 1, aeol: 1, mario: 0.8, andal: 0.5, ivVi: 1 } };
const legalSeq = (arr, ctx, style, endSong) => arr.every((c, i) => !chordIssues(c, arr[i + 1] || null, ctx, style, endSong && i === arr.length - 1).length);
function applyCadence(ph, ctx, style, rng, o) {
  const ref = ctxRef(ctx), cx = o.complexity === undefined ? 1 : o.complexity;
  if (MODAL.includes(ctx.mode) || style.penta) return endPhrase(ph, ctx, style, rng, 'cad');
  const w = Object.assign({}, CAD_W[ref]);
  if (/爵士|R&B|Lo-fi|福音/.test(style.genre)) { w.iiVI *= 2.5; if (w.backdoor) w.backdoor *= 2; }
  if (/古典/.test(style.genre)) for (const k of ['mario', 'backdoor', 'aeol', 'minplagal']) if (w[k]) w[k] = 0;
  if (cx === 0) { w.IIVI = 0; w.backdoor = 0; }
  const mood = MOOD_FEAT[o.mood] || {};
  if (mood.plagal > 0.3) { w.plagal *= 2; if (w.minplagal) w.minplagal *= 2; }
  if (mood.flat67 > 0.3) { if (w.mario) w.mario *= 3; if (w.aeol) w.aeol *= 2; }
  for (let tries = 0; tries < 6; tries++) {
    if (!Object.values(w).some((x) => x > 0)) break;
    const type = wpick(rng, w), toks = CAD_TOK[ref][type];
    w[type] = 0;
    if (toks.length > ph.length) continue;
    let cs; try { cs = toks.map((x) => parseTok(x, ctx)); } catch (e) { continue; }
    const k = cs.length, trial = ph.slice(0, ph.length - k).concat(cs);
    if (!legalSeq(trial, ctx, style, true) || (trial.length > k && trial[trial.length - k - 1].rel === cs[0].rel)) continue;
    for (let i = 0; i < k; i++) ph[ph.length - k + i] = Object.assign({}, cs[i]);
    return { type, n: CAD_CN[type] };
  }
  return endPhrase(ph, ctx, style, rng, 'cad');
}
function interiorEnd(ph, ctx, style, rng) {
  const r = rng();
  if (r < 0.5) return endPhrase(ph, ctx, style, rng, 'half');
  if (r < 0.7 && ph.length >= 2) { // 阻碍进行 V→vi / V→♭VI
    const t = parseTok(ctxRef(ctx) === 'M' ? 'vi' : 'bVI', ctx), v = cadV(ctx), trial = ph.slice(0, -2).concat([v, t]);
    if (legalSeq(trial, ctx, style, false)) { ph[ph.length - 2] = v; ph[ph.length - 1] = t; return { n: '阻碍进行' }; }
  }
  return null; // 开放结尾
}
const TRI = { maj7: '', m7: 'm', 7: '', m7b5: 'dim', dim7: 'dim' };
function buildProg(ctx, style, n, rng, o = {}) {
  if (style.fixed && style.tpl.length && o.tplOK !== false) { // 12 小节布鲁斯等固定曲式
    const tplUsed = pick(rng, style.tpl), toks = tplUsed.split(' '), chords = [];
    for (let i = 0; i < n; i++) chords.push(parseTok(toks[i % toks.length], ctx));
    if (n >= 2) { chords[n - 2] = parseTok('V7', ctx); chords[n - 1] = parseTok(toks[0], ctx); }
    return { chords, tplUsed, cad: { type: 'blues', n: '布鲁斯回转 V7→I7' }, form: '', phrases: [] };
  }
  const P = clamp(o.phrase || 4, 2, 8), nP = Math.max(1, Math.ceil(n / P));
  const form = pickForm(nP, style, rng);
  const lex = {}, used = [], desc = [];
  const tokOf = (letter, k) => {
    const base = letter[0];
    if (!lex[base]) {
      const ph = choosePhrase(ctx, style, P, rng, Object.assign({}, o, { startFunc: k === 0 ? o.startFunc : base !== 'A' && rng() < 0.6 ? 'S' : undefined }), used);
      lex[base] = ph ? ph.t : (ctxRef(ctx) === 'm' ? 'i iv i i' : 'I IV I I').split(' ').slice(0, P);
      used.push(lex[base].map((x) => skelR(x, ctxRef(ctx)))); desc.push(base + '：' + lex[base].join(' '));
    }
    if (letter.length > 1) { if (!lex[letter]) lex[letter] = variantOf(lex[base], ctx, style, rng); return lex[letter]; }
    return lex[base];
  };
  const chords = []; let cad = null, idx = 0;
  form.forEach((f, k) => {
    const toks = tokOf(f, k), len = Math.min(P, n - idx);
    let ph = []; for (let i = 0; i < len; i++) ph.push(parseTok(toks[i % toks.length], ctx));
    if (o.complexity === 0 && !style.fixed) ph = ph.map((c) => (TRI[c.q] !== undefined ? Object.assign(c, { q: TRI[c.q], fixedQ: false }) : c));
    colorize(ph, ctx, style, rng, o);
    const last = idx + len >= n;
    if (last && o.end === 'half') cad = endPhrase(ph, ctx, style, rng, 'half');
    else if (last && o.end !== 'none') cad = applyCadence(ph, ctx, style, rng, o);
    else if (!last && (f[0] !== 'A' || rng() < 0.3)) interiorEnd(ph, ctx, style, rng);
    chords.push(...ph); idx += len;
  });
  repairSecondary(chords, ctx);
  legalize(chords, ctx, style);
  if (n >= 2 && o.end !== 'none' && o.end !== 'half' && chords[n - 1].rel !== 0) chords[n - 1] = tonic(ctx);
  if (o.complexity === 0 && !style.fixed) for (const c of chords) if (TRI[c.q] !== undefined && c.tag !== '三全音替代') { c.q = TRI[c.q]; c.fixedQ = false; }
  if (chords.some((c) => c.fixedQ) && o.complexity !== 0) { // 语料写明七和弦：其余和弦统一为调内七和弦
    const sc = MODES[ctx.mode].s;
    for (const c of chords) if (!c.fixedQ && !c.sec && !c.sub) { c.q = c.dom ? '7' : c.diat && sc[c.step] === c.rel ? diatonicQ(sc, c.step, true) : ({ '': 'maj7', m: 'm7', dim: 'm7b5' }[c.q] || c.q); c.fixedQ = true; }
  }
  return { chords, tplUsed: desc.join('；'), cad, form: form.join(''), markovUsed: false, phrases: used.map((x) => x.join(' ')) };
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
  const s = MODES[ctx.mode].s, memo = applyComplexity.memo && applyComplexity.memoCtx === ctx ? applyComplexity.memo : new Map();
  applyComplexity.memo = memo; applyComplexity.memoCtx = ctx;
  for (const c of chords) {
    if (c.fixedQ || c.seed || c.done) continue;
    c.done = true;
    const key = c.rel + '|' + c.q + '|' + (c.tag || '') + '|' + c.func;
    if (memo.has(key)) { c.q = memo.get(key); continue; } // 同一和弦在全曲保持同一色彩，乐句重复才听得出来
    let L = level;
    if (L > 0 && rng() < 0.2) L--;
    const cls = Q[c.q].cls;
    let q = c.q;
    if (L >= 1) {
      if (c.diat && !c.dom) {
        // 七和弦性质取自真正包含该根音的音阶（和声/旋律小调中借自自然小调的级数用自然小调）
        const sc = s[c.step] === c.rel ? s : MODES.minor.s[c.step] === c.rel ? MODES.minor.s : null;
        q = sc ? diatonicQ(sc, c.step, true) : ({ M: 'maj7', m: 'm7', d: 'm7b5' }[cls] || q);
        if (Q[q].cls !== cls) q = { M: 'maj7', m: 'm7', d: 'm7b5' }[cls] || c.q;
      }
      else if (cls === 'M') q = c.dom || c.rel === 10 ? '7' : 'maj7';
      else if (cls === 'm') q = 'm7';
      else if (cls === 'd') q = c.dom ? 'dim7' : 'm7b5';
      else q = 'aug';
      if (c.dom && Q[q].cls === 'M') q = '7';
    }
    if (L >= 2) {
      const up = { maj7: ['maj9', 'maj7', 'maj9', '69'], 7: ['9', '7', '9', '13'], m7: ['m9', 'm7', 'm9', 'm11'] };
      if (up[q]) q = pick(rng, up[q]);
      if (ctx.mode === 'lydian' && c.rel === 0 && q.startsWith('maj')) q = 'maj7#11';
    }
    if (L >= 3 && Q[q].dom && c.rel !== 0 && c.rel !== 10) q = pick(rng, ['7b9', '7#9', '7alt', '7#11', '13', '7b13']);
    if (L === 0 && style.penta && cls === 'M' && rng() < 0.3) q = pick(rng, ['add9', 'sus2', '6']);
    if (cls === 'M' && !c.sub && q === (L >= 1 ? q : '') && rng() < (style.sus + (susAdd || 0)) * 0.4 * (c.rel === 0 ? 0.3 : 1)) {
      q = Q[q].dom ? (L >= 1 ? '7sus4' : 'sus4') : (L >= 1 ? q : pick(rng, ['sus2', 'sus4']));
    }
    c.q = q; memo.set(key, q);
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
/* ---------- 声部进行规则（见 docs/theory-rules.md §4） ---------- */
// 上一和弦各声部 → 当前和弦各声部的对应：音数相同按音高顺序配对，否则就近配对
function voiceMap(prevU, curU) {
  const A = prevU.slice().sort((x, y) => x - y), B = curU.slice().sort((x, y) => x - y);
  if (A.length === B.length) { // 最小总移动的对应（等价于最平滑的声部进行解释）
    let best = null, bc = 1e9;
    const perm = (arr, used, acc) => {
      if (acc.length === A.length) { const c = acc.reduce((t, n, i) => t + Math.abs(n - A[i]), 0); if (c < bc) { bc = c; best = acc.slice(); } return; }
      for (let i = 0; i < B.length; i++) if (!used[i]) { used[i] = true; acc.push(B[i]); perm(arr, used, acc); acc.pop(); used[i] = false; }
    };
    perm(B, [], []);
    return A.map((p, i) => [p, best[i]]);
  }
  return A.map((p) => [p, B.reduce((m, n) => (Math.abs(n - p) < Math.abs(m - p) ? n : m), B[0])]);
}
// 返回声部进行违规列表：平行/反向五度八度、属七和弦七音与导音未解决
function vlIssues(pc, cc, pU, pB, cU, cB) {
  const out = [];
  if (pc.pc === cc.pc && pc.q === cc.q && pB === cB) return out;
  const pairs = voiceMap(pU, cU), voices = [[pB, cB]].concat(pairs);
  for (let i = 0; i < voices.length; i++) for (let j = i + 1; j < voices.length; j++) {
    const [a1, a2] = voices[i], [b1, b2] = voices[j];
    if (a1 === a2 || b1 === b2) continue; // 至少一个声部保持则不构成平行
    const i1 = mod(a1 - b1, 12), i2 = mod(a2 - b2, 12);
    if (i1 === i2 && (i1 === 0 || i1 === 7) && a1 !== b1) out.push(i1 === 7 ? '平行/反向五度' : '平行/反向八度');
  }
  const T = Q[pc.q].t.map((x) => x[0]);
  if (pc.dom && T.includes(4) && mod(cc.pc - pc.pc, 12) === 5) { // 属→主（含副属）
    const top = Math.max(...pU), nextPcs = Q[cc.q].t.map((x) => mod(cc.pc + x[0], 12));
    for (const [p, n] of pairs) {
      const rel = mod(p - pc.pc, 12), d = n - p;
      const rootInUpper = cU.some((x) => mod(x, 12) === cc.pc);
      if (rel === 4 && !(d === 1 || (!rootInUpper && Math.abs(d) <= 2) || (p !== top && (d === -3 || d === -4)) || (d === 0 && nextPcs.includes(mod(p, 12))) || (d === -1 && Q[cc.q].t.some((x) => x[0] === 10 || x[0] === 11)))) out.push('导音未解决');
      if (rel === 10 && !(d === -1 || d === -2 || (d === 0 && nextPcs.includes(mod(p, 12))))) out.push('七音未下行解决');
    }
  }
  return out;
}
const UP_LO = 52, UP_HI = 79, BASS_LO = 40;
function upperPcs(c) {
  const T = Q[c.q].t;
  let tones = T.map((x) => x[0]);
  if (tones.length > 4) tones = tones.filter((x) => x !== 7); // 延伸和弦省略五音
  if (tones.length > 4) tones = tones.filter((x) => x !== 0); // 仍多于 4 音则省略根音（低音已有）
  return tones.map((x) => mod(c.pc + x, 12));
}
function closeVoicings(pcs0) {
  const pcs = [...new Set(pcs0)].sort((a, b) => a - b);
  const out = [];
  for (let r = 0; r < pcs.length; r++) {
    const rot = pcs.slice(r).concat(pcs.slice(0, r));
    for (let lo = UP_LO; lo < UP_LO + 16; lo++) {
      if (mod(lo, 12) !== rot[0]) continue;
      let cur = lo; const notes = [cur];
      for (let k = 1; k < rot.length; k++) { cur += mod(rot[k] - cur, 12) || 12; notes.push(cur); }
      if (notes[notes.length - 1] <= UP_HI) out.push(notes);
    }
  }
  return out;
}
function moveCost(a, b) {
  let tot = 0, mx = 0;
  for (const [p, n] of voiceMap(a, b)) { const d = Math.abs(p - n); tot += d; mx = Math.max(mx, d); }
  return { tot, mx };
}
function voiceAll(list, style, rng, strict) {
  // 1) 低音：原位为主，转位仅在带来级进时使用
  let prevB = null;
  const nearOct = (pc) => BASS_LO + mod(pc - BASS_LO, 12);
  list.forEach((c, i) => {
    const T = Q[c.q].t, next = list[i + 1];
    const edge = i === 0 || !next || next.section !== c.section || (list[i - 1] && list[i - 1].section !== c.section);
    const cand = [0];
    if (!edge && Q[c.q].cls !== 'd' && style.slash > 0.15) for (let k = 1; k < Math.min(3, T.length); k++) if (!(k === 1 && (c.dom || c.rel === 7))) cand.push(k);
    let bb = 0, bnote = nearOct(c.pc), bcost = 1e9;
    for (const k of cand) {
      const note = nearOct(c.pc + T[k][0]), step = prevB === null ? 0 : Math.abs(note - prevB);
      let cost = k === 0 ? 0 : 6 * (1.3 - style.slash);
      if (k > 0 && step > 2) cost += 50;
      cost += step * 0.25 + rng() * 0.3;
      if (cost < bcost) { bcost = cost; bb = k; bnote = note; }
    }
    if (c.seedBass !== undefined && c.seedBass < T.length) { bb = c.seedBass; bnote = nearOct(c.pc + T[bb][0]); }
    if (c.lb !== undefined && c.lb < T.length) { bb = c.lb; bnote = nearOct(c.pc + T[bb][0]); }
    if (c.xb) { bb = 0; bnote = nearOct(c.xbPc); }
    c.bass = bb; c.bassNote = bnote; prevB = bnote;
  });
  // 2) 上方声部：对整条进行做动态规划（Viterbi），代价 = 声部移动 + 违规惩罚，保证全局最平滑且合规
  const C = list.map((c) => {
    let v = closeVoicings(upperPcs(c)).filter((x) => x[0] > c.bassNote + 4);
    if (!v.length) v = closeVoicings(upperPcs(c)).map((x) => (x[0] > c.bassNote + 4 ? x : x.map((y) => y + 12)));
    return v;
  });
  const pen = strict ? 1000 : 80;
  let dp = C[0].map((v) => ({ cost: Math.abs((v[0] + v[v.length - 1]) / 2 - 62) * 0.8 + rng() * 0.2, back: -1 }));
  const backs = [dp];
  for (let i = 1; i < list.length; i++) {
    const p = list[i - 1], c = list[i], cur = [];
    for (const v of C[i]) {
      const mid = (v[0] + v[v.length - 1]) / 2;
      let bc = 1e12, bj = 0;
      C[i - 1].forEach((u, j) => {
        let t = dp[j].cost;
        if (p.section === c.section || true) {
          const m = moveCost(u, v); t += m.tot + Math.max(0, m.mx - 4) * 3 + (m.mx > 7 ? 500 : 0) + (u.length === v.length && Math.max(...v.map((n, k) => Math.abs(n - u[k]))) > 7 ? 500 : 0);
          t += vlIssues(p, c, u, p.bassNote, v, c.bassNote).length * pen;
        }
        if (t < bc) { bc = t; bj = j; }
      });
      cur.push({ cost: bc + Math.abs(mid - 63) * 0.12 + rng() * 0.2, back: bj });
    }
    dp = cur; backs.push(dp);
  }
  let j = dp.reduce((bi, x, k) => (x.cost < dp[bi].cost ? k : bi), 0);
  for (let i = list.length - 1; i >= 0; i--) { list[i].upper = C[i][j]; j = backs[i][j].back; }
  list.forEach((c) => (c.name = chordName(c)));
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
    // 默认以自然大/小调为主；调式色彩只在风格本身需要时出现，且情绪只能调整、不能凭空引入
    for (const k of Object.keys(MODES)) { const base = st.modes[k] || 0; const tame = k === 'major' || k === 'minor' ? 1 : k === 'harmonic' || k === 'melodic' ? 0 : 0.35; w[k] = base * tame * Math.min(1.6, Math.max(0.5, md.m[k] || 1)); }
    if ((st.modes.harmonic || 0) + (st.modes.melodic || 0) > 0) w.minor = (w.minor || 0) + (st.modes.harmonic || 0) + (st.modes.melodic || 0);
    if (st.penta) for (const k of Object.keys(w)) if (!['major', 'minor'].includes(k)) w[k] = 0;
    if (!Object.values(w).some((x) => x > 0)) w.major = 1;
    r.mode = wpick(rng, w);
  }
  r.tonic = isSet(o.key) ? mod(+o.key, 12) : Math.floor(rng() * 12);
  r.meter = isSet(o.meter) ? o.meter : st.meters.includes('4/4') ? '4/4' : st.meters[0];
  if (isSet(o.bpm)) r.bpm = clamp(+o.bpm, 20, 300);
  else {
    let lo = st.tempo[0] * md.tempo, hi = st.tempo[1] * md.tempo;
    const span = hi - lo;
    if (o.feel === '慢') hi = lo + span / 3; else if (o.feel === '快') lo = hi - span / 3; else if (o.feel === '中') { lo += span / 3; hi -= span / 3; }
    r.bpm = clamp(Math.round(lo + rng() * (hi - lo)), 40, 220);
    r.bpm = clamp(r.bpm, st.tempo[0], st.tempo[1]); // 情绪只在风格速度范围内调整（如 Lo-fi 始终 70–90）
  }
  r.feel = r.bpm < 80 ? '慢' : r.bpm < 125 ? '中' : '快';
  r.bars = isSet(o.bars) ? clamp(+o.bars, 1, 64) : (st.fixed ? 12 : pick(rng, [8, 8, 8, 16]));
  // 默认复杂度保守：大多数风格三和弦/七和弦；只有爵士类默认九和弦，变化和弦需手动开启
  r.complexity = isSet(o.complexity) ? clamp(+o.complexity, 0, 3) : st.ext >= 2 ? (rng() < 0.6 ? 2 : 1) : st.ext === 1 ? (rng() < 0.5 ? 1 : 0) : 0;
  if (isSet(o.hr)) r.hr = +o.hr;
  else {
    const w = Object.assign({}, st.hr); delete w[4];
    if (r.bpm > 140) { w[2] = 0; w[0.5] = (w[0.5] || 0) + 0.3; }
    w[1] = (w[1] || 0) + 2; // 每小节一个和弦最自然
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
function generateRaw(o = {}) {
  const seed = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 2 ** 31);
  const rng = mkRng(seed);
  const r = resolve(o, rng), st = r.style, md = MOODS[r.mood];
  const ctx = { tonic: r.tonic, mode: r.mode };
  const n = Math.max(2, Math.round(r.bars * r.hr));
  const p = buildProg(ctx, st, n, rng, { borrowAdd: md.borrow, secAdd: md.sec, complexity: r.complexity, mood: r.mood, meter: r.meter, recent: o._recent ? o._recent.get(st.id) || null : null, phrase: Math.max(2, Math.round(4 * r.hr)) });
  applyComplexity(p.chords, ctx, st, r.complexity, rng, md.sus);
  const song = { kind: 'random', seed, phrases: p.phrases, style: st, meter: r.meter, bpm: r.bpm, hr: r.hr, settings: settingsOut(r), sections: [{ name: '和弦进行', tonic: ctx.tonic, mode: ctx.mode, chords: p.chords }] };
  finalize(song, rng);
  const ex = [];
  ex.push(`调性：${keyName(ctx.tonic, ctx.mode)} ${MODES[ctx.mode].n}；风格：${st.genre} › ${st.name}；情绪：${r.mood}（${md.d}）。`);
  if (st.desc) ex.push(st.desc);
  ex.push(`乐句骨架（由风格语料 + 可变阶马尔可夫 + 功能代理替换生成候选，按风格/情绪/新颖度打分采样）：${p.tplUsed}${p.form ? `；曲式 ${p.form}（' 表示变奏乐句：保留轮廓、改写一个和弦或句尾）` : ''}。借用/副属等色彩和弦按复杂度限量使用。`);
  if (p.cad) ex.push('结尾：' + p.cad.n + '。');
  ex.push(...describeChords(song.flat, ctx));
  ex.push(`复杂度：${COMPLEX[r.complexity]}；和声节奏：每小节 ${r.hr} 个和弦；拍号 ${r.meter}，${r.bpm} BPM（${r.feel}）；伴奏型：${PATTERNS[st.pat]}。`);
  song.explanation = ex;
  return song;
}
/* ---------- 模式二：根据给定和弦扩展 ---------- */
const SUF = { '': '', M: '', maj: '', m: 'm', min: 'm', '-': 'm', dim: 'dim', '°': 'dim', o: 'dim', aug: 'aug', '+': 'aug', 7: '7', dom7: '7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', m7: 'm7', min7: 'm7', '-7': 'm7', m7b5: 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', 'm7-5': 'm7b5', dim7: 'dim7', '°7': 'dim7', o7: 'dim7', mMaj7: 'mMaj7', mM7: 'mMaj7', 'm(maj7)': 'mMaj7', sus2: 'sus2', sus4: 'sus4', sus: 'sus4', '7sus4': '7sus4', '7sus': '7sus4', add9: 'add9', add2: 'add9', madd9: 'madd9', 'm(add9)': 'madd9', 6: '6', m6: 'm6', 69: '69', '6/9': '69', 9: '9', maj9: 'maj9', M9: 'maj9', m9: 'm9', 11: '11', m11: 'm11', 13: '13', maj13: 'maj13', M13: 'maj13', m13: 'm13', min13: 'm13', add11: 'add11', add4: 'add11', '7b5': '7b5', '7-5': '7b5', '9sus4': '9sus4', '9sus': '9sus4', ma7: 'maj7', Ma7: 'maj7', j7: 'maj7', maj: '', ma: '', Maj7: 'maj7', Maj9: 'maj9', ma9: 'maj9', 'Δ9': 'maj9', min6: 'm6', '-6': 'm6', '-9': 'm9', min11: 'm11', '-11': 'm11', '°': 'dim', 'ø9': 'm9', '+': 'aug', '#5': 'aug', 'm#5': 'aug', '7+': '7#5', '-maj7': 'mMaj7', 'm/maj7': 'mMaj7', mmaj7: 'mMaj7', 'dom': '7', '7sus2': 'sus2', 'sus2sus4': 'sus4', 'madd11': 'm11', '(b5)': 'dim', 'm7♭5': 'm7b5', '7b9': '7b9', '7#9': '7#9', '7#11': '7#11', '7b13': '7b13', '7alt': '7alt', alt: '7alt', 'maj7#11': 'maj7#11', 'maj7#5': 'maj7#5', 5: '5', '7#5': '7#5', '7+5': '7#5', aug7: '7#5', '+7': '7#5', '△': 'maj7', '△7': 'maj7', 'maj7(#11)': 'maj7#11', mi: 'm', mi7: 'm7', min9: 'm9', 'm(b5)': 'dim', mb5: 'dim', 'min(maj7)': 'mMaj7', sus24: 'sus4', '7(b9)': '7b9', '7(#9)': '7#9', dom9: '9', 'add(9)': 'add9', 'madd2': 'madd9', '(add9)': 'add9', 'm(add2)': 'madd9', 'm7-b5': 'm7b5', 'm7(b5)': 'm7b5', 'mi7b5': 'm7b5' };
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
function expandRaw(o = {}) {
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
  const B = clamp(isSet(o.bars) ? +o.bars : 8, 2, 16);
  r.bars = B;
  let hr = isSet(o.hr) ? r.hr : 1; if (hr === 0.5 && B % 2) hr = 1; r.hr = hr;
  const plan = SECTION_PLANS[o.length] || SECTION_PLANS['标准'];
  const modulate = o.modulate !== false && o.modulate !== 'false';
  const seedsOrig = parsed.chords.map((c) => seedToRel(c, ctx));
  // 种子不足 4 个和弦时，用精选进行补全为 4 和弦动机（种子在前），避免整段只重复一个和弦
  let seeds = seedsOrig;
  if (seedsOrig.length < 4) {
    const t = pickTpl(ctx, st, rng, { startFunc: seedsOrig[0].func === 'D' ? 'T' : seedsOrig[0].func });
    let tc = tplChords(t, ctx);
    const k = tc.findIndex((c) => c.rel === seedsOrig[seedsOrig.length - 1].rel);
    if (k >= 0 && k < 3) tc = tc.slice(k + 1).concat(tc.slice(0, k + 1));
    const add = tc.filter((c) => !seedsOrig.some((x) => x.rel === c.rel && Q[x.q].cls === Q[c.q].cls));
    while (add.length && seeds.length < 4) seeds = seeds.concat([add.shift()]);
    if (seeds.length < 4) seeds = seeds.concat(tc).slice(0, 4);
    if (seeds !== seedsOrig) applyComplexity(seeds.slice(seedsOrig.length), ctx, st, r.complexity, rng, md.sus);
  }
  const slots = (bars) => { let b = Math.max(1, bars); if (hr === 0.5 && b % 2) b++; return Math.max(2, Math.round(b * hr)); };
  const loop = (n) => { const a = []; for (let i = 0; i < n; i++) a.push(cp(seeds[i % seeds.length])); return a; };
  const minorish = MODES[mode].ref === 'm' && !['minor', 'harmonic', 'melodic'].includes(mode);
  const cadEnd = (arr, type) => { const cd = cadence(ctx, st, rng, type); const k = Math.min(cd.ch.length, arr.length); for (let i = 0; i < k; i++) arr[arr.length - k + i] = cp(cd.ch[cd.ch.length - k + i]); return cd; };
  const gen = (n, oo) => { const p = buildProg(ctx, st, n, rng, Object.assign({ tplOK: false, borrowAdd: md.borrow, secAdd: md.sec, complexity: r.complexity, mood: r.mood, meter: r.meter, phrase: Math.max(2, Math.round(4 * hr)) }, oo)); applyComplexity(p.chords, ctx, st, r.complexity, rng, md.sus); return p; };
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
        if (v < 0.45 && seeds.length > 1) {
          let k = seeds.findIndex((c) => c.func === 'S'); if (k <= 0) k = 1;
          chorusBase = seeds.slice(k).concat(seeds.slice(0, k)).map(cp); chorusNote = `副歌将种子和弦轮转（从第 ${k + 1} 个和弦开始），换一个功能起点提升能量。`;
        } else if (v < 0.6) {
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
      const p = gen(n, { startFunc: 'S', end: 'half', borrowAdd: md.borrow + 0.15 });
      if (n > 2 && rng() < 0.6) { p.chords[0] = dia(ctx, 5); fill([p.chords[0]]); }
      sec.chords = p.chords; sec.note = '桥段离开主和弦，转向 vi/借用和弦的对比色彩，最后停在属和弦等待解决。';
    } else {
      const arr = loop(n); const cd = cadEnd(arr, minorish ? null : rng() < 0.5 ? 'plagal' : 'auth'); fill(arr);
      sec.chords = arr; sec.note = '尾奏回顾种子和弦' + (shifted ? '（保持在转调后的新调）' : '') + '，以' + cd.n + '结束全曲。';
    }
    sections.push(sec);
  });
  sections.forEach((sec, si) => {
    const sctx = { tonic: sec.tonic, mode: sec.mode };
    legalize(sec.chords, sctx, st);
    const last = sec.chords[sec.chords.length - 1];
    if (si < sections.length - 1 && !(last.rel === 0 || last.func === 'D' || last.func === 'T' || last.tag === '转调属')) sec.chords[sec.chords.length - 1] = cadV(sctx);
    applyComplexity(sec.chords, sctx, st, r.complexity, rng, md.sus);
  });
  const song = { kind: 'expand', seed, style: st, meter: r.meter, bpm: r.bpm, hr, settings: settingsOut(Object.assign(r, { tonic: tonicPc, mode })), sections, inference: inf.slice(0, 6), autoKey: auto, seedsParsed: parsed };
  finalize(song, rng);
  const ex = [];
  ex.push(`输入种子：${parsed.chords.map((c) => c.text).join(' ')}${parsed.bad.length ? '（无法识别，已忽略：' + parsed.bad.join(' ') + '）' : ''}。`);
  ex.push(`调性推断（得分）：${inf.slice(0, 3).map((x) => `${x.name}（${x.score}）`).join('、')}；${auto ? '自动' : '手动指定'}采用 ${keyName(tonicPc, mode)} ${MODES[mode].n}。`);
  ex.push('种子和弦分析：' + seedsOrig.map((c, i) => { const x = realize(cp(c), ctx); return `${parsed.chords[i].text} = ${x.roman}（${FUNC_CN[c.func] || c.func}${c.tag ? '·' + c.tag : ''}）`; }).join('；') + '。');
  if (seeds !== seedsOrig) ex.push('种子较短，已用常用进行补全为 4 和弦动机：' + seeds.map((c) => realize(cp(c), ctx).roman).join(' – ') + '。');
  ex.push(`风格：${st.genre} › ${st.name}；情绪：${r.mood}（${md.d}）；结构：${plan.join(' – ')}。`);
  if (st.desc) ex.push(st.desc);
  ex.push(...describeChords(song.flat, ctx));
  ex.push(`复杂度：${COMPLEX[r.complexity]}（种子和弦保留原样）；和声节奏：每小节 ${hr} 个和弦；拍号 ${r.meter}，${r.bpm} BPM。`);
  song.explanation = ex;
  return song;
}
/* ---------- 乐理校验器：所有生成 / 随机 / 扩展结果必须通过（规则见 docs/theory-rules.md） ---------- */
const LICENSED = ['借用', '和声小调属', '副属', '三全音替代', '调式特征', '转调属', '半音中音'];
// 允许的平行调借用（以大调为参照的根音半音数 + 性质）：iv、♭VI、♭VII、♭III、ii°、v（大调中）；小调中：IV、V、♭II（那不勒斯）
const BORROW_OK = { M: ['5m', '8', '10', '3', '2dim', '7m', '5m7', '8maj7', '10 7', '107', '3maj7', '2m7b5'], m: ['5', '7', '1', '57', '77', '1maj7'] };
function chordIssues(c, nx, ctx, style, isLastOfSong) {
  const out = [];
  const cls = Q[c.q].cls, ref = MODES[ctx.mode].ref;
  if (!c.diat && !c.seed && !style.fixed) {
    if (!LICENSED.includes(c.tag)) out.push(`非调内和弦未经许可：${c.name || c.rel}`);
    if (c.tag === '半音中音' && (cls !== 'M' || ![3, 4, 8, 9].includes(c.rel) )) out.push(`半音中音须为大三和弦、与主音相距三度：${c.name}`);
    if (c.tag === '借用') {
      const s = MODES[ctx.mode].s, natQ = s.includes(c.rel) ? null : null; void natQ;
      const key = c.rel + (cls === 'm' ? 'm' : cls === 'd' ? 'dim' : '');
      const keyQ = c.rel + c.q;
      const okList = BORROW_OK[ref];
      if (!okList.includes(key) && !okList.includes(keyQ) && !(ref === 'm' && c.rel === 0 && cls === 'M' && isLastOfSong)) out.push(`借用和弦不在常用范围：${c.name}`);
    }
  }
  if (nx && !c.seed) {
    const d = mod(nx.rel - c.rel + (nx.tonicShift || 0), 12);
    if (c.tag === '副属' && (d !== 5 || ['d', 'A'].includes(Q[nx.q].cls))) out.push(`副属未解决到下方五度的大/小三和弦：${c.name}→${nx.name}`);
    if (c.tag === '三全音替代' && d !== 11) out.push(`三全音替代未半音下行解决：${c.name}→${nx.name}`);
    if (/古典|Classical/.test(style.genre) && c.rel === 7 && c.func === 'D' && nx.func === 'S' && !nx.seed) out.push(`古典风格禁止属→下属倒退：${c.name}→${nx.name}`);
    if (cls === 'd' && !c.seed && !(ctx.mode === 'locrian' && c.rel === 0) && ![1, 5].includes(d) && !(Q[c.q].sym === 'dim7' && d === 0)) out.push(`减和弦未按导音(上行半音)或 ii°→V 解决：${c.name}→${nx.name}`);
  }
  return out;
}
function validate(song) {
  const issues = [], st = song.style, flat = song.flat;
  const vamp = st.fixed || /Drone|嗡鸣|放克|Funk|冥想/.test(st.name + st.genre);
  song.sections.forEach((sec, si) => {
    const ctx = { tonic: sec.tonic, mode: sec.mode };
    sec.chords.forEach((c, k) => {
      const gi = flat.indexOf(c), nx = flat[gi + 1];
      const nxRel = nx ? Object.assign({}, nx, { tonicShift: mod(song.sections[nx.section].tonic - sec.tonic, 12) }) : null;
      issues.push(...chordIssues(c, nxRel, ctx, st, gi === flat.length - 1).map((x) => `[${sec.name}#${k + 1}] ${x}`));
      if (!vamp && k >= 2 && sec.chords[k - 1].name === c.name && sec.chords[k - 2].name === c.name && !c.seed) issues.push(`[${sec.name}#${k + 1}] 同一和弦连续 3 次以上`);
    });
    const last = sec.chords[sec.chords.length - 1];
    const endOK = last.rel === 0 || last.func === 'D' || last.tag === '转调属' || last.seed || (si < song.sections.length - 1 && last.func === 'T');
    if (!endOK) issues.push(`[${sec.name}] 段落结尾既非主功能也非属功能（无终止感）`);
  });
  const fin = flat[flat.length - 1];
  if (fin && fin.rel !== 0) issues.push('全曲未结束在主和弦');
  if (flat.length >= 2 && !st.fixed) { const pen = flat[flat.length - 2]; if (!(['D', 'S'].includes(pen.func) || pen.tag === '调式特征' || pen.rel === 10 || pen.seed)) issues.push('终止前和弦不是属/下属/调式特征和弦'); }
  for (let i = 0; i < flat.length; i++) {
    const c = flat[i];
    if (Math.min(...c.upper) < UP_LO || Math.max(...c.upper) > UP_HI + 12) issues.push(`音域越界 ${c.name}`);
    if (Math.max(...c.upper) - Math.min(...c.upper) > 12) issues.push(`上方声部间距超过八度 ${c.name}`);
    if (c.bassNote < BASS_LO || c.bassNote >= BASS_LO + 12 || Math.min(...c.upper) - c.bassNote < 5 || Math.min(...c.upper) - c.bassNote > 24) issues.push(`低音位置/间距不当 ${c.name}`);
    if (i && flat[i - 1].section === c.section) for (const x of vlIssues(flat[i - 1], c, flat[i - 1].upper, flat[i - 1].bassNote, c.upper, c.bassNote)) issues.push(`${flat[i - 1].name}→${c.name} ${x}`);
  }
  return issues;
}
// 生成 → 校验；不通过先用严格声部进行重排，再换种子重生成
function validated(raw, o) {
  const base = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 2 ** 31);
  let song = null, issues = null;
  for (let k = 0; k < 40; k++) {
    song = raw(Object.assign({}, o, { seed: (base + k * 7919) >>> 0 }));
    issues = validate(song);
    if (issues.length) { voiceAll(song.flat, song.style, mkRng(song.seed ^ 0x9e3779b9), true); issues = validate(song); }
    if (!issues.length) { song.validation = { ok: true, tries: k + 1 }; return song; }
  }
  song.validation = { ok: false, issues };
  return song;
}
function generate(o = {}) {
  const fresh = o.seed === undefined && o.memory !== false;
  const song = validated(generateRaw, fresh ? Object.assign({}, o, { _recent: RECENT }) : o);
  if (fresh) remember(song);
  return song;
}
function expand(o = {}) { if (!parseSeeds(o.seeds || '').chords.length) throw new Error('无法识别输入的和弦：' + (o.seeds || '（空）')); return validated(expandRaw, o); }
/* ---------- 节奏型与事件 ---------- */
const PATTERNS = { block: '柱式和弦', pulse: '八分音符脉冲', arp: '分解和弦', pad: '长音铺底', swing: '摇摆走路贝斯', skank: '反拍 skank', shuffle: '布鲁斯 shuffle', drive: '八分音符强力推进', strum: '民谣扫弦', funk: '十六分切分', latin: '拉丁切分', bossa: '波萨诺瓦', boom: 'Boom-bap 律动', lofi: 'Lo-fi 慵懒摇摆', alberti: '阿尔贝蒂低音', waltz: '圆舞曲 嘭-嚓-嚓' };
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
    case 'drive': { const r = 52 + mod(c.pc - 52, 12); for (let t = start; t < end; t += sub) add(t, sub * 0.9, [B], 0.7, 'bass'); add(start, dur, Q[c.q].t.some((x) => x[0] === 7) ? [r, r + 7, r + 12] : U, 0.5, 'chord'); break; }
    case 'strum': { const h = M.d === 4 ? [0, 1, 1.5, 2.5, 3, 3.5] : [0, 2, 3, 5]; for (let b = start; b < end; b += L) for (const x of h) add(b + x, 0.5, U, x % 1 ? 0.38 : 0.55, 'chord'); add(start, dur, [B], 0.6, 'bass'); break; }
    case 'funk': for (let b = start; b < end; b += 4) { for (const x of [0, 0.75, 1.5, 2.25, 2.5, 3.5]) add(b + x, 0.2, U, 0.55, 'chord'); for (const x of [0, 1.75, 2.5, 3]) add(b + x, 0.4, [x === 2.5 ? B + 12 : B], 0.7, 'bass'); } break;
    case 'latin': case 'bossa': {
      const h = pat === 'bossa' ? [0, 1.5, 3] : [0, 1.5, 2.5, 3.5];
      for (let b = start; b < end; b += 4) { for (const x of h) add(b + x, 0.45, U, 0.5, 'chord'); add(b, 1.4, [B], 0.65, 'bass'); add(b + 1.5, 0.5, [B + 7], 0.5, 'bass'); add(b + 2, 1.4, [B], 0.6, 'bass'); add(b + 3.5, 0.5, [B + 7], 0.5, 'bass'); }
      break;
    }
    case 'lofi': for (let b = start; b < end; b += 4) { add(b + 0.04, 2.6, U, 0.42, 'chord'); add(b + 2 + 2 / 3, 1.2, U, 0.32, 'chord'); add(b, 1.4, [B], 0.62, 'bass'); add(b + 1 + 2 / 3, 0.6, [B], 0.45, 'bass'); add(b + 2.5 + 1 / 6, 1.2, [B], 0.5, 'bass'); } break;
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
  return { pulse: 'four', drive: 'rock', strum: 'rock', block: 'rock', boom: 'boom', lofi: 'lofi', swing: 'swing', skank: 'onedrop', latin: 'latin', bossa: 'bossa', funk: 'funk', shuffle: 'shuffle', waltz: 'waltz', pad: 'soft', arp: 'soft', alberti: 'soft' }[pat] || 'rock';
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
      case 'lofi': if (b === 0) hit(t, DRUM.kick, 0.7); if (b === 1) hit(t + 2 / 3, DRUM.kick, 0.5); if (b === 2) hit(t + 1 / 3 + 0.33, DRUM.kick, 0.55); if (odd) hit(t + 0.03, DRUM.snare, 0.55); hit(t, DRUM.hat, 0.22); hit(t + 2 / 3, DRUM.hat, 0.15); break;
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
// 旋律提示：强拍落在和弦音上，弱拍用调内音级进连接；音域 E4–E5，乐句尾拉长
function melodyFor(song, seed) {
  const rng = mkRng((seed || song.seed || 1) ^ 0x5bd1e995), M = METERS[song.meter], beat = M.d === 4 ? 1 : 1.5;
  const LO = 64, HI = 79, out = [];
  let prev = 71, dir = 1, motif = null;
  const inRange = (pcs) => { const a = []; for (let n = LO; n <= HI; n++) if (pcs.includes(mod(n, 12))) a.push(n); return a; };
  return {
    span(c, sec, t0, dur) {
      const scale = inRange(MODES[sec.mode].s.map((x) => mod(sec.tonic + x, 12)));
      const ct = inRange(Q[c.q].t.slice(0, 3).map((x) => mod(c.pc + x[0], 12)).concat(c.q.includes('7') ? [mod(c.pc + Q[c.q].t[3][0], 12)] : []));
      // 和弦音：选离上一个音最近的（≤ 4 半音优先），偶尔反向保持轮廓
      const near = (list, around) => list.reduce((b, n) => (Math.abs(n - around) < Math.abs(b - around) ? n : b), list[0]);
      if (prev >= HI - 2) dir = -1; else if (prev <= LO + 2) dir = 1; else if (rng() < 0.25) dir = -dir;
      let target = near(ct, prev + dir * 2);
      const beats = Math.max(1, Math.round(dur / beat));
      const rhythm = motif && motif.length === beats && rng() < 0.7 ? motif : Array.from({ length: beats }, (_, k) => (k === 0 ? 1 : rng() < 0.75 ? 1 : 0));
      if (!motif) motif = rhythm;
      let cur = target;
      for (let k = 0; k < beats; k++) {
        if (!rhythm[k]) continue;
        const t = t0 + k * beat;
        let n;
        if (k === 0) n = target;
        else { // 级进：在音阶上移动一步（方向随轮廓）
          const idx = scale.indexOf(near(scale, cur));
          n = scale[clamp(idx + (rng() < 0.8 ? dir : -dir), 0, scale.length - 1)];
          if (k % 2 === 0 && M.d === 4 && !ct.includes(n)) n = near(ct, n); // 次强拍回到和弦音
        }
        let len = beat; while (k + 1 < beats && !rhythm[k + 1] && len < dur) { len += beat; k++; }
        out.push({ t, d: Math.min(len, t0 + dur - t) * 0.92, notes: [n], vel: k === 0 ? 0.62 : 0.5, part: 'melody' });
        cur = n;
      }
      prev = cur;
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

/* ---------- General MIDI 128 音色（gleitz/midi-js-soundfonts 命名 + 中文名，按 16 个家族分组） ---------- */
const GM_FAMILIES = ['钢琴', '色彩打击乐', '风琴', '吉他', '贝斯', '弦乐', '合奏', '铜管', '簧管', '笛类', '合成主音', '合成铺底', '合成效果', '民族乐器', '打击乐', '音效'];
const GM = [
  ['acoustic_grand_piano', '原声大钢琴'], ['bright_acoustic_piano', '明亮钢琴'], ['electric_grand_piano', '电大钢琴'], ['honkytonk_piano', '酒吧钢琴'], ['electric_piano_1', '电钢琴 1（Rhodes）'], ['electric_piano_2', '电钢琴 2（DX）'], ['harpsichord', '羽管键琴'], ['clavinet', '克拉维内特'],
  ['celesta', '钢片琴'], ['glockenspiel', '钟琴'], ['music_box', '八音盒'], ['vibraphone', '颤音琴'], ['marimba', '马林巴'], ['xylophone', '木琴'], ['tubular_bells', '管钟'], ['dulcimer', '扬琴'],
  ['drawbar_organ', '拉杆风琴'], ['percussive_organ', '打击风琴'], ['rock_organ', '摇滚风琴'], ['church_organ', '教堂管风琴'], ['reed_organ', '簧风琴'], ['accordion', '手风琴'], ['harmonica', '口琴'], ['tango_accordion', '探戈手风琴'],
  ['acoustic_guitar_nylon', '尼龙弦吉他'], ['acoustic_guitar_steel', '钢弦吉他'], ['electric_guitar_jazz', '爵士电吉他'], ['electric_guitar_clean', '清音电吉他'], ['electric_guitar_muted', '闷音电吉他'], ['overdriven_guitar', '过载吉他'], ['distortion_guitar', '失真吉他'], ['guitar_harmonics', '吉他泛音'],
  ['acoustic_bass', '原声贝斯'], ['electric_bass_finger', '指弹电贝斯'], ['electric_bass_pick', '拨片电贝斯'], ['fretless_bass', '无品贝斯'], ['slap_bass_1', '击弦贝斯 1'], ['slap_bass_2', '击弦贝斯 2'], ['synth_bass_1', '合成贝斯 1'], ['synth_bass_2', '合成贝斯 2'],
  ['violin', '小提琴'], ['viola', '中提琴'], ['cello', '大提琴'], ['contrabass', '低音提琴'], ['tremolo_strings', '震音弦乐'], ['pizzicato_strings', '拨弦弦乐'], ['orchestral_harp', '竖琴'], ['timpani', '定音鼓'],
  ['string_ensemble_1', '弦乐合奏 1'], ['string_ensemble_2', '弦乐合奏 2'], ['synth_strings_1', '合成弦乐 1'], ['synth_strings_2', '合成弦乐 2'], ['choir_aahs', '合唱“啊”'], ['voice_oohs', '人声“哦”'], ['synth_choir', '合成人声'], ['orchestra_hit', '管弦乐重音'],
  ['trumpet', '小号'], ['trombone', '长号'], ['tuba', '大号'], ['muted_trumpet', '弱音小号'], ['french_horn', '圆号'], ['brass_section', '铜管组'], ['synth_brass_1', '合成铜管 1'], ['synth_brass_2', '合成铜管 2'],
  ['soprano_sax', '高音萨克斯'], ['alto_sax', '中音萨克斯'], ['tenor_sax', '次中音萨克斯'], ['baritone_sax', '上低音萨克斯'], ['oboe', '双簧管'], ['english_horn', '英国管'], ['bassoon', '大管'], ['clarinet', '单簧管'],
  ['piccolo', '短笛'], ['flute', '长笛'], ['recorder', '竖笛'], ['pan_flute', '排箫'], ['blown_bottle', '吹瓶'], ['shakuhachi', '尺八'], ['whistle', '口哨'], ['ocarina', '陶笛'],
  ['lead_1_square', '方波主音'], ['lead_2_sawtooth', '锯齿波主音'], ['lead_3_calliope', '汽笛风琴主音'], ['lead_4_chiff', '吹管主音'], ['lead_5_charang', '吉他式主音'], ['lead_6_voice', '人声主音'], ['lead_7_fifths', '五度主音'], ['lead_8_bass__lead', '贝斯+主音'],
  ['pad_1_new_age', '新世纪铺底'], ['pad_2_warm', '温暖铺底'], ['pad_3_polysynth', '复音合成铺底'], ['pad_4_choir', '合唱铺底'], ['pad_5_bowed', '弓弦铺底'], ['pad_6_metallic', '金属铺底'], ['pad_7_halo', '光环铺底'], ['pad_8_sweep', '扫频铺底'],
  ['fx_1_rain', '雨声'], ['fx_2_soundtrack', '电影音效'], ['fx_3_crystal', '水晶'], ['fx_4_atmosphere', '大气'], ['fx_5_brightness', '明亮'], ['fx_6_goblins', '精灵'], ['fx_7_echoes', '回声'], ['fx_8_scifi', '科幻'],
  ['sitar', '西塔琴'], ['banjo', '班卓琴'], ['shamisen', '三味线'], ['koto', '筝（日本）'], ['kalimba', '卡林巴'], ['bagpipe', '风笛'], ['fiddle', '提琴（民间）'], ['shanai', '唢呐'],
  ['tinkle_bell', '铃铛'], ['agogo', '阿哥哥铃'], ['steel_drums', '钢鼓'], ['woodblock', '木鱼'], ['taiko_drum', '太鼓'], ['melodic_tom', '旋律通鼓'], ['synth_drum', '合成鼓'], ['reverse_cymbal', '反向镲'],
  ['guitar_fret_noise', '吉他品格噪音'], ['breath_noise', '呼吸声'], ['seashore', '海浪'], ['bird_tweet', '鸟鸣'], ['telephone_ring', '电话铃'], ['helicopter', '直升机'], ['applause', '掌声'], ['gunshot', '枪声'],
];
// 风格默认音色（和弦 / 低音 / 旋律）
function defaultPrograms(style) {
  const g = (style && style.genre) || '';
  if (/Lo-fi/.test(g)) return /House/.test(style.name) ? { chord: 4, bass: 38, melody: 11 } : /Vaporwave/.test(style.name) ? { chord: 5, bass: 33, melody: 89 } : { chord: 4, bass: 33, melody: 11 };
  if (/爵士|Jazz/.test(g)) return { chord: 4, bass: 32, melody: 65 };
  if (/摇滚|Rock|金属|Metal/.test(g)) return { chord: 29, bass: 34, melody: 30 };
  if (/电子|EDM|合成器|Synth/.test(g)) return { chord: 90, bass: 38, melody: 81 };
  if (/R&B|灵魂|放克|Funk|嘻哈|Hip/.test(g)) return { chord: 4, bass: 33, melody: 65 };
  if (/古典|Classical/.test(g)) return { chord: 48, bass: 42, melody: 40 };
  if (/民谣|Folk|乡村|Country|拉丁|Latin/.test(g)) return { chord: 25, bass: 32, melody: 73 };
  if (/国风|Chinese/.test(g)) return { chord: 46, bass: 32, melody: 77 };
  if (/配乐|Score/.test(g)) return { chord: 48, bass: 43, melody: 60 };
  if (/氛围|Ambient/.test(g)) return { chord: 89, bass: 38, melody: 88 };
  if (/福音|Gospel/.test(g)) return { chord: 16, bass: 33, melody: 0 };
  return { chord: 0, bass: 33, melody: 73 };
}
/* ---------- MIDI 导出（format 1 多轨 / 单轨分轨） ---------- */
function vlq(n) { const b = [n & 0x7f]; while ((n >>>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
const utf8 = (str) => Array.from(unescape(encodeURIComponent(str))).map((ch) => ch.charCodeAt(0));
const PARTS = [
  { part: 'chord', name: '和弦', ch: 0, file: 'chords' },
  { part: 'bass', name: '低音', ch: 1, file: 'bass' },
  { part: 'melody', name: '旋律', ch: 2, file: 'melody' },
  { part: 'drum', name: '鼓', ch: 9, file: 'drums' },
  { part: 'click', name: '节拍器', ch: 9, file: 'click' },
];
const PROGRAMS = { piano: 0, epiano: 4, pad: 89, guitar: 25, organ: 16, synth: 81 };
function midiTiming(song) {
  const M = METERS[song.meter], ppq = 480, unitTicks = (ppq * 4) / M.d;
  const qpm = M.d === 4 ? song.bpm : M.n % 3 === 0 && M.n > 3 ? song.bpm * 1.5 : song.bpm;
  return { M, ppq, unitTicks, mpq: Math.round(60000000 / qpm) };
}
function chunk(bytesArr) { const L = bytesArr.length; return [0x4d, 0x54, 0x72, 0x6b, (L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255, ...bytesArr]; }
function trackData(items) { // items: [tick, order, bytes]
  items.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const tr = []; let last = 0;
  for (const [t, , bytes] of items) { for (const x of vlq(t - last)) tr.push(x); for (const x of bytes) tr.push(x); last = t; }
  for (const x of [0, 0xff, 0x2f, 0x00]) tr.push(x);
  return tr;
}
const metaText = (type, str) => { const b = utf8(str); return [0xff, type, ...vlq(b.length), ...b]; };
function conductorItems(song, built, tm, title) {
  const { M, unitTicks, mpq } = tm;
  const it = [[0, 0, metaText(0x03, title)], [0, 0, [0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255]], [0, 0, [0xff, 0x58, 0x04, M.n, Math.log2(M.d), M.d === 8 && M.n % 3 === 0 ? 36 : 24, 8]]];
  let lastSec = -1;
  for (const x of built.timeline) {
    if (x.cont) continue;
    const c = song.flat[x.ci], t = Math.round(x.t * unitTicks);
    if (c.section !== lastSec && song.sections.length > 1) { it.push([t, 0, metaText(0x06, song.sections[c.section].name)]); lastSec = c.section; }
    it.push([t, 0, metaText(0x06, c.name)]);
  }
  return it;
}
function noteItems(events, part, ch, tm) {
  const it = [];
  for (const e of events) {
    if (e.part !== part) continue;
    const t0 = Math.round(e.t * tm.unitTicks), t1 = Math.max(t0 + 1, Math.round((e.t + e.d) * tm.unitTicks) - 1);
    for (const n of e.notes) {
      const note = clamp(Math.round(n), 0, 127), vel = clamp(Math.round(e.vel * 127), 1, 127);
      it.push([t0, 2, [0x90 | ch, note, vel]]); it.push([t1, 1, [0x80 | ch, note, 0]]);
    }
  }
  return it;
}
// 选择的 GM 音色号写入 MIDI（Program Change）；未指定时按旧的音色名/默认值
function progFor(part, opts) {
  const pr = opts.programs || {};
  if (pr[part] !== undefined && pr[part] !== null && pr[part] !== '') return clamp(+pr[part] | 0, 0, 127);
  return part === 'chord' ? PROGRAMS[opts.instrument] || 0 : part === 'bass' ? 33 : 73;
}
function partHeader(P, opts) {
  const it = [[0, 0, metaText(0x03, P.name)]];
  if (P.ch !== 9) it.push([0, 0, [0xc0 | P.ch, progFor(P.part, opts)]]);
  return it;
}
function midiFile(format, tracks, ppq) {
  return new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, format, 0, tracks.length, (ppq >> 8) & 255, ppq & 255, ...tracks.flatMap(chunk)]);
}
// 合并 MIDI：format 1，第 0 轨为指挥轨（速度/拍号/和弦标记），其后每个声部一个命名轨
function toMidi(song, opts = {}) {
  const built = buildEvents(song, opts), tm = midiTiming(song);
  const tracks = [trackData(conductorItems(song, built, tm, opts.title || 'Chord Generator'))];
  for (const P of PARTS) {
    const notes = noteItems(built.events, P.part, P.ch, tm);
    if (notes.length) tracks.push(trackData(partHeader(P, opts).concat(notes)));
  }
  return midiFile(1, tracks, tm.ppq);
}
// 分轨导出：每个声部一个独立的 .mid（format 0，含速度、拍号、轨名与和弦标记）
function midiParts(song, opts = {}) {
  const built = buildEvents(song, Object.assign({}, opts, { drums: true, melody: true, metronome: false })), tm = midiTiming(song);
  const out = [];
  for (const P of PARTS.slice(0, 4)) {
    const notes = noteItems(built.events, P.part, P.ch, tm);
    if (!notes.length) continue;
    const it = conductorItems(song, built, tm, P.name).concat(partHeader(P, opts).slice(1), notes);
    out.push({ part: P.part, name: P.name, file: P.file, channel: P.ch + 1, bytes: midiFile(0, [trackData(it)], tm.ppq) });
  }
  return out;
}
/* ---------- 极简 ZIP（仅存储，不压缩） ---------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u) { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function makeZip(files, date) {
  const d = date || new Date();
  const dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  const parts = [], central = []; let off = 0;
  const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = utf8(f.name), data = f.data instanceof Uint8Array ? f.data : new Uint8Array(utf8(String(f.data))), crc = crc32(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(dt), ...u16(dd), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    const local = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...common, ...name]);
    parts.push(local, data);
    central.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off), ...name]));
    off += local.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), 0, 0]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0; for (const c of all) { out.set(c, p); p += c.length; }
  return out;
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
function setBpm(song, bpm) { song.bpm = clamp(Math.round(+bpm) || 120, 20, 300); song.settings.bpm = song.bpm; song.settings.feel = song.bpm < 80 ? '慢' : song.bpm < 125 ? '中' : '快'; return song; }
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
  const before = song.sections.map((sec) => sec.chords.map(cleanChord));
  const seed = o.seed !== undefined ? o.seed : Math.floor(Math.random() * 2 ** 31), rng = mkRng(seed);
  const md = MOODS[song.settings.mood] || MOODS['中性'];
  song.sections.forEach((sec, si) => {
    if (o.section !== undefined && o.section !== null && o.section !== si) return;
    const n = sec.chords.length, ctx = { tonic: sec.tonic, mode: sec.mode };
    if (sec.chords.every((c) => c.lock)) return;
    const last = sec.chords[n - 1];
    const p = buildProg(ctx, song.style, n, rng, { tplOK: song.kind === 'random', end: endTypeOf(last), borrowAdd: md.borrow, secAdd: md.sec, complexity: song.settings.complexity, phrase: Math.max(2, Math.round(4 * song.hr)), startFunc: sec.chords[0].lock ? undefined : (sec.key === 'Pre-chorus' || sec.key === 'Bridge' ? 'S' : undefined) });
    applyComplexity(p.chords, ctx, song.style, song.settings.complexity || 0, rng, md.sus);
    if (last.tag === '转调属' && !last.lock) p.chords[n - 1] = cleanChord(last);
    sec.chords = sec.chords.map((c, k) => (c.lock ? c : p.chords[k]));
  });
  song.seed = seed;
  refresh(song);
  if (!o._noRetry) {
    let issues = validate(song);
    if (issues.length) { voiceAll(song.flat, song.style, mkRng(seed ^ 0x9e3779b9), true); issues = validate(song); }
    for (let k = 1; issues.length && k < 40; k++) { song.sections = before.map((sec) => sec.map(cleanChord)).map((chs, i) => Object.assign(song.sections[i], { chords: chs })); regenerate(song, Object.assign({}, o, { seed: (seed + k * 7919) >>> 0, _noRetry: true })); issues = validate(song); if (issues.length) { voiceAll(song.flat, song.style, mkRng(song.seed ^ 0x9e3779b9), true); issues = validate(song); } }
    song.validation = { ok: !issues.length, issues };
  }
  return song;
}
const GUITAR = [40, 45, 50, 55, 59, 64];
function guitarShape(c) {
  if (c.q !== '__dict' && !c.xb && !(c.bass > 0) && typeof guitarVoicings === 'function') { // 优先使用标准指法（如 Bb = x13331）
    const v = guitarVoicings(c.pc, Q[c.q].t.map((x) => x[0]), c.pc, c.q, KEYS_M[c.pc] === 'Gb' ? 'F#' : KEYS_M[c.pc]);
    if (v.length && v[0].label !== '自动') return v[0];
  }
  const pcs = c.q === '__dict' ? c.__pcs : Q[c.q].t.map((x) => mod(c.pc + x[0], 12));
  const bassPc = c.q === '__dict' ? c.__bass : c.xb ? c.xbPc : mod(c.pc + Q[c.q].t[c.bass || 0][0], 12);
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

function dspell(pc, letter) { pc = mod(pc, 12); letter = mod(letter, 7); let d = mod(pc - LETPC[letter], 12); if (d > 6) d -= 12; if (Math.abs(d) > 2) return KEYS_M[pc]; return LET[letter] + (d === 2 ? '##' : d === 1 ? '#' : d === -1 ? 'b' : d === -2 ? 'bb' : ''); }
/* ---------- 和弦分析：下一和弦候选（与 validate 使用同一套 chordIssues 规则） ---------- */
const IV_NAME = { 0: '根音', 1: '♭9', 2: '大二/9', 3: '小三度', 4: '大三度', 5: '纯四/11', 6: '减五/♯11', 7: '纯五度', 8: '增五/♭13', 9: '大六/13', 10: '小七度', 11: '大七度' };
const IV_SHORT = { 0: '1', 1: '♭9', 2: '9', 3: '♭3', 4: '3', 5: '4/11', 6: '♭5/♯11', 7: '5', 8: '♯5/♭13', 9: '6/13', 10: '♭7', 11: '7' };
const NEXT_CATS = ['调内 · 主功能 T', '调内 · 下属功能 S', '调内 · 属功能 D', '终止式', '副属和弦', '三全音替代', '借用 / 调式交替', '阻碍进行', '半音中音', '风格惯用'];
// 非调内类别的先验概率（来自 docs/theory-rules.md：副属/借用在流行语料中合计约 5–10%，三全音替代仅见于爵士）
const CAT_PRIOR = { '副属和弦': 0.05, '三全音替代': 0.03, '借用 / 调式交替': 0.04, '阻碍进行': 0.06, '半音中音': 0.015, '风格惯用': 0.08 };
function chordFacts(c, ctx) {
  const T = Q[c.q].t;
  const notes = T.map(([iv, l]) => ({ pc: mod(c.pc + iv, 12), name: dspell(c.pc + iv, c.letter + l), iv: mod(iv, 12), ivName: IV_NAME[mod(iv, 12)], deg: IV_SHORT[mod(iv, 12)] }));
  const interp = [];
  const pcs = notes.map((n) => n.pc), root = c.pc, q = c.q;
  for (const mode of ['major', 'minor']) for (let t = 0; t < 12; t++) {
    const s = MODES[mode].s, rel = mod(root - t, 12), st = s.indexOf(rel), k = { tonic: t, mode };
    const kn = keyName(t, mode) + (mode === 'major' ? ' 大调' : ' 小调');
    if (st >= 0) {
      const d3 = diatonicQ(s, st, false), d7 = diatonicQ(s, st, true);
      if (Q[q].cls === Q[d3].cls && pcs.every((p) => s.includes(mod(p - t, 12)))) interp.push({ key: kn, roman: romanOf(k, rel, st, q), func: FUNC_CN[funcOfStep(k, st)], kind: '调内', same: t === ctx.tonic && mode === ctx.mode });
      else if (Q[q].dom && d7 !== '7') { const tgt = s.indexOf(mod(rel + 5, 12)); if (tgt > 0 && ['', 'm'].includes(diatonicQ(s, tgt, false))) interp.push({ key: kn, roman: 'V7/' + romanOf(k, s[tgt], tgt, diatonicQ(s, tgt, false)), func: '副属（属功能）', kind: '副属' }); }
    }
    if (mode === 'minor' && rel === 7 && Q[q].cls === 'M' && (Q[q].dom || q === '')) interp.push({ key: kn, roman: 'V' + (Q[q].dom ? '7' : ''), func: '属功能（和声小调）', kind: '和声小调属' });
  }
  return { notes, interp: interp.slice(0, 14) };
}
function candChord(base, ctx) { const r = realize(Object.assign({ bass: 0 }, base), ctx); r.name = chordName(r); return r; }
function nextCandidates(song, ci) {
  const loc = locate(song, ci); if (!loc) return null;
  const [si, k] = loc, sec = song.sections[si], ctx = { tonic: sec.tonic, mode: sec.mode }, cur = sec.chords[k], st = song.style;
  const s = MODES[ctx.mode].s, ref = MODES[ctx.mode].ref, M = MARKOV[ref], lvl = song.settings.complexity || 0;
  const after = sec.chords[k + 2] || null, out = [], seen = new Set();
  const curStep = s.indexOf(cur.rel) >= 0 && cur.diat ? s.indexOf(cur.rel) : -1;
  const isLast = ci + 1 === song.flat.length - 1;
  const q7 = (x) => { if (lvl >= 1 && !x.fixedQ) { if (x.dom) x.q = '7'; else if (x.diat) x.q = diatonicQ(s, x.step, true); } return x; };
  const add = (base, cat, p, why) => {
    const c = candChord(q7(Object.assign({}, base, { done: true })), ctx);
    const key = cat + c.rel + ':' + c.q + ':' + (c.tag || '');
    if (seen.has(key)) return;
    // 同一套规则：当前和弦 → 候选（例如副属/减和弦/三全音替代的解决、古典 V→IV 禁止），以及候选自身的许可（借用白名单等）
    const res = c.tag === '副属' || c.tag === '三全音替代' ? null : null; void res;
    const curR = Object.assign({}, cur, { name: song.flat[ci].name });
    const issues = chordIssues(curR, c, ctx, st, false).concat(chordIssues(c, null, ctx, st, isLast));
    if (issues.length) return;
    seen.add(key);
    let need = '';
    if (c.tag === '副属') need = `需继续解决到 ${c.sec}`;
    if (c.tag === '三全音替代') need = '需半音下行解决';
    if (Q[c.q].cls === 'd') need = '需上行半音解决';
    out.push({ chord: cleanChord(c), name: c.name, roman: c.roman, cat, p, why, need });
  };
  // 2) 终止式
  if (cur.func === 'D') add(dia(ctx, 0), NEXT_CATS[3], 0.45, '正格终止 V→I：最强的收束。');
  if (cur.func === 'S') { add(Object.assign(dia(ctx, 4), ref === 'm' ? { q: '', diat: false, tag: '和声小调属', dom: true, func: 'D' } : { dom: true }), NEXT_CATS[3], 0.3, '下属→属：为终止做准备（半终止）。'); add(dia(ctx, 0), NEXT_CATS[3], 0.25, '变格终止 IV→I（"阿门"终止）。'); }
  if (cur.func === 'T' && cur.rel === 0) add(Object.assign(dia(ctx, 4), ref === 'm' ? { q: '', diat: false, tag: '和声小调属', dom: true, func: 'D' } : { dom: true }), NEXT_CATS[3], 0.2, '停在属和弦：半终止。');
  // 1) 调内：Hooktheory 加权的转移矩阵
  for (let t = 0; t < 7; t++) {
    const d = dia(ctx, t), p = curStep >= 0 ? M[curStep][t] : [0.2, 0.08, 0.04, 0.2, 0.2, 0.15, 0.02][t];
    if (t === curStep) continue;
    const f = funcOfStep(ctx, t), cat = f === 'T' ? NEXT_CATS[0] : f === 'S' ? NEXT_CATS[1] : NEXT_CATS[2];
    add(d, cat, Math.max(p, 0.01), `${romanOf(ctx, d.rel, t, d.q)}：${FUNC_CN[f]}。` + (p >= 0.25 ? '语料中最常见的走向之一。' : p >= 0.1 ? '常见走向。' : '较少见但合规。'));
  }
  // 3) 副属：V7/x 指向调内大/小三和弦（下一步须解决）
  for (let t = 1; t < 7; t++) { const tq = diatonicQ(s, t, false); if (!['', 'm'].includes(tq)) continue; const sd = secDom(ctx, t); sd.q = '7'; sd.fixedQ = true; add(sd, NEXT_CATS[4], CAT_PRIOR['副属和弦'] * (t === 1 || t === 5 ? 1.5 : 1), `V7/${sd.sec}：临时把 ${sd.sec} 当作主和弦，增强推进。`); }
  // 4) 三全音替代
  for (let t = 0; t < 7; t++) { const tq = diatonicQ(s, t, false); if (!['', 'm'].includes(tq)) continue; const sd = secDom(ctx, t); sd.q = '7'; const tt = tritoneOf(t === 0 ? Object.assign(sd, { sec: 'I' }) : sd); tt.fixedQ = true; add(tt, NEXT_CATS[5], CAT_PRIOR['三全音替代'] * (/爵士|Jazz|Bossa|R&B|灵魂|Soul|福音/.test(st.genre + st.name) ? 2 : 0.5), `subV7/${tt.sec}：与 V7 共享三音与七音，低音半音下行进入 ${tt.sec}。`); }
  // 5) 借用 / 调式交替（BORROW_OK 白名单）
  const brw = ref === 'M' ? [[3, 5, 'm', 'iv'], [5, 8, '', '♭VI'], [6, 10, '', '♭VII'], [2, 3, '', '♭III'], [1, 2, 'dim', 'ii°']] : [[3, 5, '', 'IV'], [4, 7, '', 'V'], [1, 1, '', '♭II']];
  for (const [stp, rel, q, nm] of brw) { if (s[stp] === rel && diatonicQ(s, stp, false) === q) continue; add({ rel, step: stp, q, func: rel === 7 ? 'D' : funcOfStep(ctx, stp), tag: rel === 7 ? '和声小调属' : '借用', dom: rel === 7 }, NEXT_CATS[6], CAT_PRIOR['借用 / 调式交替'] * (nm === '♭VII' || nm === 'iv' || nm === 'V' ? 1.5 : 1), `${nm}：从平行${ref === 'M' ? '小' : '大'}调借来，${ref === 'M' ? '带来暗色' : '带来明亮或强属'}色彩。`); }
  // 6) 阻碍进行
  if (cur.func === 'D') { add(dia(ctx, 5), NEXT_CATS[7], 0.25, '阻碍终止 V→vi：期待主和弦却落在 vi。'); if (ref === 'M') add({ rel: 8, step: 5, q: '', func: 'S', tag: '借用' }, NEXT_CATS[7], 0.05, '阻碍终止 V→♭VI：更戏剧化的落点。'); }
  // 7) 半音中音：根音相距大/小三度、同为大三和弦，共享一个音
  for (const rel of [3, 4, 8, 9]) { if (rel === cur.rel || (s.includes(rel) && diatonicQ(s, s.indexOf(rel), false) === '')) continue; const d = mod(rel - cur.rel, 12); add({ rel, step: rel <= 4 ? 2 : 5, q: '', func: 'T', tag: '半音中音', fixedQ: true }, NEXT_CATS[8], CAT_PRIOR['半音中音'] * ([3, 4, 8, 9].includes(d) ? 1.5 : 1) * (/配乐|Film|Cinematic|Epic|史诗/.test(st.genre + st.name) ? 3 : 1), `主音的半音中音（与主音根音相距三度的大三和弦）：电影配乐式的色彩转换。`); }
  // 8) 风格惯用：在本风格模板库中紧跟当前和弦的和弦
  const L = libFor(st, ref), tpls = L.main.concat(L.extra), hits = {};
  for (const t of tpls) { let cs; try { cs = tplChords(t, ctx); } catch (e) { continue; } for (let i = 0; i + 1 < cs.length; i++) if (cs[i].rel === cur.rel && Q[cs[i].q].cls === Q[cur.q].cls) { const n = cs[i + 1], key = n.rel + ':' + n.q; hits[key] = hits[key] || { c: n, n: 0, t }; hits[key].n++; } }
  const tot = Object.values(hits).reduce((a, h) => a + h.n, 0);
  for (const h of Object.values(hits)) add(Object.assign({}, h.c), NEXT_CATS[9], CAT_PRIOR['风格惯用'] + 0.3 * h.n / tot, `本风格常用进行「${h.t}」中的下一步。`);
  // 概率归一化
  const sum = out.reduce((a, x) => a + x.p, 0) || 1;
  out.forEach((x) => (x.p = x.p / sum));
  const groups = NEXT_CATS.map((cat) => ({ cat, items: out.filter((x) => x.cat === cat).sort((a, b) => b.p - a.p) })).filter((g) => g.items.length);
  return { ctx, key: keyName(ctx.tonic, ctx.mode) + ' ' + MODES[ctx.mode].n, groups, all: out, hasNext: !!sec.chords[k + 1], after };
}
function analyzeChord(song, ci) {
  const c = song.flat[ci]; if (!c) return null;
  const sec = song.sections[c.section], ctx = { tonic: sec.tonic, mode: sec.mode };
  const f = chordFacts(c, ctx);
  return Object.assign({ name: c.name, roman: c.roman, func: c.func, funcCn: FUNC_CN[c.func] || c.func, tag: c.tag, quality: DICT_CN[c.q] || c.q, formula: Q[c.q].t.map(([iv]) => IV_SHORT[mod(iv, 12)]).join('-') }, f, { next: nextCandidates(song, ci) });
}
// 预览：当前和弦 → 候选和弦的声部配置（与正式配置算法相同）
function previewPair(song, ci, chord) {
  const c = song.flat[ci], sec = song.sections[c.section], ctx = { tonic: sec.tonic, mode: sec.mode };
  const a = Object.assign({}, cleanChord(c)); realize(a, ctx); a.name = chordName(a); a.bass = c.bass || 0;
  const b = realize(Object.assign({ bass: 0 }, cleanChord(chord)), ctx); b.name = chordName(b);
  voiceAll([a, b], song.style, mkRng(7)); return [a, b];
}
function setNext(song, ci, chord, mode) {
  const loc = locate(song, ci); if (!loc) return song;
  const [si, k] = loc, chs = song.sections[si].chords, nc = cleanChord(chord);
  if (mode === 'insert' || k + 1 >= chs.length) chs.splice(k + 1, 0, nc); else chs[k + 1] = nc;
  return refresh(song);
}

/* ---------- 和弦图鉴 ---------- */
// [id, 符号, 中文名, 族, 音程（半音）, 字母级数]
const DICT = [
  ['', '', '大三和弦', '三和弦', [0, 4, 7], [0, 2, 4]], ['m', 'm', '小三和弦', '三和弦', [0, 3, 7], [0, 2, 4]], ['dim', 'dim', '减三和弦', '三和弦', [0, 3, 6], [0, 2, 4]], ['aug', 'aug', '增三和弦', '三和弦', [0, 4, 8], [0, 2, 4]],
  ['sus2', 'sus2', '挂二和弦', '挂留', [0, 2, 7], [0, 1, 4]], ['sus4', 'sus4', '挂四和弦', '挂留', [0, 5, 7], [0, 3, 4]], ['7sus4', '7sus4', '属七挂四', '挂留', [0, 5, 7, 10], [0, 3, 4, 6]], ['9sus4', '9sus4', '属九挂四', '挂留', [0, 5, 7, 10, 14], [0, 3, 4, 6, 1]],
  ['6', '6', '大六和弦', '六和弦', [0, 4, 7, 9], [0, 2, 4, 5]], ['m6', 'm6', '小六和弦', '六和弦', [0, 3, 7, 9], [0, 2, 4, 5]], ['69', '6/9', '六九和弦', '六和弦', [0, 4, 7, 9, 14], [0, 2, 4, 5, 1]],
  ['maj7', 'maj7', '大七和弦', '七和弦', [0, 4, 7, 11], [0, 2, 4, 6]], ['7', '7', '属七和弦', '七和弦', [0, 4, 7, 10], [0, 2, 4, 6]], ['m7', 'm7', '小七和弦', '七和弦', [0, 3, 7, 10], [0, 2, 4, 6]], ['m7b5', 'm7b5', '半减七和弦', '七和弦', [0, 3, 6, 10], [0, 2, 4, 6]], ['dim7', 'dim7', '减七和弦', '七和弦', [0, 3, 6, 9], [0, 2, 4, 6]], ['mMaj7', 'mMaj7', '小大七和弦', '七和弦', [0, 3, 7, 11], [0, 2, 4, 6]], ['maj7#5', 'maj7#5', '增大七和弦', '七和弦', [0, 4, 8, 11], [0, 2, 4, 6]], ['7#5', '7#5', '增属七和弦', '七和弦', [0, 4, 8, 10], [0, 2, 4, 6]],
  ['maj9', 'maj9', '大九和弦', '延伸', [0, 4, 7, 11, 14], [0, 2, 4, 6, 1]], ['9', '9', '属九和弦', '延伸', [0, 4, 7, 10, 14], [0, 2, 4, 6, 1]], ['m9', 'm9', '小九和弦', '延伸', [0, 3, 7, 10, 14], [0, 2, 4, 6, 1]], ['11', '11', '属十一和弦', '延伸', [0, 7, 10, 14, 17], [0, 4, 6, 1, 3]], ['m11', 'm11', '小十一和弦', '延伸', [0, 3, 7, 10, 14, 17], [0, 2, 4, 6, 1, 3]], ['maj13', 'maj13', '大十三和弦', '延伸', [0, 4, 7, 11, 14, 21], [0, 2, 4, 6, 1, 5]], ['13', '13', '属十三和弦', '延伸', [0, 4, 7, 10, 14, 21], [0, 2, 4, 6, 1, 5]], ['m13', 'm13', '小十三和弦', '延伸', [0, 3, 7, 10, 14, 21], [0, 2, 4, 6, 1, 5]], ['maj7#11', 'maj7#11', '利底亚大七', '延伸', [0, 4, 7, 11, 18], [0, 2, 4, 6, 3]],
  ['7b9', '7b9', '属七降九', '变化', [0, 4, 7, 10, 13], [0, 2, 4, 6, 1]], ['7#9', '7#9', '属七升九（亨德里克斯和弦）', '变化', [0, 4, 7, 10, 15], [0, 2, 4, 6, 1]], ['7#11', '7#11', '属七升十一', '变化', [0, 4, 7, 10, 18], [0, 2, 4, 6, 3]], ['7b13', '7b13', '属七降十三', '变化', [0, 4, 7, 10, 20], [0, 2, 4, 6, 5]], ['7b5', '7b5', '属七降五', '变化', [0, 4, 6, 10], [0, 2, 4, 6]], ['7alt', '7alt', '变化属和弦', '变化', [0, 4, 10, 13, 15, 20], [0, 2, 6, 1, 1, 5]],
  ['add9', 'add9', '加九和弦', '加音', [0, 4, 7, 14], [0, 2, 4, 1]], ['madd9', 'm(add9)', '小加九和弦', '加音', [0, 3, 7, 14], [0, 2, 4, 1]], ['add11', 'add11', '加十一和弦', '加音', [0, 4, 7, 17], [0, 2, 4, 3]],
  ['5', '5', '强力和弦（五度）', '强力和弦', [0, 7], [0, 4]],
];
const DICT_CN = Object.fromEntries(DICT.map((d) => [d[0], d[2]]));
const DICT_FAMILIES = ['三和弦', '挂留', '六和弦', '七和弦', '延伸', '变化', '加音', '强力和弦'];
const ROOTS = [['C', 0, 0], ['Db', 1, 1], ['D', 2, 1], ['Eb', 3, 2], ['E', 4, 2], ['F', 5, 3], ['F#', 6, 3], ['G', 7, 4], ['Ab', 8, 5], ['A', 9, 5], ['Bb', 10, 6], ['B', 11, 6]];
// 各和弦性质常见于哪些风格（模板库统计 + 风格手册，见 docs/theory-rules.md）
const DICT_STYLES = { '': ['流行', '摇滚', '民谣', '国风', '古典', '乡村', '雷鬼', '福音', '敬拜'], m: ['流行', '摇滚', '民谣', '国风', '古典', '电子', '说唱', '拉丁'], dim: ['古典', '福音', '爵士'], aug: ['古典', '爵士', '配乐'], sus2: ['国风', '流行', '氛围', '后摇', '敬拜'], sus4: ['国风', '流行', '摇滚', '福音', '敬拜'], '7sus4': ['放克', 'R&B', '爵士', '福音'], '9sus4': ['爵士', '放克', 'R&B'], 6: ['爵士', '摇摆', '乡村'], m6: ['爵士', '探戈', '拉丁'], 69: ['爵士', 'Bossa Nova', '国风', 'Lo-fi'], maj7: ['爵士', 'R&B', 'Lo-fi', '新灵魂', 'City Pop', 'K-pop', 'J-pop', 'Vaporwave'], 7: ['布鲁斯', '爵士', '放克', '福音', '摇滚'], m7: ['爵士', 'R&B', 'Lo-fi', '放克', '新灵魂', 'K-pop', 'Amapiano'], m7b5: ['爵士', '古典', '拉丁'], dim7: ['古典', '福音', '爵士'], mMaj7: ['爵士', '配乐'], 'maj7#5': ['爵士'], '7#5': ['爵士', '福音'], maj9: ['R&B', '新灵魂', 'Lo-fi', '爵士'], 9: ['放克', '布鲁斯', '爵士', 'Lo-fi'], m9: ['R&B', '新灵魂', 'Lo-fi', '爵士'], 11: ['放克', '爵士', '福音'], m11: ['新灵魂', 'R&B', '爵士'], maj13: ['爵士', '新灵魂', 'Lo-fi'], 13: ['放克', '爵士', '布鲁斯', 'Lo-fi'], m13: ['爵士', '新灵魂'], 'maj7#11': ['爵士', '配乐', 'City Pop'], '7b9': ['爵士', '拉丁', '弗拉门戈'], '7#9': ['放克', '摇滚', '布鲁斯'], '7#11': ['爵士', 'Bossa Nova'], '7b13': ['爵士'], '7b5': ['爵士'], '7alt': ['爵士', '比波普'], add9: ['流行', '摇滚', '国风', '民谣', 'Lo-fi', 'K-pop'], madd9: ['流行', '国风', '氛围'], add11: ['民谣', '流行'], 5: ['摇滚', '朋克', '金属', '垃圾摇滚', 'Phonk'] };
// 常用开放和弦（标准指法，-1 = 不弹）
const OPEN = { C: [-1, 3, 2, 0, 1, 0], A: [-1, 0, 2, 2, 2, 0], G: [3, 2, 0, 0, 0, 3], E: [0, 2, 2, 1, 0, 0], D: [-1, -1, 0, 2, 3, 2], Am: [-1, 0, 2, 2, 1, 0], Em: [0, 2, 2, 0, 0, 0], Dm: [-1, -1, 0, 2, 3, 1], C7: [-1, 3, 2, 3, 1, 0], A7: [-1, 0, 2, 0, 2, 0], G7: [3, 2, 0, 0, 0, 1], E7: [0, 2, 0, 1, 0, 0], D7: [-1, -1, 0, 2, 1, 2], B7: [-1, 2, 1, 2, 0, 2], Am7: [-1, 0, 2, 0, 1, 0], Em7: [0, 2, 0, 0, 0, 0], Dm7: [-1, -1, 0, 2, 1, 1], Cmaj7: [-1, 3, 2, 0, 0, 0], Fmaj7: [-1, -1, 3, 2, 1, 0], Amaj7: [-1, 0, 2, 1, 2, 0], Dmaj7: [-1, -1, 0, 2, 2, 2], Emaj7: [0, 2, 1, 1, 0, 0], Gmaj7: [3, 2, 0, 0, 0, 2], Csus2: [-1, 3, 0, 0, 1, 0], Dsus2: [-1, -1, 0, 2, 3, 0], Asus2: [-1, 0, 2, 2, 0, 0], Dsus4: [-1, -1, 0, 2, 3, 3], Asus4: [-1, 0, 2, 2, 3, 0], Esus4: [0, 2, 2, 2, 0, 0], Csus4: [-1, 3, 3, 0, 1, 1], Cadd9: [-1, 3, 2, 0, 3, 0], Gadd9: [3, 0, 0, 2, 0, 3], A6: [-1, 0, 2, 2, 2, 2], E5: [0, 2, 2, -1, -1, -1], A5: [-1, 0, 2, 2, -1, -1], D5: [-1, -1, 0, 2, 3, -1], Asus4_: null, E9: [0, 2, 0, 1, 0, 2], Am6: [-1, 0, 2, 2, 1, 2], Dm6: [-1, -1, 0, 2, 0, 1], Em9: [0, 2, 0, 0, 0, 2], Cdim7: [-1, 3, 4, 2, 4, 2] };
// 可移动指法：E 型（根音在 6 弦）、A 型（根音在 5 弦）、D 型（根音在 4 弦）。数值相对根音品位。
const MOVE = {
  E: { '': [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], 7: [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], maj7: [0, -9, 1, 1, 0, -9], sus4: [0, 2, 2, 2, 0, 0], '7sus4': [0, 2, 0, 2, 0, 0], 5: [0, 2, 2, -9, -9, -9], m7b5: [0, -9, 0, 0, -1, -9], dim7: [0, -9, -1, 0, -1, -9], 6: [0, -9, -1, 1, 0, -9], m6: [0, -9, -1, 0, 0, -9], 9: [0, -9, 0, 1, 0, 2], '7#9': [0, -9, 0, 1, 3, -9], '7b9': [0, -9, 0, 1, 0, 1], 13: [0, -9, 0, 1, 2, -9], mMaj7: [0, 2, 1, 0, 0, 0], aug: [0, 3, 2, 1, 1, 0], m9: [0, 2, 0, 0, 0, 2], add9: [0, 2, 4, 1, 0, 0], '7#5': [0, -9, 0, 1, 1, -9], '7b5': [0, -9, 0, 1, -1, -9], m11: [0, 0, 0, 0, 0, 0] },
  A: { '': [-9, 0, 2, 2, 2, 0], m: [-9, 0, 2, 2, 1, 0], 7: [-9, 0, 2, 0, 2, 0], m7: [-9, 0, 2, 0, 1, 0], maj7: [-9, 0, 2, 1, 2, 0], sus2: [-9, 0, 2, 2, 0, 0], sus4: [-9, 0, 2, 2, 3, 0], '7sus4': [-9, 0, 2, 0, 3, 0], 6: [-9, 0, 2, 2, 2, 2], m6: [-9, 0, 2, 2, 1, 2], 69: [-9, 0, -1, -1, 0, 0], dim: [-9, 0, 1, 2, 1, -9], dim7: [-9, 0, 1, 2, 1, 2], m7b5: [-9, 0, 1, 0, 1, -9], aug: [-9, 0, 3, 2, 2, -9], 9: [-9, 0, -1, 0, 0, 0], maj9: [-9, 0, -1, 1, 0, -9], m9: [-9, 0, -2, 0, 0, -9], 13: [-9, 0, -1, 0, 0, 2], '7b9': [-9, 0, -1, 0, -1, -9], '7#9': [-9, 0, -1, 0, 1, -9], add9: [-9, 0, 2, 4, 2, 0], 5: [-9, 0, 2, 2, -9, -9], mMaj7: [-9, 0, 2, 1, 1, 0], '9sus4': [-9, 0, 0, 0, 0, 0], m11: [-9, 0, 0, 0, 1, 0], 'maj7#11': [-9, 0, 1, 1, 2, -9], '7#5': [-9, 0, -9, 0, 2, 1], '7b5': [-9, 0, 1, 0, 2, -9], '7alt': [-9, 0, -1, 0, 1, 1], '7#11': [-9, 0, 1, 0, 2, 2], '7b13': [-9, 0, -9, 0, 2, 1], maj13: [-9, 0, -1, 1, 0, 2], m13: [-9, 0, -2, 0, 0, 2], 11: [-9, 0, 0, 0, 0, 0], add11: [-9, 0, 2, 2, 2, 3] },
  D: { '': [-9, -9, 0, 2, 3, 2], m: [-9, -9, 0, 2, 3, 1], 7: [-9, -9, 0, 2, 1, 2], m7: [-9, -9, 0, 2, 1, 1], maj7: [-9, -9, 0, 2, 2, 2], sus2: [-9, -9, 0, 2, 3, 0], sus4: [-9, -9, 0, 2, 3, 3], 6: [-9, -9, 0, 2, 0, 2], m6: [-9, -9, 0, 2, 0, 1], m7b5: [-9, -9, 0, 1, 1, 1], dim7: [-9, -9, 0, 1, 0, 1], add9: [-9, -9, 0, 2, 3, 0] },
};
const STR_OPEN = { E: 40, A: 45, D: 50 };
function shapeOk(fr, pcs, need, bassPc) {
  const snd = fr.map((f, j) => (f < 0 ? null : GUITAR[j] + f)).filter((x) => x !== null);
  if (snd.length < Math.min(3, pcs.length)) return false;
  if (snd.some((n) => !pcs.includes(mod(n, 12)))) return false;
  const got = new Set(snd.map((n) => mod(n, 12))); for (const p of need) if (!got.has(p)) return false;
  const first = fr.findIndex((f) => f >= 0); if (mod(GUITAR[first] + fr[first], 12) !== bassPc) return false;
  const pf = fr.filter((f) => f > 0); return !pf.length || Math.max(...pf) - Math.min(...pf) <= 4;
}
function guitarVoicings(rootPc, ivs, bassPc, id, rootName) {
  const pcs = ivs.map((i) => mod(rootPc + i, 12)); bassPc = bassPc === undefined || bassPc === null ? rootPc : bassPc;
  // 必须包含：根音、三音（或挂留音）与七音；五音与延伸音可省略
  const need = new Set([rootPc]); ivs.forEach((i) => { const m = mod(i, 12); if ([3, 4, 10, 11].includes(m) || (ivs.length <= 3 && m !== 7) || (ivs.length === 2)) need.add(mod(rootPc + i, 12)); if (ivs.length <= 3 && [2, 5].includes(m)) need.add(mod(rootPc + i, 12)); });
  if (ivs.includes(6) && !ivs.includes(7)) need.add(mod(rootPc + 6, 12)); if (ivs.includes(8) && !ivs.includes(7) && ivs.length <= 4) need.add(mod(rootPc + 8, 12));
  const out = [], seen = new Set();
  const push = (fr, label) => { const k = fr.join(','); if (seen.has(k) || !shapeOk(fr, pcs, need, bassPc)) return; seen.add(k); const pf = fr.filter((f) => f > 0), lo = pf.length ? Math.min(...pf) : 1; out.push({ frets: fr, base: Math.max(...fr) > 4 ? lo : 1, label, notes: fr.map((f, j) => (f < 0 ? null : GUITAR[j] + f)) }); };
  const sym = (DICT.find((d) => d[0] === id) || [0, id])[1];
  if (bassPc === rootPc) {
    for (const nm of [rootName + sym, rootName + id]) if (OPEN[nm]) push(OPEN[nm].slice(), '开放和弦');
    for (const [shape, tbl] of Object.entries(MOVE)) {
      const rel = tbl[id]; if (!rel) continue;
      const si = { E: 0, A: 1, D: 2 }[shape];
      let r = mod(rootPc - STR_OPEN[shape], 12); const minRel = Math.min(...rel.filter((x) => x > -9));
      if (r + minRel < 0) r += 12;
      const fr = rel.map((x, j) => (x <= -9 ? -1 : r + x)); void si;
      if (Math.max(...fr) <= 15) push(fr, shape + ' 型' + (r > 0 && fr.filter((f) => f === r).length >= 2 ? '横按' : '') + (r > 0 ? `（${r} 品）` : ''));
      if (r + 12 + Math.max(...rel) <= 15 && r <= 3) push(rel.map((x) => (x <= -9 ? -1 : r + 12 + x)), shape + ` 型（${r + 12} 品）`);
    }
  }
  if (out.length < 2) { const g = guitarShape({ pc: rootPc, q: '__dict', __pcs: pcs, __bass: bassPc }); if (g) push(g.frets, '自动'); }
  const lo = (v) => Math.min(...v.frets.filter((f) => f > 0).concat([99])), rk = (v) => (v.label === '开放和弦' ? 0 : v.label === '自动' ? 3 : /^D/.test(v.label) || lo(v) > 9 ? 2 : 1);
  return out.sort((a, b) => rk(a) - rk(b) || lo(a) - lo(b)).slice(0, 4);
}
function dictEntry(rootIdx, id, inv) {
  const [rn, pc, letter] = ROOTS[mod(rootIdx, 12)], d = DICT.find((x) => x[0] === id); if (!d) return null;
  const [, sym, cn, fam, ivs, ls] = d;
  const notes = ivs.map((iv, i) => ({ pc: mod(pc + iv, 12), name: dspell(pc + iv, letter + ls[i]), iv: mod(iv, 12), deg: IV_SHORT[mod(iv, 12)], ivName: IV_NAME[mod(iv, 12)] }));
  inv = inv || 0; const bassN = notes[Math.min(inv, notes.length - 1)];
  const name = rn + sym + (inv ? '/' + bassN.name : '');
  const inversions = notes.slice(1, Math.min(notes.length, 4)).map((n, i) => ({ name: rn + sym + '/' + n.name, inv: i + 1 }));
  // 试听与钢琴图：低音 + 密集排列
  const bassNote = 36 + mod(bassN.pc, 12) + (mod(bassN.pc, 12) < 4 ? 12 : 0);
  let tones = ivs.map((i) => mod(i, 12)); if (tones.length > 4) tones = tones.filter((x) => x !== 7); if (tones.length > 4) tones = tones.filter((x) => x !== 0); const vs = closeVoicings(tones.map((t) => mod(pc + t, 12))); const up = vs.length ? vs.reduce((b, v) => (Math.abs(v[0] - 60) < Math.abs(b[0] - 60) ? v : b)) : [60];
  return { id, root: rn, rootIdx: mod(rootIdx, 12), name, sym, cn, family: fam, notes, formula: notes.map((n) => n.deg).join('-'), intervals: notes.map((n) => n.ivName), styles: DICT_STYLES[id] || [], inversions, bassNote, upper: up, guitar: guitarVoicings(pc, ivs, bassN.pc, id, rn), pcs: notes.map((n) => n.pc) };
}
const DICT_STYLE_TAGS = [...new Set(Object.values(DICT_STYLES).flat())];
function chordDict(f = {}) {
  const out = [], qs = (f.query || '').trim();
  let pq = null, rootQ = null, cnQ = qs;
  if (qs) {
    const t = qs.replace(/^([a-g])(?=[#b♯♭]?(?:$|[^a-z]|m|maj|min|dim|aug|sus|add))/, (m) => m.toUpperCase());
    pq = parseChord(t);
    const m = t.match(/^([A-G][#b♯♭]?)(.*)$/); if (m) { const rp = parseChord(m[1]); if (rp) { rootQ = rp.pc; cnQ = m[2].trim(); } }
  }
  const sty = f.style ? nrm(f.style) : '';
  for (let r = 0; r < 12; r++) for (const d of DICT) {
    if (f.root !== undefined && f.root !== null && f.root !== '' && +f.root !== r) continue;
    if (f.family && d[3] !== f.family) continue;
    if (f.type && d[0] !== f.type) continue;
    const tags = DICT_STYLES[d[0]] || [];
    if (sty && !tags.some((t) => nrm(t).includes(sty) || STYLE_ALIASES.some(([k, v]) => nrm(t).includes(nrm(k)) && v.split(' ').map(nrm).includes(sty)))) continue;
    const [, pc] = ROOTS[r];
    if (qs) {
      let ok = false;
      if (pq && pq.pc === pc && pq.q === d[0] && (Q[d[0]] || d[0] === '')) ok = true;                 // 任意写法：Cmaj7 / CM7 / C△7 / Cma7 / Cø / C-
      else if (!pq && rootQ === pc && cnQ && (d[2].includes(cnQ) || nrm(d[1]) === nrm(cnQ))) ok = true; // C大七 / C 属七
      else if (rootQ === pc && !cnQ) ok = true;                                                         // 只输入根音
      else if (rootQ === null && (d[2].includes(qs) || d[3].includes(qs))) ok = true;                  // 中文名 / 类型
      else if (rootQ === null && tags.some((t) => nrm(t) === nrm(qs))) ok = true;                       // 风格名
      if (!ok) continue;
    }
    out.push({ rootIdx: r, id: d[0], name: ROOTS[r][0] + d[1], cn: d[2], family: d[3] });
  }
  return out;
}
// 反查：根据所选音级找和弦（完全匹配优先，其次为包含所选音的和弦）
function identifyChord(pcs, bassPc) {
  const set = [...new Set(pcs.map((p) => mod(p, 12)))]; if (!set.length) return [];
  const res = [];
  for (let r = 0; r < 12; r++) for (const d of DICT) {
    const cp = new Set(d[4].map((i) => mod(ROOTS[r][1] + i, 12)));
    const hit = set.filter((p) => cp.has(p)).length;
    if (hit < set.length) continue;
    const exact = cp.size === set.length;
    let score = exact ? 100 : 50 - (cp.size - set.length) * 8;
    if (bassPc !== undefined && bassPc !== null) score += ROOTS[r][1] === mod(bassPc, 12) ? 15 : cp.has(mod(bassPc, 12)) ? 0 : -100;
    score -= DICT.indexOf(d) * 0.2;
    if (score > 0) { const inv = bassPc !== undefined && bassPc !== null && ROOTS[r][1] !== mod(bassPc, 12) ? d[4].findIndex((i) => mod(ROOTS[r][1] + i, 12) === mod(bassPc, 12)) : 0; res.push({ rootIdx: r, id: d[0], inv: inv > 0 ? inv : 0, name: ROOTS[r][0] + d[1] + (inv > 0 ? '/' + spell(mod(bassPc, 12), ROOTS[r][2] + d[5][inv]) : ''), cn: d[2], exact, score }); }
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 24);
}

/* ---------- 搜索：风格别名 / 拼音 / 模糊匹配 ---------- */
// 关键词（出现在风格名或大类名中）→ 额外可搜索的别名（英文常见拼写、中文俗称、拼音）
const STYLE_ALIASES = [
  ['Lo-fi', 'lofi lo-fi lo fi 低保真 dibaozhen chill 学习 助眠 放松 study sleep relax 氛围嘻哈 lofi hip hop'],
  ['Jazzhop', 'jazzhop jazz hop nujabes 爵士嘻哈 juesixiha'], ['Chillhop', 'chillhop chill hop'], ['Vaporwave', 'vaporwave 蒸汽波 zhengqibo'],
  ['EDM', 'edm 电音 电子 dianyin dianzi dance 舞曲 club 夜店 蹦迪'], ['House', 'house 浩室 haoshi'], ['Techno', 'techno 铁克诺 科技'], ['Trance', 'trance 出神'],
  ['Drum & Bass', 'dnb d&b drum and bass drumnbass 鼓打贝斯'], ['Dubstep', 'dubstep 回响贝斯 dub step'], ['UK Garage', 'garage ukg 车库 2step'], ['Synthwave', 'synthwave retrowave outrun 合成器浪潮 复古电子 赛博'], ['Future Bass', 'future bass 未来贝斯'],
  ['Phonk', 'phonk 芬克 drift phonk 漂移'], ['Amapiano', 'amapiano 阿马皮亚诺 南非'], ['Afrobeats', 'afrobeats afrobeat afro 非洲 非洲节拍'],
  ['K-pop', 'kpop k-pop 韩流 韩国 韩语 hanliu 韩团 idol'], ['J-pop', 'jpop j-pop 日系 日本流行 ribenliuxing'], ['J-rock', 'jrock j-rock 日摇 日系摇滚'], ['Mandopop', 'cpop c-pop 华语 国语 中文流行 huayu 流行 liuxing'], ['City Pop', 'citypop city pop 城市流行 都市流行'],
  ['抖音', '抖音 douyin tiktok 网络流行 网红 短视频 爆款 wangluo'], ['Ballad', 'ballad 抒情 慢歌 情歌 shuqing qingge pop ballad'], ['Hyperpop', 'hyperpop 超流行'], ['Vocaloid', 'vocaloid v家 初音 miku 术力口 boca 电子歌姬'],
  ['Anime', 'anime 动漫 二次元 acg 番剧 动画 dongman erciyuan op ed'], ['Hip-hop', 'hiphop hip hop 说唱 rap 饶舌 嘻哈 xiha shuochang raoshe'], ['Trap', 'trap 陷阱 特拉普'], ['Drill', 'drill 钻头 英式drill'], ['Boom Bap', 'boombap boom bap 老派说唱'],
  ['R&B', 'rnb r&b randb r and b 节奏布鲁斯 灵魂 soul'], ['Neo-soul', 'neosoul neo soul 新灵魂'], ['Funk', 'funk 放克 fangke'], ['Disco', 'disco 迪斯科 迪厅 disike'],
  ['Jazz', 'jazz 爵士 爵士乐 jueshi'], ['Bossa Nova', 'bossa nova 巴萨诺瓦 波萨 bossanova'], ['Blues', 'blues 布鲁斯 蓝调 bulusi landiao'],
  ['Rock', 'rock 摇滚 yaogun'], ['Punk', 'punk 朋克 pengke'], ['Emo', 'emo 情绪摇滚 emo core'], ['Shoegaze', 'shoegaze 自赏 盯鞋 shoe gaze'], ['Post-rock', 'post rock postrock 后摇 houyao'], ['Indie', 'indie 独立 duli'], ['Grunge', 'grunge 垃圾摇滚'],
  ['Metal', 'metal 金属 重金属 jinshu'], ['Classical', 'classical 古典 gudian 交响 symphony'], ['Baroque', 'baroque 巴洛克'], ['Romantic', 'romantic 浪漫派'], ['Canon', 'canon 卡农 kanong 帕赫贝尔'],
  ['Score', '配乐 peiyue ost bgm 电影 游戏 影视 film game soundtrack 原声'], ['Epic', 'epic 史诗 shishi trailer'], ['Musical', 'musical broadway 音乐剧 百老汇'], ['Chiptune', 'chiptune 8bit 8-bit 芯片 像素'],
  ['Chinese', '国风 guofeng 中国风 zhongguofeng 古风 gufeng chinese 五声 民族 戏曲 xiqu'], ['古风', '古风 gufeng 仙侠 武侠'], ['戏', '戏腔 戏曲 京剧 昆曲 jingju xiqiang 黄梅'], ['Japanese', '和风 日式 hefeng japanese'],
  ['Folk', 'folk 民谣 minyao 乡村 country'], ['Country', 'country 乡村 xiangcun'], ['Bluegrass', 'bluegrass 蓝草'], ['校园', '校园民谣 xiaoyuan'], ['Celtic', 'celtic 凯尔特 爱尔兰'],
  ['Latin', 'latin 拉丁 lading'], ['Reggaeton', 'reggaeton 雷鬼顿 雷击顿'], ['Salsa', 'salsa 萨尔萨'], ['Tango', 'tango 探戈'], ['Flamenco', 'flamenco 弗拉门戈'],
  ['Gospel', 'gospel 福音 fuyin 教会'], ['Worship', 'worship 敬拜 赞美 诗歌 ccm praise jingbai'], ['Reggae', 'reggae 雷鬼 leigui'], ['Ska', 'ska 斯卡'],
  ['Ambient', 'ambient 氛围 环境 fenwei 冥想'], ['New Age', 'new age newage 新世纪 xinshiji'], ['Meditation', 'meditation 冥想 疗愈 healing 助眠'],
];
const nrm = (x) => String(x || '').toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/&/g, 'n').replace(/[\s\-_.·・/'’()（）,，]+/g, '');
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
for (const st of STYLES) {
  const hay = st.name + ' ' + st.genre, al = [];
  for (const [k, v] of STYLE_ALIASES) if (hay.toLowerCase().includes(k.toLowerCase())) al.push(...v.split(' '));
  st.aliases = [...new Set(al)];
  st.searchKeys = [st.name, st.genre, ...st.name.split(/\s+/), ...st.genre.split(/\s+/), ...st.aliases].map(nrm).filter(Boolean);
}
// 返回 [{id, score, via}]，via 为命中的别名（用于高亮/提示）
function searchStyles(q) {
  const toks = String(q || '').trim().split(/\s+/).filter(Boolean);
  if (toks.length > 1) { const whole = searchStyles1(q); if (whole.length) return whole; const per = toks.map((t) => new Map(searchStyles1(t).map((x) => [x.id, x]))); return [...per[0].values()].filter((x) => per.every((m) => m.has(x.id))).map((x) => ({ id: x.id, score: Math.min(...per.map((m) => m.get(x.id).score)), via: toks.join(' ') })).sort((a, b) => b.score - a.score); }
  return searchStyles1(q);
}
function searchStyles1(q) {
  const n = nrm(q); if (!n) return STYLES.map((s) => ({ id: s.id, score: 0, via: '' }));
  const out = [];
  for (const st of STYLES) {
    let best = 0, via = '';
    const nm = nrm(st.name), gn = nrm(st.genre);
    if (nm.includes(n)) { best = nm.startsWith(n) ? 100 : 90; via = ''; }
    else if (gn.includes(n)) { best = 70; via = st.genre; }
    for (const k of st.searchKeys) {
      if (best >= 90) break;
      if (k === n && best < 85) { best = 85; via = k; } else if (k.includes(n) && best < 60) { best = 60; via = k; } else if (n.length >= 4 && k.length >= 3 && best < 40) { const L = lev(n, k.slice(0, Math.max(n.length, Math.min(k.length, n.length + 1)))); if (L <= (n.length >= 7 ? 2 : 1)) { best = 40 - L * 5; via = k; } }
    }
    if (best) out.push({ id: st.id, score: best, via });
  }
  return out.sort((a, b) => b.score - a.score || a.id - b.id);
}

/* ---------- 图鉴 ↔ 进行：独立分析与插入 ---------- */
function dictToSeed(rootIdx, id, inv) {
  const [, pc, letter] = ROOTS[mod(rootIdx, 12)], d = DICT.find((x) => x[0] === id) || DICT[0];
  const k = inv ? Math.min(inv, d[4].length - 1) : 0;
  return { pc, letter, q: Q[id] ? id : '', bassPc: k ? mod(pc + d[4][k], 12) : null, bassLetter: k ? mod(letter + d[5][k], 7) : null };
}
// 在任意调中分析一个和弦（图鉴使用）：构造一首只含该和弦的虚拟歌曲，复用 analyzeChord / nextCandidates
function analyzeStandalone(rootIdx, id, inv, tonic, mode, styleId) {
  const style = STYLES[styleId] || STYLES[0], ctx = { tonic: mod(tonic, 12), mode };
  const c = seedToRel(dictToSeed(rootIdx, id, inv), ctx);
  const song = { kind: 'random', seed: 1, style, meter: '4/4', bpm: 90, hr: 1, settings: { complexity: Q[id] && Q[id].t.length > 3 ? 1 : 0, mood: '中性' }, sections: [{ name: '分析', key: 'Verse', tonic: ctx.tonic, mode, chords: [c, dia(ctx, 0)] }] };
  refresh(song);
  const a = analyzeChord(song, 0); a.song = song; return a;
}
// 把一个和弦（根音/性质/低音）插入到进行中：ci 之后；ci < 0 时追加到最后一段末尾
function insertChord(song, ci, seed) {
  let si, k;
  if (ci >= 0 && locate(song, ci)) [si, k] = locate(song, ci); else { si = song.sections.length - 1; k = song.sections[si].chords.length - 1; }
  const sec = song.sections[si], c = seedToRel(seed, { tonic: sec.tonic, mode: sec.mode });
  sec.chords.splice(k + 1, 0, c);
  refresh(song); return k + 1 + song.sections.slice(0, si).reduce((t, x) => t + x.chords.length, 0);
}
function deleteChord(song, ci) { const loc = locate(song, ci); if (!loc) return false; const chs = song.sections[loc[0]].chords; if (chs.length <= 1) return false; chs.splice(loc[1], 1); refresh(song); return true; }
function seedFromChord(c) { return { pc: c.pc, letter: c.letter, q: c.q, bassPc: c.xb ? c.xbPc : c.bass > 0 ? mod(c.pc + Q[c.q].t[c.bass][0], 12) : null, bassLetter: c.xb ? LET.indexOf(c.xbName[0]) : c.bass > 0 ? mod(c.letter + Q[c.q].t[c.bass][1], 7) : null }; }
// 进行中的和弦 → 图鉴条目（根音序号、性质、转位）
function dictRef(c) { const id = DICT.some((d) => d[0] === c.q) ? c.q : ''; const inv = c.bass > 0 ? c.bass : 0; return { rootIdx: c.pc, id, inv }; }

const ChordEngine = { LET, MODES, METERS, STYLES, GENRES, MOODS, Q, COMPLEX, KEYS_M, BAR_OPTS, HR_OPTS, FUNC_CN, PATTERNS, SECTION_PLANS, mkRng, generate, expand, parseChord, parseSeeds, inferKey, buildEvents, toMidi, toText, splitBar, unitSec, keyName, spell, diatonicQ, serialize, deserialize, cloneSong, refresh, transpose, setBpm, alternatives, replaceChord, toggleLock, regenerate, guitarShape, locate, ALT_TIPS, DRUM, midiParts, makeZip, crc32, PARTS, GM, GM_FAMILIES, defaultPrograms, progFor, PROG_LIB, vlIssues, validate, MARKOV, analyzeChord, nextCandidates, previewPair, setNext, chordDict, dictEntry, identifyChord, guitarVoicings, DICT, DICT_FAMILIES, ROOTS, NEXT_CATS, chordIssues, searchStyles, STYLE_ALIASES, deleteChord, analyzeStandalone, insertChord, dictToSeed, seedFromChord, dictRef, nrm, DICT_STYLES, DICT_STYLE_TAGS };
if (typeof module !== 'undefined' && module.exports) module.exports = ChordEngine;
if (typeof window !== 'undefined') window.ChordEngine = ChordEngine;
