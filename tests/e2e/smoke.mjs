// Playwright による確認。node tests/e2e/smoke.mjs [--sheet]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { serve } from '../serve.mjs';
const OUT = new URL('../out/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const srv = await serve();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['NG', name, e.message.split('\n')[0]]); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
export const ctx = { browser, srv, OUT, check, assert };

if (process.argv.includes('--sheet')) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(srv.url + '/tests/e2e/draw-sheet.html'); await p.waitForFunction(() => document.title === 'ready');
  await p.screenshot({ path: OUT + 'sheet.png', fullPage: true });
  await check('sheet: エラーなし', () => assert(errs.length === 0, errs.join(' / ')));
} else {
  const { run } = await import('./site.mjs');
  await run(ctx);
}
await browser.close(); srv.close();
for (const r of results) console.log(r.join(' | '));
const ng = results.filter(r => r[0] === 'NG').length;
console.log(ng ? `FAIL ${ng}/${results.length}` : `PASS ${results.length}/${results.length}`);
process.exit(ng ? 1 : 0);
