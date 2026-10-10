(function () {
  'use strict';
  const E = window.ChordEngine;
  const $ = (id) => document.getElementById(id);
  const RAND = '<option value="rand">🎲 随机</option>';
  let mode = 'rand', song = null;

  /* ---------- 控件初始化 ---------- */
  const genres = [...new Set(E.STYLES.map((s) => s.genre))];
  $('genre').innerHTML = RAND + genres.map((g) => `<option>${g}</option>`).join('');
  function fillStyles() {
    const g = $('genre').value;
    const list = E.STYLES.filter((s) => g === 'rand' || s.genre === g);
    $('style').innerHTML = RAND + list.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  }
  fillStyles();
  $('mood').innerHTML = RAND + Object.keys(E.MOODS).map((m) => `<option>${m}</option>`).join('');
  $('meter').innerHTML = RAND + Object.keys(E.METERS).map((m) => `<option>${m}</option>`).join('');
  function fillKeyMode() {
    const first = mode === 'seed' ? '<option value="auto">🔍 自动推断</option>' : RAND;
    const kv = $('key').value, mv = $('mode').value;
    $('key').innerHTML = first + E.KEYS_M.map((k, i) => `<option value="${i}">${k}${E.KEYS_M[i] !== ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][i] ? ' / ' + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][i] : ''}</option>`).join('');
    $('mode').innerHTML = first + Object.entries(E.MODES).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join('');
    if ([...$('key').options].some((o) => o.value === kv)) $('key').value = kv;
    if ([...$('mode').options].some((o) => o.value === mv)) $('mode').value = mv;
  }
  fillKeyMode();
  $('bars').innerHTML = RAND + E.BAR_OPTS.map((b) => `<option value="${b}"${b === 8 ? '' : ''}>${b}</option>`).join('');
  $('complexity').innerHTML = RAND + E.COMPLEX.map((c, i) => `<option value="${i}">${c}</option>`).join('');
  $('hr').innerHTML = RAND + [['0.5', '每 2 小节 1 个'], ['1', '每小节 1 个'], ['2', '每小节 2 个'], ['4', '每小节 4 个']].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  $('pattern').innerHTML = '<option value="style">随风格</option>' + Object.entries(E.PATTERNS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('genre').onchange = fillStyles;
  let bpmRand = true;
  const syncBpm = () => { $('bpmVal').textContent = bpmRand ? '🎲 随机' : $('bpm').value; $('bpmRand').classList.toggle('on', bpmRand); };
  $('bpm').oninput = () => { bpmRand = false; syncBpm(); };
  $('bpmRand').onclick = () => { bpmRand = !bpmRand; syncBpm(); };
  syncBpm();

  function setMode(m) {
    mode = m;
    $('tabRand').classList.toggle('on', m === 'rand');
    $('tabSeed').classList.toggle('on', m === 'seed');
    $('seedBox').hidden = m !== 'seed';
    $('barsLabel').textContent = m === 'seed' ? '段落小节数（主歌/副歌）' : '小节数';
    fillKeyMode();
    if (m === 'seed') updateInfer();
  }
  $('tabRand').onclick = () => setMode('rand');
  $('tabSeed').onclick = () => setMode('seed');

  function updateInfer() {
    const p = E.parseSeeds($('seeds').value);
    $('seedErr').textContent = p.bad.length ? '无法识别：' + p.bad.join(' ') : !p.chords.length ? '请输入至少一个和弦' : '';
    if (!p.chords.length) { $('inferBox').innerHTML = ''; return; }
    const inf = E.inferKey(p.chords).slice(0, 4);
    $('inferBox').innerHTML = '<span class="hint">推断调性：</span>' + inf.map((x, i) => `<button class="dice${i === 0 ? ' on' : ''}" data-k="${x.tonic}" data-m="${x.mode}" title="得分 ${x.score}">${x.name}</button>`).join('');
    $('inferBox').querySelectorAll('button').forEach((b) => (b.onclick = () => { $('key').value = b.dataset.k; $('mode').value = b.dataset.m; toast('已指定调性：' + b.textContent); }));
  }
  $('seeds').oninput = updateInfer;

  function opts() {
    const o = { genre: $('genre').value, style: $('style').value, mood: $('mood').value, meter: $('meter').value, key: $('key').value, mode: $('mode').value, bars: $('bars').value, complexity: $('complexity').value, hr: $('hr').value, feel: $('feel').value, bpm: bpmRand ? 'rand' : $('bpm').value };
    if (mode === 'seed') Object.assign(o, { seeds: $('seeds').value, length: $('songLen').value, modulate: $('modulate').checked });
    return o;
  }
  function generate() {
    stop();
    try {
      song = mode === 'seed' ? E.expand(opts()) : E.generate(opts());
      $('seedErr').textContent = '';
    } catch (e) { $('seedErr').textContent = e.message; return; }
    if (bpmRand) $('bpm').value = song.bpm;
    syncBpm();
    render();
  }
  $('gen').onclick = generate;
  $('allRand').onclick = () => {
    ['genre', 'mood', 'meter', 'bars', 'complexity', 'hr', 'feel'].forEach((id) => ($(id).value = 'rand'));
    fillStyles(); $('style').value = 'rand';
    $('key').value = mode === 'seed' ? 'auto' : 'rand'; $('mode').value = mode === 'seed' ? 'auto' : 'rand';
    bpmRand = true; syncBpm(); generate();
  };

  /* ---------- 渲染 ---------- */
  const FN = { T: '主 T', S: '下属 S', D: '属 D' };
  function render() {
    const s = song.settings;
    let h = `<div class="out-head"><div class="tags">
      <span class="tag">${s.genre} › ${s.style}</span><span class="tag">情绪 ${s.mood}</span>
      <span class="tag">${s.key} ${s.modeName}</span><span class="tag">${s.meter}</span><span class="tag">${s.bpm} BPM · ${s.feel}</span>
      <span class="tag">${s.complexityName}</span><span class="tag">每小节 ${s.hr} 和弦</span><span class="tag">${s.pattern}</span></div></div>
      <div class="legend"><span><i style="background:var(--T)"></i>主功能 T</span><span><i style="background:var(--S)"></i>下属功能 S</span><span><i style="background:var(--D)"></i>属功能 D</span><span style="color:var(--acc2)">粉色标注 = 借用/副属/替代/转调</span></div>`;
    let barNo = 1;
    song.sections.forEach((sec, si) => {
      h += `<div class="section"><h3>${sec.name}<span class="k">${sec.keyLabel}</span>${sec.modulated ? '<span class="mod">⤴ 转调 +全音</span>' : ''}</h3>${sec.note ? `<p class="note">${sec.note}</p>` : ''}<div class="bars">`;
      for (const bar of sec.bars) {
        h += `<div class="bar"><span class="no">${barNo++}</span>`;
        for (const cell of bar) {
          const c = song.flat[cell.ci];
          if (cell.cont) h += `<div class="ch cont ${c.func}" data-ci="${cell.ci}" data-c="1"><div class="nm">%</div><div class="fn">延续 ${c.name}</div></div>`;
          else h += `<div class="ch ${c.func}" data-ci="${cell.ci}" style="flex:${cell.dur}" title="${c.name} — 点击试听"><div class="nm">${c.name}</div><div class="rn">${c.roman}</div><div class="fn">${FN[c.func] || c.func}</div>${c.tag ? `<div class="tg">${c.tag}</div>` : ''}</div>`;
        }
        h += '</div>';
      }
      h += '</div></div>';
    });
    h += '<h2 style="margin-top:18px">乐理说明</h2><ul class="ex">' + song.explanation.map((x) => `<li>${x}</li>`).join('') + '</ul>';
    $('out').innerHTML = h;
    $('out').querySelectorAll('.ch').forEach((el) => { if (!el.dataset.c) el.onclick = () => preview(song.flat[+el.dataset.ci]); });
  }

  /* ---------- Web Audio ---------- */
  let ac = null, master = null, timer = null, raf = null, playing = false;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function ensureAC() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  }
  function newMaster() {
    if (master) { try { master.gain.setTargetAtTime(0, ac.currentTime, 0.02); const m = master; setTimeout(() => m.disconnect(), 300); } catch (e) { /* ignore */ } }
    master = ac.createGain(); master.gain.value = 0.6;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
  }
  function voice(midi, t, d, vel, part) {
    const g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = part === 'bass' ? 900 : part === 'click' ? 8000 : 2600;
    g.connect(f); f.connect(master);
    const types = part === 'bass' ? ['triangle', 'sine'] : part === 'click' ? ['square'] : ['triangle', 'sawtooth'];
    const amp = (part === 'chord' ? 0.07 : part === 'bass' ? 0.22 : 0.12) * vel;
    const rel = part === 'click' ? 0.03 : 0.12, dd = Math.max(0.04, d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + (part === 'click' ? 0.002 : 0.012));
    g.gain.setTargetAtTime(amp * (part === 'chord' ? 0.55 : 0.7), t + 0.03, 0.25);
    g.gain.setTargetAtTime(0, t + dd, rel / 3);
    types.forEach((ty, i) => {
      const o = ac.createOscillator(); o.type = ty; o.frequency.value = hz(midi);
      if (i === 1) { o.detune.value = part === 'bass' ? 0 : 6; }
      const og = ac.createGain(); og.gain.value = i === 1 && ty === 'sawtooth' ? 0.25 : 1;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dd + rel * 2 + 0.05);
    });
  }
  function preview(c) {
    ensureAC(); if (!playing) newMaster();
    const t = ac.currentTime + 0.02;
    voice(c.bassNote, t, 1.2, 0.7, 'bass');
    c.upper.forEach((n, i) => voice(n, t + i * 0.03, 1.2, 0.6, 'chord'));
  }
  function play() {
    if (!song) generate();
    if (!song) return;
    ensureAC(); stop(); newMaster(); playing = true;
    $('play').disabled = true; $('stop').disabled = false;
    const pat = $('pattern').value;
    const ev = E.buildEvents(song, { metronome: $('metro').checked, pattern: pat });
    const us = ev.unitSec, total = ev.totalUnits * us;
    let base = ac.currentTime + 0.12, idx = 0;
    const cells = $('out').querySelectorAll('.ch');
    const cellAt = (k) => cells[k];
    timer = setInterval(() => {
      const horizon = ac.currentTime + 0.35;
      while (true) {
        if (idx >= ev.events.length) {
          if ($('loop').checked) { base += total; idx = 0; continue; }
          break;
        }
        const e = ev.events[idx], t = base + e.t * us;
        if (t > horizon) break;
        for (const n of e.notes) voice(n, t, e.d * us, e.vel, e.part);
        idx++;
      }
      if (!$('loop').checked && idx >= ev.events.length && ac.currentTime > base + total + 0.3) stop();
    }, 60);
    const tick = () => {
      if (!playing) return;
      const pos = (ac.currentTime - base) / us;
      let cur = -1;
      const p = pos < 0 && $('loop').checked ? pos + ev.totalUnits : pos;
      for (let k = 0; k < ev.timeline.length; k++) { const x = ev.timeline[k]; if (p >= x.t && p < x.t + x.d) { cur = k; break; } }
      cells.forEach((el, k) => el.classList.toggle('now', k === cur));
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stop() {
    playing = false;
    clearInterval(timer); cancelAnimationFrame(raf);
    if (ac && master) newMaster();
    document.querySelectorAll('.ch.now').forEach((el) => el.classList.remove('now'));
    $('play').disabled = false; $('stop').disabled = true;
  }
  $('play').onclick = play;
  $('stop').onclick = stop;

  /* ---------- 导出 ---------- */
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1800); }
  $('midi').onclick = () => {
    if (!song) generate();
    if (!song) return;
    const bytes = E.toMidi(song, { metronome: $('metro').checked, pattern: $('pattern').value });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
    const s = song.settings;
    a.download = `chords_${s.key}_${s.mode}_${s.bpm}bpm.mid`.replace(/#/g, 's');
    document.body.appendChild(a); a.click(); a.remove();
    toast('MIDI 已导出');
  };
  $('copy').onclick = async () => {
    if (!song) return;
    const txt = E.toText(song);
    try { await navigator.clipboard.writeText(txt); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    toast('已复制到剪贴板');
  };
  document.addEventListener('keydown', (e) => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range') { if (e.key === 'Enter' && e.target.id === 'seeds') generate(); return; }
    if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); }
    if (e.key === 'Enter') generate();
  });
  generate();
})();
