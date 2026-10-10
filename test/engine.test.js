// 运行：node test/engine.test.js  —— 对大量随机组合做乐理/结构/导出一致性检查
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../src/engine.js');

let checks = 0;
const ok = (c, msg) => { checks++; assert.ok(c, msg); };
const mod = (x, n) => ((x % n) + n) % n;

function parseMidi(u) {
  ok(String.fromCharCode(...u.slice(0, 4)) === 'MThd', 'MThd');
  ok(String.fromCharCode(...u.slice(14, 18)) === 'MTrk', 'MTrk');
  const len = (u[18] << 24) | (u[19] << 16) | (u[20] << 8) | u[21];
  ok(len === u.length - 22, 'track length');
  let p = 22, on = 0, off = 0, ended = false, status = 0;
  const rd = () => { let v = 0, b; do { b = u[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  while (p < u.length) {
    rd();
    let st = u[p];
    if (st & 0x80) p++; else st = status;
    status = st;
    if (st === 0xff) { const type = u[p++]; const l = rd(); p += l; if (type === 0x2f) ended = true; }
    else if ((st & 0xf0) === 0x90) { p += 2; on++; }
    else if ((st & 0xf0) === 0x80) { p += 2; off++; }
    else if ((st & 0xf0) === 0xc0) p += 1;
    else throw new Error('unknown status ' + st);
  }
  ok(ended && p === u.length, 'end of track');
  ok(on === off && on > 0, 'balanced notes');
}

function checkSong(song, label) {
  const s = song.settings;
  ok(E.METERS[s.meter], label + ' meter');
  ok(s.bpm >= 40 && s.bpm <= 220, label + ' bpm ' + s.bpm);
  ok(song.flat.length >= 2, label + ' chords');
  for (const c of song.flat) {
    ok(typeof c.name === 'string' && !/undefined|null|NaN/.test(c.name), label + ' name ' + c.name);
    ok(/^[A-G](#|b)?/.test(c.name), label + ' root ' + c.name);
    const back = E.parseChord(c.name);
    ok(back, label + ' 和弦符号可被解析 ' + c.name);
    ok(back.pc === c.pc, label + ' root pc ' + c.name);
    ok(back.q === c.q || (c.q === '69' && back.q === '69'), label + ' quality round-trip ' + c.name + ' ' + c.q + ' ' + back.q);
    ok(typeof c.roman === 'string' && c.roman.length > 0 && !/undefined/.test(c.roman), label + ' roman');
    ok(['T', 'S', 'D'].includes(c.func), label + ' func ' + c.func);
    ok(c.upper.length >= 3 && c.upper.every((n) => n >= 0 && n <= 127), label + ' voicing range');
    ok(c.upper.every((n) => n > c.bassNote), label + ' upper above bass');
    const pcs = E.Q[c.q].t.map((t) => mod(c.pc + t[0], 12));
    ok(c.upper.every((n) => pcs.includes(mod(n, 12))), label + ' voicing tones belong to chord ' + c.name);
    ok(pcs.includes(mod(c.bassNote, 12)), label + ' bass is a chord tone');
    ok(c.bass === 0 || c.name.includes('/'), label + ' slash name for inversion');
  }
  // 小节布局
  for (const sec of song.sections) {
    const n = E.METERS[s.meter].n;
    for (const bar of sec.bars) {
      const sum = bar.reduce((a, x) => a + x.dur, 0);
      ok(Math.abs(sum - n) < 1e-6, label + ' bar fills meter');
    }
    const used = new Set(sec.bars.flat().map((x) => x.ci));
    ok(used.size === sec.chords.length, label + ' each chord laid out once');
  }
  const ev = E.buildEvents(song, { metronome: true });
  ok(ev.events.length > 0 && ev.events.every((e) => isFinite(e.t) && e.d > 0 && e.t < ev.totalUnits + 1e-6), label + ' events');
  ok(ev.timeline.length === song.sections.reduce((a, s) => a + s.bars.flat().length, 0), label + ' timeline');
  parseMidi(E.toMidi(song, { metronome: Math.random() < 0.5 }));
  const txt = E.toText(song);
  ok(txt.includes(song.flat[0].name) && !/undefined/.test(txt), label + ' text');
  ok(song.explanation.length >= 3, label + ' explanation');
}

const R = E.mkRng(12345);
const pick = (a) => a[Math.floor(R() * a.length)];
const maybe = (v) => (R() < 0.5 ? 'rand' : v);
const MODES = Object.keys(E.MODES), MOODS = Object.keys(E.MOODS), METERS = Object.keys(E.METERS);

// 1) 风格数据完整性
ok(E.STYLES.length > 80, 'style count > 80');
const names = new Set(E.STYLES.map((s) => s.genre + '/' + s.name));
ok(names.size === E.STYLES.length, 'unique styles');
for (const st of E.STYLES) {
  ok(st.tempo[0] < st.tempo[1], 'tempo range ' + st.name);
  ok(st.meters.every((m) => E.METERS[m]), 'meters ' + st.name);
  ok(Object.keys(st.modes).every((m) => E.MODES[m]), 'modes ' + st.name);
  ok(E.PATTERNS[st.pat], 'pattern ' + st.name);
  for (const mode of MODES) for (const t of st.tpl) E.generate({ style: st.id, mode, bars: 8, hr: 1, seed: 7 }); // 模板在每个调式下都能解析
}

// 2) 大量随机组合
const N = +(process.env.N || 3000);
let blues = 0;
for (let i = 0; i < N; i++) {
  const st = pick(E.STYLES);
  const o = {
    seed: i + 1, style: R() < 0.8 ? st.id : 'rand', genre: R() < 0.2 ? st.genre : undefined, mood: maybe(pick(MOODS)), mode: maybe(pick(MODES)),
    key: maybe(Math.floor(R() * 12)), meter: maybe(pick(METERS)), bpm: R() < 0.3 ? 40 + Math.floor(R() * 181) : 'rand', feel: pick(['rand', '快', '中', '慢']),
    bars: maybe(pick(E.BAR_OPTS)), complexity: maybe(Math.floor(R() * 4)), hr: maybe(pick(E.HR_OPTS)),
  };
  const song = E.generate(o);
  const label = `gen#${i} ${song.settings.style}/${song.settings.mode}/${song.settings.meter}`;
  checkSong(song, label);
  const s = song.settings;
  ok(song.flat.length === Math.max(2, Math.round(s.bars * s.hr)), label + ' slot count');
  ok(song.sections[0].bars.length === Math.max(s.bars, song.hr === 0.5 ? 2 : 1) || song.flat.length === 2, label + ' bar count');
  const last = song.flat[song.flat.length - 1];
  ok(last.rel === 0, label + ' 结尾回到主和弦');
  if (o.mode !== 'rand') ok(s.mode === o.mode, label + ' mode override');
  if (o.key !== 'rand') ok(s.tonic === o.key, label + ' key override');
  if (o.meter !== 'rand') ok(s.meter === o.meter, label + ' meter override');
  if (o.complexity !== 'rand') ok(s.complexity === o.complexity, label + ' complexity override');
  if (s.complexity === 0) ok(song.flat.every((c) => ['', 'm', 'dim', 'aug', 'sus2', 'sus4', 'add9', 'madd9', '6'].includes(c.q) || c.fixedQ || c.tag === '三全音替代'), label + ' triads at level 0');
  if (st.fixed && o.style === st.id) blues++;
  const pen = song.flat[song.flat.length - 2];
  if (!st.fixed || o.style !== st.id) ok(['D', 'S'].includes(pen.func) || pen.tag === '调式特征' || pen.rel !== 0, label + ' penultimate cadence chord');
}

// 3) 已知乐理断言
const g = E.generate({ style: E.STYLES.findIndex((s) => s.name.startsWith('卡农')), key: 2, mode: 'major', bars: 8, hr: 1, complexity: 0, seed: 3, mood: '中性' });
ok(g.flat[0].root === 'D', 'D major tonic');
const fsharp = E.generate({ style: 0, key: 7, mode: 'major', bars: 8, hr: 1, complexity: 1, seed: 11, mood: '中性' });
ok(fsharp.flat.every((c) => !/^Gb/.test(c.name)), 'G major spells F# not Gb');
ok(E.spell(6, 3) === 'F#' && E.spell(6, 4) === 'Gb', 'enharmonic spelling');
ok(E.diatonicQ(E.MODES.major.s, 6, true) === 'm7b5' && E.diatonicQ(E.MODES.major.s, 4, true) === '7' && E.diatonicQ(E.MODES.harmonic.s, 6, true) === 'dim7', 'diatonic sevenths');
ok(E.parseChord('F#m7b5').q === 'm7b5' && E.parseChord('G7/B').bassPc === 11 && E.parseChord('Cmaj7').q === 'maj7', 'chord parser');
ok(JSON.stringify(E.splitBar('7/8', 2)) === '[4,3]' && JSON.stringify(E.splitBar('6/8', 2)) === '[3,3]' && JSON.stringify(E.splitBar('4/4', 4)) === '[1,1,1,1]', 'bar split');
const inf = (t) => E.inferKey(E.parseSeeds(t).chords)[0];
ok(inf('C G Am F').name.startsWith('C 大调'), 'infer C major');
ok(inf('Am F C G').name.startsWith('A 自然小调'), 'infer A minor');
ok(inf('Dm7').tonic === 2, 'infer Dm7 tonic D');
ok(inf('Dm7 G7 Cmaj7').name.startsWith('C 大调'), 'infer ii-V-I C');
ok(inf('Em D C B7').tonic === 4, 'infer E minor (andalusian)');
ok(inf('G F C G').name.startsWith('G 混合'), 'infer G mixolydian');
const bl = E.generate({ style: E.STYLES.findIndex((s) => s.name.startsWith('芝加哥')), key: 9, bars: 12, hr: 1, complexity: 1, seed: 5 });
ok(bl.flat.length === 12 && bl.flat[0].name === 'A7' && bl.flat[4].name.startsWith('D7') && bl.flat[10].name.startsWith('E7'), '12-bar blues ' + bl.flat.map((c) => c.name).join(' '));

// 4) 根据给定和弦扩展
const SEEDS = ['Am F C G', 'Dm7', 'C G Am F', 'Cmaj7 Am7 Dm7 G7', 'Em C G D', 'F#m D A E', 'Bbmaj7 Gm7 Cm7 F7', 'Dm Bb C Dm', 'E A B7', 'Abmaj7 Fm7 Db Eb', 'G/B C D', 'Am7b5 D7 Gm', 'C Fm C', 'D Em/G A7sus4 D'];
const LETS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], ACC = ['', '#', 'b'], SUFS = ['', 'm', '7', 'maj7', 'm7', 'sus4', 'dim', 'm7b5', 'add9', '9', 'm9', '6'];
for (let i = 0; i < 1500; i++) {
  const seeds = i < SEEDS.length * 4 ? SEEDS[i % SEEDS.length] : Array.from({ length: 1 + Math.floor(R() * 5) }, () => pick(LETS) + pick(ACC) + pick(SUFS)).join(' ');
  const o = { seed: 1000 + i, seeds, style: maybe(pick(E.STYLES).id), mood: maybe(pick(MOODS)), meter: maybe(pick(METERS)), bpm: 'rand', complexity: maybe(Math.floor(R() * 4)), hr: maybe(pick([0.5, 1, 2])), bars: maybe(pick([4, 8, 16])), length: pick(['短', '标准', '长']), modulate: R() < 0.7 };
  if (R() < 0.25) o.key = Math.floor(R() * 12);
  if (R() < 0.25) o.mode = pick(MODES);
  const song = E.expand(o);
  const label = `expand#${i} [${seeds}]`;
  checkSong(song, label);
  const plan = E.SECTION_PLANS[o.length];
  ok(song.sections.length === plan.length, label + ' sections');
  const verse = song.sections.find((s) => s.key === 'Verse');
  const nseed = song.seedsParsed.chords.length;
  ok(verse.chords.slice(0, Math.min(nseed, verse.chords.length - 1)).every((c, k) => c.pc === song.seedsParsed.chords[k].pc), label + ' verse uses seeds');
  const out = song.sections[song.sections.length - 1];
  ok(out.chords[out.chords.length - 1].rel === 0, label + ' song ends on tonic');
  const fin = song.sections.filter((s) => s.key === 'Chorus');
  fin.forEach((c) => ok(c.chords[c.chords.length - 1].rel === 0 || c.chords[c.chords.length - 1].tag === '转调属', label + ' chorus cadence on tonic'));
  const modSec = song.sections.find((s) => s.modulated);
  if (o.modulate && fin.length > 1) {
    ok(modSec && mod(modSec.tonic - song.settings.tonic, 12) === 2, label + ' final chorus up a whole step');
    const idx = song.sections.indexOf(modSec), prev = song.sections[idx - 1];
    const pv = prev.chords[prev.chords.length - 1];
    ok(mod(pv.pc - modSec.tonic, 12) === 7 && pv.q === '7', label + ' pivot V7 of new key');
  } else ok(!modSec, label + ' no modulation');
  if (o.key !== undefined && o.mode) ok(song.settings.tonic === o.key && song.settings.mode === o.mode, label + ' key/mode override');
  const pre = song.sections.find((s) => s.key === 'Pre-chorus');
  if (pre && !pre.chords[pre.chords.length - 1].tag.includes('转调')) ok(pre.chords[pre.chords.length - 1].func === 'D', label + ' pre-chorus half cadence');
}
let thrown = false; try { E.expand({ seeds: 'xyz' }); } catch (e) { thrown = true; } ok(thrown, 'invalid seeds throw');

// 5) 构建产物：单文件、无外部依赖、引擎内联
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
ok(!/<script[^>]+src=|<link[^>]+href=["']https?:|@import/.test(html), 'no external deps');
ok(html.includes(fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.js'), 'utf8').slice(0, 2000)), 'engine inlined');
ok(/lang="zh-CN"/.test(html), 'Chinese UI');

console.log(`✔ 全部通过：${checks} 项断言，${N} 个随机生成组合 + 1500 个扩展组合，风格数 ${E.STYLES.length}（12 小节布鲁斯样本 ${blues}）。`);
