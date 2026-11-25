// 軽くするための後処理：灯りの数をしぼる、細かい線は映り込みに描かない、映り込みは1コマおきに更新
import * as THREE from 'three';

export const DETAIL_LAYER = 1; // 紙の折り目の線など：画面には描くが、床の映り込みには描かない

/** maxLights: 残す点光源の数（明るくて広く照らすものから） */
export function optimizeScene(scene, { maxLights = 10, reflectEvery = 2 } = {}) {
  const lights = [];
  scene.traverse(o => {
    if (o.isPointLight) lights.push(o);
    if (o.isLineSegments || o.isLine) o.layers.set(DETAIL_LAYER);
    if ((o.isReflector || o.type === 'Reflector') && !o.userData.throttled) {
      o.userData.throttled = true;
      const orig = o.onBeforeRender; let n = 0;
      o.onBeforeRender = function (...a) { if (n++ % reflectEvery === 0) orig.apply(this, a); };
    }
  });
  // 灯りは1つ増えるごとに、すべての面の計算が重くなる。近くの灯りどうしを1つにまとめて数を減らす
  // （場所ごとの明るさと色はだいたい残る）
  const items = lights.filter(L => L.visible && L.intensity > 0).map(L => ({ L, p: L.getWorldPosition(new THREE.Vector3()), w: L.intensity, c: L.color.clone(), d: L.distance || 1, decay: L.decay }));
  let groups = items.map(it => [it]);
  for (let R = 0.08; groups.length > maxLights && R < 4; R *= 1.35) {
    const next = [];
    for (const g of groups) {
      const cg = center(g), near = next.find(h => center(h).distanceTo(cg) < R);
      if (near) near.push(...g); else next.push(g);
    }
    groups = next;
  }
  // まとめなくても、灯りはすべて一番上に移す（建物が出たり消えたりしても灯りの数が変わらない＝描き方の作り直しが起きない）
  {
    for (const L of lights) L.parent?.remove(L);
    for (const g of groups) {
      const w = g.reduce((a, b) => a + b.w, 0), cg = center(g);
      const spread = Math.max(...g.map(it => it.p.distanceTo(cg)));
      const col = new THREE.Color(0, 0, 0); for (const it of g) col.add(it.c.clone().multiplyScalar(it.w / w));
      const L = new THREE.PointLight(col, g.length > 1 ? w * 0.75 / Math.sqrt(g.length) * 1.6 : w, Math.max(...g.map(it => it.d)) + spread * 0.6, g[0].decay);
      L.position.copy(cg); L.userData.base = L.intensity; scene.add(L);
    }
  }
  return { before: lights.length, after: Math.min(lights.length, maxLights) };
}
function center(g) { const c = new THREE.Vector3(); let w = 0; for (const it of g) { c.addScaledVector(it.p, it.w); w += it.w; } return w ? c.multiplyScalar(1 / w) : g[0].p.clone(); }

/** 重さに合わせて、描く細かさ（ピクセル比）を自動で上げ下げする */
export function adaptiveResolution({ min = 0.6, max = 1.5, start = 1, apply }) {
  let pr = Math.min(max, start), acc = 0, n = 0, calm = 0;
  apply(pr);
  return dt => {
    acc += dt; n++;
    if (n < 30) return;
    const avg = acc / n; acc = 0; n = 0;
    if (avg > 1 / 40 && pr > min) { pr = Math.max(min, pr - 0.15); calm = 0; apply(pr); }
    else if (avg < 1 / 58 && pr < max && ++calm >= 10) { pr = Math.min(max, pr + 0.1); calm = 0; apply(pr); } // 上げるのはゆっくり（行ったり来たりしない）
  };
}

/**
 * 動かない物をまとめて描く（描く回数を減らす）。
 * ups を何回か動かして位置が変わらなかった、不透明な面と線だけを、材質ごとに1つにまとめる。
 * exclude の物（とその子）は触らない（タッチの的、動く生きものなど）
 */
