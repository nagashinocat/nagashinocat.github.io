import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
p.on('pageerror', e => console.log('ERR', e.message));
await routeThree(p); await p.goto(srv.url + '/?manual');
await p.waitForFunction(() => window.__hub?.world, null, { timeout: 300000 });
await p.evaluate(() => document.querySelectorAll('header,#skip,#loading').forEach(e => e.remove()));
let i = 0; for (const t of (process.argv[2] || '3.6,4.2,4.8,5.4,6.0,6.6').split(',').map(Number)) { await p.evaluate(t => window.__hub.world.renderAt(t), t); await p.screenshot({ path: `tests/out/c${i++}.png` }); }
await b.close(); srv.close();
