(function () {
  'use strict';
  const E = window.ChordEngine;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RAND = '<option value="rand">🎲 随机</option>';
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存储已满或被禁用 */ } } };
  let mode = 'rand', song = null, sel = -1;
  const state = { genre: 'rand', style: 'rand' };

  /* ---------- 主题 ---------- */
  const setTheme = (t) => { document.documentElement.dataset.theme = t; LS.set('cg.theme', t); };
  setTheme(LS.get('cg.theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  $('theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  /* ---------- 浮动提示 ---------- */
  const tip = $('tip');
  const GLOSS = {
    主功能: '主功能 (T)：稳定、有归属感的和弦，如 I、vi、iii。', 下属功能: '下属功能 (S)：离开主和弦、准备属和弦，如 IV、ii。', 属功能: '属功能 (D)：紧张、强烈倾向回到主和弦，如 V、vii°。',
    借用: '借用和弦：从同主音的平行调式（如 C 大调借 C 小调）借来的和弦，带来明暗变化。', 副属: '副属和弦：调内某和弦的属和弦（V/x），让它临时成为“主”，增强推动力。',
    三全音替代: '三全音替代：用根音相距三全音的属七代替原属七，二者共享 3、7 音，低音半音下行解决。', 调式特征: '调式特征和弦：包含该调式标志性音的和弦，如多利亚的 IV、混合利底亚的 ♭VII。',
    和声小调属: '和声小调属：小调中把 v 升高三音成为大三/属七 V，形成导音，强化终止。', 转调属: '转调属：新调的属七和弦，用来自然地引入新调。', 转位: '转位：低音不是根音的和弦（斜线和弦），让低音线更平滑。',
    正格终止: '正格终止：V → I，最强烈、最完满的结束感。', 变格终止: '变格终止：IV → I，“阿们终止”，柔和。', 半终止: '半终止：停在 V 上，像逗号，等待继续。', 调式终止: '调式终止：用调式特征和弦回到主和弦，不经过 V。',
    王道进行: '王道进行：IV–V–iii–vi，日本流行最常见的进行。', 卡农进行: '卡农进行：I–V–vi–iii–IV–I–IV–V，源自帕赫贝尔《卡农》。', 安达卢西亚: '安达卢西亚终止：i–♭VII–♭VI–V 下行，弗拉门戈标志。', 五度圈: '五度圈：根音按纯四/纯五度循环运动（如 vi–ii–V–I），最自然的和声推进。',
    马尔可夫链: '马尔可夫链：按“当前功能 → 下一功能”的概率表逐个选择和弦。', 五声音阶: '五声音阶：宫商角徵羽五个音，中国传统音乐的基础。',
  };
  const termify = (html) => html.replace(new RegExp(Object.keys(GLOSS).join('|'), 'g'), (m) => `<span class="term" data-tip="${esc(GLOSS[m])}">${m}</span>`);
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.classList.remove('on'); return; }
    tip.textContent = t.dataset.tip; tip.classList.add('on');
    const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
    if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  document.addEventListener('scroll', () => tip.classList.remove('on'), true);

  /* ---------- 控件 ---------- */
  $('mood').innerHTML = RAND + Object.entries(E.MOODS).map(([k, v]) => `<option value="${k}" title="${esc(v.d)}">${k}</option>`).join('');
  $('meter').innerHTML = RAND + Object.keys(E.METERS).map((m) => `<option>${m}</option>`).join('');
  const SH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function fillKeyMode() {
    const first = mode === 'seed' ? '<option value="auto">🔍 自动推断</option>' : RAND;
    const kv = $('key').value, mv = $('mode').value;
    $('key').innerHTML = first + E.KEYS_M.map((k, i) => `<option value="${i}">${k}${k !== SH[i] ? ' / ' + SH[i] : ''}</option>`).join('');
    $('mode').innerHTML = first + Object.entries(E.MODES).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join('');
    $('key').value = /^\d+$/.test(kv) ? kv : first.includes('auto') ? 'auto' : 'rand';
    $('mode').value = E.MODES[mv] ? mv : first.includes('auto') ? 'auto' : 'rand';
  }
  fillKeyMode();
  $('bars').innerHTML = RAND + E.BAR_OPTS.map((b) => `<option value="${b}">${b}</option>`).join('');
  $('complexity').innerHTML = RAND + E.COMPLEX.map((c, i) => `<option value="${i}">${c}</option>`).join('');
  $('hr').innerHTML = RAND + [['0.5', '每 2 小节 1 个'], ['1', '每小节 1 个'], ['2', '每小节 2 个'], ['4', '每小节 4 个']].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  $('pattern').innerHTML = '<option value="style">节奏型：随风格</option>' + Object.entries(E.PATTERNS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  let bpmRand = true;
  const syncBpm = () => { $('bpmVal').textContent = bpmRand ? '（随机）' : $('bpm').value; $('bpmRand').classList.toggle('on', bpmRand); };
  // BPM 直接输入：回车/失焦生效，校验并限制在 20–300
  const BPM_MIN = 20, BPM_MAX = 300;
  function parseBpm(v) { const n = Math.round(parseFloat(String(v).replace(',', '.'))); return Number.isFinite(n) ? Math.min(BPM_MAX, Math.max(BPM_MIN, n)) : null; }
  function applyBpm(v, from) {
    const n = parseBpm(v);
    const el = $(from || 'bpmNow');
    if (n === null) { el.classList.add('bad'); toast('请输入 20–300 之间的数字', true); setTimeout(() => el.classList.remove('bad'), 900); if (song) el.value = song.bpm; return; }
    if (+v !== n) toast(`BPM 已限制在 ${BPM_MIN}–${BPM_MAX}：${n}`);
    $('bpm').value = n; $('bpmNow').value = n; bpmRand = false; syncBpm();
    if (song && song.bpm !== n) { E.setBpm(song, n); renderTags(); if (playing) restartSoon(); commit('改速度 ' + n); }
  }
  for (const id of ['bpm', 'bpmNow']) {
    const el = $(id);
    el.addEventListener('change', () => applyBpm(el.value, id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyBpm(el.value, id); el.blur(); }
      else if (e.key === 'Escape') { if (song) el.value = song.bpm; el.blur(); }
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey) { e.preventDefault(); applyBpm((parseBpm(el.value) || 120) + (e.key === 'ArrowUp' ? 10 : -10), id); }
      e.stopPropagation();
    });
    el.addEventListener('wheel', (e) => { if (document.activeElement !== el) return; e.preventDefault(); applyBpm((parseBpm(el.value) || 120) + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 10 : 1), id); }, { passive: false });
  }
  const taps = [];
  $('tap').onclick = () => {
    const now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now); if (taps.length > 6) taps.shift();
    if (taps.length >= 2) { const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); applyBpm(60000 / iv); } else toast('继续点按…');
  };
  $('bpmRand').onclick = () => { bpmRand = !bpmRand; syncBpm(); };
  syncBpm();
  const toggles = {};
  ['loop', 'metro', 'drums', 'melody'].forEach((id) => {
    toggles[id] = LS.get('cg.' + id, id === 'drums');
    const b = $(id); const sync = () => { b.classList.toggle('on', toggles[id]); b.setAttribute('aria-pressed', toggles[id]); };
    sync(); b.onclick = () => { toggles[id] = !toggles[id]; LS.set('cg.' + id, toggles[id]); sync(); if (playing && id !== 'loop') restartSoon(); };
  });
  $('inst').value = LS.get('cg.inst', 'gm');
  $('inst').onchange = () => { LS.set('cg.inst', $('inst').value); syncSound(); if (playing) restartSoon(); };
  // GM 音色选择器：128 个音色按 16 个家族分组
  const gmOpts = E.GM_FAMILIES.map((f, fi) => `<optgroup label="${fi + 1}. ${f}">` + E.GM.slice(fi * 8, fi * 8 + 8).map(([, cn], k) => `<option value="${fi * 8 + k}">${fi * 8 + k + 1} ${cn}</option>`).join('') + '</optgroup>').join('');
  const PROG_IDS = { chord: 'progChord', bass: 'progBass', melody: 'progMelody' };
  for (const [part, id] of Object.entries(PROG_IDS)) {
    $(id).innerHTML = gmOpts;
    $(id).onchange = () => { LS.set('cg.progUser', true); LS.set('cg.prog', programs()); syncSound(); if (playing) restartSoon(); else if (part === 'chord' && sel >= 0 && song) preview(song.flat[sel]); };
  }
  $('drumKit').value = LS.get('cg.drumKit', 'gm');
  $('drumKit').onchange = () => { LS.set('cg.drumKit', $('drumKit').value); syncSound(); if (playing) restartSoon(); };
  function programs() { return { chord: +$('progChord').value, bass: +$('progBass').value, melody: +$('progMelody').value }; }
  function setPrograms(pr) { for (const [part, id] of Object.entries(PROG_IDS)) if (pr && pr[part] !== undefined) $(id).value = pr[part]; }
  setPrograms(Object.assign({ chord: 0, bass: 33, melody: 73 }, LS.get('cg.prog', null) || {}));
  $('progDefault').onclick = () => { if (!song) return; setPrograms(E.defaultPrograms(song.style)); LS.set('cg.progUser', false); LS.set('cg.prog', programs()); syncSound(); toast('已按风格推荐音色'); if (playing) restartSoon(); };
  function syncSound() {
    const gm = $('inst').value === 'gm';
    document.querySelectorAll('.gmsel').forEach((x) => (x.disabled = false));
    $('sfStatus').textContent = !gm ? '内置合成器' : SF.offline ? '离线：已回退到内置合成器' : SF.loading ? '加载中…' : '';
  }
  $('pattern').onchange = () => { if (playing) restartSoon(); };

  /* ---------- 风格选择器 ---------- */
  const genres = [...new Set(E.STYLES.map((s) => s.genre))];
  function pickLabel() {
    if (state.style !== 'rand') { const s = E.STYLES[+state.style]; return s.genre.split(' ')[0] + ' › ' + s.name; }
    return state.genre === 'rand' ? '🎲 全部随机' : '🎲 ' + state.genre + '（大类内随机）';
  }
  function renderPick() {
    const q = $('pickSearch').value.trim().toLowerCase();
    let h = `<div class="it${state.genre === 'rand' && state.style === 'rand' ? ' sel' : ''}" data-g="rand" data-s="rand">🎲 全部随机</div>`;
    for (const g of genres) {
      const items = E.STYLES.filter((s) => s.genre === g && (!q || (s.name + ' ' + s.genre).toLowerCase().includes(q)));
      if (!items.length) continue;
      h += `<div class="gh" data-g="${esc(g)}" data-s="rand" title="此大类内随机"><span>${esc(g)}</span><span>🎲</span></div>`;
      h += items.map((s) => `<div class="it${String(s.id) === String(state.style) ? ' sel' : ''}" role="option" data-g="${esc(g)}" data-s="${s.id}">${esc(s.name)}</div>`).join('');
    }
    $('pickList').innerHTML = h;
    $('pickLabel').textContent = pickLabel();
  }
  $('pickBtn').onclick = (e) => { e.stopPropagation(); $('pickPop').classList.toggle('open'); renderPick(); $('pickSearch').focus(); };
  $('pickSearch').oninput = renderPick;
  $('pickSearch').onkeydown = (e) => { if (e.key === 'Enter') { const f = $('pickList').querySelector('.it[data-s]:not([data-s=rand])'); if (f) f.click(); } };
  $('pickList').onclick = (e) => { const t = e.target.closest('[data-g]'); if (!t) return; state.genre = t.dataset.g; state.style = t.dataset.s; $('pickPop').classList.remove('open'); renderPick(); };
  document.addEventListener('click', (e) => { if (!e.target.closest('#picker')) $('pickPop').classList.remove('open'); document.querySelectorAll('.menu').forEach((m) => { if (!m.contains(e.target)) { const pp = m.querySelector('.pop'); pp.classList.remove('open'); m.querySelector('button').setAttribute('aria-expanded', 'false'); } }); });
  renderPick();

  /* ---------- 模式 ---------- */
  function setMode(m) {
    mode = m;
    $('tabRand').setAttribute('aria-selected', m === 'rand'); $('tabSeed').setAttribute('aria-selected', m === 'seed');
    $('seedBox').hidden = m !== 'seed';
    $('barsLabel').textContent = m === 'seed' ? '段落小节数' : '小节数';
    fillKeyMode(); if (m === 'seed') updateInfer();
  }
  $('tabRand').onclick = () => setMode('rand');
  $('tabSeed').onclick = () => setMode('seed');
  function updateInfer() {
    const p = E.parseSeeds($('seeds').value);
    $('seedErr').textContent = p.bad.length ? '无法识别：' + p.bad.join(' ') : !p.chords.length ? '请输入至少一个和弦' : '';
    if (!p.chords.length) { $('inferBox').innerHTML = ''; return; }
    const inf = E.inferKey(p.chords).slice(0, 4);
    $('inferBox').innerHTML = '<span class="hint" style="margin:0">推断：</span>' + inf.map((x) => `<button class="chip${$('key').value === String(x.tonic) && $('mode').value === x.mode ? ' on' : ''}" data-k="${x.tonic}" data-m="${x.mode}" data-tip="匹配得分 ${x.score}，点击指定此调">${esc(x.name)}</button>`).join('') + `<button class="chip" data-auto="1" data-tip="恢复自动推断">自动</button>`;
    $('inferBox').querySelectorAll('button').forEach((b) => (b.onclick = () => { if (b.dataset.auto) { $('key').value = 'auto'; $('mode').value = 'auto'; } else { $('key').value = b.dataset.k; $('mode').value = b.dataset.m; } updateInfer(); }));
  }
  $('seeds').oninput = updateInfer;

  /* ---------- 历史 / 撤销 ---------- */
  let hist = [], hp = -1;
  function commit(label) {
    if (!song) return;
    hist = hist.slice(0, hp + 1);
    hist.push({ label, time: Date.now(), data: JSON.stringify(E.serialize(song)) });
    if (hist.length > 60) hist.shift();
    hp = hist.length - 1; syncHist();
  }
  function restore(i) {
    if (i < 0 || i >= hist.length) return;
    hp = i; song = E.deserialize(JSON.parse(hist[i].data)); sel = Math.min(sel, song.flat.length - 1);
    stop(); render(); syncHist();
  }
  function syncHist() {
    $('undo').disabled = hp <= 0; $('redo').disabled = hp >= hist.length - 1;
    $('histList').innerHTML = hist.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => `<div class="li${i === hp ? ' cur' : ''}"><div class="t" data-i="${i}"><div>${esc(h.label)}</div><small>${new Date(h.time).toLocaleTimeString()}</small></div></div>`).join('') || '<p class="hint">暂无</p>';
  }
  $('histList').onclick = (e) => { const t = e.target.closest('[data-i]'); if (t) restore(+t.dataset.i); };
  $('undo').onclick = () => restore(hp - 1);
  $('redo').onclick = () => restore(hp + 1);

  /* ---------- 生成 ---------- */
  function opts() {
    const o = { genre: state.genre, style: state.style, mood: $('mood').value, meter: $('meter').value, key: $('key').value, mode: $('mode').value, bars: $('bars').value, complexity: $('complexity').value, hr: $('hr').value, feel: $('feel').value, bpm: bpmRand ? 'rand' : $('bpm').value };
    if (mode === 'seed') Object.assign(o, { seeds: $('seeds').value, length: $('songLen').value, modulate: $('modulate').value === '1' });
    return o;
  }
  function generate() {
    $('gen').classList.add('busy'); requestAnimationFrame(() => requestAnimationFrame(() => $('gen').classList.remove('busy')));
    stop();
    try { song = mode === 'seed' ? E.expand(opts()) : E.generate(opts()); $('seedErr').textContent = ''; } catch (e) { $('seedErr').textContent = e.message; toast(e.message, true); if (isMobile()) openSheetEl('ctrl'); return; }
    sel = -1; afterNew('生成：' + song.settings.style + ' · ' + song.settings.key);
  }
  function afterNew(label) {
    if (bpmRand) $('bpm').value = song.bpm;
    if (!LS.get('cg.progUser', false)) { setPrograms(E.defaultPrograms(song.style)); LS.set('cg.prog', programs()); }
    syncBpm(); render(); commit(label);
  }
  function regen(section) {
    if (!song) return generate();
    stop(); E.regenerate(song, { section }); render();
    commit(section === undefined ? '重新生成（保留锁定）' : '重新生成：' + song.sections[section].name);
    toast(song.flat.some((c) => c.lock) ? '已重新生成未锁定的和弦' : '已重新生成');
  }
  $('gen').onclick = generate;
  $('regen').onclick = () => regen();
  $('allRand').onclick = () => {
    ['mood', 'meter', 'bars', 'complexity', 'hr', 'feel'].forEach((id) => ($(id).value = 'rand'));
    state.genre = 'rand'; state.style = 'rand'; renderPick();
    $('key').value = mode === 'seed' ? 'auto' : 'rand'; $('mode').value = mode === 'seed' ? 'auto' : 'rand';
    bpmRand = true; syncBpm(); generate();
  };
  function transpose(n) {
    if (!song) return; const was = playing; stop();
    E.transpose(song, n); render(); commit('移调 ' + (n > 0 ? '+' : '') + n + ' → ' + song.settings.key); if (was) play();
  }
  function stepBpm(d) {
    if (!song) return; const v = Math.max(20, Math.min(300, song.bpm + d));
    $('bpm').value = v; $('bpmNow').value = v; bpmRand = false; syncBpm(); E.setBpm(song, v); renderTags(); if (playing) restartSoon();
    clearTimeout(stepBpm.t); stepBpm.t = setTimeout(() => commit('改速度 ' + song.bpm), 600);
  }
  function renderOnboard() {
    if (LS.get('cg.onboarded', false)) { $('onboard').innerHTML = ''; return; }
    $('onboard').innerHTML = `<div class="onboard" role="note"><div style="font-size:22px">👋</div><div><b>三步上手</b><ol><li>在左侧选好<b>风格</b>和情绪（不选就全部随机）</li><li>点 <b>✨ 生成</b>，再点 <b>▶</b> 或按 <kbd>空格</kbd> 试听</li><li>点任意和弦查看指法与<b>可替换和弦</b>；🔒 锁定喜欢的，按 <kbd>R</kbd> 重生成其余</li></ol></div><button class="ib sm x" id="obClose" aria-label="关闭引导">✕</button></div>`;
    $('obClose').onclick = () => { LS.set('cg.onboarded', true); renderOnboard(); };
  }
  renderOnboard();
  $('tUp').onclick = () => transpose(1);
  $('tDown').onclick = () => transpose(-1);

  /* ---------- 渲染 ---------- */
  const FN = { T: '主 T', S: '下属 S', D: '属 D' };
  const fmtT = (sec) => Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
  function renderTags() {
    const s = song.settings;
    $('keyNow').textContent = s.key + ' ' + (E.MODES[s.mode].n.split(' ')[0]);
    if (document.activeElement !== $('bpmNow')) $('bpmNow').value = song.bpm;
    if (!playing) { const b0 = E.buildEvents(song, {}), tot = b0.totalUnits * b0.unitSec; $('progT').textContent = '0:00 / ' + fmtT(tot); $('progFill').style.width = '0'; }
    const t = document.getElementById('tagline'); if (!t) return;
    t.innerHTML = [['风格', s.genre.split(' ')[0] + ' › ' + s.style], ['情绪', s.mood], ['调', s.key + ' ' + s.modeName], ['拍号', s.meter], ['速度', song.bpm + ' BPM'], ['复杂度', s.complexityName], ['和声节奏', s.hr + '/小节']].map(([k, v]) => `<span class="tag">${k} <b>${esc(v)}</b></span>`).join('');
  }
  function render() {
    let h = '<div class="tags" id="tagline"></div><div class="legend"><span><i style="background:var(--T)"></i><span class="term" data-tip="' + esc(GLOSS.主功能) + '">主功能 T</span></span><span><i style="background:var(--S)"></i><span class="term" data-tip="' + esc(GLOSS.下属功能) + '">下属 S</span></span><span><i style="background:var(--D)"></i><span class="term" data-tip="' + esc(GLOSS.属功能) + '">属 D</span></span><span style="color:var(--acc2)">粉字 = 借用 / 副属 / 替代 / 转调</span></div>';
    let barNo = 1;
    song.sections.forEach((sec, si) => {
      h += `<div class="section" style="animation-delay:${si * 40}ms"><div class="sh"><h3>${esc(sec.name)}</h3><span class="k">${esc(sec.keyLabel)}</span>${sec.modulated ? '<span class="mod">⤴ 转调 +全音</span>' : ''}<span class="sp"></span>
        <button class="ib" data-act="playsec" data-si="${si}" data-tip="只播放本段">▶</button><button class="ib" data-act="regensec" data-si="${si}" data-tip="重新生成本段（保留锁定）">↻</button><button class="ib" data-act="midisec" data-si="${si}" data-tip="导出本段多轨 MIDI">⬇ MIDI</button><button class="ib" data-act="zipsec" data-si="${si}" data-tip="本段分轨打包 .zip（和弦/低音/旋律/鼓）">📦</button></div>${sec.note ? `<p class="note">${termify(esc(sec.note))}</p>` : ''}<div class="bars">`;
      for (const bar of sec.bars) {
        h += `<div class="bar"><span class="no">${barNo++}</span>`;
        for (const cell of bar) {
          const c = song.flat[cell.ci];
          if (cell.cont) h += `<div class="ch cont ${c.func}" data-ci="${cell.ci}" data-cont="1"><div class="nm">%</div><div class="fn">延续 ${esc(c.name)}</div></div>`;
          else h += `<div class="ch ${c.func}${c.lock ? ' locked' : ''}${cell.ci === sel ? ' sel' : ''}" data-ci="${cell.ci}" style="flex:${cell.dur};animation-delay:${Math.min(cell.ci * 12, 400)}ms" tabindex="0" role="button" aria-label="${esc(c.name)} ${esc(c.roman)}">
            <span class="ch-tools"><button class="lk${c.lock ? ' on' : ''}" data-lock="${cell.ci}" aria-label="${c.lock ? '解锁' : '锁定'} ${esc(c.name)}" aria-pressed="${!!c.lock}" data-tip="${c.lock ? '已锁定：重新生成时保留 (L)' : '锁定此和弦 (L)'}">${c.lock ? '🔒' : '🔓'}</button><button class="sw" data-swap="${cell.ci}" aria-label="替换 ${esc(c.name)}" data-tip="查看可替换和弦">⇄</button></span>
            <div class="nm">${esc(c.name)}</div><div class="rn">${esc(c.roman)}</div><div class="fn">${FN[c.func] || esc(c.func)}</div>${c.tag ? `<div class="tg" data-tip="${esc(GLOSS[c.tag] || c.tag)}">${esc(c.tag)}</div>` : ''}</div>`;
        }
        h += '</div>';
      }
      h += '</div></div>';
    });
    h += '<details class="explain" open><summary>乐理说明</summary><ul class="ex">' + song.explanation.map((x) => `<li>${termify(esc(x))}</li>`).join('') + '</ul></details>';
    $('result').innerHTML = h;
    renderTags(); renderInsp();
  }
  $('result').addEventListener('click', (e) => {
    const sw = e.target.closest('[data-swap]');
    if (sw) { e.stopPropagation(); select(+sw.dataset.swap, false, true); setTimeout(() => { const a = $('insp').querySelector('.alts'); if (a) a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50); return; }
    const lk = e.target.closest('[data-lock]');
    if (lk) { e.stopPropagation(); toggleLock(+lk.dataset.lock); return; }
    const act = e.target.closest('[data-act]');
    if (act) { const si = +act.dataset.si; if (act.dataset.act === 'regensec') regen(si); else if (act.dataset.act === 'midisec') exportMidi(si); else if (act.dataset.act === 'zipsec') exportZip(si); else play(si); return; }
    const ch = e.target.closest('.ch'); if (!ch) return;
    select(+ch.dataset.ci, true);
  });
  $('result').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('ch')) { e.stopPropagation(); select(+e.target.dataset.ci, true); } });
  function toggleLock(ci) { E.toggleLock(song, ci); render(); commit((song.flat[ci].lock ? '锁定 ' : '解锁 ') + song.flat[ci].name); }
  const isMobile = () => matchMedia('(max-width: 880px)').matches;
  function select(ci, sound, openSheet) {
    if (!song || ci < 0 || ci >= song.flat.length) return;
    sel = ci;
    if (isMobile() && (openSheet || sound) && !playing) openSheetEl('insp');
    document.querySelectorAll('.ch.sel').forEach((el) => el.classList.remove('sel'));
    document.querySelectorAll(`.ch[data-ci="${ci}"]:not([data-cont])`).forEach((el) => el.classList.add('sel'));
    renderInsp(); if (sound) preview(song.flat[ci]);
  }

  /* ---------- 可视化：钢琴与吉他 ---------- */
  function pianoSVG(c) {
    const lo = 36, hi = 84, white = [], black = [], on = new Set(c.upper), bass = c.bassNote;
    const isB = (n) => [1, 3, 6, 8, 10].includes(n % 12);
    let x = 0; const W = 12;
    for (let n = lo; n <= hi; n++) { if (!isB(n)) { white.push({ n, x }); x += W; } else black.push({ n, x: x - 4 }); }
    const col = (n) => (n === bass ? 'var(--D)' : on.has(n) ? 'var(--acc)' : null);
    let s = `<svg viewBox="0 0 ${x} 60" role="img" aria-label="钢琴键盘：${esc(c.name)}">`;
    for (const k of white) s += `<rect x="${k.x}" y="0" width="${W - 1}" height="58" rx="2" fill="${col(k.n) || '#f4f5fb'}" stroke="#8890b0" stroke-width=".5"/>${k.n % 12 === 0 ? `<text x="${k.x + 2}" y="55" font-size="6" fill="#666">C${k.n / 12 - 1}</text>` : ''}`;
    for (const k of black) s += `<rect x="${k.x}" y="0" width="8" height="36" rx="1.5" fill="${col(k.n) || '#20243a'}"/>`;
    return s + '</svg>';
  }
  function guitarSVG(c) {
    const g = E.guitarShape(c); if (!g) return '<p class="hint">无合适的吉他指法</p>';
    return fretSVG(g, c.name);
  }
  function fretSVG(g, title) {
    const c = { name: title };
    const base = g.base, W = 140, H = 150, x0 = 25, y0 = 28, sw = 18, fh = 22;
    let s = `<svg viewBox="0 0 ${W + 20} ${H}" role="img" aria-label="吉他指法：${esc(c.name)}" style="max-width:200px;margin:auto">`;
    s += `<text x="${x0 + 45}" y="12" font-size="11" text-anchor="middle" fill="currentColor" font-weight="700">${esc(c.name)}</text>`;
    for (let i = 0; i < 6; i++) s += `<line x1="${x0 + i * sw}" y1="${y0}" x2="${x0 + i * sw}" y2="${y0 + fh * 5}" stroke="var(--muted)" stroke-width="1"/>`;
    for (let f = 0; f <= 5; f++) s += `<line x1="${x0}" y1="${y0 + f * fh}" x2="${x0 + sw * 5}" y2="${y0 + f * fh}" stroke="var(--muted)" stroke-width="${f === 0 && base === 1 ? 4 : 1}"/>`;
    if (base > 1) s += `<text x="${x0 - 6}" y="${y0 + fh * 0.65}" font-size="10" text-anchor="end" fill="var(--muted)">${base}fr</text>`;
    g.frets.forEach((f, i) => {
      const x = x0 + i * sw;
      if (f < 0) s += `<text x="${x}" y="${y0 - 6}" font-size="11" text-anchor="middle" fill="var(--muted)">×</text>`;
      else if (f === 0) s += `<circle cx="${x}" cy="${y0 - 10}" r="4" fill="none" stroke="var(--muted)"/>`;
      else { const rf = f - base + 1; s += `<circle cx="${x}" cy="${y0 + (rf - 0.5) * fh}" r="7" fill="${i === g.frets.findIndex((v) => v >= 0) ? 'var(--D)' : 'var(--acc)'}"/>`; }
    });
    return s + '</svg>';
  }
  const NN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  function noteName(c, n) { // 按和弦音的字母级数拼写（Db13 中写 Cb/Eb 而不是 B/D#）
    const pc = n % 12; let nm = NN[pc];
    if (c.xb && pc === c.xbPc) nm = c.xbName;
    else { const t = E.Q[c.q].t.find((x) => (c.pc + x[0]) % 12 === pc); if (t) nm = E.spell(pc, c.letter + t[1]); }
    return nm + (Math.floor(n / 12) - 1);
  }
  function renderInsp() {
    document.body.classList.toggle('has-insp', !!song && sel >= 0 && sel < song.flat.length);
    if (!song || sel < 0 || sel >= song.flat.length) { $('insp').innerHTML = ''; $('insp').classList.remove('open'); return; }
    const c = song.flat[sel], alts = E.alternatives(song, sel);
    const groups = {}; alts.forEach((a, i) => { (groups[a.kind] = groups[a.kind] || []).push([a, i]); });
    let h = `<h2>和弦详情 <span style="flex:1"></span><button class="ib" id="prevC" aria-label="上一个">‹</button><button class="ib" id="nextC" aria-label="下一个">›</button><button class="ib" id="closeInsp" aria-label="关闭详情">✕</button></h2>
      <div class="cbig">${esc(c.name)}</div><div class="sub">${esc(c.roman)}</div>
      <div class="badges"><span class="badge ${c.func}" data-tip="${esc(GLOSS[{ T: '主功能', S: '下属功能', D: '属功能' }[c.func]] || '')}">${FN[c.func] || esc(c.func)}</span>${c.tag ? `<span class="badge x" data-tip="${esc(GLOSS[c.tag] || '')}">${esc(c.tag)}</span>` : ''}${c.bass > 0 || c.xb ? '<span class="badge" data-tip="' + esc(GLOSS.转位) + '">转位/斜线</span>' : ''}<button class="badge" id="lockSel" style="cursor:pointer">${c.lock ? '🔒 已锁定' : '🔓 锁定'}</button></div>
      <div class="hint" style="margin:0">组成音：${[c.bassNote, ...c.upper].map((n) => noteName(c, n)).join(' · ')}</div>
      <button class="btn anaBtn" id="anaBtn">🔍 分析该和弦</button>
      <div class="viz">${pianoSVG(c)}</div><div class="viz" style="color:var(--text)">${guitarSVG(c)}</div>
      <h2 style="margin-top:12px">可替换和弦 <span class="hint" style="margin:0;text-transform:none">点击替换并试听</span></h2><div class="alts">`;
    for (const [k, list] of Object.entries(groups)) {
      h += `<div class="altg"><span class="term" data-tip="${esc(E.ALT_TIPS[k] || '')}">${esc(k)}</span></div>`;
      h += list.map(([a, i]) => `<button class="alt" data-alt="${i}" data-tip="${esc(a.why)}"><b>${esc(a.name)}</b><small>${esc(a.roman)}</small></button>`).join('');
    }
    $('insp').innerHTML = h + '</div>';
    $('insp').querySelectorAll('[data-alt]').forEach((b) => (b.onclick = () => {
      const a = alts[+b.dataset.alt], old = c.name;
      E.replaceChord(song, sel, a.chord); render(); preview(song.flat[sel]); commit(`替换 ${old} → ${song.flat[sel].name}`);
    }));
    $('lockSel').onclick = () => toggleLock(sel);
    $('anaBtn').onclick = () => openAnalysis(sel);
    $('closeInsp').onclick = () => { sel = -1; closeSheets(); document.querySelectorAll('.ch.sel').forEach((el) => el.classList.remove('sel')); renderInsp(); };
    $('prevC').onclick = () => select(sel - 1, true);
    $('nextC').onclick = () => select(sel + 1, true);
  }

  /* ---------- 音频 ---------- */
  let ac = null, master = null, timer = null, raf = null, playing = false, noiseBuf = null, playSec;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function ensureAC() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { toast('此浏览器不支持 Web Audio'); return false; }
      ac = new AC({ latencyHint: 'interactive' });
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state !== 'running') ac.resume();
    // iOS 解锁：在用户手势中播放一个静音缓冲
    const b = ac.createBufferSource(); b.buffer = ac.createBuffer(1, 1, 22050); b.connect(ac.destination); b.start(0);
    return true;
  }
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, function unlock() { if (ensureAC()) document.removeEventListener(ev, unlock); }, { once: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ac && ac.state === 'suspended' && playing) ac.resume(); });
  function newMaster() {
    if (master) { const m = master; try { m.gain.cancelScheduledValues(ac.currentTime); m.gain.setValueAtTime(m.gain.value, ac.currentTime); m.gain.linearRampToValueAtTime(0, ac.currentTime + 0.04); } catch (e) { /* ignore */ } setTimeout(() => m.disconnect(), 120); }
    master = ac.createGain(); master.gain.value = 0.7;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
  }
  function env(g, t, a, peak, d, sus, end, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * sus, t + a, d); g.gain.setTargetAtTime(0.0001, end, rel);
  }
  function osc(type, f, t, stopAt, dest, detune) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stopAt); return o; }
  function tone(midi, t, d, vel, inst) {
    const f = hz(midi), g = ac.createGain(), end = t + Math.max(0.05, d);
    if (inst === 'pad') {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.7; g.connect(lp); lp.connect(master);
      env(g, t, 0.25, 0.05 * vel, 0.6, 0.8, end, 0.35); osc('sawtooth', f, t, end + 1.5, g, -7); osc('sawtooth', f, t, end + 1.5, g, 7);
    } else if (inst === 'epiano') {
      g.connect(master); env(g, t, 0.005, 0.14 * vel, 0.5, 0.25, end, 0.15);
      const mod = ac.createOscillator(), mg = ac.createGain(); mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.6);
      const car = ac.createOscillator(); car.frequency.value = f; mod.connect(mg); mg.connect(car.frequency); car.connect(g); mod.start(t); car.start(t); mod.stop(end + 0.8); car.stop(end + 0.8);
    } else if (inst === 'guitar') {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.4); g.connect(lp); lp.connect(master);
      env(g, t, 0.003, 0.09 * vel, 0.35, 0.15, end, 0.08); osc('sawtooth', f, t, end + 0.5, g); osc('triangle', f * 2, t, end + 0.5, g, 3);
    } else if (inst === 'bass') {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; g.connect(lp); lp.connect(master);
      env(g, t, 0.008, 0.3 * vel, 0.3, 0.6, end, 0.06); osc('triangle', f, t, end + 0.4, g); osc('sine', f, t, end + 0.4, g);
    } else if (inst === 'lead') {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; g.connect(lp); lp.connect(master);
      env(g, t, 0.02, 0.09 * vel, 0.2, 0.7, end, 0.06); osc('square', f, t, end + 0.4, g); const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 5.5; vg.gain.value = 5; v.connect(vg); v.start(t); v.stop(end + 0.4);
    } else if (inst === 'click') {
      g.connect(master); env(g, t, 0.001, 0.25 * vel, 0.02, 0.01, t + 0.03, 0.01); osc('square', f, t, t + 0.08, g);
    } else { // piano
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 1); g.connect(lp); lp.connect(master);
      env(g, t, 0.004, 0.12 * vel, 0.7, 0.2, end, 0.12); osc('triangle', f, t, end + 0.8, g); const g2 = ac.createGain(); g2.gain.value = 0.25; g2.connect(g); osc('sine', f * 2, t, end + 0.8, g2, 2);
    }
  }
  function drum(note, t, vel) {
    const g = ac.createGain(); g.connect(master);
    const noise = (filterType, freq, dur, amp) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = filterType; fl.frequency.value = freq; s.connect(fl); fl.connect(g); g.gain.setValueAtTime(amp * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t); s.stop(t + dur + 0.02); };
    if (note === 36) { const o = ac.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); o.start(t); o.stop(t + 0.4); }
    else if (note === 38) { noise('bandpass', 1800, 0.18, 0.5); const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = 190; og.gain.setValueAtTime(0.3 * vel, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.12); }
    else if (note === 39) noise('bandpass', 1200, 0.15, 0.55);
    else if (note === 37) { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 1700; g.gain.setValueAtTime(0.12 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); o.connect(g); o.start(t); o.stop(t + 0.05); }
    else if (note === 46) noise('highpass', 7000, 0.3, 0.18);
    else if (note === 51) noise('highpass', 5000, 0.4, 0.1);
    else noise('highpass', 8000, 0.05, 0.2);
  }
  /* ---------- GM 采样音源（gleitz/midi-js-soundfonts FluidR3_GM + surikov webaudiofont 鼓组，均为免费资源） ---------- */
  const SF = { base: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/', drumBase: 'https://surikov.github.io/webaudiofontdata/sound/', raw: new Map(), bufs: new Map(), drums: new Map(), offline: false, loading: false };
  window.__SF = SF;
  const SF_NN = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const sfNote = (m) => SF_NN[m % 12] + (Math.floor(m / 12) - 1);
  const b64buf = (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  async function fetchText(url, ms) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 20000);
    try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); } finally { clearTimeout(to); }
  }
  async function loadProg(prog) {
    if (SF.raw.has(prog)) return SF.raw.get(prog);
    const p = fetchText(SF.base + E.GM[prog][0] + '-mp3.js').then((txt) => {
      const map = {}; const re = /"([A-G]b?-?\d)"\s*:\s*"data:audio\/[a-z0-9]+;base64,([^"]+)"/g; let m;
      while ((m = re.exec(txt))) map[m[1]] = m[2];
      if (!Object.keys(map).length) throw new Error('bad soundfont');
      return map;
    });
    SF.raw.set(prog, p);
    p.catch(() => SF.raw.delete(prog));
    return p;
  }
  async function noteBuf(prog, midi) {
    const key = prog * 128 + midi; if (SF.bufs.has(key)) return SF.bufs.get(key);
    const raw = await loadProg(prog), b64 = raw[sfNote(Math.max(21, Math.min(108, midi)))];
    if (!b64) return null;
    const p = ac.decodeAudioData(b64buf(b64)); SF.bufs.set(key, p); return p;
  }
  async function drumBuf(note) {
    if (SF.drums.has(note)) return SF.drums.get(note);
    const p = fetchText(SF.drumBase + '128' + note + '_0_FluidR3_GM_sf2_file.js').then((txt) => { const m = txt.match(/file:'([^']+)'/); if (!m) throw new Error('bad drum'); return ac.decodeAudioData(b64buf(m[1])); });
    SF.drums.set(note, p); p.catch(() => SF.drums.delete(note)); return p;
  }
  // 播放前预加载本曲用到的音符；失败（离线/超时）则回退到内置合成器
  async function prepareGM(ev) {
    const pr = programs(), need = [];
    for (const e of ev.events) {
      const prog = e.part === 'chord' ? pr.chord : e.part === 'bass' ? pr.bass : e.part === 'melody' ? pr.melody : null;
      if (prog !== null) for (const n of e.notes) need.push([prog, Math.round(n)]);
    }
    const uniq = [...new Map(need.map((x) => [x[0] * 128 + x[1], x])).values()];
    const drumNotes = $('drumKit').value === 'gm' ? [...new Set(ev.events.filter((e) => e.part === 'drum').map((e) => e.notes[0]))] : [];
    const ready = uniq.every(([p, n]) => SF.bufs.has(p * 128 + n)) && drumNotes.every((n) => SF.drums.has(n));
    if (!ready) { SF.loading = true; syncSound(); $('play').classList.add('sf-loading'); toast('正在加载 GM 音色…'); }
    try {
      await Promise.all(uniq.map(([p, n]) => noteBuf(p, n)).concat(drumNotes.map((n) => drumBuf(n))));
      SF.offline = false; return true;
    } catch (err) {
      SF.offline = true; toast('GM 音色加载失败（可能离线），已回退到内置合成器', true); return false;
    } finally { SF.loading = false; $('play').classList.remove('sf-loading'); syncSound(); }
  }
  function sample(buf, t, d, vel, sustain) {
    if (!buf) return;
    const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.connect(g); g.connect(master);
    const peak = 0.55 * Math.pow(vel, 1.4), end = t + Math.max(0.06, d);
    g.gain.setValueAtTime(peak, t); g.gain.setValueAtTime(peak, end); g.gain.exponentialRampToValueAtTime(0.0001, end + (sustain ? 0.35 : 0.2));
    src.start(t); src.stop(end + 0.45);
  }
  const bufNow = (map, key) => { const p = map.get(key); return p && p.__v; };
  // 已解码的缓冲同步可取（Promise 完成后记录在 __v 上）
  function settle(map) { for (const p of map.values()) if (!p.__hooked) { p.__hooked = true; p.then((v) => (p.__v = v), () => {}); } }
  const useGM = () => $('inst').value === 'gm' && !SF.offline;
  syncSound();
  function gmTone(prog, midi, t, d, vel) { const b = bufNow(SF.bufs, prog * 128 + Math.round(midi)); if (b) { sample(b, t, d, vel); return true; } return false; }
  function preview(c) {
    if (!ensureAC()) return; if (!playing) newMaster();
    if (useGM()) {
      const pr = programs(), notes = [[pr.bass, c.bassNote]].concat(c.upper.map((n) => [pr.chord, n]));
      const t0 = ac.currentTime + 0.03;
      Promise.all(notes.map(([p, n]) => noteBuf(p, n))).then(() => { settle(SF.bufs); setTimeout(() => notes.forEach(([p, n], i) => gmTone(p, n, Math.max(ac.currentTime + 0.01, t0) + (i ? (i - 1) * 0.012 : 0), 1.3, i ? 0.7 : 0.8)), 0); }).catch(() => { SF.offline = true; syncSound(); preview(c); });
      return;
    }
    const t = ac.currentTime + 0.03, inst = $('inst').value;
    tone(c.bassNote, t, 1.3, 0.8, 'bass');
    c.upper.forEach((n, i) => tone(n, t + (inst === 'guitar' ? i * 0.022 : i * 0.012), 1.3, 0.75, inst));
  }
  let restartTimer = null;
  function restartSoon() { clearTimeout(restartTimer); restartTimer = setTimeout(() => { if (playing) play(playSec); }, 120); }
  let playReq = 0;
  function play(section) {
    if (!song) generate(); if (!song || !ensureAC()) return;
    if (useGM()) {
      const req = ++playReq;
      const ev = E.buildEvents(song, { metronome: toggles.metro, drums: toggles.drums, melody: toggles.melody, pattern: $('pattern').value, section: typeof section === 'number' ? section : undefined });
      $('play').classList.add('playing'); $('playIcon').textContent = '❚❚';
      prepareGM(ev).then(() => { settle(SF.bufs); settle(SF.drums); setTimeout(() => { if (req === playReq) playNow(section); }, 0); });
      return;
    }
    playNow(section);
  }
  function playNow(section) {
    stopAudio(); newMaster(); playing = true; playSec = typeof section === 'number' ? section : undefined;
    $('play').classList.add('playing'); $('playIcon').textContent = '❚❚'; $('play').setAttribute('aria-label', '停止 (空格)'); $('stop').disabled = false;
    const inst = $('inst').value;
    const ev = E.buildEvents(song, { metronome: toggles.metro, drums: toggles.drums, melody: toggles.melody, pattern: $('pattern').value, section: playSec });
    const us = ev.unitSec, total = ev.totalUnits * us;
    const cells = [...$('result').querySelectorAll('.ch')].filter((el) => playSec === undefined || +el.closest('.section') === 0 || true);
    const cellFor = new Map(); cells.forEach((el) => { const k = el.dataset.ci + (el.dataset.cont ? 'c' : ''); if (!cellFor.has(k)) cellFor.set(k, []); cellFor.get(k).push(el); });
    let base = ac.currentTime + 0.1, idx = 0, loopN = 0, strum = 0;
    const startAt = base;
    const schedule = () => {
      const horizon = ac.currentTime + (document.hidden ? 1.5 : 0.4);
      for (;;) {
        if (idx >= ev.events.length) { if (toggles.loop) { base += total; idx = 0; loopN++; continue; } break; }
        const e = ev.events[idx], t = base + e.t * us;
        if (t > horizon) break;
        if (t >= ac.currentTime - 0.02) {
          const gm = useGM(), pr = gm ? programs() : null;
          if (e.part === 'drum') { const b = gm && $('drumKit').value === 'gm' ? bufNow(SF.drums, e.notes[0]) : null; if (b) sample(b, t, 0.6, e.vel * 0.9); else drum(e.notes[0], t, e.vel); }
          else if (e.part === 'chord') { strum++; const dn = strum % 2 === 0 && inst === 'guitar'; const ns = dn ? e.notes.slice().reverse() : e.notes; ns.forEach((n, i) => { if (!(gm && gmTone(pr.chord, n, t + i * 0.008, e.d * us, e.vel * 0.85))) tone(n, t + (inst === 'guitar' ? i * 0.018 : 0), e.d * us, e.vel, inst === 'gm' ? 'piano' : inst); }); }
          else for (const n of e.notes) { const part = e.part; if (gm && part !== 'click' && gmTone(part === 'bass' ? pr.bass : pr.melody, n, t, e.d * us, e.vel)) continue; tone(n, t, e.d * us, e.vel, part === 'bass' ? 'bass' : part === 'melody' ? 'lead' : 'click'); }
        }
        idx++;
      }
      if (!toggles.loop && idx >= ev.events.length && ac.currentTime > base + total + 0.4) stop();
    };
    schedule(); timer = setInterval(schedule, 50);
    let lastCur = -2;
    const tick = () => {
      if (!playing) return;
      let pos = (ac.currentTime - startAt) / us;
      if (pos >= 0) pos = pos % ev.totalUnits;
      $('progFill').style.width = (Math.max(0, pos) / ev.totalUnits * 100).toFixed(2) + '%';
      $('progT').textContent = fmtT(Math.max(0, pos) * us) + ' / ' + fmtT(total);
      let cur = -1;
      for (let k = 0; k < ev.timeline.length; k++) { const x = ev.timeline[k]; if (pos >= x.t && pos < x.t + x.d) { cur = k; break; } }
      if (cur !== lastCur) {
        document.querySelectorAll('.ch.now').forEach((el) => el.classList.remove('now'));
        if (cur >= 0) { const x = ev.timeline[cur]; (cellFor.get(x.ci + (x.cont ? 'c' : '')) || []).forEach((el) => el.classList.add('now')); if (!x.cont) { sel = x.ci; renderInsp(); document.querySelectorAll('.ch.sel').forEach((el) => el.classList.remove('sel')); } }
        lastCur = cur;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stopAudio() { playReq++; playing = false; clearInterval(timer); cancelAnimationFrame(raf); if (ac && master) newMaster(); }
  function stop() {
    stopAudio();
    document.querySelectorAll('.ch.now').forEach((el) => el.classList.remove('now'));
    $('play').classList.remove('playing'); $('playIcon').textContent = '▶'; $('play').setAttribute('aria-label', '播放 (空格)'); $('stop').disabled = true;
    $('progFill').style.width = '0';
  }
  $('play').onclick = () => (playing || $('play').classList.contains('playing') ? stop() : play());
  $('stop').onclick = stop;

  /* ---------- 导出 / 分享 / 收藏 ---------- */
  function toast(t, err) { const el = $('toast'); el.textContent = (err ? '⚠ ' : '✓ ') + t; el.classList.toggle('err', !!err); el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2000); }
  const fileBase = () => { const s = song.settings; return `chords_${s.key}_${s.mode}_${song.bpm}bpm`.replace(/#/g, 's'); };
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  function exportMidi(section) {
    if (!song) return;
    const bytes = E.toMidi(song, midiOpts(section));
    download(new Blob([bytes], { type: 'audio/midi' }), fileBase() + (section !== undefined ? '_' + song.sections[section].name.split(' ')[0] : '') + '.mid');
    toast('MIDI 已导出');
  }
  const midiOpts = (section) => ({ metronome: toggles.metro, drums: toggles.drums, melody: toggles.melody, pattern: $('pattern').value, instrument: $('inst').value, programs: programs(), section, title: song.settings.style + ' · ' + song.settings.key });
  const secSuffix = (section) => (section !== undefined ? '_' + song.sections[section].name.split(' ')[0] : '');
  function exportPart(part, section) {
    if (!song) return;
    const x = E.midiParts(song, midiOpts(section)).find((p) => p.part === part);
    if (!x) { toast('该声部没有音符'); return; }
    download(new Blob([x.bytes], { type: 'audio/midi' }), `${fileBase()}${secSuffix(section)}_${x.file}.mid`);
    toast(x.name + '轨已导出');
  }
  function exportZip(section) {
    if (!song) return;
    const parts = E.midiParts(song, midiOpts(section)), base = fileBase() + secSuffix(section);
    const files = parts.map((x) => ({ name: `${base}_${x.file}.mid`, data: x.bytes }));
    files.push({ name: base + '_全部.mid', data: E.toMidi(song, Object.assign(midiOpts(section), { drums: true, melody: true, metronome: false })) });
    files.push({ name: base + '.txt', data: E.toText(song) });
    download(new Blob([E.makeZip(files)], { type: 'application/zip' }), base + '_分轨.zip');
    toast(`已打包 ${parts.length} 条分轨`);
  }
  document.querySelectorAll('#expPop [data-part]').forEach((b) => (b.onclick = () => exportPart(b.dataset.part)));
  $('zipAll').onclick = () => exportZip();
  const menuBtn = (btn, pop) => ($(btn).onclick = (e) => { e.stopPropagation(); document.querySelectorAll('.menu .pop.open').forEach((x) => x !== $(pop) && x.classList.remove('open')); const o = $(pop).classList.toggle('open'); $(btn).setAttribute('aria-expanded', o); });
  menuBtn('expBtn', 'expPop'); menuBtn('soundBtn', 'soundPop');
  $('expPop').addEventListener('click', () => $('expPop').classList.remove('open'));
  $('midi').onclick = () => exportMidi();
  $('txt').onclick = () => { if (song) download(new Blob([E.toText(song)], { type: 'text/plain;charset=utf-8' }), fileBase() + '.txt'); };
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) { /* ignore */ } ta.remove(); return ok;
    }
  }
  $('copy').onclick = async () => { if (song) toast((await copyText(E.toText(song))) ? '已复制到剪贴板' : '复制失败，请手动选择'); };
  const b64 = { enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))) };
  function shareURL() { const d = E.serialize(song); delete d.ex; delete d.inf; delete d.sp; return location.href.split('#')[0] + '#p=' + b64.enc(JSON.stringify(d)); }
  $('share').onclick = async () => { if (!song) return; const u = shareURL(); history.replaceState(null, '', u); toast((await copyText(u)) ? '分享链接已复制' : '已写入地址栏'); };
  function loadHash() {
    const m = location.hash.match(/#p=([\w-]+)/); if (!m) return false;
    try { const d = JSON.parse(b64.dec(m[1])); d.ex = d.ex || ['（来自分享链接）']; song = E.deserialize(d); sel = -1; afterNew('打开分享链接'); toast('已载入分享的进行'); return true; } catch (e) { toast('分享链接无效：' + e.message); return false; }
  }
  window.addEventListener('hashchange', loadHash);
  function pngExport() {
    if (!song) return;
    const W = 1200, P = 36, cols = 4, bh = 74, gap = 10, cw = (W - P * 2 - gap * (cols - 1)) / cols;
    let H = P + 70; song.sections.forEach((s) => { H += 34 + Math.ceil(s.bars.length / cols) * (bh + gap); }); H += 30;
    const cv = document.createElement('canvas'), dpr = 2; cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const dark = document.documentElement.dataset.theme === 'dark', cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    g.fillStyle = v('--bg'); g.fillRect(0, 0, W, H);
    const font = (w, s) => `${w} ${s}px -apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
    const st = song.settings;
    g.fillStyle = v('--text'); g.font = font(800, 24); g.fillText('和弦进行 · ' + st.genre.split(' ')[0] + ' › ' + st.style, P, P + 18);
    g.fillStyle = v('--muted'); g.font = font(400, 14); g.fillText(`${st.key} ${st.modeName}   ${st.meter}   ${song.bpm} BPM   情绪 ${st.mood}   ${st.complexityName}`, P, P + 44);
    let y = P + 70, no = 1;
    const fc = { T: v('--T'), S: v('--S'), D: v('--D') };
    for (const sec of song.sections) {
      g.fillStyle = v('--text'); g.font = font(700, 16); g.fillText(sec.name + '   ' + sec.keyLabel + (sec.modulated ? '  ⤴ +全音' : ''), P, y + 18); y += 30;
      sec.bars.forEach((bar, bi) => {
        const x = P + (bi % cols) * (cw + gap), yy = y + Math.floor(bi / cols) * (bh + gap);
        g.fillStyle = v('--panel'); g.strokeStyle = v('--line'); g.beginPath(); g.roundRect(x, yy, cw, bh, 10); g.fill(); g.stroke();
        g.fillStyle = v('--faint'); g.font = font(400, 10); g.fillText(String(no++), x + 7, yy + 13);
        const tot = bar.reduce((a, b) => a + b.dur, 0); let cx = x + 4;
        for (const cell of bar) {
          const w = (cw - 8) * cell.dur / tot, c = song.flat[cell.ci];
          g.fillStyle = cell.cont ? v('--line') : fc[c.func] || v('--X'); g.fillRect(cx + 2, yy + 18, w - 4, 3);
          g.textAlign = 'center'; g.fillStyle = v('--text'); g.font = font(700, w < 90 ? 14 : 18); g.fillText(cell.cont ? '%' : c.name, cx + w / 2, yy + 45, w - 6);
          g.fillStyle = v('--muted'); g.font = font(400, 12); if (!cell.cont) g.fillText(c.roman, cx + w / 2, yy + 63, w - 6); g.textAlign = 'left'; cx += w;
        }
      });
      y += Math.ceil(sec.bars.length / cols) * (bh + gap) + 4;
    }
    g.fillStyle = v('--faint'); g.font = font(400, 11); g.fillText('由「和弦进行生成器」生成' + (dark ? '' : ''), P, H - 14);
    cv.toBlob((b) => { download(b, fileBase() + '.png'); toast('PNG 已导出'); });
  }
  $('png').onclick = pngExport;
  let favs = LS.get('cg.favs', []);
  function renderFavs() {
    $('favList').innerHTML = favs.length ? favs.map((f, i) => `<div class="li"><div class="t" data-load="${i}"><div>${esc(f.name)}</div><small>${new Date(f.time).toLocaleString()} · ${esc(f.preview)}</small></div><button class="ib" data-del="${i}" aria-label="删除">🗑</button></div>`).join('') : '<p class="hint">还没有收藏。生成后按 ☆ 或 <kbd>S</kbd> 收藏。</p>';
  }
  function saveFav() {
    if (!song) return; const s = song.settings;
    favs.unshift({ name: `${s.style} · ${s.key} ${s.modeName.split(' ')[0]} · ${s.mood}`, time: Date.now(), preview: song.flat.slice(0, 6).map((c) => c.name).join(' '), data: E.serialize(song) });
    favs = favs.slice(0, 100); LS.set('cg.favs', favs); renderFavs(); toast('已收藏 ★');
  }
  $('save').onclick = saveFav;
  $('favList').onclick = (e) => {
    const d = e.target.closest('[data-del]'), l = e.target.closest('[data-load]');
    if (d) { favs.splice(+d.dataset.del, 1); LS.set('cg.favs', favs); renderFavs(); }
    else if (l) { try { stop(); song = E.deserialize(favs[+l.dataset.load].data); sel = -1; afterNew('打开收藏'); closeDrawers(); } catch (er) { toast('收藏数据损坏'); } }
  };
  renderFavs();
  const drawers = { favBtn: 'favDrawer', histBtn: 'histDrawer', help: 'helpDrawer' };
  function closeDrawers() { document.querySelectorAll('.drawer.open,.panel.open').forEach((d) => d.classList.remove('open')); $('scrim').classList.remove('open'); }
  function closeSheets() { closeDrawers(); }
  function openSheetEl(id) { closeDrawers(); $(id).classList.add('open'); $('scrim').classList.add('open'); }
  $('openCtrl').onclick = () => openSheetEl('ctrl');
  document.querySelectorAll('[data-close-ctrl]').forEach((b) => (b.onclick = closeDrawers));
  $('genM').onclick = () => { closeDrawers(); generate(); };
  function openDrawer(id) { closeDrawers(); $(id).classList.add('open'); $('scrim').classList.add('open'); }
  Object.entries(drawers).forEach(([b, d]) => ($(b).onclick = () => openDrawer(d)));
  $('scrim').onclick = closeDrawers;
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeDrawers));


  /* ---------- 分析该和弦 ---------- */
  let anaCi = -1, anaMode = 'replace';
  const pct = (p) => (p >= 0.1 ? (p * 100).toFixed(0) : (p * 100).toFixed(1)) + '%';
  function openAnalysis(ci) { anaCi = ci; renderAnalysis(); openDrawer('anaDrawer'); }
  function renderAnalysis() {
    if (!song || anaCi < 0 || anaCi >= song.flat.length) return;
    const a = E.analyzeChord(song, anaCi), nx = a.next, nextName = song.flat[anaCi + 1] ? song.flat[anaCi + 1].name : '';
    const max = Math.max(...nx.all.map((x) => x.p));
    let h = `<div class="anaHead"><div class="cbig">${esc(a.name)}</div><div><div class="sub">${esc(a.roman)} · ${esc(nx.key)}</div><span class="badge ${a.func}">${esc(a.funcCn)}</span>${a.tag ? `<span class="badge x">${esc(a.tag)}</span>` : ''}<span class="badge">${esc(a.quality)}</span></div></div>
      <table class="anaT"><tr><th>音名</th>${a.notes.map((n) => `<td><b>${esc(n.name)}</b></td>`).join('')}</tr><tr><th>级数</th>${a.notes.map((n) => `<td>${esc(n.deg)}</td>`).join('')}</tr><tr><th>音程</th>${a.notes.map((n) => `<td>${esc(n.ivName)}</td>`).join('')}</tr></table>
      <div class="hint" style="margin:6px 0">公式：${esc(a.formula)}</div>
      <h3>在其他调中的解释</h3><div class="interp">${a.interp.map((x) => `<span class="ip${x.same ? ' cur' : ''}"><b>${esc(x.key)}</b> ${esc(x.roman)} <small>${esc(x.func)}</small></span>`).join('') || '<span class="hint">—</span>'}</div>
      <h3>下一个和弦 <span class="hint" style="margin:0">全部通过乐理校验 · 概率按语料统计</span></h3>
      <div class="seg" role="radiogroup" aria-label="操作"><button data-am="replace" aria-pressed="${anaMode === 'replace'}">${nextName ? '替换下一个（' + esc(nextName) + '）' : '追加'}</button><button data-am="insert" aria-pressed="${anaMode === 'insert'}">插入到后面</button></div>`;
    nx.groups.forEach((g, gi) => {
      h += `<div class="ng"><div class="ngh">${esc(g.cat)} <small>${g.items.length}</small></div>`;
      h += g.items.map((x, i) => `<div class="nc" data-g="${gi}" data-i="${i}"><button class="ib np" data-play aria-label="试听 ${esc(a.name)} → ${esc(x.name)}">▶</button><div class="nm"><b>${esc(x.name)}</b> <small>${esc(x.roman)}</small><div class="why">${esc(x.why)}${x.need ? ' <em>' + esc(x.need) + '</em>' : ''}</div></div><div class="pb" title="语料概率"><i style="width:${Math.max(4, (x.p / max) * 100).toFixed(0)}%"></i><span>${pct(x.p)}</span></div><button class="btn sm" data-use>${anaMode === 'insert' ? '插入' : '使用'}</button></div>`).join('');
      h += '</div>';
    });
    $('anaBody').innerHTML = h;
    $('anaBody').querySelectorAll('[data-am]').forEach((b) => (b.onclick = () => { anaMode = b.dataset.am; renderAnalysis(); }));
    $('anaBody').querySelectorAll('.nc').forEach((row) => {
      const x = nx.groups[+row.dataset.g].items[+row.dataset.i];
      row.querySelector('[data-play]').onclick = () => { const [p, q] = E.previewPair(song, anaCi, x.chord); preview(p); setTimeout(() => preview(q), 750); };
      row.querySelector('[data-use]').onclick = () => {
        const old = nextName; E.setNext(song, anaCi, x.chord, anaMode); render(); commit((anaMode === 'insert' || !old ? '插入 ' : `替换 ${old} → `) + song.flat[anaCi + 1].name);
        preview(song.flat[anaCi + 1]); renderAnalysis(); toast('已' + (anaMode === 'insert' ? '插入 ' : '设为下一个：') + song.flat[anaCi + 1].name);
      };
    });
  }

  /* ---------- 和弦图鉴 ---------- */
  const dictState = { root: '', family: '', q: '', notes: new Set(), cur: null, inv: 0 };
  function openDict() { $('dictPage').classList.remove('show-entry'); $('dictPage').classList.add('open'); document.body.classList.add('dict-open'); renderDictFilters(); renderDict(); }
  function closeDict() { $('dictPage').classList.remove('open', 'show-entry'); document.body.classList.remove('dict-open'); }
  function renderDictFilters() {
    if ($('dRoot').options.length) return;
    $('dRoot').innerHTML = '<option value="">全部根音</option>' + E.ROOTS.map((r, i) => `<option value="${i}">${r[0]}</option>`).join('');
    $('dFam').innerHTML = '<option value="">全部类型</option>' + E.DICT_FAMILIES.map((f) => `<option>${f}</option>`).join('');
    $('dNotes').innerHTML = E.ROOTS.map((r, i) => `<button class="nk${[1, 3, 6, 8, 10].includes(i) ? ' blk' : ''}" data-pc="${i}" aria-pressed="false">${r[0]}</button>`).join('');
    $('dRoot').onchange = () => { dictState.root = $('dRoot').value; renderDict(); };
    $('dFam').onchange = () => { dictState.family = $('dFam').value; renderDict(); };
    $('dQ').oninput = () => { dictState.q = $('dQ').value; renderDict(); };
    $('dNotes').onclick = (e) => { const b = e.target.closest('[data-pc]'); if (!b) return; const pc = +b.dataset.pc; dictState.notes.has(pc) ? dictState.notes.delete(pc) : dictState.notes.add(pc); b.setAttribute('aria-pressed', dictState.notes.has(pc)); renderDict(); };
    $('dClear').onclick = () => { dictState.notes.clear(); $('dNotes').querySelectorAll('[data-pc]').forEach((b) => b.setAttribute('aria-pressed', 'false')); renderDict(); };
  }
  function renderDict() {
    let list;
    if (dictState.notes.size) {
      list = E.identifyChord([...dictState.notes]).map((x) => Object.assign(x, { family: x.exact ? '完全匹配' : '包含所选音' }));
      $('dCount').textContent = `反查：${list.filter((x) => x.exact).length} 个完全匹配`;
    } else {
      list = E.chordDict({ root: dictState.root, family: dictState.family, query: dictState.q });
      $('dCount').textContent = `${list.length} 个和弦`;
    }
    $('dList').innerHTML = list.length ? list.slice(0, 300).map((x, i) => `<button class="dItem${dictState.cur && dictState.cur.rootIdx === x.rootIdx && dictState.cur.id === x.id ? ' sel' : ''}" data-di="${i}"><b>${esc(x.name)}</b><small>${esc(x.cn)}</small></button>`).join('') : '<div class="empty">没有匹配的和弦</div>';
    $('dList').querySelectorAll('[data-di]').forEach((b) => (b.onclick = () => { const x = list[+b.dataset.di]; dictState.cur = x; dictState.inv = x.inv || 0; renderDictEntry(true); $('dList').querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); b.classList.add('sel'); }));
    if (!dictState.cur && list.length) { dictState.cur = list[0]; dictState.inv = 0; }
    renderDictEntry(false);
  }
  function renderDictEntry(play) {
    const x = dictState.cur; if (!x) { $('dEntry').innerHTML = ''; return; }
    const e = E.dictEntry(x.rootIdx, x.id, dictState.inv);
    $('dEntry').innerHTML = `<div class="anaHead"><div class="cbig">${esc(e.name)}</div><div><div class="sub">${esc(e.cn)}</div><span class="badge">${esc(e.family)}</span></div><button class="btn" id="dPlay">▶ 试听</button><button class="ib only-m" id="dBack" aria-label="返回列表">✕</button></div>
      <table class="anaT"><tr><th>拼写</th>${e.notes.map((n) => `<td><b>${esc(n.name)}</b></td>`).join('')}</tr><tr><th>公式</th>${e.notes.map((n) => `<td>${esc(n.deg)}</td>`).join('')}</tr><tr><th>音程</th>${e.notes.map((n) => `<td>${esc(n.ivName)}</td>`).join('')}</tr></table>
      <div class="hint">公式：${esc(e.formula)}　常见风格：${e.styles.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div>
      <div class="interp">转位 / 斜线：<button class="ip${dictState.inv ? '' : ' cur'}" data-inv="0">${esc(e.root + e.sym)}</button>${e.inversions.map((v) => `<button class="ip${dictState.inv === v.inv ? ' cur' : ''}" data-inv="${v.inv}">${esc(v.name)}</button>`).join('')}</div>
      <div class="viz">${pianoSVG(e)}</div>
      <div class="gvs">${e.guitar.length ? e.guitar.map((g) => `<div class="gv">${fretSVG(g, e.name)}<small>${esc(g.label)} · ${g.frets.map((f) => (f < 0 ? 'x' : f)).join(f10(g) ? '-' : '')}</small></div>`).join('') : '<p class="hint">无合适的吉他指法</p>'}</div>`;
    $('dPlay').onclick = () => preview(e);
    $('dBack').onclick = () => $('dictPage').classList.remove('show-entry');
    $('dEntry').querySelectorAll('[data-inv]').forEach((b) => (b.onclick = () => { dictState.inv = +b.dataset.inv; renderDictEntry(true); }));
    if (play) { $('dictPage').classList.add('show-entry'); preview(e); }
  }
  const f10 = (g) => g.frets.some((f) => f >= 10);
  $('dictBtn').onclick = openDict;
  $('dictClose').onclick = closeDict;
  /* ---------- 快捷键 ---------- */
  document.addEventListener('keydown', (e) => {
    const tg = e.target, typing = /INPUT|SELECT|TEXTAREA/.test(tg.tagName) && tg.type !== 'range';
    if (e.key === 'Escape') { closeDict(); closeDrawers(); $('pickPop').classList.remove('open'); document.querySelectorAll('.menu .pop.open').forEach((x) => x.classList.remove('open')); return; }
    if (typing) { if (e.key === 'Enter' && tg.id === 'seeds') generate(); return; }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? restore(hp + 1) : restore(hp - 1); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); restore(hp + 1); return; }
    if (mod || e.altKey) return;
    const k = e.key;
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); }
    else if (k === 'Enter' && !tg.closest('.ch')) { if (tg.tagName !== 'BUTTON') generate(); }
    else if (k === 'r' || k === 'R') regen();
    else if (k === 'a' || k === 'A') $('allRand').click();
    else if (k === 'ArrowRight') { e.preventDefault(); select(sel + 1, true); }
    else if (k === 'ArrowLeft') { e.preventDefault(); select(Math.max(0, sel - 1), true); }
    else if ((k === 'l' || k === 'L') && sel >= 0) toggleLock(sel);
    else if (k === '+' || k === '=') stepBpm(2);
    else if (k === '-') stepBpm(-2);
    else if (k === ']') transpose(1);
    else if (k === '[') transpose(-1);
    else if (k === 'm' || k === 'M') $('metro').click();
    else if (k === 'd' || k === 'D') $('drums').click();
    else if (k === 's' || k === 'S') saveFav();
    else if (k === 't' || k === 'T') $('theme').click();
    else if (k === 'h' || k === 'H') openDrawer('histDrawer');
    else if (k === 'f' || k === 'F') openDrawer('favDrawer');
    else if (k === '?') openDrawer('helpDrawer');
  });

  if (!loadHash()) generate();
  window.__cg = { get song() { return song; }, E };
})();