// ups を何回か動かして、位置が変わる物（動く物）を見つける
export function findDynamic(scene, ups = []) {
  const dyn = new Set();
  scene.updateMatrixWorld(true);
  const snap = new Map();
  scene.traverse(o => { if (o.isMesh || o.isLineSegments) snap.set(o, o.matrixWorld.clone()); });
  for (const t of [0.7, 1.9, 3.3]) { for (const u of ups) { try { u && u(t, 1 / 60); } catch { /* */ } } scene.updateMatrixWorld(true); for (const [o, m] of snap) if (!o.matrixWorld.equals(m)) dyn.add(o); }
  return dyn;
}
let mergeGeometries;
export async function mergeStatic(scene, { exclude = [], ups = [], dynamic = null, into = null } = {}) {
  mergeGeometries ??= (await import('three/addons/utils/BufferGeometryUtils.js')).mergeGeometries;
  const skip = new Set(dynamic || findDynamic(scene, ups));
  for (const o of exclude) o && o.traverse(c => skip.add(c));
  const root = into || scene; root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert(), m4 = new THREE.Matrix4();
  const buckets = new Map(); // 材質 → [geometry...]
  const victims = [];
  const visibleUp = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  root.traverse(o => {
    if (skip.has(o) || o === root || !visibleUp(o) || o.isSkinnedMesh || o.isInstancedMesh || o.isSprite || o.isReflector || o.type === 'Reflector') return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    const isLine = o.isLineSegments;
    if (!o.isMesh && !isLine) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some(m => !m || m.transparent || m.side === THREE.BackSide || (!isLine && !m.isMeshStandardMaterial && !m.isMeshBasicMaterial && !m.isMeshLambertMaterial))) return;
    let g = o.geometry; if (!g?.attributes?.position) return;
    g = g.index ? g.toNonIndexed() : g.clone();
    g.applyMatrix4(m4.multiplyMatrices(toRoot, o.matrixWorld));
    const keep = isLine ? ['position'] : ['position', 'normal', 'uv'];
    for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
    if (!isLine) { if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); }
    const parts = Array.isArray(o.material) && g.groups.length ? g.groups.map(gr => [o.material[gr.materialIndex], gr.start, gr.count]) : [[mats[0], 0, g.attributes.position.count]];
    for (const [m, start, count] of parts) {
      if (!m || !count) continue;
      const sub = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(g.attributes)) sub.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
      const key = (isLine ? 'L' : 'M') + m.uuid;
      if (!buckets.has(key)) buckets.set(key, { m, isLine, geos: [] });
      buckets.get(key).geos.push(sub);
    }
    victims.push(o);
  });
  let before = victims.length, after = 0;
  for (const o of victims) o.parent?.remove(o);
  for (const { m, isLine, geos } of buckets.values()) {
    for (let i = 0; i < geos.length; i += 2000) { // 大きくなりすぎないように区切る
      const merged = mergeGeometries(geos.slice(i, i + 2000), false); if (!merged) continue;
      const obj = isLine ? new THREE.LineSegments(merged, m) : new THREE.Mesh(merged, m);
      if (isLine) obj.layers.set(DETAIL_LAYER); else obj.layers.enable(OCCLUDER_LAYER);
      obj.matrixAutoUpdate = false; obj.updateMatrix(); root.add(obj); after++;
    }
  }
  return { before, after };
}

export const OCCLUDER_LAYER = 3; // まとめた建物：細かく描く物の手前にあるかの判定に使う
export const SHARP_LAYER = 2; // 看板・猫・クジラ：いつも細かく描く
export function markSharp(obj) { obj.traverse(o => o.layers.enable(SHARP_LAYER)); }
// 灯りは細かく描く段でも効くように
export function lightsForSharp(scene) { scene.traverse(o => { if (o.isLight) o.layers.enable(SHARP_LAYER); }); }
