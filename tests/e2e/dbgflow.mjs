import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
p.on('pageerror', e => console.log('ERR', e.message));
await routeThree(p); await p.goto(srv.url + '/lab/flow.html?manual');
await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
let i = 0; for (const t of [9.5, 10.5, 11.5, 12.5, 13, 13.5]) { await p.evaluate(t => window.__frame(t), t); await p.screenshot({ path: `tests/out/c${i++}.png` }); }
await b.close(); srv.close();
