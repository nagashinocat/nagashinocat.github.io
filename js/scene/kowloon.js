// 九龍城の路地の作り込み：窓の鉄格子・室外機・洗濯物・屋台と提灯・湯気・電線と配管・濡れた路面・突き当たりのタワー
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { INK } from '../draw/manga.js';
import { ALLEY } from '../layout.js';

const ink = new THREE.MeshBasicMaterial({ color: INK });
const hullMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = canvas(64, 64), g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (glowTex = tex(c));
}
function steamTexture() {
  const c = canvas(64, 64), g = c.getContext('2d');
  for (let i = 0; i < 6; i++) {
    const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, rr = 10 + Math.random() * 10;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(255,240,245,0.5)'); gr.addColorStop(1, 'rgba(255,240,245,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return tex(c);
}

// 同じ形をたくさん置く：位置・回転・大きさ・色の配列から InstancedMesh（輪郭つき）
function instanced(geo, list, mat, outline = 0.18) {
  const g = new THREE.Group();
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  const h = outline ? new THREE.InstancedMesh(geo, hullMat, list.length) : null;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3();
  list.forEach((it, i) => {
    Q.setFromEuler(E.set(...(it.rot || [0, 0, 0])));
    M.compose(V.set(...it.pos), Q, new THREE.Vector3(...it.scale));
    m.setMatrixAt(i, M);
    if (it.color) m.setColorAt(i, new THREE.Color(it.color));
    if (h) { M.compose(V.set(...it.pos), Q, new THREE.Vector3(...it.scale).multiplyScalar(1 + outline)); h.setMatrixAt(i, M); }
  });
  g.add(m); if (h) g.add(h);
  return g;
}

// 鉄格子のかご（窓の外に張り出す）：細い棒を組んだ形
function cageGeometry() {
  const bars = [];
  const bar = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); bars.push(b); };
  const t = 0.06;
  for (const x of [-0.5, -0.17, 0.17, 0.5]) bar(t, 1, t, x, 0, 0.5);
  for (const y of [-0.5, 0.5]) { bar(1, t, t, 0, y, 0.5); bar(t, t, 1, -0.5, y, 0); bar(t, t, 1, 0.5, y, 0); }
  for (const y of [-0.1, 0.25]) bar(1, t * 0.6, t * 0.6, 0, y, 0.5);
  return mergeGeometries(bars);
}

