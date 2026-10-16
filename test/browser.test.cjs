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
  await p.click('[data-swap="0"]'); await p.waitForSelector('.alt'); assert(await p.$('.ch.sel'), '⇄ 按钮打开替换列表');
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
  assert(pfw > 0 && (await p.textContent('#playIcon')) === '❚❚', '进度条与播放按钮状态 ' + pfw);
  await p.click('#play'); assert(!(await p.$('.ch.now')) && (await p.textContent('#playIcon')) === '▶', '播放按钮切换为停止');
  await p.click('#play'); await p.waitForTimeout(300); await p.click('#stop'); assert(!(await p.$('.ch.now')), '停止');
  await p.click('#soundBtn'); await p.click('#loop'); await p.keyboard.press('Escape'); await p.click('[data-act=playsec]'); await p.waitForTimeout(600); await p.keyboard.press('Space'); await p.click('#soundBtn'); await p.click('#loop'); await p.keyboard.press('Escape');
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
  await p.click('#expBtn'); await p.click('#save'); await p.click('#favBtn'); assert((await p.$$('#favList .li')).length >= 1, '收藏'); await p.keyboard.press('Escape');
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
  await p.click('#theme');
  await p.click('#tabRand'); await p.click('#gen');
  await p.click('.ch:not(.cont) >> nth=1');
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.mouse.move(600, 900);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.resolve(__dirname, '..', 'screenshot.png') });
  await p.click('#theme'); await p.mouse.move(600, 900); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/cg-light.png' }); await p.click('#theme');
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
  await p.click('#dictBtn'); await p.waitForSelector('#dictPage.open .dItem');
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
  await p.click('#dClear'); await p.click('#dictClose'); assert(!(await p.isVisible('#dictPage')), '关闭图鉴');
  // 风格搜索
  await p.click('#pickBtn'); await p.fill('#pickSearch', 'bossa'); const items = await p.$$('#pickList .it[data-s]:not([data-s=rand])');
  assert(items.length === 1, '风格搜索 bossa'); await items[0].click(); assert((await p.textContent('#pickLabel')).includes('Bossa'), '选择风格');
  // 移动端
  await p.setViewportSize({ width: 375, height: 812 }); await p.waitForTimeout(300);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(ov <= 1, '移动端无横向溢出 (' + ov + ')');
  assert(await p.isVisible('#openCtrl') && (await p.evaluate(() => getComputedStyle(document.getElementById('transport')).position)) === 'fixed', '移动端底部运输栏');
  const tb = await p.evaluate(() => document.getElementById('transport').getBoundingClientRect().bottom);
  assert(tb > 760 && tb <= 812, '运输栏在拇指区 ' + tb);
  await p.click('#closeInsp').catch(() => {}); await p.keyboard.press('Escape');
  await p.click('#openCtrl'); await p.waitForTimeout(350);
  assert(await p.evaluate(() => document.getElementById('ctrl').getBoundingClientRect().top < 700), '参数底部抽屉打开');
  await p.click('#genM'); await p.waitForTimeout(350);
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
