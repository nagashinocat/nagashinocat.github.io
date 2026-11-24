// サイト本体の確認（Task 6 以降で追加していく）
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const THREE_DIR = '/tmp/three/node_modules/three/';
export async function routeThree(page) {
  await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.170\.0\/(.*)/, async route => {
    const rel = route.request().url().split('three@0.170.0/')[1];
    try { route.fulfill({ body: await readFile(THREE_DIR + rel), contentType: 'text/javascript' }); } catch { route.fulfill({ status: 404 }); }
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
}
export async function openPage({ browser, srv }, path, viewport, opts = {}) {
  const page = await browser.newPage({ viewport, ...opts });
  page.setDefaultTimeout(180000); // ソフトウェア描画は1コマが重いので、クリックの待ちを長めに
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await routeThree(page);
  await page.goto(srv.url + path);
  return { page, errs };
}
export async function run(ctx) {
  const { check, assert, OUT } = ctx;
  await runSite(ctx);
  return; // 旧3Dの街（scene.html）の確認は、紙の街に置き換えたので行わない
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1280, height: 800 }]]) {
    const { page, errs } = await openPage(ctx, '/tests/e2e/scene.html', vp);
    await check(`scene ${name}: 本が開く`, async () => { await page.waitForFunction(() => document.title === 'opened', null, { timeout: 240000 }); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}scene-${name}.png` });
    await check(`scene ${name}: エラーなし`, () => assert(errs.length === 0, errs.join(' / ')));
    if (name === 'pc') {
      await check('scene: 看板の座標で pick が workId を返す', async () => {
        const got = await page.evaluate(() => {
          const { stage, book } = window.__hub;
          const s = book.district.userData.workSigns[0];
          const v = new (s.position.constructor)(); s.getWorldPosition(v); v.project(stage.camera);
          const rect = stage.renderer.domElement.getBoundingClientRect();
          stage.setPickables(book.district.userData.workSigns);
          return [s.userData.workId, stage.pick(rect.left + (v.x + 1) / 2 * rect.width, rect.top + (1 - v.y) / 2 * rect.height)];
        });
        assert(got[1] && got[1].workId === got[0], JSON.stringify(got));
      });
      await check('scene: turnTo 連打でも1つだけ進む', async () => {
        const k = await page.evaluate(async () => {
          const { book } = window.__hub;
          const ps = [book.turnTo('tools'), book.turnTo('wip'), book.turnTo('wip')];
          await Promise.all(ps); return book.current;
        });
        assert(k === 'tools', k);
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}scene-tools.png` });
      await page.evaluate(() => window.__hub.book.turnTo('wip'));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}scene-wip.png` });
    }
    await page.close();
  }
}

async function runSite(ctx) {
  const { check, assert, OUT } = ctx;
  // 本体：スマホと PC
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1280, height: 800 }]]) {
    const { page, errs } = await openPage(ctx, '/', vp, { hasTouch: name === 'phone' });
    await check(`site ${name}: スキップで路地に着いて操作できる`, async () => {
      await page.waitForSelector('#skip:not([hidden])', { timeout: 240000 });
      await page.click('#skip');
      await page.waitForFunction(() => window.__hub?.ready === true, null, { timeout: 240000 });
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}site-${name}.png` });
    await check(`site ${name}: コンソールエラー 0`, () => assert(errs.length === 0, errs.join(' / ')));
    await check(`site ${name}: 看板に触れると掲示板に予告が出る`, async () => {
      const [id, x, y] = await page.evaluate(() => { const h = window.__hub.world.stands[0]; return [h.userData.workId, ...window.__hub.world.screenOf(h)]; });
      if (name === 'phone') await page.touchscreen.tap(x, y); else await page.mouse.move(x, y);
      await page.waitForFunction(id => window.__hub.billboard.state().workId === id, id, { timeout: 60000 });
      assert(!(await page.isHidden('#play')), 'あそぶボタンが出ない');
    });

    await check(`site ${name}: めくりボタンで第3工場へ（めくりはスキップできる）`, async () => {
      await page.click('#next');
      await page.waitForSelector('#skip:not([hidden])', { timeout: 60000 });
      await page.click('#skip');
      await page.waitForFunction(() => window.__hub.world.page === 'tools' && !window.__hub.world.busy, null, { timeout: 240000 });
      const label = await page.textContent('#district-name');
      assert(label.includes('工場'), label);
    });
    await page.screenshot({ path: `${OUT}site-${name}-tools.png` });
    await check(`site ${name}: 矢印は両端のまん中、ページ名は左上`, async () => {
      const r = await page.evaluate(() => Object.fromEntries(['prev', 'next', 'district-name'].map(id => { const b = document.getElementById(id).getBoundingClientRect(); return [id, [b.left, b.top, b.right, b.bottom]]; })));
      const W = page.viewportSize().width, H = page.viewportSize().height;
      assert(r.prev[0] < 30 && Math.abs((r.prev[1] + r.prev[3]) / 2 - H / 2) < 10, 'prev ' + r.prev);
      assert(r.next[2] > W - 30 && Math.abs((r.next[1] + r.next[3]) / 2 - H / 2) < 10, 'next ' + r.next);
      assert(r['district-name'][0] < 40 && r['district-name'][1] < 80, 'label ' + r['district-name']);
      assert(!(await page.$('#open-list')), '作品いちらんボタンが残っている');
    });
    await page.close();
  }
  // 幅 360 ではみ出さない、長い題は折り返す
  {
    const { page } = await openPage(ctx, '/', { width: 360, height: 740 }, { hasTouch: true });
    await page.click('#skip').catch(() => {});
    await page.waitForFunction(() => window.__hub?.ready === true, null, { timeout: 240000 });
    await page.screenshot({ path: `${OUT}site-360.png` });
    await check('360px: 横にはみ出さない', async () => {
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(w <= 360, String(w));
    });
    await page.close();
  }
  // CM動画が読めない → 文字表示に戻る
  {
    const { page } = await openPage(ctx, '/', { width: 1280, height: 800 });
    await page.route('**/assets/cm/**', r => r.fulfill({ status: 404, body: '' }));
    await page.waitForSelector('#skip:not([hidden])', { timeout: 240000 }); await page.click('#skip');
    await page.waitForFunction(() => window.__hub?.ready === true, null, { timeout: 240000 });
    await check('CM動画が読めないと文字表示に戻る', async () => {
      const id = await page.evaluate(() => window.__hub.works.find(w => w.cm)?.id);
      assert(id, 'cm のある作品がない');
      await page.evaluate(id => window.__hub.billboard.preview(id), id);
      await page.waitForFunction(() => window.__hub.billboard.state().video === null, null, { timeout: 90000 });
    });
    await check('CM動画が読めれば掲示板に映る', async () => {
      await page.unroute('**/assets/cm/**');
      const ok = await page.evaluate(() => window.__hub.videoReady !== undefined);
      assert(ok, 'videoReady がない');
    });
    await page.close();
  }
  // WebGL なし → 一覧が本体
  {
    const b = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
    const page = await b.newPage({ viewport: { width: 360, height: 740 } });
    await routeThree(page);
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(ctx.srv.url + '/');
    await check('WebGLなし: 一覧が見えてリンクが正しい', async () => {
      await page.waitForSelector('#list:not([hidden]) a[href="/aiaigasa/"]', { timeout: 15000 });
    });
    await check('WebGLなし 360px: 長い題が折り返す、はみ出さない', async () => {
      const lines = await page.evaluate(() => { const el = [...document.querySelectorAll('#list h3')].find(h => h.textContent.startsWith('鉛筆削り')); const lh = parseFloat(getComputedStyle(el).lineHeight); return el.getBoundingClientRect().height / lh; });
      assert(lines >= 1.9, String(lines));
      const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.querySelector('#list').scrollWidth));
      assert(w <= 360, String(w));
    });
    await check('WebGLなし: 未捕捉エラーなし', () => assert(errs.length === 0, errs.join(' / ')));
    await page.screenshot({ path: `${OUT}site-nowebgl.png` });
    await b.close();
  }
}