export function addKowloon(root, plan, bmap, decor, r, { pivots = [], signs = [] } = {}) {
  const inner = plan.buildings.filter(b => b.strip === 'inner');
  const facadeOf = b => {
    const nx = b.face === 'east' ? 1 : -1;
    return { nx, x: b.face === 'east' ? b.x + b.w / 2 : b.x - b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2, h: b.h };
  };
  const on = (f, z, y, out) => [f.x + f.nx * out, y, z];

  // --- 窓まわり：室外機・鉄格子・洗濯物 ---
  const acs = [], cages = [], cloths = [], lines = [], pipes = [];
  for (const b of inner) {
    const f = facadeOf(b);
    const floors = Math.floor((f.h - 0.07) / 0.045);
    for (let k = 0; k < floors; k++) {
      const y = 0.09 + k * 0.045;
      for (let z = f.z0 + 0.018; z < f.z1 - 0.018; z += 0.036) {
        const t = r.next();
        if (t < 0.22) cages.push({ pos: on(f, z, y, 0.0075), rot: [0, f.nx * Math.PI / 2, 0], scale: [0.03, 0.034, 0.015], color: r.pick(['#3a2a2a', '#4a3530', '#2c2630', '#5a3c2e']) });
        else if (t < 0.36) acs.push({ pos: on(f, z + r.range(-0.006, 0.006), y - 0.012, 0.009), rot: [0, f.nx * Math.PI / 2, 0], scale: [0.022, 0.014, 0.016], color: r.pick(['#d9d2c2', '#c8c0ae', '#b8b2a6', '#e0dccf']) });
        else if (t < 0.42) {
          const len = r.range(0.02, 0.04), zz = z;
          lines.push([on(f, zz - len / 2, y + 0.01, 0.02), on(f, zz + len / 2, y + 0.01, 0.02)]);
          for (let c = 0; c < 3; c++) cloths.push({ pos: on(f, zz - len / 2 + (c + 0.5) * len / 3, y + 0.0, 0.02), rot: [0, f.nx * Math.PI / 2, 0], scale: [len / 3.6, r.range(0.012, 0.02), 1], color: r.pick(['#f0ece4', '#e88aa8', '#8ac4e8', '#f0d070', '#9c4a5a', '#5a7a9a']) });
        }
      }
    }
    // 壁を這う縦の配管
    for (let k = 0; k < r.int(1, 3); k++) { const z = r.range(f.z0 + 0.01, f.z1 - 0.01); pipes.push([on(f, z, 0, 0.006), on(f, z, f.h * r.range(0.5, 0.98), 0.006)]); }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  // 室外機の前面に格子模様
  const acC = canvas(32, 24), ag = acC.getContext('2d');
  ag.fillStyle = '#fff'; ag.fillRect(0, 0, 32, 24); ag.strokeStyle = '#444'; ag.lineWidth = 1.5;
  ag.beginPath(); ag.arc(11, 12, 8, 0, 7); ag.stroke(); for (let x = 22; x < 30; x += 2.5) { ag.moveTo(x, 4); ag.lineTo(x, 20); } ag.stroke();
  decor.add(instanced(box, acs, new THREE.MeshBasicMaterial({ map: tex(acC) }), 0.14));
  decor.add(instanced(cageGeometry(), cages, new THREE.MeshBasicMaterial(), 0));
  decor.add(instanced(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), cloths, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 0));

  // --- 細い線もの（洗濯ロープ・電線）：まとめて1つのメッシュに ---
  const wireGeos = [];
  const addWire = (a, b, sagK, rad) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), M = A.clone().lerp(B, 0.5); M.y -= A.distanceTo(B) * sagK;
    wireGeos.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 10, rad, 3, false));
  };
  for (const [a, b] of lines) addWire(a, b, 0.05, 0.0006);
  // 路地をまたぐ電線（たくさん）と束
  const L = inner.filter(b => b.x < 0), R = inner.filter(b => b.x > 0);
  const hAt = (side, z) => { const b = side.find(b => Math.abs(b.z - z) <= b.d / 2) || side.reduce((p, q) => Math.abs(q.z - z) < Math.abs(p.z - z) ? q : p); return b.h; };
  for (let i = 0; i < 150; i++) {
    const z = r.range(-0.48, 0.62), z2 = z + r.range(-0.08, 0.08);
    const ha = hAt(L, z), hb = hAt(R, z2);
    const y = r.range(0.12, Math.min(ha, hb) * 0.95);
    addWire([-ALLEY / 2, y, z], [ALLEY / 2, Math.min(hb * 0.95, y + r.range(-0.08, 0.08)), z2], r.range(0.04, 0.16), r.range(0.0006, 0.0011));
  }
  for (let i = 0; i < 16; i++) {
    const z = r.range(-0.4, 0.55), y = r.range(0.18, 0.5), n = r.int(4, 8);
    for (let k = 0; k < n; k++) addWire([-ALLEY / 2, y + k * 0.006, z + k * 0.004], [ALLEY / 2, y + k * 0.005 + r.range(-0.02, 0.02), z + r.range(-0.03, 0.03)], 0.14 + k * 0.025, 0.0007);
  }
  decor.add(new THREE.Mesh(mergeGeometries(wireGeos), new THREE.MeshBasicMaterial({ color: '#0e0810' })));

  // --- 配管・ダクト：路地をまたいで直角に曲がる＋壁を這う。色ごとにまとめる ---
  const pipeBy = new Map();
  const addPipe = (pts, rad, color) => {
    const curve = pts.length === 2 ? new THREE.LineCurve3(...pts.map(p => new THREE.Vector3(...p))) : new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.04);
    if (!pipeBy.has(color)) pipeBy.set(color, { body: [], hull: [] });
    const e = pipeBy.get(color);
    e.body.push(new THREE.TubeGeometry(curve, pts.length === 2 ? 2 : 24, rad, 6, false));
    e.hull.push(new THREE.TubeGeometry(curve, pts.length === 2 ? 2 : 24, rad * 1.55, 6, false));
  };
  const PIPE = ['#5a4248', '#6b4a3a', '#4a3f52', '#7a5a48', '#3d3440', '#7d6f60'];
  for (const [a, b] of pipes) addPipe([a, b], r.range(0.0016, 0.0032), r.pick(PIPE));
  for (let i = 0; i < 26; i++) {
    const z = r.range(-0.45, 0.3), y = r.range(0.1, Math.min(hAt(L, z), hAt(R, z)) * 0.9), dy = r.range(-0.06, 0.08), off = r.range(0.006, 0.025);
    addPipe([[-ALLEY / 2, y, z], [-ALLEY / 2 + off, y, z], [-ALLEY / 2 + off, y + dy, z], [ALLEY / 2 - off, y + dy, z + r.range(-0.02, 0.02)], [ALLEY / 2 - off, y, z], [ALLEY / 2, y, z]], r.next() < 0.3 ? r.range(0.003, 0.005) : r.range(0.0012, 0.0024), r.pick(PIPE));
  }
  for (const side of [L, R]) for (let i = 0; i < 18; i++) {
    const b = r.pick(side), f = facadeOf(b), y = r.range(0.06, b.h * 0.9), za = r.range(f.z0, f.z1), zb = za + r.range(-0.15, 0.15);
    addPipe([[f.x + f.nx * 0.007, y, za], [f.x + f.nx * 0.007, y, (za + zb) / 2], [f.x + f.nx * 0.007, y + r.range(-0.04, 0.04), zb]], r.range(0.0012, 0.0028), r.pick(PIPE));
  }
  for (const [color, e] of pipeBy) {
    decor.add(new THREE.Mesh(mergeGeometries(e.body), new THREE.MeshBasicMaterial({ color })));
    decor.add(new THREE.Mesh(mergeGeometries(e.hull), hullMat));
  }

  // --- 1階の屋台：日よけ・カウンター・提灯・裸電球 ---
  const lanterns = [], bulbs = [], awnings = [];
  for (const b of inner) {
    const f = facadeOf(b);
    if (r.next() < 0.25) continue;
    const zc = (f.z0 + f.z1) / 2, len = f.z1 - f.z0 - 0.006;
    awnings.push({ f, zc, len, color: r.pick(['#a8323c', '#2f5d7a', '#3d6b3a', '#8a6a2a', '#6a3a6a']), y: r.range(0.06, 0.075) });
    const n = Math.max(1, Math.floor(len / 0.025));
    if (r.next() < 0.6) for (let k = 0; k < n; k++) lanterns.push({ pos: on(f, f.z0 + (k + 0.5) * len / n, 0.052, 0.03), color: r.pick(['#ff3b2a', '#ff5030', '#ffb030']) });
    else for (let k = 0; k < n * 2; k++) bulbs.push(on(f, f.z0 + (k + 0.5) * len / (n * 2), 0.058, 0.028));
  }
  for (const a of awnings) {
    const c = canvas(64, 16), g = c.getContext('2d');
    for (let x = 0; x < 64; x += 8) { g.fillStyle = (x / 8) % 2 ? a.color : '#efe6d6'; g.fillRect(x, 0, 8, 16); }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 12, 64, 4);
    const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(1, 1);
    const top = new THREE.MeshBasicMaterial({ map: t }), dark = new THREE.MeshBasicMaterial({ color: '#2a1a1a' });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0015, a.len), [dark, dark, top, top, dark, dark]);
    m.position.set(a.f.x + a.f.nx * 0.016, a.y, a.zc);
    m.rotation.z = -a.f.nx * 0.42;
    m.add(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.003, a.len + 0.002), hullMat));
    decor.add(m);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0015, a.len), ink);
    edge.position.set(a.f.x + a.f.nx * 0.032, a.y - 0.008, a.zc); decor.add(edge);
    // 屋台のカウンター（中が明るい）
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, a.len * 0.8), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshBasicMaterial({ color: i === 2 ? '#8a6a50' : '#3e2a22' })));
    counter.position.set(a.f.x + a.f.nx * 0.01, 0.01, a.zc);
    counter.add(new THREE.Mesh(new THREE.BoxGeometry(0.0155, 0.0215, a.len * 0.8 + 0.0015), hullMat));
    decor.add(counter);
  }
  const lanternGeo = new THREE.SphereGeometry(1, 10, 8);
  decor.add(instanced(lanternGeo, lanterns.map(l => ({ pos: l.pos, scale: [0.0075, 0.0095, 0.0075], color: l.color })), new THREE.MeshBasicMaterial(), 0.16));
  // 提灯を路地にも吊る（路地の上を横切る列）
  const crossL = [];
  for (const d of plan.decor.filter(d => d.type === 'lantern')) {
    const A = new THREE.Vector3(...d.from), B = new THREE.Vector3(...d.to), n = 4;
    const M = A.clone().lerp(B, 0.5); M.y -= 0.02;
    const curve = new THREE.QuadraticBezierCurve3(A, M, B);
    decor.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.0006, 3, false), ink));
    for (let k = 1; k <= n; k++) { const p = curve.getPoint(k / (n + 1)); crossL.push({ pos: [p.x, p.y - 0.01, p.z], scale: [0.0065, 0.0085, 0.0065], color: r.pick(['#ff3b2a', '#ff6a2a']) }); }
  }
  decor.add(instanced(lanternGeo, crossL, new THREE.MeshBasicMaterial(), 0.16));
  // 光のにじみ（提灯・電球）
  const glowPts = [...lanterns.map(l => [l.pos, '#ff6040', 0.05]), ...crossL.map(l => [l.pos, '#ff5030', 0.045]), ...bulbs.map(p => [p, '#ffd890', 0.02])];
  const gp = new Float32Array(glowPts.length * 3), gc = new Float32Array(glowPts.length * 3);
  glowPts.forEach(([p, c], i) => { gp.set(p, i * 3); const col = new THREE.Color(c); gc.set([col.r, col.g, col.b], i * 3); });
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  decor.add(new THREE.Points(gg, new THREE.PointsMaterial({ map: glowTexture(), size: 0.045, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const bp = new THREE.BufferGeometry(); bp.setAttribute('position', new THREE.Float32BufferAttribute(bulbs.flat(), 3));
  decor.add(new THREE.Points(bp, new THREE.PointsMaterial({ color: '#fff2c0', size: 0.004 })));

  // --- 湯気 ---
  const steam = [];
  const st = steamTexture();
  for (const a of awnings.filter(() => r.next() < 0.5)) {
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { base: new THREE.Vector3(a.f.x + a.f.nx * 0.03, 0.03, a.zc + r.range(-0.02, 0.02)), t: r.range(0, 3), speed: r.range(0.25, 0.4) };
      decor.add(s); steam.push(s);
    }
  }

  // --- 突き当たりのタワー：冠・尖塔・サーチライト・ネオン ---
  const bb = bmap.get(plan.billboard.bldgId);
  const top = bb.b.h;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(bb.b.fw * 0.34, bb.b.fw * 0.5, 0.12, 8), new THREE.MeshBasicMaterial({ color: '#2a2440' }));
  crown.position.set(0, top / 2 + 0.06, -bb.b.fd / 2); crown.add(new THREE.Mesh(new THREE.CylinderGeometry(bb.b.fw * 0.35, bb.b.fw * 0.51, 0.122, 8), hullMat));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.2, 6), new THREE.MeshBasicMaterial({ color: '#3a3450' }));
  spire.position.set(0, 0.16, 0); crown.add(spire);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(bb.b.fw * 0.36, 0.003, 4, 24), new THREE.MeshBasicMaterial({ color: '#4fd8ff' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; crown.add(ring);
  bb.mesh.add(crown);
  const beams = [];
  const beamMat = new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * bb.b.fw * 0.3, top / 2 + 0.1, -bb.b.fd / 2 + 0.02);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 2.4, 16, 1, true), beamMat);
    cone.position.y = 1.2; cone.rotation.z = Math.PI; // 先が根元
    pivot.add(cone); pivot.rotation.z = -s * 0.35;
    pivot.userData = { s, phase: r.range(0, 6) };
    bb.mesh.add(pivot); beams.push(pivot);
  }
  // ネオンの大看板（タワーの上部）
  const nc = canvas(256, 96), ng = nc.getContext('2d');
  ng.fillStyle = '#12060f'; ng.fillRect(0, 0, 256, 96);
  ng.font = '72px "Dela Gothic One","Hiragino Kaku Gothic StdN",sans-serif'; ng.textAlign = 'center'; ng.textBaseline = 'middle';
  ng.shadowColor = '#ff3b6a'; ng.shadowBlur = 18; ng.fillStyle = '#ff5a7a'; ng.fillText('開発街', 128, 50);
  ng.shadowBlur = 0; ng.fillStyle = '#ffe0e8'; ng.globalAlpha = 0.6; ng.fillText('開発街', 128, 50); ng.globalAlpha = 1;
  ng.strokeStyle = '#ff3b6a'; ng.lineWidth = 4; ng.strokeRect(6, 6, 244, 84);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(bb.b.fw * 0.9, bb.b.fw * 0.34), new THREE.MeshBasicMaterial({ map: tex(nc) }));
  neon.position.set(0, top / 2 - 0.05, bb.b.fd / 2 + 0.006);
  bb.mesh.add(neon);

  // --- 手前の壁に描かれた大きな文字（色あせたペンキ） ---
  const near = L.slice().sort((a, b) => b.z - a.z)[0];
  if (near) {
    const f = facadeOf(near), c = canvas(128, 512), g = c.getContext('2d');
    g.fillStyle = 'rgba(232,222,210,0.78)'; g.fillRect(6, 6, 116, 500);
    g.font = '96px "Dela Gothic One","Hiragino Mincho ProN",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#8a1e22';
    ['開', '発', '置', '場'].forEach((ch, i) => g.fillText(ch, 64, 70 + i * 116));
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r.range(0.2, 0.9)})`; g.beginPath(); g.arc(r.range(0, 128), r.range(0, 512), r.range(1, 6), 0, 7); g.fill(); }
    const hgt = Math.min(near.h * 0.55, 0.36);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(hgt / 4, hgt), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true }));
    decal.position.set(f.x + f.nx * 0.003, near.h * 0.45, (f.z0 + f.z1) / 2);
    decal.rotation.y = f.nx * Math.PI / 2;
    decor.add(decal);
  }

  // --- 濡れた路面（水たまりにネオンが映る） ---
  const wet = new THREE.Group();
  // 濡れたアスファルト：墨のひび、水たまりの縁
  const pc = canvas(256, 1024), pg = pc.getContext('2d');
  pg.fillStyle = '#1a1220'; pg.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 70; i++) { const x = r.range(0, 256), y = r.range(0, 1024), rx = r.range(14, 70), ry = r.range(8, 40); pg.fillStyle = 'rgba(70,50,90,0.35)'; pg.beginPath(); pg.ellipse(x, y, rx, ry, 0, 0, 7); pg.fill(); pg.strokeStyle = 'rgba(10,5,14,0.8)'; pg.lineWidth = 1.5; pg.stroke(); }
  pg.strokeStyle = 'rgba(8,4,10,0.9)'; pg.lineWidth = 2;
  for (let i = 0; i < 50; i++) { let x = r.range(0, 256), y = r.range(0, 1024); pg.beginPath(); pg.moveTo(x, y); for (let k = 0; k < 4; k++) { x += r.range(-20, 20); y += r.range(-30, 30); pg.lineTo(x, y); } pg.stroke(); }
  pg.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 1024; y += 4) for (let x = (y / 4 % 2) * 2; x < 256; x += 4) pg.fillRect(x, y, 1.2, 1.2);
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(ALLEY + 0.01, 1.32), new THREE.MeshBasicMaterial({ map: tex(pc) }));
  overlay.rotation.x = -Math.PI / 2; overlay.position.set(0, 0.0045, 0.04);
  wet.add(overlay);
  // 看板・提灯の光が路面に縦長に映る（加算の帯）
  const refl = canvas(32, 128), rg = refl.getContext('2d');
  const grd = rg.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  rg.fillStyle = grd; for (let x = 0; x < 32; x += 1) { rg.globalAlpha = 0.3 + 0.7 * Math.sin(x / 31 * Math.PI) * (0.6 + 0.4 * Math.random()); rg.fillRect(x, 0, 1, 128); }
  const reflTex = tex(refl);
  const saved = pivots.map(p => p.rotation.x);
  pivots.forEach(p => p.userData.stand ? p.userData.stand(Math.PI / 2) : (p.rotation.x = 0));
  root.updateMatrixWorld(true);
  const W = new THREE.Vector3();
  const lights = [...signs.map(sg => { sg.getWorldPosition(W); const m = sg.userData.faceMat || (Array.isArray(sg.material) ? sg.material[4] : sg.material); return [W.clone(), m.map ? (sg.userData.color || '#ff4fa3') : '#ffffff', sg]; })];
  pivots.forEach((p, i) => { p.rotation.x = saved[i]; });
  root.updateMatrixWorld(true);
  for (const [pos, , sg] of lights) {
    if (Math.abs(pos.x) > ALLEY / 2 + 0.06 || pos.y > 0.6) continue;
    const col = new THREE.Color(sg.userData.color || '#ff7ab0');
    const len = 0.05 + pos.y * 0.5;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.05, 0.02 + pos.y * 0.04), len), new THREE.MeshBasicMaterial({ map: reflTex, color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(THREE.MathUtils.clamp(pos.x, -ALLEY / 2 + 0.01, ALLEY / 2 - 0.01), 0.005, pos.z + len / 2);
    wet.add(m);
  }
  root.add(wet);

  return {
    wet, overlay,
    animate(time, dt) {
      for (const s of steam) {
        const u = s.userData; u.t += dt * u.speed;
        const k = u.t % 1;
        s.position.copy(u.base).add(new THREE.Vector3(Math.sin(u.t * 3) * 0.004, k * 0.09, 0));
        s.scale.setScalar(0.02 + k * 0.05);
        s.material.opacity = Math.sin(k * Math.PI) * 0.5;
      }
      for (const p of beams) p.rotation.z = -p.userData.s * (0.3 + Math.sin(time * 0.5 + p.userData.phase) * 0.25);
    },
  };
}
