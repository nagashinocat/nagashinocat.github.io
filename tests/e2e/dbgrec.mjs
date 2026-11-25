import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const q of (process.argv[2] || 'record,manual').split(',')) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  p.on('console', m => m.type() === 'error' && console.log(q, 'CON', m.text().slice(0, 400)));
  p.on('pageerror', e => console.log(q, 'ERR', e.message));
  await routeThree(p); await p.goto(srv.url + '/?' + q);
  await p.waitForFunction(() => window.__hub?.world, null, { timeout: 300000 });
  for (const t of [9, 20]) { await p.evaluate(t => window.__hub.world.renderAt(t), t); await p.screenshot({ path: `tests/out/rec-${q}-${t}.png` }); }
  await p.close();
}
await b.close(); srv.close();
