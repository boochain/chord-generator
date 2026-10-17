// 多样性回归测试：防止生成结果再次“同质化”。阈值留有余量（实测值见 docs/diversity-report.md）
const E = require('../src/engine.js');
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL', m); } };
const skel = (c) => (c.roman || '').replace(/^(V7?\/→.*)$/, 'Vmod').replace(/(maj|m|ø|°)?(6|7|9|11|13|add9|add11|sus2|sus4|alt|b5|#5|b9|#9|#11|b13|\+)+.*$/, '').replace(/\/.*$/, '').replace(/[ø°+]$/, '');
const key = (s) => s.flat.map(skel).join(' ');
const styles = E.STYLES.filter((s) => !s.fixed);
const N = 60;
// 1) 每个风格：不同种子下的唯一进行比例、前 10 名占比
let uSum = 0, tSum = 0, minU = 1, minName = '';
const weak = {};
for (const st of styles) {
  const cnt = new Map();
  for (let i = 0; i < N; i++) { const s = E.generate({ style: st.id, bars: 8, hr: 1, seed: 1 + i * 7 + st.id * 100003 }); ok(s.validation.ok, 'valid ' + st.name); const k = key(s); cnt.set(k, (cnt.get(k) || 0) + 1); }
  const u = cnt.size / N, top = [...cnt.values()].sort((a, b) => b - a).slice(0, 10).reduce((a, b) => a + b, 0) / N;
  uSum += u; tSum += top; if (u < minU) { minU = u; minName = st.name; }
  if (/Flamenco|Horror|Death Metal|Reggaeton|Pop Punk/.test(st.name)) weak[st.name] = u;
}
const uAvg = uSum / styles.length, tAvg = tSum / styles.length;
ok(uAvg >= 0.75, '平均唯一进行比例 ≥ 75%：' + uAvg.toFixed(3));
ok(tAvg <= 0.4, '前 10 名进行占比 ≤ 40%：' + tAvg.toFixed(3));
ok(minU >= 0.55, '最差风格唯一比例 ≥ 55%：' + minName + ' ' + minU.toFixed(3));
for (const [n, u] of Object.entries(weak)) ok(u >= 0.75, '原最弱风格已提升：' + n + ' ' + u.toFixed(3));
// 2) 连续点击（不指定种子）：反重复记忆
for (const sid of [0, E.STYLES.findIndex((s) => /Lo-fi/.test(s.name)), E.STYLES.findIndex((s) => /Flamenco/.test(s.name))]) {
  const seen = [], keys = new Set(); let same = 0, inLast5 = 0;
  for (let i = 0; i < 60; i++) {
    const s = E.generate({ style: sid, bars: 8, hr: 1 }); const k = key(s);
    if (seen.length && seen[seen.length - 1] === k) same++;
    if (seen.slice(-5).includes(k)) inLast5++;
    seen.push(k); keys.add(k);
  }
  ok(same === 0, '连续两次点击不重复 ' + E.STYLES[sid].name + '：' + same);
  ok(inLast5 <= 3, '最近 5 次内重复 ≤ 3 ' + E.STYLES[sid].name + '：' + inLast5);
  ok(keys.size / 60 >= 0.7, '连续点击唯一比例 ≥ 70% ' + E.STYLES[sid].name + '：' + keys.size);
}
// 3) 情绪 / 复杂度确实改变选择（骨架集合重叠度）
const overlap = (a, b) => { const A = new Set(a), B = new Set(b); let x = 0; for (const k of A) if (B.has(k)) x++; return x / Math.min(A.size, B.size); };
for (const [param, vals] of [['mood', ['欢快', '悲伤', '史诗', '治愈']], ['complexity', [0, 2]]]) {
  let ov = 0, n = 0;
  for (const sid of [0, 30, 60]) {
    const sets = vals.map((v) => { const out = []; for (let i = 0; i < 40; i++) out.push(key(E.generate({ style: sid, bars: 8, hr: 1, mode: 'major', key: 0, [param]: v, mood: param === 'mood' ? v : '中性', seed: 500 + i }))); return out; });
    for (let a = 0; a < sets.length; a++) for (let b = a + 1; b < sets.length; b++) { ov += overlap(sets[a], sets[b]); n++; }
  }
  ok(ov / n <= 0.7, param + ' 改变输出（重叠度 ≤ 0.7）：' + (ov / n).toFixed(3));
}
// 4) 编配多样：伴奏型、排列、旋律轮廓
const pats = new Set(), voic = new Set(), cont = new Set(); let wide = 0, tot = 0;
for (let i = 0; i < 200; i++) { const s = E.generate({ seed: 4000 + i }); pats.add(s.arr.pat); voic.add(s.arr.voicing); cont.add(s.arr.contour); for (const c of s.flat) { tot++; if (Math.max(...c.upper) - Math.min(...c.upper) > 12) wide++; } }
ok(pats.size >= 8, '伴奏型种类 ≥ 8：' + pats.size);
ok(voic.size === 3, '三种排列方式都出现：' + [...voic]);
ok(cont.size >= 5, '旋律轮廓 ≥ 5 种：' + cont.size);
ok(wide / tot >= 0.1 && wide / tot <= 0.6, '开放排列比例 10%–60%：' + (wide / tot).toFixed(3));
// 5) 种子扩展：同一种子输入多次扩展各不相同，第二段主歌为变奏
const ex = new Set(); let varied = 0, vn = 0;
for (let i = 0; i < 40; i++) {
  const s = E.expand({ seeds: 'C G Am F', seed: 900 + i, length: '标准' });
  ok(s.validation.ok, 'expand valid');
  ex.add(s.sections.map((x) => x.chords.map(skel).join(' ')).join('|'));
  const vs = s.sections.filter((x) => x.key === 'Verse');
  if (vs.length > 1) { vn++; if (vs[0].chords.map(skel).join() !== vs[1].chords.map(skel).join()) varied++; }
}
ok(ex.size >= 36, '种子扩展结果唯一 ≥ 90%：' + ex.size);
ok(vn && varied / vn >= 0.8, '第二段主歌为变奏 ≥ 80%：' + varied + '/' + vn);
console.log(`diversity: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
