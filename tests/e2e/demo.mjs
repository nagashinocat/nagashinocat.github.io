// 路地で看板をいくつかタップするデモを撮る（画面の文字や小窓も入れて）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const [, , outDir, size = '960x540'] = process.argv;
const [w, h] = size.split('x').map(Number);
mkdirSync(outDir, { recursive: true });
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: false });
p.setDefaultTimeout(600000);
p.on('pageerror', e => console.log('ERR', e.message));
await routeThree(p); await p.goto(srv.url + '/?manual');
await p.waitForFunction(() => window.__hub?.world);
// タップした所に丸を出す
await p.addStyleTag({ content: '.tapfx{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #fff;background:rgba(255,255,255,.25);z-index:99;pointer-events:none;animation:tf .6s ease-out forwards}@keyframes tf{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}' });
let T = 19.6, n = 0;
const frame = async () => { T += 1 / 30; await p.evaluate(t => window.__hub.world.renderAt(t, 1 / 30), T); await p.screenshot({ path: `${outDir}/f${String(n++).padStart(4, '0')}.png` }); };
await p.evaluate(t => window.__hub.world.renderAt(t, 0.1), T);
await p.waitForFunction(() => window.__hub.ready);
await p.evaluate(() => window.__hub.world.setVisitors(1234));
console.log(JSON.stringify(await p.evaluate(() => window.__hub.world.stands.map(s => [s.userData.workId, window.__hub.world.screenOf(s).map(Math.round)]))));
const tap = async (x, y) => { await p.evaluate(([x, y]) => { const d = document.createElement('div'); d.className = 'tapfx'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.append(d); setTimeout(() => d.remove(), 700); }, [x, y]); await p.touchscreen.tap(x, y); };
const posOf = id => p.evaluate(id => { const w = window.__hub.world, h = w.stands.find(s => s.userData.workId === id); return h ? w.screenOf(h) : null; }, id);
for (let i = 0; i < 30; i++) await frame();
for (const id of (process.argv[4] || 'saigo-no-ichigeki,nyankoro-mori,aiaigasa,chounouryokusha-no-shoumei').split(',')) {
  const pos = await posOf(id); if (!pos) { console.log('no', id); continue; }
  await tap(...pos);
  for (let i = 0; i < 75; i++) await frame();
}
// 最後に猫もタッチ
const c = await p.evaluate(() => window.__hub.world.screenOf(window.__hub.world.cat.hit));
await tap(...c); for (let i = 0; i < 150; i++) await frame();
console.log('frames', n);
await b.close(); srv.close();
