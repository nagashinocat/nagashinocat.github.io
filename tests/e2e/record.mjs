// 本が開く場面と、ページめくりの場面を動画用のコマに撮る
// node tests/e2e/record.mjs intro 960x540 OUTDIR [from-to]   例：turn 960x540 out games-tools
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const [, , kind, size, outDir, pair = '', fromIdx = '0', toIdx = '99999'] = process.argv;
const [w, h] = size.split('x').map(Number);
mkdirSync(outDir, { recursive: true });
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: w, height: h } });
p.setDefaultTimeout(900000);
p.on('pageerror', e => console.log('ERR', e.message));
await routeThree(p); await p.goto(srv.url + '/?record');
await p.waitForFunction(() => window.__hub?.world);
await p.evaluate(() => document.querySelectorAll('body > *:not(#app)').forEach(e => e.style.visibility = 'hidden'));
const canvas = await p.$('#app canvas');
const FPS = 30; let n = 0;
const snap = async () => { if (n >= +fromIdx && n < +toIdx) await canvas.screenshot({ path: `${outDir}/f${String(n).padStart(4, '0')}.png` }); n++; };
if (kind === 'intro') {
  const T = await p.evaluate(async () => (await import('/js/scene/world.js')).T_ALLEY);
  for (let i = 0; i <= Math.round(T * FPS); i++) { if (i >= +fromIdx && i < +toIdx) await p.evaluate(t => window.__hub.world.renderAt(t, 1 / 30), i / FPS); await snap(); }
} else {
  const [from, to] = pair.split('-');
  let t = 19;
  await p.evaluate(t => window.__hub.world.renderAt(t), t);
  await p.evaluate(f => window.__hub.world.jumpTo(f), from);
  await p.evaluate(to => window.__hub.world.prepare(to), to);
  await p.evaluate(t => window.__hub.world.renderAt(t), t += 0.1);
  await p.evaluate(to => { window.__turnDone = false; window.__hub.world.turnTo(to).then(() => window.__turnDone = true); }, to);
  while (!(await p.evaluate(() => window.__hub.world.busy))) await p.waitForTimeout(50);
  for (;;) {
    t += 1 / FPS;
    const busy = await p.evaluate(t => { window.__hub.world.renderAt(t, 1 / 30); return window.__hub.world.busy; }, t);
    await snap();
    if (!busy) break;
  }
}
console.log('frames', n);
await b.close(); srv.close();
