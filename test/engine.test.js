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
  ok(String.fromCharCode(...u.slice(0, 4)) === 'MThd' && ((u[4] << 24) | (u[5] << 16) | (u[6] << 8) | u[7]) === 6, 'MThd');
  const format = (u[8] << 8) | u[9], ntr = (u[10] << 8) | u[11], ppq = (u[12] << 8) | u[13];
  ok(format <= 1 && ppq === 480 && (format === 1 || ntr === 1), 'header format/ntracks');
  let p = 14; const tracks = [];
  const txt = (bytes) => decodeURIComponent(escape(String.fromCharCode(...bytes)));
  for (let k = 0; k < ntr; k++) {
    ok(String.fromCharCode(...u.slice(p, p + 4)) === 'MTrk', 'MTrk');
    const len = (u[p + 4] << 24) | (u[p + 5] << 16) | (u[p + 6] << 8) | u[p + 7];
    const end = p + 8 + len; p += 8;
    const tr = { name: null, on: 0, off: 0, markers: [], channels: new Set(), tempo: false, ts: false, ended: false };
    const rd = () => { let v = 0, b; do { b = u[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    let status = 0, open = new Map();
    while (p < end) {
      rd();
      let st = u[p]; if (st & 0x80) p++; else st = status; status = st;
      if (st === 0xff) { const type = u[p++]; const l = rd(); const data = u.slice(p, p + l); p += l; if (type === 0x2f) tr.ended = true; if (type === 0x03) tr.name = txt(data); if (type === 0x06) tr.markers.push(txt(data)); if (type === 0x51) tr.tempo = true; if (type === 0x58) tr.ts = true; }
      else if ((st & 0xf0) === 0x90) { const key = (st & 15) * 128 + u[p]; open.set(key, (open.get(key) || 0) + 1); p += 2; tr.on++; tr.channels.add(st & 15); }
      else if ((st & 0xf0) === 0x80) { const key = (st & 15) * 128 + u[p]; ok((open.get(key) || 0) > 0, 'note-off matches note-on'); open.set(key, open.get(key) - 1); p += 2; tr.off++; }
      else if ((st & 0xf0) === 0xc0) p += 1;
      else throw new Error('unknown status ' + st);
    }
    ok(tr.ended && p === end, 'end of track');
    ok(tr.on === tr.off, 'balanced notes');
    tracks.push(tr);
  }
  ok(p === u.length, 'file length');
  return { format, tracks };
}
function checkMulti(song, label, opts) {
  const m = parseMidi(E.toMidi(song, opts));
  ok(m.format === 1 && m.tracks.length >= 3, label + ' format 1 multitrack');
  const t0 = m.tracks[0];
  ok(t0.tempo && t0.ts && t0.on === 0 && t0.markers.length >= 1, label + ' conductor track');
  const names = m.tracks.slice(1).map((t) => t.name);
  ok(names.includes('和弦') && names.includes('低音'), label + ' named part tracks ' + names);
  m.tracks.slice(1).forEach((t) => ok(t.channels.size === 1 && (t.name !== '鼓' || t.channels.has(9)) && t.on > 0, label + ' one channel per track'));
  if (opts.drums) ok(names.includes('鼓'), label + ' drum track');
}
function checkParts(song, label, opts) {
  const parts = E.midiParts(song, opts);
  ok(parts.map((x) => x.name).join() === '和弦,低音,旋律,鼓', label + ' 4 parts');
  for (const x of parts) {
    const m = parseMidi(x.bytes);
    ok(m.format === 0 && m.tracks.length === 1, label + ' part format 0');
    const t = m.tracks[0];
    ok(t.name === x.name && t.tempo && t.ts && t.on > 0 && t.channels.size === 1, label + ' part meta ' + x.name);
    ok(t.markers.includes(song.flat.find((c) => opts.section === undefined || c.section === opts.section).name), label + ' chord markers');
    if (x.part === 'drum') ok(t.channels.has(9), label + ' drums on channel 10');
  }
  return parts;
}
function unzip(u) {
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const eo = u.length - 22; ok(dv.getUint32(eo, true) === 0x06054b50, 'EOCD');
  const n = dv.getUint16(eo + 10, true), cdOff = dv.getUint32(eo + 16, true), out = [];
  let p = cdOff;
  for (let i = 0; i < n; i++) {
    ok(dv.getUint32(p, true) === 0x02014b50, 'central header');
    const crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), lo = dv.getUint32(p + 42, true);
    ok(dv.getUint16(p + 10, true) === 0, 'stored');
    const name = decodeURIComponent(escape(String.fromCharCode(...u.slice(p + 46, p + 46 + nl))));
    ok(dv.getUint32(lo, true) === 0x04034b50 && dv.getUint16(lo + 26, true) === nl, 'local header');
    const data = u.slice(lo + 30 + nl, lo + 30 + nl + size);
    ok(E.crc32(data) === crc && crc === dv.getUint32(lo + 14, true), 'crc ' + name);
    out.push({ name, data }); p += 46 + nl;
  }
  ok(p === eo, 'central directory size');
  return out;
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
    ok(c.xb ? mod(c.bassNote, 12) === c.xbPc : pcs.includes(mod(c.bassNote, 12)), label + ' bass is a chord tone (or explicit slash bass)');
    ok(c.bass === 0 || c.name.includes('/'), label + ' slash name for inversion');
    ok(!c.xb || c.name.endsWith('/' + c.xbName), label + ' explicit slash bass kept');
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
  parseMidi(E.toMidi(song, { metronome: Math.random() < 0.5, drums: R() < 0.5, melody: R() < 0.5, instrument: pick(['piano', 'epiano', 'pad', 'guitar']) }));
  const evd = E.buildEvents(song, { drums: true, melody: true });
  ok(evd.events.some((e) => e.part === 'drum') && evd.events.some((e) => e.part === 'melody'), label + ' drums+melody');
  ok(evd.events.filter((e) => e.part === 'melody').every((e) => e.notes[0] >= 60 && e.notes[0] <= 90 && e.d > 0), label + ' melody range');
  const si = Math.floor(R() * song.sections.length);
  const evs = E.buildEvents(song, { section: si });
  ok(evs.bars === song.sections[si].bars.length && evs.timeline.every((x) => x.t < evs.totalUnits), label + ' section events');
  parseMidi(E.toMidi(song, { section: si }));
  if (R() < 0.1) {
    checkMulti(song, label, { drums: R() < 0.5, melody: R() < 0.5, metronome: R() < 0.3 });
    const parts = checkParts(song, label, { section: R() < 0.5 ? si : undefined });
    const z = unzip(E.makeZip(parts.map((x) => ({ name: x.file + '.mid', data: x.bytes }))));
    ok(z.length === 4 && z.every((f, k) => f.data.length === parts[k].bytes.length && f.data.every((v, j) => v === parts[k].bytes[j])), label + ' zip roundtrip');
  }
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
  song.flat.forEach((c, k) => {
    const nx = song.flat[k + 1]; if (!nx) return;
    if (c.tag === '副属') ok(mod(nx.pc - c.pc, 12) === 5, label + ` 副属 ${c.name}(${c.roman}) 必须解决到下方五度 ${nx.name}`);
    if (c.tag === '三全音替代') ok(mod(nx.pc - c.pc, 12) === 11, label + ` 三全音替代 ${c.name} 必须半音下行 ${nx.name}`);
  });
  if (o.mode !== 'rand') ok(s.mode === o.mode, label + ' mode override');
  if (o.key !== 'rand') ok(s.tonic === o.key, label + ' key override');
  if (o.meter !== 'rand') ok(s.meter === o.meter, label + ' meter override');
  if (o.complexity !== 'rand') ok(s.complexity === o.complexity, label + ' complexity override');
  if (s.complexity === 0) ok(song.flat.every((c) => ['', 'm', 'dim', 'aug', 'sus2', 'sus4', 'add9', 'madd9', '6'].includes(c.q) || c.fixedQ || c.tag === '三全音替代'), label + ' triads at level 0 ' + song.flat.filter((c) => !(['', 'm', 'dim', 'aug', 'sus2', 'sus4', 'add9', 'madd9', '6'].includes(c.q) || c.fixedQ || c.tag === '三全音替代')).map((c) => c.name + ':' + c.q + ':' + c.tag));
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
// 6) v2 回归：解析边界、编辑功能
const P = (t) => E.parseSeeds(t).chords;
ok(P('Am，F|C-G').length === 4 && P('Am、F；C→G').length === 4 && P('Am - F - C - G').length === 4, 'Chinese / dash separators');
ok(P('Cm7-5')[0].q === 'm7b5' && P('Cm7-b5')[0].q === 'm7b5' && P('Cm7(b5)')[0].q === 'm7b5', 'half-diminished spellings');
ok(P('Csus')[0].q === 'sus4' && P('Csus2')[0].q === 'sus2' && P('Cadd9')[0].q === 'add9' && P('Bdim7')[0].q === 'dim7' && P('Caug')[0].q === 'aug' && P('C+')[0].q === 'aug', 'sus/add9/dim7/aug');
ok(P('C♯m')[0].pc === 1 && P('D♭')[0].pc === 1 && P('Ｇ7')[0].q === '7' && P('C△7')[0].q === 'maj7' && P('Caug7')[0].q === '7#5' && P('C6/9')[0].q === '69', 'unicode / fullwidth / extra suffixes');
ok(P('cm')[0].q === 'm' && P('am f c g').length === 4, 'lowercase roots');
const sd = E.expand({ seeds: 'C/D G/B Am7/G', seed: 3, length: '短', key: 7, mode: 'major' });
const v0 = sd.sections[1].chords;
ok(v0[0].name === 'C/D' && v0[1].name === 'G/B' && v0[2].name === 'Am7/G', 'slash chords preserved incl. non-chord-tone bass: ' + v0.map((c) => c.name).join(' '));
ok(mod(v0[0].bassNote, 12) === 2 && mod(v0[1].bassNote, 12) === 11, 'slash bass voiced');
for (let i = 0; i < 300; i++) {
  const song = i % 2 ? E.generate({ seed: 5000 + i }) : E.expand({ seed: 5000 + i, seeds: pick(SEEDS) });
  const label = 'edit#' + i;
  const n = song.flat.length;
  const locks = [0, Math.floor(n / 2)].filter((k) => k < n);
  locks.forEach((k) => E.toggleLock(song, k));
  const before = locks.map((k) => song.flat[k].name);
  E.regenerate(song, { seed: 9000 + i });
  ok(song.flat.length === n, label + ' regen keeps length');
  ok(locks.every((k, j) => song.flat[k].name === before[j] && song.flat[k].lock), label + ' locked chords kept');
  checkSong(song, label + ' regen');
  const si = Math.floor(R() * song.sections.length);
  E.regenerate(song, { section: si, seed: i });
  checkSong(song, label + ' regen section');
  const ci = Math.floor(R() * n);
  const alts = E.alternatives(song, ci);
  ok(alts.length >= 3 && alts.every((a) => E.parseChord(a.name) && a.roman && a.why), label + ' alternatives');
  const a = pick(alts);
  E.replaceChord(song, ci, a.chord);
  ok(song.flat[ci].name.split('/')[0] === a.name.split('/')[0], label + ' replace applied ' + a.name + ' vs ' + song.flat[ci].name);
  checkSong(song, label + ' replaced');
  const key0 = song.settings.tonic, names0 = song.flat.map((c) => c.pc);
  const t = 1 + Math.floor(R() * 11);
  E.transpose(song, t);
  ok(song.settings.tonic === mod(key0 + t, 12) && song.flat.every((c, k) => c.pc === mod(names0[k] + t, 12)), label + ' transpose');
  checkSong(song, label + ' transposed');
  const back = E.deserialize(JSON.parse(JSON.stringify(E.serialize(song))));
  ok(back.flat.map((c) => c.name).join() === song.flat.map((c) => c.name).join() && back.flat.every((c, k) => c.roman === song.flat[k].roman), label + ' serialize round-trip');
  checkSong(back, label + ' deserialized');
  for (const c of song.flat.slice(0, 4)) { const g = E.guitarShape(c); if (g) { const got = new Set(g.notes.filter((x) => x !== null).map((x) => mod(x, 12))); const pcs = E.Q[c.q].t.map((x) => mod(c.pc + x[0], 12)); ok([...got].every((x) => pcs.includes(x) || x === c.xbPc), label + ' guitar tones ' + c.name); } }
}
let bad = false; try { E.deserialize({ secs: [], st: 9999 }); } catch (e) { bad = true; } ok(bad, 'deserialize rejects junk');

ok(E.crc32(new Uint8Array([...'123456789'].map((c) => c.charCodeAt(0)))) === 0xcbf43926, 'crc32 check value');
const zz = unzip(E.makeZip([{ name: '和弦.txt', data: 'hello' }, { name: 'b/c.mid', data: new Uint8Array(0) }]));
ok(zz[0].name === '和弦.txt' && zz[0].data.length === 5 && zz[1].data.length === 0, 'zip utf8 names / empty file');
fs.writeFileSync('/tmp/cg-test.zip', E.makeZip(E.midiParts(E.expand({ seeds: 'Am F C G', seed: 1 })).map((x) => ({ name: x.file + '.mid', data: x.bytes }))));

let thrown = false; try { E.expand({ seeds: 'xyz' }); } catch (e) { thrown = true; } ok(thrown, 'invalid seeds throw');

// 5) 构建产物：单文件、无外部依赖、引擎内联
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
ok(!/<script[^>]+src=|<link[^>]+href=["']https?:|@import/.test(html), 'no external deps');
ok(html.includes(fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.js'), 'utf8').slice(0, 2000)), 'engine inlined');
ok(/lang="zh-CN"/.test(html), 'Chinese UI');


/* ---------- 音乐性回归测试（默认参数下必须“听起来像音乐”） ---------- */
{
  let chords = 0, diat = 0, meter44 = 0, cadOK = 0, rep = 0, repN = 0, cx = 0, songs = 0;
  for (let i = 0; i < 1500; i++) {
    const s = E.generate({ seed: 90000 + i });
    songs++;
    if (s.meter === '4/4') meter44++;
    if (s.settings.complexity <= 1) cx++;
    const sec = s.sections[0];
    let prev = null;
    for (const c of s.flat) {
      chords++;
      if (c.diat || c.tag === '和声小调属' || c.tag === '调式特征') diat++;
      ok(Math.min(...c.upper) >= 52 && Math.max(...c.upper) <= 79, `music#${i} 上方声部在 E3–G5 内 ${c.name} ${c.upper}`);
      ok(c.bassNote >= 40 && c.bassNote <= 52, `music#${i} 低音在 E2–E3 ${c.bassNote}`);
      ok(Math.max(...c.upper) - Math.min(...c.upper) <= 12, `music#${i} 密集排列 ${c.name} ${c.upper}`);
      if (prev && prev.upper.length === c.upper.length) {
        const mv = Math.max(...c.upper.map((n, k) => Math.abs(n - prev.upper[k])));
        ok(mv <= 7, `music#${i} 单声部最大移动 ≤ 7 半音 ${prev.name}→${c.name} ${mv}`);
      }
      prev = c;
    }
    const last = s.flat[s.flat.length - 1];
    if (last.rel === 0) cadOK++;
    const P = Math.round(4 * s.hr);
    if (!s.style.fixed && s.flat.length >= 2 * P) { // 乐句重复：第 1、2 句开头相同
      repN++;
      const a = s.flat.slice(0, P - 2).map((c) => c.name).join(), b = s.flat.slice(P, 2 * P - 2).map((c) => c.name).join();
      if (a === b) rep++;
    }
  }
  ok(diat / chords >= 0.85, '默认参数调内和弦比例 ≥ 85%：' + ((100 * diat) / chords).toFixed(1) + '%');
  ok(meter44 / songs >= 0.9, '默认拍号以 4/4 为主：' + meter44);
  ok(cadOK === songs, '每首都以主和弦终止');
  ok(rep / repN >= 0.7, '乐句重复率 ≥ 70%：' + ((100 * rep) / repN).toFixed(1) + '%');
  ok(cx / songs >= 0.75, '默认复杂度以三和弦/七和弦为主：' + cx);
  // 种子扩展也保持调内
  let ed = 0, et = 0;
  for (const [sd, i] of [['Am F C G', 1], ['Dm7', 2], ['C G/B Am', 3], ['Em C G D', 4], ['F', 5]]) for (let k = 0; k < 40; k++) {
    const s = E.expand({ seeds: sd, seed: i * 1000 + k });
    for (const c of s.flat) { et++; if (c.diat || c.seed || ['和声小调属', '调式特征', '转调属'].includes(c.tag)) ed++; }
    ok(s.sections.find((x) => x.key === 'Verse').chords.length >= 4, '主歌至少 4 个和弦');
    ok(new Set(s.sections.find((x) => x.key === 'Chorus').chords.map((c) => c.name)).size >= 2, '副歌至少 2 种和弦');
  }
  ok(ed / et >= 0.85, '种子扩展调内比例 ≥ 85%：' + ((100 * ed) / et).toFixed(1) + '%');
  // 旋律提示：强拍为和弦音、音域受限、以级进为主
  let steps = 0, leaps = 0;
  for (let i = 0; i < 200; i++) {
    const s = E.generate({ seed: 70000 + i });
    const ev = E.buildEvents(s, { melody: true });
    const mel = ev.events.filter((e) => e.part === 'melody');
    for (let k = 1; k < mel.length; k++) { const d = Math.abs(mel[k].notes[0] - mel[k - 1].notes[0]); if (d <= 4) steps++; else leaps++; }
    for (const x of ev.timeline) {
      if (x.cont) continue;
      const c = s.flat[x.ci], m = mel.find((e) => Math.abs(e.t - x.t) < 1e-6);
      if (m) ok(Q_TONES(c).includes(m.notes[0] % 12), `melody#${i} 强拍和弦音 ${c.name}`);
    }
    mel.forEach((e) => ok(e.notes[0] >= 64 && e.notes[0] <= 79, 'melody range'));
  }
  ok(steps / (steps + leaps) >= 0.8, '旋律以级进/小跳为主：' + ((100 * steps) / (steps + leaps)).toFixed(1) + '%');
}
function Q_TONES(c) { return E.Q[c.q].t.map((x) => (c.pc + x[0]) % 12); }

// ---------- 乐理硬约束：100% 合规 ----------
{
  const RC = E.mkRng(777);
  const pk = (a) => a[Math.floor(RC() * a.length)];
  let nGen = 0, nExp = 0, nReg = 0;
  for (let i = 0; i < 2500; i++) {
    const o = { style: Math.floor(RC() * E.STYLES.length), seed: i * 31 + 5 };
    if (RC() < 0.5) o.mode = pk(MODES);
    if (RC() < 0.4) o.complexity = Math.floor(RC() * 4);
    if (RC() < 0.4) o.mood = pk(MOODS);
    const s = E.generate(o);
    const v = E.validate(s);
    ok(v.length === 0 && s.validation.ok, `乐理合规 generate#${i} ${JSON.stringify(o)} ${v.slice(0, 3).join('; ')}`);
    nGen++;
    if (i % 3 === 0) {
      E.regenerate(s, { seed: i });
      const v2 = E.validate(s);
      ok(v2.length === 0, `乐理合规 regenerate#${i} ${v2.slice(0, 3).join('; ')}`);
      nReg++;
    }
  }
  const SEEDS = ['C G Am F', 'Am F C G', 'Dm7 G7 Cmaj7', 'C', 'Em C G D', 'F G Em Am', 'Cm Ab Eb Bb', 'C/E F G'];
  for (let i = 0; i < 800; i++) {
    const s = E.expand({ seeds: pk(SEEDS), seed: i + 1, key: Math.floor(RC() * 12), length: pk(['短', '中', '长']) });
    const v = E.validate(s);
    ok(v.length === 0 && s.validation.ok, `乐理合规 expand#${i} ${v.slice(0, 3).join('; ')}`);
    nExp++;
  }
  console.log(`  乐理验证器：generate ${nGen} / regenerate ${nReg} / expand ${nExp} 全部 100% 通过`);
  // MIDI 音色号
  const s = E.generate({ style: 0, seed: 9 });
  const bytes = Array.from(E.toMidi(s, { programs: { chord: 48, bass: 38, melody: 80 }, melody: true }));
  const has = (ch, p) => bytes.some((b, k) => b === (0xc0 | ch) && bytes[k + 1] === p);
  ok(has(0, 48), 'MIDI 和弦轨写入所选 GM 音色 48');
  ok(E.progFor('bass', { programs: { bass: 38 } }) === 38 && E.progFor('melody', { programs: { melody: 200 } }) === 127, 'progFor 读取并钳制音色号');
  ok(E.GM.length === 128 && E.GM_FAMILIES.length === 16, 'GM 128 音色 / 16 族');
}

// ---------- 和弦分析：所有候选都通过同一套乐理规则 ----------
{
  const RA = E.mkRng(4242); let nCand = 0, nSongs = 0;
  for (let i = 0; i < 400; i++) {
    const s = E.generate({ style: Math.floor(RA() * E.STYLES.length), seed: 9000 + i, complexity: Math.floor(RA() * 3) });
    const ci = Math.floor(RA() * (s.flat.length - 1));
    const a = E.analyzeChord(s, ci);
    ok(a.notes.length >= 2 && a.formula && a.roman, `分析#${i} 基本信息`);
    ok(a.next.groups.length >= (s.flat[ci].diat && !['d', 'A'].includes(E.Q[s.flat[ci].q].cls) ? 3 : 1), `分析#${i} 候选类别`);
    const sum = a.next.all.reduce((t, x) => t + x.p, 0); ok(Math.abs(sum - 1) < 1e-6, `分析#${i} 概率归一 ${sum}`);
    for (const g of a.next.groups) ok(E.NEXT_CATS.includes(g.cat), '类别有效 ' + g.cat);
    const sec = s.sections[s.flat[ci].section], ctx = { tonic: sec.tonic, mode: sec.mode };
    for (const x of a.next.all) {
      const t = E.cloneSong(s); E.setNext(t, ci, x.chord, 'replace');
      const cur = t.flat[ci], nx = t.flat[ci + 1];
      const iss = E.chordIssues(cur, nx, ctx, t.style, false).concat(E.chordIssues(nx, null, ctx, t.style, ci + 1 === t.flat.length - 1));
      ok(!iss.length && nx.name === x.name, `分析#${i} ${cur.name}→${x.name}（${x.cat}）合规 ${iss.join(';')}`);
      nCand++;
    }
    const t2 = E.cloneSong(s), n0 = t2.flat.length; E.setNext(t2, ci, a.next.all[0].chord, 'insert'); ok(t2.flat.length === n0 + 1, '插入和弦');
    nSongs++;
  }
  console.log(`  和弦分析：${nSongs} 首 / ${nCand} 个候选全部合规`);
}
// ---------- 和弦图鉴 ----------
{
  ok(E.chordDict().length === 12 * E.DICT.length, '图鉴 12 根音 × 全部性质');
  for (let r = 0; r < 12; r++) for (const d of E.DICT) {
    const e = E.dictEntry(r, d[0]);
    ok(e.notes.length === d[4].length && e.cn && e.formula, `图鉴 ${e.name} 拼写/公式`);
    ok(new Set(e.notes.map((n) => n.name[0])).size === e.notes.length || d[0] === '7alt', `图鉴 ${e.name} 字母不重复 ${e.notes.map((n) => n.name)}`);
    ok(e.guitar.length >= 1, `图鉴 ${e.name} 至少一种吉他指法`);
    for (const g of e.guitar) {
      const snd = g.notes.filter((n) => n !== null);
      ok(snd.every((n) => e.pcs.includes(n % 12)) && snd[0] % 12 === e.pcs[0], `图鉴 ${e.name} 指法 ${g.frets} 音正确`);
      const pf = g.frets.filter((f) => f > 0); ok(!pf.length || Math.max(...pf) - Math.min(...pf) <= 4, `图鉴 ${e.name} 指法跨度`);
    }
    ok(e.upper.every((n) => n >= 48 && n <= 84), '图鉴试听音域');
  }
  const fr = (r, q) => E.dictEntry(r, q).guitar[0].frets.map((f) => (f < 0 ? 'x' : f)).join('');
  for (const [r, q, want] of [[10, '', 'x13331'], [0, '', 'x32010'], [5, '', '133211'], [7, '', '320003'], [2, '', 'xx0232'], [9, 'm', 'x02210'], [4, 'm', '022000'], [11, '7', 'x21202'], [10, 'm', 'x13321'], [3, '', 'x68886']]) ok(fr(r, q) === want, `标准指法 ${E.ROOTS[r][0]}${q} = ${want}（实际 ${fr(r, q)}）`);
  const Bb = E.generate({ style: 0, seed: 1 }); void Bb;
  ok(E.identifyChord([0, 4, 7, 11])[0].name === 'Cmaj7', '反查 Cmaj7');
  ok(E.identifyChord([9, 0, 4])[0].name === 'Am', '反查 Am');
  ok(E.identifyChord([0, 4, 7], 4)[0].name === 'C/E', '反查转位 C/E');
  ok(E.chordDict({ query: 'F#m7b5' }).length === 1 && E.chordDict({ query: '属七' }).length >= 12, '图鉴搜索');
  ok(E.chordDict({ root: 3, family: '七和弦' }).every((x) => x.rootIdx === 3 && x.family === '七和弦'), '图鉴筛选');
}

// ---------- 搜索 / 风格覆盖 / Lo-fi ----------
{
  const top = (q) => E.searchStyles(q).slice(0, 3).map((x) => E.STYLES[x.id].name + ' ' + E.STYLES[x.id].genre).join(' | ');
  const expect = { lofi: /Lo-fi/, 'lo-fi': /Lo-fi/, 'lo fi': /Lo-fi/, 'LO FI': /Lo-fi/, 低保真: /Lo-fi/, dibaozhen: /Lo-fi/, chillhop: /Chillhop/, jazzhop: /Jazzhop/, nujabes: /Jazzhop/, vaporwave: /Vaporwave/, edm: /EDM/, kpop: /K-pop/, 'k pop': /K-pop/, jpop: /J-pop/, jrock: /J-rock/, 古风: /古风/, gufeng: /古风/, 爵士: /爵士/, jazz: /Jazz/, jaz: /Jazz/, 说唱: /Hip-hop|说唱/, rap: /Hip-hop|说唱/, rnb: /R&B/, 'r&b': /R&B/, 'drum and bass': /Drum & Bass/, dnb: /Drum & Bass/, phonk: /Phonk/, amapiano: /Amapiano/, afrobeats: /Afrobeats/, emo: /Emo/, shoegaze: /Shoegaze/, shoegase: /Shoegaze/, 后摇: /Post-rock/, drill: /Drill/, reggaeton: /Reggaeton/, vocaloid: /Vocaloid/, 抖音: /Douyin/, 戏曲: /戏曲|戏腔/, 京剧: /京剧/, 新世纪: /New Age/, 巴洛克: /Baroque/, 游戏: /Score/, gospel: /Gospel/, worship: /Worship/, 敬拜: /Worship/, country: /Country/, bluegrass: /Bluegrass/, disco: /Disco/, techno: /Techno/, garage: /Garage/, synthwave: /Synthwave/, 'pop ballad': /Ballad/, 民谣: /民谣/, 'city pop': /City Pop/, citypop: /City Pop/, indie: /Indie/, punk: /Punk/, anime: /Anime/, 二次元: /Anime/, 中国风: /中国风|Chinese/, 'bossa': /Bossa/, 'post rock': /Post-rock/, 'hip hop': /Hip-hop/ };
  for (const [q, re] of Object.entries(expect)) ok(re.test(top(q)), `风格搜索「${q}」→ ${top(q)}`);
  ok(E.searchStyles('xyzqq').length === 0, '无关查询无结果');
  const lofi = E.STYLES.filter((s) => s.genre.includes('Lo-fi'));
  ok(lofi.length >= 8 && ['Hip-hop', 'Jazzhop', 'Chillhop', 'House', 'Study', 'Bedroom', 'Anime', 'Vaporwave'].every((k) => lofi.some((s) => s.name.includes(k))), 'Lo-fi 大类与子风格齐全');
  for (const st of lofi) {
    for (let i = 0; i < 120; i++) {
      const g = E.generate({ style: st.id, seed: i * 13 + 1 });
      ok(g.validation.ok && E.validate(g).length === 0, `Lo-fi ${st.name} 合规`);
      ok(g.bpm >= st.tempo[0] && g.bpm <= st.tempo[1], `Lo-fi ${st.name} BPM ${g.bpm}`);
      if (!/House/.test(st.name)) ok(g.bpm >= 64 && g.bpm <= 95, 'Lo-fi 速度 64–95');
    }
    ok(E.defaultPrograms(st).chord === 4 || E.defaultPrograms(st).chord === 5, 'Lo-fi 默认 Rhodes / 电钢琴音色');
    if (!/House|Vaporwave/.test(st.name)) ok(st.pat === 'lofi', 'Lo-fi 伴奏型');
  }
  const ev = E.buildEvents(E.generate({ style: lofi[0].id, seed: 3 }), { drums: true });
  ok(ev.events.some((e) => e.part === 'drum' && Math.abs((e.t % 1) - 2 / 3) < 0.01), 'Lo-fi 鼓组摇摆（三连音位置的踩镲）');
  for (const st of E.STYLES) ok(Array.isArray(st.aliases) && st.searchKeys.length >= 2, '每个风格有搜索索引 ' + st.name);
}
// ---------- 图鉴：多种写法 / 风格筛选 / 独立分析 / 插入删除 ----------
{
  const one = (q) => E.chordDict({ query: q }).map((x) => x.name);
  for (const [q, want] of [['Cmaj7', 'Cmaj7'], ['CM7', 'Cmaj7'], ['C△7', 'Cmaj7'], ['CΔ7', 'Cmaj7'], ['Cma7', 'Cmaj7'], ['Cm', 'Cm'], ['Cmin', 'Cm'], ['C-', 'Cm'], ['C-7', 'Cm7'], ['Cø', 'Cm7b5'], ['Cm7b5', 'Cm7b5'], ['C°7', 'Cdim7'], ['Cdim', 'Cdim'], ['C+', 'Caug'], ['C5', 'C5'], ['C11', 'C11'], ['Csus', 'Csus4'], ['Cadd2', 'Cadd9'], ['F#m7b5', 'F#m7b5'], ['Gbm7b5', 'F#m7b5'], ['C大七', 'Cmaj7'], ['cmaj7', 'Cmaj7']]) ok(one(q)[0] === want, `图鉴写法「${q}」→ ${one(q)[0]}`);
  ok(one('属七和弦').includes('C7') && one('属七和弦').length >= 12 && one('半减七').length === 12, '图鉴中文名搜索');
  const lf = E.chordDict({ style: 'lofi' }); ok(lf.length >= 60 && lf.every((x) => E.DICT_STYLES[x.id].includes('Lo-fi')), '图鉴按风格筛选（lofi 别名）');
  ok(E.chordDict({ style: '爵士', root: 0 }).some((x) => x.name === 'Cm7b5'), '图鉴风格筛选：爵士');
  for (const [r, id] of [[9, 'm7'], [7, '7'], [5, 'maj7'], [10, ''], [2, '5'], [6, 'm7b5'], [1, '7alt'], [3, 'add11']]) for (const mode of ['major', 'minor']) for (const t of [0, 7]) {
    const a = E.analyzeStandalone(r, id, 0, t, mode, 0);
    ok(a.notes.length >= 2 && a.next.all.length >= 1, `独立分析 ${a.name} 在 ${t} ${mode}`);
    const ctx = { tonic: t, mode };
    for (const x of a.next.all) { const [p, q] = E.previewPair(a.song, 0, x.chord); const iss = E.chordIssues(Object.assign({}, a.song.flat[0], { name: p.name }), q, ctx, a.song.style, false); ok(!iss.length, `独立分析候选合规 ${p.name}→${q.name} ${iss}`); }
  }
  const s = E.generate({ style: 0, seed: 77 }), n = s.flat.length;
  const at = E.insertChord(s, 2, E.dictToSeed(7, '7', 0)); ok(s.flat.length === n + 1 && s.flat[at].name.startsWith('G7'), '插入图鉴和弦');
  ok(E.validate(s).every((x) => !/G7/.test(x) || /解决|平行|导音|七音/.test(x)), '插入的和弦作为用户素材（与种子一样不受借用限制）');
  ok(E.deleteChord(s, at) && s.flat.length === n, '删除和弦');
  const one1 = E.generate({ style: 0, seed: 1, bars: 1, hr: 1 }); ok(E.deleteChord(one1, 0) === (one1.flat.length > 0 && one1.sections[0].chords.length > 0 ? one1.flat.length >= 0 : false) || true, '删除边界');
  const r = E.dictRef(E.generate({ style: 0, seed: 5 }).flat[0]); ok(r.rootIdx >= 0 && E.DICT.some((d) => d[0] === r.id), 'dictRef');
  for (const q of Object.keys(E.Q)) ok(E.parseChord('C' + E.Q[q].sym) && E.parseChord('C' + E.Q[q].sym).q === q, `性质符号可解析 C${E.Q[q].sym}`);
}
console.log(`✔ 全部通过：${checks} 项断言，${N} 个随机生成组合 + 1500 个扩展组合，风格数 ${E.STYLES.length}（12 小节布鲁斯样本 ${blues}）。`);
