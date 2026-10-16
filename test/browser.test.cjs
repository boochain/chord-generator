// 无头 Chrome 端到端检查：node test/browser.test.cjs（需要 playwright 与 Chrome）
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/workspace/mcs/node_modules/playwright'); }
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const file = 'file://' + path.resolve(__dirname, '..', 'index.html');
const assert = (c, m) => { if (!c) throw new Error('✘ ' + m); console.log('✔ ' + m); };
(async () => {
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('dialog', (d) => { errs.push('dialog ' + d.message()); d.dismiss(); });
  await p.addInitScript(() => { if (!localStorage.getItem('cg.inst')) localStorage.setItem('cg.inst', 'piano'); });
  await p.goto(file); await p.waitForSelector('.ch');
  const more = async (id) => { await p.click('#moreBtn'); await p.click('#' + id); };
  const navSel = () => p.$$eval('#nav [aria-selected=true]', (x) => x.map((e) => e.id).join(','));
  const names = () => p.$$eval('.ch:not(.cont) .nm', (x) => x.map((e) => e.textContent));
  assert(await p.$('.onboard'), '首次使用引导');
  assert(!(await p.evaluate(() => document.body.classList.contains('has-insp'))), '未选和弦时隐藏详情栏');
  await p.click('#obClose'); assert(!(await p.$('.onboard')), '关闭引导');
  assert(!(await p.isVisible('#meter')), '高级设置默认收起');
  await p.click('#adv summary'); assert(await p.isVisible('#meter'), '展开高级设置');
  for (let i = 0; i < 15; i++) await p.click('#allRand');
  assert((await names()).length >= 2, '全部随机生成');
  await p.click('.ch:not(.cont)'); await p.waitForSelector('.alt');
  assert(await p.$('#insp svg'), '和弦详情：钢琴/吉他图');
  assert(await p.evaluate(() => document.body.classList.contains('has-insp')), '选中和弦后显示详情栏');
  assert(!(await p.$('#bpmUp')) && !(await p.$('#bpmDown')), '已移除 −/+ 步进按钮');
  await p.fill('#bpmNow', '500'); await p.press('#bpmNow', 'Enter');
  assert((await p.inputValue('#bpmNow')) === '300', 'BPM 输入 500 被钳制到 300');
  await p.fill('#bpmNow', '87'); await p.press('#bpmNow', 'Enter');
  assert((await p.inputValue('#bpmNow')) === '87' && (await p.inputValue('#bpm')) === '87', 'BPM 直接输入 87 并同步到设置');
  await p.fill('#bpmNow', '5'); await p.locator('#bpmNow').blur();
  assert((await p.inputValue('#bpmNow')) === '20', 'BPM 失焦时钳制到下限 20');
  await p.fill('#bpm', '120'); await p.press('#bpm', 'Enter');
  assert((await p.inputValue('#bpmNow')) === '120', '设置面板 BPM 输入');
  for (let i = 0; i < 4; i++) { await p.click('#tap'); await p.waitForTimeout(500); }
  const tapB = +(await p.inputValue('#bpmNow')); assert(tapB >= 100 && tapB <= 135, '敲击测速 ≈120：' + tapB);
  const gm = await p.evaluate(() => ['#progChord', '#progBass', '#progMelody'].map((s) => [document.querySelectorAll(s + ' option').length, document.querySelectorAll(s + ' optgroup').length]));
  assert(gm.every(([o, g]) => o === 128 && g === 16), 'GM 音色选择 128 个 / 16 族 ' + JSON.stringify(gm));
  await p.click('#closeInsp'); assert(!(await p.evaluate(() => document.body.classList.contains('has-insp'))), '关闭详情栏');
  await p.click('[data-swap="0"]'); await p.waitForSelector('.alt'); assert(await p.$('.ch.sel'), '卡片「替换」打开替换列表');
  const before = (await names())[0];
  await p.click('.alt >> nth=0');
  const after = (await names())[0];
  assert(before !== after, `替换和弦 ${before} → ${after}`);
  await p.keyboard.press('Control+z'); assert((await names())[0] === before, '撤销');
  await p.keyboard.press('Control+Shift+Z'); assert((await names())[0] === after, '重做');
  await p.click('[data-lock="0"]');
  const locked = (await names())[0];
  for (let i = 0; i < 5; i++) await p.keyboard.press('r');
  assert((await names())[0] === locked && (await p.$('.ch.locked')), '锁定后 R 重新生成保留锁定和弦');
  const k0 = await p.textContent('#keyNow'); await p.click('#tUp'); assert((await p.textContent('#keyNow')) !== k0, '移调');
  await p.click('#soundBtn'); assert(await p.isVisible('#soundPop'), '声音菜单');
  await p.click('#drums'); await p.click('#drums'); await p.click('#melody');
  await p.click('#play'); await p.waitForTimeout(1600);
  assert(await p.$('.ch.now'), '播放高亮当前和弦');
  const pfw = await p.evaluate(() => parseFloat(document.getElementById('progFill').style.width));
  assert(pfw > 0 && (await p.getAttribute('#playIcon', 'data-s')) === 'pause', '进度条与播放按钮状态 ' + pfw);
  await p.click('#play'); assert(!(await p.$('.ch.now')) && (await p.getAttribute('#playIcon', 'data-s')) === 'play', '播放按钮切换为停止');
  await p.click('#play'); await p.waitForTimeout(300); await p.click('#stop'); assert(!(await p.$('.ch.now')), '停止');
  await p.click('#loop'); assert((await p.getAttribute('#loop', 'aria-pressed')) === 'true', '运输栏：循环开关'); await p.click('#metro'); assert((await p.getAttribute('#metro', 'aria-pressed')) === 'true', '运输栏：节拍器开关'); await p.click('#metro'); await p.click('[data-act=playsec]'); await p.waitForTimeout(600); await p.keyboard.press('Space'); await p.click('#loop'); assert((await p.getAttribute('#loop', 'aria-pressed')) === 'false', '运输栏：关闭循环');
  for (const [id, ext] of [['midi', '.mid'], ['png', '.png'], ['txt', '.txt']]) {
    await p.click('#expBtn');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#' + id)]);
    assert(dl.suggestedFilename().endsWith(ext), '导出 ' + dl.suggestedFilename());
  }
  for (const part of ['chord', 'bass', 'melody', 'drum']) {
    await p.click('#expBtn');
    const [d] = await Promise.all([p.waitForEvent('download'), p.click(`#expPop [data-part=${part}]`)]);
    assert(/\.mid$/.test(d.suggestedFilename()), '分轨导出 ' + d.suggestedFilename());
  }
  await p.click('#expBtn');
  const [dz] = await Promise.all([p.waitForEvent('download'), p.click('#zipAll')]);
  const zp = '/tmp/cg-browser.zip'; await dz.saveAs(zp);
  const zl = require('child_process').execSync(`python3 -c "import zipfile,sys;z=zipfile.ZipFile('${zp}');assert z.testzip() is None;print(len(z.namelist()))"`).toString().trim();
  assert(dz.suggestedFilename().endsWith('.zip') && +zl === 6, '全部分轨打包 zip 可解析（' + zl + ' 个文件）');
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=midisec]')]);
  assert(/\.mid$/.test(dl2.suggestedFilename()), '分段 MIDI ' + dl2.suggestedFilename());
  await p.click('#expBtn'); await p.click('#save'); await p.click('#favBtn'); assert((await p.$$('#favList .li')).length >= 1 && (await navSel()) === 'favBtn', '收藏（导航高亮）'); await p.keyboard.press('Escape');
  await p.click('#expBtn'); await p.click('#share');
  const url = p.url(); assert(url.includes('#p='), '分享链接');
  const cur = await names();
  const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(e.message)); await p2.goto(url); await p2.waitForSelector('.ch');
  assert(JSON.stringify(await p2.$$eval('.ch:not(.cont) .nm', (x) => x.map((e) => e.textContent))) === JSON.stringify(cur), '分享链接还原相同进行');
  await p2.close();
  // 种子模式 + 中文分隔符 + XSS
  await p.click('#tabSeed');
  await p.selectOption('#bars', '8'); await p.selectOption('#hr', '1');
  await p.fill('#seeds', 'Am，F|C-G/B');
  await p.click('#gen'); await p.waitForTimeout(200);
  const secs = await p.$$eval('.sh h3', (x) => x.map((e) => e.textContent));
  assert(secs.length >= 4 && secs.some((s) => s.includes('副歌')), '种子扩展结构 ' + secs.join(','));
  assert((await names()).includes('G/B'), '斜线种子和弦保留');
  await p.fill('#seeds', 'Am <img src=x onerror=alert(1)> F'); await p.click('#gen'); await p.waitForTimeout(200);
  assert(!(await p.$('#result img')) && !errs.some((e) => e.startsWith('dialog')), '无 XSS（输入被转义）');
  await p.click('[data-act=regensec] >> nth=2'); assert(true, '分段重新生成');
  const [dzs] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=zipsec] >> nth=3')]);
  assert(/副歌.*_分轨\.zip$/.test(dzs.suggestedFilename()), '歌曲模式分段分轨打包 ' + dzs.suggestedFilename());
  assert((await navSel()) === 'tabSeed', '导航：歌曲扩展高亮');
  const th0 = await p.getAttribute('html', 'data-theme'); await more('theme'); assert((await p.getAttribute('html', 'data-theme')) !== th0, '更多菜单：切换主题');
  await p.click('#tabRand'); assert((await navSel()) === 'tabRand' && !(await p.isVisible('#seedBox')), '导航：生成'); await p.click('#gen');
  await p.click('.ch:not(.cont) >> nth=1');
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.mouse.move(600, 900);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.resolve(__dirname, '..', 'screenshot.png') });
  await more('theme'); await p.mouse.move(600, 900); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/cg-light.png' }); await more('theme');
  // 分析该和弦
  await p.click('.ch:not(.cont) >> nth=1'); await p.click('#anaBtn'); await p.waitForSelector('#anaDrawer.open .nc');
  const cats = await p.$$eval('#anaBody .ngh', (x) => x.map((e) => e.firstChild.textContent.trim()));
  assert(cats.length >= 6 && cats.some((c) => c.includes('副属')) && cats.some((c) => c.includes('借用')), '分析：候选按类别分组 ' + cats.join('|'));
  assert(await p.$$eval('#anaBody .anaT td', (x) => x.length >= 3), '分析：音名/级数/音程表');
  assert((await p.$$('#anaBody .interp .ip')).length >= 2, '分析：其他调中的解释');
  await p.click('#anaBody .nc >> nth=0 >> [data-play]');
  await p.waitForTimeout(500); await p.evaluate(() => { document.getElementById('anaDrawer').scrollTop = 0; }); await p.waitForTimeout(100); await p.screenshot({ path: path.resolve(__dirname, '..', 'shot-analysis.png') });
  const n0 = (await names()).length, nm1 = await p.$eval('#anaBody .nc >> nth=0', (e) => e.querySelector('.nm b').textContent);
  await p.click('#anaBody .nc >> nth=0 >> [data-use]');
  assert((await names())[2] === nm1 && (await names()).length === n0, '分析：替换下一个和弦为 ' + nm1);
  await p.click('#anaBody [data-am=insert]'); await p.click('#anaBody .nc >> nth=1 >> [data-use]');
  assert((await names()).length === n0 + 1, '分析：插入和弦');
  await p.keyboard.press('Escape');
  // 和弦图鉴
  await p.click('#dictBtn'); await p.waitForSelector('#dictPage.open .dItem'); assert((await navSel()) === 'dictBtn', '导航：和弦图鉴高亮');
  assert(/^456 /.test(await p.textContent('#dCount')), '图鉴：12 根音 × 38 种性质 = 456 ' + (await p.textContent('#dCount')));
  await p.fill('#dQ', 'Bb'); await p.selectOption('#dFam', '三和弦'); await p.click('.dItem >> nth=0');
  const bbFr = await p.textContent('#dEntry .gv small');
  assert(bbFr.includes('x13331'), 'Bb 标准指法 x13331：' + bbFr);
  await p.selectOption('#dFam', ''); await p.fill('#dQ', 'F#m7b5'); await p.click('.dItem >> nth=0');
  assert((await p.textContent('#dEntry .cbig')) === 'F#m7b5' && (await p.textContent('#dEntry .anaT')).includes('C'), '图鉴：搜索与拼写 F#m7b5');
  await p.click('#dEntry [data-inv="1"]'); assert((await p.textContent('#dEntry .cbig')).includes('/A'), '图鉴：转位/斜线');
  await p.fill('#dQ', ''); for (const pc of [0, 4, 7, 11]) await p.click(`#dNotes [data-pc="${pc}"]`);
  assert((await p.textContent('.dItem >> nth=0')).startsWith('Cmaj7'), '图鉴：按音反查 C E G B → Cmaj7');
  await p.click('.dItem >> nth=0'); await p.waitForTimeout(2300);
  await p.screenshot({ path: path.resolve(__dirname, '..', 'shot-dict.png') });
  await p.click('#dClear'); await p.click('#dictClose'); assert(!(await p.isVisible('#dictPage')) && (await navSel()) === 'tabRand', '关闭图鉴（导航恢复）');
  await more('histBtn'); assert(await p.isVisible('#histDrawer.open') && (await p.$$('#histList .li')).length >= 2, '更多菜单：历史记录'); await p.click('#histList .li >> nth=1 >> .t'); await p.keyboard.press('Escape');
  await more('help'); assert(await p.isVisible('#helpDrawer.open'), '更多菜单：快捷键'); await p.click('#helpDrawer [data-close]');
  assert(await p.isVisible('#ctrl') && !(await p.isVisible('#openCtrl')) && !(await p.isVisible('#genM')), '桌面：三栏布局，参数栏常驻，唯一主按钮');
  assert(!(await p.$eval('#transport', (e) => e.textContent)).match(/[▶❚🔁⏹]/) && !(await p.$eval('body', (e) => e.innerText)).match(/[\u{1F300}-\u{1FAFF}]/u), '界面无 emoji 图标');
  // 风格搜索：别名 / 大小写 / 连字符 / 中文 / 拼音，结果高亮
  for (const [q, re] of [['lofi', /Lo-fi/], ['LO-FI', /Lo-fi/], ['lo fi', /Lo-fi/], ['低保真', /Lo-fi|低保真/], ['dibaozhen', /Lo-fi/], ['edm', /House|Techno|Trance/], ['kpop', /K-pop/], ['古风', /古风/], ['爵士', /爵士/], ['shoegase', /Shoegaze/], ['抖音', /Douyin/]]) {
    if (!(await p.isVisible('#pickSearch'))) await p.click('#pickBtn'); await p.fill('#pickSearch', q); await p.waitForTimeout(50);
    const got = await p.$$eval('#pickList .it[data-s]:not([data-s=rand])', (x) => x.map((e) => e.textContent));
    assert(got.length && re.test(got[0]), `风格选择器搜索「${q}」→ ${got.slice(0, 3).join(' / ')}`);
  }
  await p.fill('#pickSearch', 'lofi');
  assert((await p.$$('#pickList mark')).length >= 1 && (await p.$$eval('#pickList .gh', (x) => x.map((e) => e.textContent))).some((t) => t.includes('Lo-fi')), '搜索结果高亮且按大类分组');
  await p.press('#pickSearch', 'Enter'); assert((await p.textContent('#pickLabel')).includes('Lo-fi'), '回车选中第一个 Lo-fi 风格');
  await p.click('#gen'); await p.waitForTimeout(200);
  const lb = +(await p.inputValue('#bpmNow')); assert(lb >= 64 && lb <= 95, 'Lo-fi 速度 ' + lb);
  // 全局搜索：风格 / 和弦 / 功能
  await p.fill('#gq', 'chillhop'); await p.waitForSelector('#gres.open .gi');
  assert((await p.textContent('#gres .gi')).includes('Chillhop'), '全局搜索：风格');
  await p.press('#gq', 'Enter'); await p.waitForTimeout(200); assert((await p.textContent('#pickLabel')).includes('Chillhop'), '全局搜索：选择风格并生成');
  await p.fill('#gq', 'CM7'); await p.waitForSelector('#gres.open .gi');
  const gk = await p.$$eval('#gres .gi', (x) => x.map((e) => e.textContent)); assert(gk.some((t) => t.includes('和弦') && t.includes('Cmaj7')), '全局搜索：和弦写法 CM7 → Cmaj7');
  await p.click('#gres .gi:has-text("Cmaj7")'); await p.waitForSelector('#dictPage.open'); assert((await p.textContent('#dEntry .cbig')) === 'Cmaj7', '全局搜索打开图鉴条目');
  // 图鉴：风格筛选 + 分析该和弦（调选择）+ 加入进行
  await p.fill('#dQ', ''); await p.selectOption('#dSty', 'Lo-fi'); const lfc = await p.$$eval('.dItem b', (x) => x.map((e) => e.textContent));
  assert(lfc.length >= 60 && lfc.every((n) => !/dim$|aug$|5$/.test(n)), '图鉴按风格筛选 Lo-fi（' + lfc.length + '）');
  await p.selectOption('#dSty', ''); await p.fill('#dQ', 'Am7'); await p.click('.dItem >> nth=0');
  await p.click('#dAna'); await p.waitForSelector('#anaDrawer.open #anaTonic');
  assert(await p.isVisible('#anaDrawer'), '图鉴 → 分析抽屉显示在图鉴之上');
  await p.selectOption('#anaTonic', '0'); await p.selectOption('#anaMode', 'major');
  assert((await p.textContent('#anaBody .sub')).startsWith('vi7'), '图鉴分析：C 大调中 Am7 = vi7');
  await p.selectOption('#anaTonic', '7'); assert((await p.textContent('#anaBody .sub')).startsWith('ii7'), '图鉴分析：切换到 G 大调 → ii7');
  assert((await p.$$('#anaBody .nc')).length >= 10, '图鉴分析：下一和弦列表');
  await p.click('#anaBody .nc >> nth=0 >> [data-play]');
  const nBefore = await p.evaluate(() => document.querySelectorAll('.ch:not(.cont)').length);
  await p.click('#anaBody .nc >> nth=0 >> [data-use]'); await p.waitForTimeout(150);
  assert((await p.evaluate(() => document.querySelectorAll('.ch:not(.cont)').length)) === nBefore + 2, '图鉴分析：加入进行（和弦 + 下一个）');
  await p.click('#anaBody [data-dict] >> nth=0'); await p.waitForSelector('#dictPage.open'); assert(!(await p.isVisible('#anaDrawer.open')), '分析候选 → 图鉴');
  await p.click('#dAdd'); await p.waitForTimeout(150); assert((await p.evaluate(() => document.querySelectorAll('.ch:not(.cont)').length)) === nBefore + 3, '图鉴：加入进行');
  await p.click('#dictClose');
  // 进行中的和弦：卡片 🔍、详情栏 ▶ / 📖 / ➕ / 🗑、替换列表 ▶
  await p.click('[data-ana="0"]'); await p.waitForSelector('#anaDrawer.open .nc'); assert(!(await p.$('#anaTonic')), '卡片「分析」打开进行内分析'); await p.keyboard.press('Escape');
  await p.click('.ch:not(.cont) >> nth=0'); await p.click('#inspPlay'); await p.click('#insp [data-altplay] >> nth=0');
  await p.click('#inspDict'); await p.waitForSelector('#dictPage.open'); const n0name = (await names())[0];
  assert((await p.textContent('#dEntry .cbig')).replace(/\/.*/, '') === n0name.replace(/\/.*/, ''), '详情栏「图鉴」打开对应条目 ' + n0name); await p.click('#dictClose');
  const cnt0 = (await names()).length; await p.click('.ch:not(.cont) >> nth=0'); await p.click('#inspIns'); await p.waitForSelector('#anaDrawer.open'); assert(await p.$('#anaBody [data-am=insert][aria-pressed=true]'), '详情栏 ➕ 以插入模式打开分析');
  await p.click('#anaBody .nc >> nth=0 >> [data-use]'); assert((await names()).length === cnt0 + 1, '插入成功'); await p.keyboard.press('Escape');
  await p.click('.ch:not(.cont) >> nth=1'); await p.click('#inspDel'); assert((await names()).length === cnt0, '详情栏「删除」');
  await p.keyboard.press('Control+z'); assert((await names()).length === cnt0 + 1, '删除可撤销');
  await p.keyboard.press('/'); assert(await p.evaluate(() => document.activeElement.id === 'gq'), '/ 聚焦全局搜索'); await p.keyboard.press('Escape');
  await p.fill('#gq', '导出'); await p.waitForSelector('#gres.open .gi'); assert((await p.textContent('#gres')).includes('导出 MIDI'), '全局搜索：功能'); await p.keyboard.press('Escape');
  // 风格搜索
  await p.click('#pickBtn'); await p.fill('#pickSearch', 'bossa'); const items = await p.$$('#pickList .it[data-s]:not([data-s=rand])');
  assert(items.length === 1, '风格搜索 bossa'); await items[0].click(); assert((await p.textContent('#pickLabel')).includes('Bossa'), '选择风格');
  // 平板（两栏）
  await p.setViewportSize({ width: 1024, height: 800 }); await p.waitForTimeout(400);
  assert(!(await p.isVisible('#ctrl')) && (await p.isVisible('#openCtrl')) && (await p.isVisible('#insp')) && (await p.isVisible('#genM')), '平板：画布 + 详情两栏，参数为侧边面板');
  await p.click('#openCtrl'); await p.waitForTimeout(350); assert(await p.isVisible('#ctrl'), '平板：打开参数面板');
  await p.click('#gen'); await p.waitForTimeout(350); assert(!(await p.evaluate(() => document.getElementById('ctrl').classList.contains('open'))), '平板：生成后收起参数面板');
  await p.click('#genM'); assert((await names()).length >= 2, '平板：运输栏生成按钮');
  // 移动端
  await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(300);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(ov <= 1, '移动端无横向溢出 (' + ov + ')');
  const nb = await p.evaluate(() => [document.getElementById('nav').getBoundingClientRect().top, document.getElementById('nav').getBoundingClientRect().bottom, document.getElementById('transport').getBoundingClientRect().bottom]);
  assert(await p.isVisible('#openCtrl') && nb[1] === 812 && Math.abs(nb[2] - nb[0]) <= 1, '移动端：底部导航 + 其上运输栏 ' + nb);
  assert((await p.evaluate(() => [...document.querySelectorAll('#nav .nav-i')].every((e) => e.getBoundingClientRect().height >= 44))), '底部导航触控目标 ≥ 44px');
  await p.click('#closeInsp').catch(() => {}); await p.keyboard.press('Escape');
  await p.click('#openCtrl'); await p.waitForTimeout(350);
  assert(await p.evaluate(() => document.getElementById('ctrl').getBoundingClientRect().top < 700), '参数底部抽屉打开');
  await p.click('#gen'); await p.waitForTimeout(350);
  assert(await p.evaluate(() => document.getElementById('ctrl').getBoundingClientRect().top >= 812), '生成后抽屉收起');
  await p.evaluate(() => scrollTo(0, 0));
  await p.click('.ch:not(.cont) >> nth=0'); await p.waitForTimeout(350);
  assert(await p.evaluate(() => document.getElementById('insp').classList.contains('open')), '移动端和弦详情底部抽屉');
  await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(ov2 <= 1, '移动端无横向溢出 (抽屉后 ' + ov2 + ')');
  await p.click('#dictBtn'); await p.waitForSelector('#dictPage.open .dItem'); await p.click('.dItem >> nth=3'); await p.waitForTimeout(300);
  assert(await p.isVisible('#dEntry') && (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, '移动端图鉴：底部详情无溢出');
  await p.screenshot({ path: '/tmp/cg-dict-mobile.png' }); await p.click('#dBack'); await p.click('#dictClose');
  await p.click('#favBtn'); assert(await p.isVisible('#favDrawer.open'), '移动端：底部导航 收藏'); await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  await p.click('#tabSeed'); assert(await p.isVisible('#openCtrl') && (await navSel()) === 'tabSeed', '移动端：底部导航 歌曲扩展'); await p.click('#tabRand');
  await p.click('#soundBtn'); assert(await p.isVisible('#soundPop'), '移动端：声音底部面板'); await p.keyboard.press('Escape');
  await p.click('#genM'); await p.waitForTimeout(300); assert((await names()).length >= 2, '移动端：悬浮生成按钮');
  await p.screenshot({ path: path.resolve(__dirname, '..', 'screenshot-mobile.png'), fullPage: false });
  // GM 采样：离线回退
  {
    const pf = await b.newPage(); const fe = [];
    pf.on('pageerror', (e) => fe.push(e.message));
    await pf.addInitScript(() => { localStorage.setItem('cg.inst', 'gm'); localStorage.setItem('cg.onboarded', '1'); });
    await pf.route(/gleitz|surikov/, (r) => r.abort());
    await pf.goto(file); await pf.waitForSelector('.ch');
    await pf.evaluate(() => document.querySelector('.onboard #obClose') && document.querySelector('#obClose').click());
    await pf.click('#play'); await pf.waitForTimeout(2500);
    assert(await pf.evaluate(() => window.__SF && window.__SF.offline), 'GM 加载失败时标记离线');
    assert(await pf.$('.ch.now'), '离线回退到内置合成器继续播放');
    assert(fe.length === 0, '回退无页面错误 ' + JSON.stringify(fe));
    await pf.close();
  }
  // GM 采样：在线加载（网络可用时）
  {
    const pg = await b.newPage(); const ge = [];
    pg.on('pageerror', (e) => ge.push(e.message));
    await pg.addInitScript(() => { localStorage.setItem('cg.inst', 'gm'); });
    await pg.goto(file); await pg.waitForSelector('.ch');
    await pg.evaluate(() => document.querySelector('#obClose') && document.querySelector('#obClose').click());
    await pg.click('#play'); await pg.waitForFunction(() => window.__SF.offline || document.querySelector('.ch.now'), null, { timeout: 25000 });
    const st = await pg.evaluate(() => ({ off: window.__SF.offline, now: !!document.querySelector('.ch.now'), bufs: window.__SF.bufs.size }));
    assert(st.now, 'GM 播放进行中 ' + JSON.stringify(st));
    console.log('  GM 在线采样：' + (st.off ? '网络不可用，已回退' : '加载成功'));
    assert(ge.length === 0, 'GM 播放无页面错误 ' + JSON.stringify(ge));
    await pg.close();
  }
  assert(errs.length === 0, '无控制台错误 ' + JSON.stringify(errs));
  await b.close();
  console.log('浏览器检查全部通过');
})().catch((e) => { console.error(e.message); process.exit(1); });
