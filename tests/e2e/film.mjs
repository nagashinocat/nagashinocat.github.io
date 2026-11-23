// 流れを連番で撮って動画にする
import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const [, , path, outDir, dur = 14, fps = 6, w = 640, h = 360, from = 0, to = 1e9] = process.argv;
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await routeThree(p);
await p.goto(srv.url + path);
await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
const n = Math.round(dur * fps);
for (let i = +from; i < Math.min(n, +to); i++) { await p.evaluate(t => window.__frame(t), i / fps); await p.screenshot({ path: `${outDir}/f${String(i).padStart(4, '0')}.png` }); }
await b.close(); srv.close();
