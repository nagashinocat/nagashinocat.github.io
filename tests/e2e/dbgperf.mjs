import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
import { routeThree } from './site.mjs';
const srv = await serve();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.setDefaultTimeout(300000);
const t0 = Date.now();
await routeThree(p); await p.goto(srv.url + '/?manual');
await p.waitForFunction(() => window.__hub?.world);
console.log('load ms', Date.now() - t0);
const stat = async label => console.log(label, JSON.stringify(await p.evaluate(() => {
  const w = window.__hub.world, r = w.renderer, out = { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries };
  for (const [k, sc] of Object.entries(w.__scenes)) { let L = 0, M = 0, refl = 0; sc.traverse(o => { if (o.isPointLight || o.isSpotLight) L++; if (o.isMesh) M++; if (o.isReflector || o.type === 'Reflector' || o.getRenderTarget) refl++; }); out[k] = { lights: L, meshes: M, refl }; }
  return out;
})));
await p.evaluate(() => window.__hub.world.renderAt(8)); await stat('intro t=8');
await p.evaluate(() => window.__hub.world.renderAt(20)); await stat('alley');
await p.evaluate(() => { const r = window.__hub.world.renderer; r.info.autoReset = false; r.info.reset(); window.__hub.world.renderAt(20.02); }); await stat('alley one frame (all passes)');
console.log(JSON.stringify(await p.evaluate(() => { const sc = window.__hub.world.__scenes.A; const c = {}; const mats = new Set(); sc.traverse(o => { if (!o.isMesh) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; mats.add(m.uuid); const k = (m.transparent ? 'T' : 'O') + ':' + m.type + (o.isSkinnedMesh ? ':skin' : '') + (m.side === 2 ? ':ds' : ''); c[k] = (c[k] || 0) + 1; }); c.mats = mats.size; return c; })));
let t1 = Date.now(); for (let i = 0; i < 5; i++) await p.evaluate(t => window.__hub.world.renderAt(t), 20 + i * 0.03); console.log('alley ms/frame (swiftshader)', (Date.now() - t1) / 5);
await b.close(); srv.close();
