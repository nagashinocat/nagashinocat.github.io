import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const w = +(process.argv[2] || 1672), h = +(process.argv[3] || 941);
const p = await b.newPage({ viewport: { width: w, height: h } });
p.on('pageerror', e => console.log('ERR', e.message));
await routeThree(p);
await p.goto(srv.url + '/');
await p.waitForFunction(() => window.__hub?.ready === true, null, { timeout: 240000 });
const page = process.argv.find(a => a.startsWith('--page='))?.slice(7);
if (page) { await p.evaluate(async k => { const b = window.__hub.book; if (k === 'wip') await b.turnTo('tools'); await b.turnTo(k); }, page); await p.waitForTimeout(400); }
if (process.argv.includes('--nobook')) await p.evaluate(() => { const s = window.__hub.stage.scene; s.children.forEach(o => { if (o.type === 'Group' && !o.name) o.visible = false; }); });
if (process.argv.includes('--nodecor')) await p.evaluate(() => { window.__hub.book.district.userData.decor.visible = false; });
await p.evaluate(() => { for (const id of ['hint','turn']) document.getElementById(id).hidden = true; document.querySelector('.top').style.display='none'; });
await p.waitForTimeout(500);
await p.screenshot({ path: process.argv.at(-1).endsWith('.png') ? process.argv.at(-1) : '/tmp/dbg.png' });
await b.close(); srv.close();
