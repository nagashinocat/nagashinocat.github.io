// 本が開くところを何枚か撮る
import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
await routeThree(p);
await p.goto(srv.url + '/');
await p.waitForFunction(() => window.__hub?.book, null, { timeout: 60000 });
for (const [i, ms] of [[1, 2500], [2, 2500], [3, 3000]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `tests/out/open-${i}.png` }); }
await b.close(); srv.close();
