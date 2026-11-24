import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const [w, h] = (process.argv[2] || '960x540').split('x').map(Number);
const p = await b.newPage({ viewport: { width: w, height: h } });
p.setDefaultTimeout(300000);
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CON', m.text().slice(0, 300)));
await routeThree(p); await p.goto(srv.url + '/?manual');
await p.waitForFunction(() => window.__hub?.world);
let T = 19.5; const step = async (n, dt = 0.25) => { for (let i = 0; i < n; i++) { T += dt; await p.evaluate(t => window.__hub.world.renderAt(t, 0.25), T); } };
await step(1); await p.waitForFunction(() => window.__hub.ready);
await step(2); await p.screenshot({ path: 'tests/out/pg-0.png' });
for (const [i, k] of [[1, 'tools']]) {
  await p.click('#next');
  await p.waitForFunction(k => window.__hub.world.busy || window.__hub.world.page === k, k);
  await step(3); await p.screenshot({ path: `tests/out/pg-${i}a.png` }); await step(1); await p.screenshot({ path: `tests/out/pg-${i}b.png` });
  while (await p.evaluate(() => window.__hub.world.busy)) await step(1);
  await step(2); await p.screenshot({ path: `tests/out/pg-${i}.png` });
  const st = await p.evaluate(() => { const w = window.__hub.world, h = w.stands.find(s => s.parent && window.__hub.world.page && s.visible !== false && w.screenOf(s)[0] > 0 && w.screenOf(s)[0] < innerWidth && w.screenOf(s)[1] > 0 && w.screenOf(s)[1] < innerHeight); return h ? [h.userData.workId, ...w.screenOf(h)] : null; });
  console.log(k, 'stand', JSON.stringify(st));
}
await b.close(); srv.close();
