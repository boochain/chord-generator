// 多样性度量：node tools/diversity.js [每风格样本数=300] [输出json]
'use strict';
const E = require('../src/engine.js');
const N = +(process.argv[2] || 300), OUT = process.argv[3];
const skel = (c) => (c.roman || '').replace(/^(V7?\/→.*)$/, 'Vmod').replace(/(maj|m|ø|°)?(6|7|9|11|13|add9|add11|sus2|sus4|alt|b5|#5|b9|#9|#11|b13|\+)+.*$/, '').replace(/\/.*$/, '').replace(/[ø°+]$/, '');
const seqOf = (s) => s.flat.map(skel);
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n] / Math.max(m, n, 1);
}
let rs = 12345; const R = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
const pick = (a) => a[Math.floor(R() * a.length)];
function stats(seqs, voic = [], pats = []) {
  const keys = seqs.map((s) => s.join(' ')), cnt = new Map();
  keys.forEach((k) => cnt.set(k, (cnt.get(k) || 0) + 1));
  const g4 = new Set(), tok = new Map();
  for (const s of seqs) { for (let i = 0; i + 4 <= s.length; i++) g4.add(s.slice(i, i + 4).join(' ')); for (const t of s) tok.set(t, (tok.get(t) || 0) + 1); }
  let tot = 0; tok.forEach((v) => (tot += v)); let H = 0; tok.forEach((v) => { const p = v / tot; H -= p * Math.log2(p); });
  const top = [...cnt.values()].sort((a, b) => b - a).slice(0, 10).reduce((a, b) => a + b, 0) / seqs.length;
  let ed = 0; const P = Math.min(300, seqs.length * 2);
  for (let i = 0; i < P; i++) ed += lev(pick(seqs), pick(seqs));
  return { n: seqs.length, uniq: cnt.size / seqs.length, g4: g4.size, H, top10: top, ed: ed / P, voic: new Set(voic).size, pats: new Set(pats).size };
}
const voiceSig = (s) => s.flat.slice(0, 4).map((c) => { const u = c.upper.slice().sort((a, b) => a - b); return u.map((x) => x - u[0]).join('.'); }).join(',');
function gen(o) { return E.generate(Object.assign({ bars: 8, hr: 1 }, o)); }
const t0 = Date.now();
const perStyle = [];
for (const st of E.STYLES) {
  if (st.fixed) continue; // 12 小节布鲁斯等固定曲式不计
  const seqs = [], voic = [], pats = [];
  for (let i = 0; i < N; i++) { const s = gen({ style: st.id, seed: 1 + i * 7 + st.id * 100003 }); seqs.push(seqOf(s)); voic.push(voiceSig(s)); pats.push(s.pat || st.pat); }
  perStyle.push(Object.assign({ id: st.id, name: st.name, genre: st.genre }, stats(seqs, voic, pats)));
}
const avg = (k) => perStyle.reduce((a, x) => a + x[k], 0) / perStyle.length;
const summary = { uniq: avg('uniq'), g4: avg('g4'), H: avg('H'), top10: avg('top10'), ed: avg('ed'), voic: avg('voic'), pats: avg('pats') };
const worst = perStyle.slice().sort((a, b) => a.uniq - b.uniq).slice(0, 8).map((x) => [x.name, +x.uniq.toFixed(3), +x.top10.toFixed(3)]);
const cross = []; for (let i = 0; i < N * 4; i++) cross.push(seqOf(gen({ seed: 777777 + i })));
const crossStats = stats(cross);
// 参数敏感度：同一风格只改一个参数，不同取值产出的骨架集合重叠率（越低 = 参数影响越大）
function overlap(styleId, field, values) {
  const sets = values.map((v) => { const S = new Set(); for (let i = 0; i < 120; i++) S.add(seqOf(gen(Object.assign({ style: styleId, seed: 5000 + i, mood: '中性', mode: 'major', key: 0, complexity: 1 }, { [field]: v }))).join(' ')); return S; });
  let sum = 0, k = 0;
  for (let a = 0; a < sets.length; a++) for (let b = a + 1; b < sets.length; b++) { const inter = [...sets[a]].filter((x) => sets[b].has(x)).length; sum += inter / Math.min(sets[a].size, sets[b].size); k++; }
  return sum / k;
}
const sampleStyles = [0, E.STYLES.findIndex((s) => /Lo-fi Hip/.test(s.name)), E.STYLES.findIndex((s) => /摇滚/.test(s.genre)), E.STYLES.findIndex((s) => /爵士/.test(s.genre)), E.STYLES.findIndex((s) => /古风/.test(s.name))].filter((x) => x >= 0);
const sens = {};
for (const [f, vals] of [['mood', ['欢快', '悲伤', '史诗', '怀旧', '梦幻']], ['complexity', [0, 1, 2]], ['meter', ['4/4', '3/4', '6/8']], ['mode', ['major', 'mixolydian', 'lydian']]]) sens[f] = sampleStyles.reduce((a, s) => a + overlap(s, f, vals), 0) / sampleStyles.length;
// 连续点击：相同设置、不指定 seed 连续生成
function clicks(styleId) {
  const seqs = []; for (let i = 0; i < 150; i++) seqs.push(seqOf(gen({ style: styleId, mood: '中性', mode: 'major', key: 0, complexity: 1 })));
  let same = 0, same4 = 0, ed = 0, inLast5 = 0;
  for (let i = 1; i < seqs.length; i++) {
    const a = seqs[i - 1].join(' '), b = seqs[i].join(' ');
    if (a === b) same++; if (seqs[i - 1].slice(0, 4).join() === seqs[i].slice(0, 4).join()) same4++; ed += lev(seqs[i - 1], seqs[i]);
    if (seqs.slice(Math.max(0, i - 5), i).some((x) => x.join(' ') === b)) inLast5++;
  }
  const m = seqs.length - 1; return { same: same / m, same4: same4 / m, ed: ed / m, inLast5: inLast5 / m, uniq: new Set(seqs.map((s) => s.join(' '))).size / seqs.length };
}
const clk = sampleStyles.map(clicks); const clkAvg = {}; for (const k of Object.keys(clk[0])) clkAvg[k] = clk.reduce((a, x) => a + x[k], 0) / clk.length;
// 扩展模式：同一首歌各段落（主歌/副歌/桥段…）互不相同的比例；同一种子多次扩展的副歌差异
let secDiff = 0, secN = 0; const chorus = new Map();
for (let i = 0; i < 200; i++) {
  const seedTxt = pick(['Am F C G', 'C G Am F', 'Dm7 G7 Cmaj7', 'Em C G D', 'F G Am']);
  const s = E.expand({ seeds: seedTxt, seed: 300 + i }); const by = {};
  s.sections.forEach((x) => { const k = x.name.split(' ')[0]; if (!by[k]) by[k] = x.chords.map(skel).join(' '); });
  const vs = Object.values(by); for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) { secDiff += vs[a] === vs[b] ? 0 : 1; secN++; }
  if (!chorus.has(seedTxt)) chorus.set(seedTxt, new Set()); chorus.get(seedTxt).add((by['副歌'] || '') + '|' + (by['桥段'] || '') + '|' + (by['导歌'] || ''));
}
const expandUniq = [...chorus.values()].reduce((a, x) => a + x.size, 0) / 200;
const res = { N, ms: Date.now() - t0, summary, worst, cross: crossStats, sens, clicks: clkAvg, expandSectionDistinct: secDiff / secN, expandUniq };
console.log(JSON.stringify(res, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v)));
if (OUT) require('fs').writeFileSync(OUT, JSON.stringify(Object.assign(res, { perStyle }), null, 1));
