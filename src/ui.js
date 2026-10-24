(function () {
  'use strict';
  const E = window.ChordEngine;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c]));
  const RAND = '<option value="rand">随机</option>';
  const ic = (n, c) => `<svg class="ic${c ? ' ' + c : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存储已满或被禁用 */ } } };
  let mode = 'rand', song = null, sel = -1;
  const state = { genre: 'rand', style: 'rand' };

  /* ---------- 主题 ---------- */
  const sysLight = matchMedia('(prefers-color-scheme: light)');
  let themePref = LS.get('cg.theme', 'system');
  function applyTheme() {
    const p = themePref, classic = p.startsWith('classic'), base = classic ? p.slice(8) : p;
    const t = base === 'light' || base === 'dark' ? base : sysLight.matches ? 'light' : 'dark';
    const h = document.documentElement; h.dataset.theme = t; h.dataset.skin = classic ? 'classic' : 'modern';
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(h).getPropertyValue('--surface').trim() || (t === 'dark' ? '#111216' : '#FFFFFF');
    document.querySelectorAll('[data-theme-opt]').forEach((b) => b.setAttribute('aria-checked', b.dataset.themeOpt === p));
  }
  const setThemePref = (p) => { themePref = p; LS.set('cg.theme', p); applyTheme(); };
  const setTheme = (t) => setThemePref((document.documentElement.dataset.skin === 'classic' ? 'classic-' : '') + t);
  sysLight.addEventListener('change', applyTheme); applyTheme();
  document.querySelectorAll('[data-theme-opt]').forEach((b) => (b.onclick = () => setThemePref(b.dataset.themeOpt)));
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
    马尔可夫链: '马尔可夫链：按“当前功能 → 下一功能”的概率表逐个选择和弦。', 五声音阶: '五声音阶：宫商角征羽五个音，中国传统音乐的基础。',
  };
  const termify = (html) => html.replace(new RegExp(Object.keys(GLOSS).join('|'), 'g'), (m) => `<span class="term" data-tip="${esc(GLOSS[m])}">${m}</span>`);
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.classList.remove('on'); tip.style.left = '0px'; tip.style.top = '0px'; return; }
    tip.textContent = t.dataset.tip; tip.classList.add('on');
    const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
    if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  document.addEventListener('scroll', () => (tip.classList.remove('on'), tip.style.left = '0px'), true);

  /* ---------- 控件 ---------- */
  $('mood').innerHTML = RAND + Object.entries(E.MOODS).map(([k, v]) => `<option value="${k}" title="${esc(v.d)}">${k}</option>`).join('');
  $('meter').innerHTML = RAND + Object.keys(E.METERS).map((m) => `<option>${m}</option>`).join('');
  const SH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function fillKeyMode() {
    const first = mode === 'seed' ? '<option value="auto">自动推断</option>' : RAND;
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
  $('inst').onchange = () => { LS.set('cg.inst', $('inst').value); syncSound(); if ($('inst').value === 'gm') preloadPrograms(); };
  // GM 音色选择器：128 个标准 + 扩展音色
  let gmOpts = E.GM_FAMILIES.map((f, fi) => `<optgroup label="${fi + 1}. ${f}">` + E.GM.slice(fi * 8, fi * 8 + 8).map(([, cn], k) => `<option value="${fi * 8 + k}">${fi * 8 + k + 1} ${cn}</option>`).join('') + '</optgroup>').join('');
  if (E.GM.length > 128) {
    const extras = E.GM.slice(128);
    gmOpts += `<optgroup label="扩展音色">` + extras.map(([, cn], k) => `<option value="${128 + k}">${128 + k + 1} ${cn}</option>`).join('') + '</optgroup>';
  }
  const PROG_IDS = { chord: 'progChord', bass: 'progBass', melody: 'progMelody' };
  for (const [part, id] of Object.entries(PROG_IDS)) {
    $(id).innerHTML = gmOpts;
    $(id).onchange = () => { LS.set('cg.progUser', true); LS.set('cg.prog', programs()); syncSound(); preloadPrograms(); if (!playing && part === 'chord' && sel >= 0 && song) preview(song.flat[sel]); };
  }
  $('drumKit').value = LS.get('cg.drumKit', 'gm');
  $('drumKit').onchange = () => { LS.set('cg.drumKit', $('drumKit').value); syncSound(); preloadPrograms(); };
  function programs() { return { chord: +$('progChord').value, bass: +$('progBass').value, melody: +$('progMelody').value }; }
  function setPrograms(pr) { for (const [part, id] of Object.entries(PROG_IDS)) if (pr && pr[part] !== undefined) $(id).value = pr[part]; }
  setPrograms(Object.assign({ chord: 0, bass: 33, melody: 73 }, LS.get('cg.prog', null) || {}));
  $('progDefault').onclick = () => { if (!song) return; setPrograms(E.defaultPrograms(song.style)); LS.set('cg.progUser', false); LS.set('cg.prog', programs()); syncSound(); toast('已按风格推荐音色'); preloadPrograms(); };
  function syncSound() {
    const gm = $('inst').value === 'gm';
    document.querySelectorAll('.gmsel').forEach((x) => (x.disabled = false));
    $('sfStatus').textContent = !gm ? '内置合成器' : SF.loading ? '加载中…' : SF.offline ? '部分音色加载失败，使用混合' : 'GM 就绪';
  }
  $('pattern').onchange = () => { if (playing) restartSoon(); };

  /* ---------- 风格选择器 ---------- */
  const genres = [...new Set(E.STYLES.map((s) => s.genre))];
  function pickLabel() {
    if (state.style !== 'rand') { const s = E.STYLES[+state.style]; return s.genre.split(' ')[0] + ' › ' + s.name; }
    return state.genre === 'rand' ? '全部随机' : state.genre + '（大类内随机）';
  }
  function hl(text, q) { // 高亮：忽略大小写/空格/连字符匹配查询
    const t = String(text); if (!q) return esc(t);
    const nq = E.nrm(q); if (!nq) return esc(t);
    const map = []; let norm = '';
    for (let i = 0; i < t.length; i++) { const n = E.nrm(t[i]); for (const ch of n) { norm += ch; map.push(i); } }
    const k = norm.indexOf(nq); if (k < 0) return esc(t);
    const a = map[k], b = map[k + nq.length - 1] + 1;
    return esc(t.slice(0, a)) + '<mark>' + esc(t.slice(a, b)) + '</mark>' + esc(t.slice(b));
  }
  function renderPick() {
    const q = $('pickSearch').value.trim();
    let h = q ? '' : `<div class="it${state.genre === 'rand' && state.style === 'rand' ? ' sel' : ''}" data-g="rand" data-s="rand">${ic('dice')}全部随机</div>`;
    if (q) {
      const res = E.searchStyles(q);
      if (!res.length) h += `<div class="empty" style="padding:12px">没有找到「${esc(q)}」。试试：lofi、edm、kpop、古风、爵士、说唱</div>`;
      const byG = new Map(); res.forEach((r) => { const st = E.STYLES[r.id]; if (!byG.has(st.genre)) byG.set(st.genre, []); byG.get(st.genre).push(r); });
      for (const [g, items] of byG) {
        h += `<div class="gh" data-g="${esc(g)}" data-s="rand" title="此大类内随机"><span>${hl(g, q)}</span><span class="gh-r">${ic('dice')}</span></div>`;
        h += items.map((r) => { const s = E.STYLES[r.id]; const viaShown = r.via && E.nrm(s.name).indexOf(E.nrm(q)) < 0 && r.via !== s.genre; return `<div class="it${String(s.id) === String(state.style) ? ' sel' : ''}" role="option" data-g="${esc(g)}" data-s="${s.id}">${hl(s.name, q)}${viaShown ? ` <small class="via">≈ ${hl(r.via, q)}</small>` : ''}</div>`; }).join('');
      }
    } else for (const g of genres) {
      const items = E.STYLES.filter((s) => s.genre === g);
      h += `<div class="gh" data-g="${esc(g)}" data-s="rand" title="此大类内随机"><span>${esc(g)}</span><span class="gh-r">${ic('dice')}</span></div>`;
      h += items.map((s) => `<div class="it${String(s.id) === String(state.style) ? ' sel' : ''}" role="option" data-g="${esc(g)}" data-s="${s.id}">${esc(s.name)}</div>`).join('');
    }
    $('pickList').innerHTML = h;
    $('pickLabel').textContent = pickLabel();
  }
  function chooseStyle(id) { const st = E.STYLES[id]; state.genre = st.genre; state.style = String(id); bpmRand = true; syncBpm(); renderPick(); }
  $('pickBtn').onclick = (e) => { e.stopPropagation(); $('pickPop').classList.toggle('open'); renderPick(); $('pickSearch').focus(); };
  $('pickSearch').oninput = renderPick;
  $('pickSearch').onkeydown = (e) => { if (e.key === 'Enter') { const f = $('pickList').querySelector('.it[data-s]:not([data-s=rand])'); if (f) f.click(); } };
  $('pickList').onclick = (e) => { const t = e.target.closest('[data-g]'); if (!t) return; state.genre = t.dataset.g; state.style = t.dataset.s; bpmRand = true; syncBpm(); $('pickPop').classList.remove('open'); renderPick(); }; // 换风格时速度回到该风格的典型范围
  document.addEventListener('click', (e) => { if (!e.target.closest('#picker')) $('pickPop').classList.remove('open'); document.querySelectorAll('.menu').forEach((m) => { if (!m.contains(e.target)) { const pp = m.querySelector('.pop'); pp.classList.remove('open'); m.querySelector('button').setAttribute('aria-expanded', 'false'); } }); });
  renderPick();

  /* ---------- 导航 ---------- */
  const NAV = ['tabRand', 'tabSeed', 'dictBtn', 'favBtn'];
  function setNav(id) { NAV.forEach((n) => { const on = n === id; $(n).setAttribute('aria-selected', on); if (on) $(n).setAttribute('aria-current', 'page'); else $(n).removeAttribute('aria-current'); }); }
  const modeNav = () => (mode === 'seed' ? 'tabSeed' : 'tabRand');
  /* ---------- 模式 ---------- */
  function setMode(m) {
    mode = m;
    closeDict(true); setNav(m === 'seed' ? 'tabSeed' : 'tabRand');
    $('ctrlTitle').textContent = m === 'seed' ? '歌曲扩展' : '生成参数';
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
    const o = { genre: state.genre, style: state.style, mood: $('mood').value, meter: $('meter').value, key: $('key').value, mode: $('mode').value, bars: $('bars').value, complexity: $('complexity').value, hr: $('hr').value, pattern: $('pattern').value, bpm: bpmRand ? 'rand' : +$('bpm').value };
    return o;
  }
  function generate() {
    stop();
    const o = opts();
    if (mode === 'seed') {
      const p = E.parseSeeds($('seeds').value);
      if (!p.chords.length) { toast('请输入至少一个种子和弦', true); return; }
      song = E.expand(p.chords, o);
    } else song = E.generate(o);
    if (!LS.get('cg.progUser', false)) { setPrograms(E.defaultPrograms(song.style)); LS.set('cg.prog', programs()); }
    sel = 0; hist = []; hp = -1; commit('生成');
    render(); syncSound(); preloadPrograms();
  }
  $('gen').onclick = generate;
  $('allRand').onclick = () => {
    ['mood', 'meter', 'key', 'mode', 'bars', 'complexity', 'hr'].forEach((id) => ($(id).value = 'rand'));
    state.genre = 'rand'; state.style = 'rand'; bpmRand = true; syncBpm(); renderPick();
    generate();
  };

  /* ---------- 渲染 ---------- */
  function render() {
    if (!song) return;
    $('out').innerHTML = song.sections.map((sec, si) => {
      const chords = song.flat.filter((c) => c.section === si);
      return `<div class="sec"><div class="sec-h"><b>${esc(sec.name)}</b><small>${sec.bars} 小节</small></div>` + chords.map((c) => cell(c)).join('') + '</div>';
    }).join('');
    renderTags(); renderInsp(); syncHist();
    // 更新 URL hash 以分享
    const ser = E.serialize(song);
    history.replaceState(null, '', '#' + btoa(unescape(encodeURIComponent(JSON.stringify(ser)))));
  }
  function cell(c) {
    const locked = c.locked ? ' locked' : '';
    return `<div class="ch${locked}" data-i="${c.i}" tabindex="0" role="button" aria-label="${esc(c.name)}"><div class="ch-n">${esc(c.name)}</div><div class="ch-r">${esc(c.rn)}</div><div class="ch-f" style="color:var(--${c.func})">${c.func}</div>${c.locked ? '<div class="lock">🔒</div>' : '<div class="lock">🔓</div>'}</div>`;
  }
  function renderTags() {
    if (!song) return;
    const tags = [];
    tags.push(`<span class="tag">${song.keyName}</span>`);
    tags.push(`<span class="tag">${song.modeName}</span>`);
    tags.push(`<span class="tag">${song.meter}</span>`);
    tags.push(`<span class="tag">${song.bpm} BPM</span>`);
    if (song.style) tags.push(`<span class="tag">${esc(song.style.name)}</span>`);
    $('tags').innerHTML = tags.join('');
  }
  function renderInsp() {
    if (sel < 0 || !song) { $('insp').innerHTML = '<p class="hint">点击和弦查看详情与替换</p>'; return; }
    const c = song.flat[sel];
    const alts = E.alternatives(song, sel);
    let h = `<h3>${esc(c.name)} <small>${esc(c.rn)}</small></h3><p class="hint">${esc(c.funcCN)} · ${c.locked ? '已锁定' : '可替换'}</p>`;
    h += '<div class="alts">' + alts.map((a) => `<button class="alt" data-alt="${esc(JSON.stringify(a))}" data-tip="${esc(a.tip)}">${esc(a.name)} <small>${esc(a.rn)}</small></button>`).join('') + '</div>';
    h += `<div class="row" style="margin-top:12px"><button id="lockBtn" class="btn sm">${c.locked ? '解锁' : '锁定'}</button><button id="prevBtn" class="btn sm">试听</button></div>`;
    $('insp').innerHTML = h;
    $('lockBtn').onclick = () => toggleLock(sel);
    $('prevBtn').onclick = () => preview(c);
    $('insp').querySelectorAll('.alt').forEach((b) => (b.onclick = () => { const a = JSON.parse(b.dataset.alt); E.replaceChord(song, sel, a); commit('替换 ' + a.name); render(); preview(song.flat[sel]); }));
  }
  function select(i, scroll) {
    sel = i;
    document.querySelectorAll('.ch.sel').forEach((el) => el.classList.remove('sel'));
    const el = document.querySelector(`.ch[data-i="${i}"]`); if (el) { el.classList.add('sel'); if (scroll) el.scrollIntoView({ block: 'nearest' }); }
    renderInsp();
  }
  $('out').onclick = (e) => { const t = e.target.closest('.ch'); if (!t) return; const i = +t.dataset.i; select(i); if (e.target.closest('.lock')) toggleLock(i); else preview(song.flat[i]); };
  function toggleLock(i) {
    E.toggleLock(song, i); commit(song.flat[i].locked ? '锁定' : '解锁'); render();
  }
  function regen() {
    if (!song) return;
    E.regenerate(song, opts()); commit('重新生成未锁定'); render();
  }
  $('regen').onclick = regen;

  /* ---------- 音频 ---------- */
  let ac, master, playing = false, playSec, timer, raf, startAt;
  function ensureAC() { if (!ac) { ac = new AudioContext(); master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; }
  function newMaster() { if (master) master.disconnect(); master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination); }
  function tone(midi, t, d, vel, type) {
    // 内置合成器回退
    const o = ac.createOscillator(), g = ac.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    o.type = type === 'bass' ? 'sawtooth' : type === 'lead' ? 'square' : 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * vel, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.1);
  }
  function drum(note, t, vel) {
    // 简单合成鼓
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(note === 36 ? 60 : note === 38 ? 180 : 400, t);
    g.gain.setValueAtTime(0.4 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
  }
  function noise(filter, freq, q, d) { /* 简单噪声，省略 */ }

  /* ---------- GM 采样音源（gleitz/midi-js-soundfonts FluidR3_GM + surikov webaudiofont 鼓组，均为免费资源） ---------- */
  // 改进：更长超时+重试、IndexedDB 持久缓存、切换时不重启播放（实时切换）、预加载常用音色、失败不永久离线
  const SF = { base: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/', drumBase: 'https://surikov.github.io/webaudiofontdata/sound/', raw: new Map(), bufs: new Map(), drums: new Map(), offline: false, loading: false, cache: null };
  window.__SF = SF;
  const SF_NN = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const sfNote = (m) => SF_NN[m % 12] + (Math.floor(m / 12) - 1);
  const b64buf = (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };

  // IndexedDB 缓存原始 map，加快二次加载与离线
  function openCache() {
    if (SF.cache) return SF.cache;
    SF.cache = new Promise((res) => {
      const req = indexedDB.open('cg-sf', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('raw');
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });
    return SF.cache;
  }
  async function cacheGet(key) {
    const db = await openCache(); if (!db) return null;
    return new Promise((res) => { const tx = db.transaction('raw', 'readonly'); const r = tx.objectStore('raw').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  }
  async function cachePut(key, val) {
    const db = await openCache(); if (!db) return;
    const tx = db.transaction('raw', 'readwrite'); tx.objectStore('raw').put(val, key);
  }

  async function fetchText(url, ms) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 45000);
    try { const r = await fetch(url, { signal: ctl.signal, cache: 'force-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); } finally { clearTimeout(to); }
  }
  async function fetchWithRetry(url, ms) {
    for (let i = 0; i < 3; i++) {
      try { return await fetchText(url, ms); } catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
    }
  }

  async function loadProg(prog) {
    if (SF.raw.has(prog)) return SF.raw.get(prog);
    const key = 'prog:' + prog;
    const cached = await cacheGet(key);
    if (cached) { SF.raw.set(prog, Promise.resolve(cached)); return cached; }
    const p = fetchWithRetry(SF.base + E.GM[prog][0] + '-mp3.js').then(async (txt) => {
      const map = {}; const re = /"([A-G]b?-\d)"\s*:\s*"data:audio\/[a-z0-9]+;base64,([^"]+)"/g; let m;
      while ((m = re.exec(txt))) map[m[1]] = m[2];
      if (!Object.keys(map).length) throw new Error('bad soundfont');
      cachePut(key, map);
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
    const key = 'drum:' + note;
    const cached = await cacheGet(key);
    if (cached) { const p = ac.decodeAudioData(b64buf(cached)); SF.drums.set(note, p); return p; }
    const p = fetchWithRetry(SF.drumBase + '128' + note + '_0_FluidR3_GM_sf2_file.js').then(async (txt) => {
      const m = txt.match(/file:'([^']+)'/); if (!m) throw new Error('bad drum');
      cachePut(key, m[1]);
      return ac.decodeAudioData(b64buf(m[1]));
    });
    SF.drums.set(note, p); p.catch(() => SF.drums.delete(note)); return p;
  }
  // 播放前预加载本曲用到的音符；失败则临时回退，不永久标记离线
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
      toast('部分 GM 音色加载较慢或失败，将临时使用内置合成器', true);
      return false;
    } finally { SF.loading = false; $('play').classList.remove('sf-loading'); syncSound(); }
  }
  // 后台预加载当前选择的音色（切换时调用，不中断播放）
  function preloadPrograms() {
    if ($('inst').value !== 'gm') return;
    const pr = programs();
    const progs = [pr.chord, pr.bass, pr.melody];
    // 预加载中音区常用音符，保证切换后立即可用
    const notes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
    progs.forEach((p) => notes.forEach((n) => noteBuf(p, n).catch(() => {})));
    if ($('drumKit').value === 'gm') [35, 36, 38, 40, 42, 46, 49, 51].forEach((n) => drumBuf(n).catch(() => {}));
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
      Promise.all(notes.map(([p, n]) => noteBuf(p, n))).then(() => { settle(SF.bufs); setTimeout(() => notes.forEach(([p, n], i) => gmTone(p, n, Math.max(ac.currentTime + 0.01, t0) + (i ? (i - 1) * 0.012 : 0), 1.3, i ? 0.7 : 0.8)), 0); }).catch(() => { toast('音色加载失败，使用合成器', true); const t = ac.currentTime + 0.03; tone(c.bassNote, t, 1.3, 0.8, 'bass'); c.upper.forEach((n, i) => tone(n, t + i * 0.012, 1.3, 0.75, 'piano')); });
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
      $('play').classList.add('playing'); $('playIcon').dataset.s = 'pause';
      prepareGM(ev).then(() => { settle(SF.bufs); settle(SF.drums); setTimeout(() => { if (req === playReq) playNow(section); }, 0); });
      return;
    }
    playNow(section);
  }
  function playNow(section) {
    stopAudio(); newMaster(); playing = true; playSec = typeof section === 'number' ? section : undefined;
    $('play').classList.add('playing'); $('playIcon').dataset.s = 'pause'; $('play').setAttribute('aria-label', '停止 (空格)'); $('stop').disabled = false;
    const inst = $('inst').value;
    const ev = E.buildEvents(song, { metronome: toggles.metro, drums: toggles.drums, melody: toggles.melody, pattern: $('pattern').value, section: playSec });
    const us = ev.unitSec, total = ev.totalUnits * us;
    startAt = ac.currentTime + 0.1;
    let idx = 0, base = startAt, loopN = 0;
    const schedule = () => {
      const horizon = ac.currentTime + (document.hidden ? 1.5 : 0.4);
      for (;;) {
        if (idx >= ev.events.length) { if (toggles.loop) { base += total; idx = 0; loopN++; continue; } break; }
        const e = ev.events[idx], t = base + e.t * us;
        if (t > horizon) break;
        if (t >= ac.currentTime - 0.02) {
          const gm = useGM(), pr = gm ? programs() : null;
          if (e.part === 'drum') { const b = gm && $('drumKit').value === 'gm' ? bufNow(SF.drums, e.notes[0]) : null; if (b) sample(b, t, 0.6, e.vel * 0.9); else drum(e.notes[0], t, e.vel); }
          else if (e.part === 'chord') { const ns = e.notes; ns.forEach((n, i) => { if (!(gm && gmTone(pr.chord, n, t + i * 0.008, e.d * us, e.vel * 0.85))) tone(n, t, e.d * us, e.vel, inst === 'gm' ? 'piano' : inst); }); }
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
    $('play').classList.remove('playing'); $('playIcon').dataset.s = 'play'; $('play').setAttribute('aria-label', '播放 (空格)'); $('stop').disabled = true;
    document.querySelectorAll('.ch.now').forEach((el) => el.classList.remove('now'));
    $('progFill').style.width = '0%';
  }
  $('play').onclick = () => playing ? stop() : play();
  $('stop').onclick = stop;
  function fmtT(sec) { const s = Math.max(0, sec); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }

  /* ---------- 其他 ---------- */
  function toast(msg, err) {
    const t = $('toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 2200);
  }
  function loadHash() {
    const h = location.hash.slice(1);
    if (!h) return false;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(h))));
      song = E.deserialize(data); sel = 0; hist = []; hp = -1; commit('从分享加载');
      render(); return true;
    } catch (e) { return false; }
  }
  preloadPrograms(); // 预加载当前音色
  if (!loadHash()) generate();
  window.__cg = { get song() { return song; }, E };
})();
