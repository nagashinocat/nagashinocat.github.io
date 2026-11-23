// サイト本体の確認（Task 6 以降で追加していく）
import { readFile } from 'node:fs/promises';
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
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await routeThree(page);
  await page.goto(srv.url + path);
  return { page, errs };
}
export async function run(ctx) {
  const { check, assert, OUT } = ctx;
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['pc', { width: 1280, height: 800 }]]) {
    const { page, errs } = await openPage(ctx, '/tests/e2e/scene.html', vp);
    await check(`scene ${name}: 本が開く`, async () => { await page.waitForFunction(() => document.title === 'opened', null, { timeout: 60000 }); });
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
