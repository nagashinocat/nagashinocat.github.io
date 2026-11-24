// ページめくりを撮る：路地→工場→空き地→工場（戻る）
import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.setDefaultTimeout(600000);
p.on('pageerror', e => console.log('ERR', e.message));
await routeThree(p); await p.goto(srv.url + '/?manual');
await p.waitForFunction(() => window.__hub?.world);
let T = 19.5, n = 0;
const FPS = +(process.argv[3] || 30); const shot = async () => { T += 1 / FPS; await p.evaluate(t => window.__hub.world.renderAt(t, 1 / 30), T); await p.screenshot({ path: `tests/out/turn/f${String(n++).padStart(4, '0')}.png` }); };
await p.evaluate(t => window.__hub.world.renderAt(t, 0.1), T); await p.waitForFunction(() => window.__hub.ready);
for (const btn of (process.argv[2] || '#next').split(',')) {
  // 先にページを作っておく（読み込みの待ち時間は撮らない）
  for (let i = 0; i < 15; i++) await shot();
  await p.click(btn);
  while (!(await p.evaluate(() => window.__hub.world.busy && window.__hub.world.time >= 0))) await p.waitForTimeout(200);
  while (await p.evaluate(() => window.__hub.world.busy)) await shot();
}
for (let i = 0; i < 20; i++) await shot();
await b.close(); srv.close();
