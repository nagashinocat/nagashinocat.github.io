// 本のページに立ち上がる、工場街と空き地の小さなジオラマ（ページをめくる場面で使う）
// 大きさは路地のジオラマと同じ：見開き 2.2×1.6、手前が +z。紙の箱に絵を印刷して、光は本物
import * as THREE from 'three';
import { rustWall } from './factorypaper.js';
import { graffitiWall, fenceTex } from './lotpaper.js';
import { paperBuildingDetailed, paperTank, paperAntenna, paperPipe } from './paper.js';
import { glowTex } from './parts.js';
import { rng } from '../rng.js';

const INK = '#1a1018';
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tx = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const edgeM = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22 });
const edged = (m, a = 30) => { m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, a), edgeM)); return m; };
const paper = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, ...o });

// 地面の絵（見開きに敷くカーペット）
function groundCanvas(kind, r) {
  const W = 1536, H = 1100, c = cv(W, H), g = c.getContext('2d');
  if (kind === 'tools') {
    g.fillStyle = 'rgba(40,40,46,0.92)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '10,10,14' : '110,110,120'},${r.next() * 0.25})`; g.fillRect(r.next() * W, r.next() * H, 2 + r.next() * 3, 2 + r.next() * 3); }
    for (const x of [0.44, 0.56]) { g.fillStyle = 'rgba(255,200,30,0.85)'; g.fillRect(W * x - 4, 0, 8, H); }
    for (let y = 0; y < H; y += 40) { g.fillStyle = 'rgba(255,200,30,0.6)'; g.fillRect(W * 0.2, y, 6, 22); g.fillRect(W * 0.8, y, 6, 22); }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) { const x = r.next() * W, y = r.next() * H, rr = 20 + r.next() * 80; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(0,0,0,0.8)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  } else {
    g.fillStyle = 'rgba(70,64,70,0.94)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '14,10,14' : '130,120,128'},${r.next() * 0.3})`; g.fillRect(r.next() * W, r.next() * H, 2 + r.next() * 3, 2 + r.next() * 3); }
    for (let i = 0; i < 120; i++) { const x = r.next() * W, y = r.next() * H, rr = 14 + r.next() * 60; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(70,96,40,0.55)'); gg.addColorStop(1, 'rgba(70,96,40,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    g.strokeStyle = 'rgba(10,8,10,0.8)'; for (let i = 0; i < 60; i++) { g.lineWidth = 1 + r.next() * 2; let x = r.next() * W, y = r.next() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r.next() - 0.5) * 60; y += (r.next() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 30; i++) { const x = r.next() * W, y = r.next() * H, rr = 30 + r.next() * 90; g.save(); g.translate(x, y); g.scale(1, 0.45); const gg = g.createRadialGradient(0, 0, 0, 0, 0, rr); gg.addColorStop(0, 'rgba(0,0,0,0.9)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore(); }
  }
  return tx(c);
}

// 錆びた工場の棟（絵は数枚を使い回す）
function sheds(r, n) {
  const T = Array.from({ length: 3 }, () => rustWall(0.5, 0.35, r, { ppu: 700, windows: [{ x0: 0.04, x1: 0.46, y: 0.18, h: 0.08, n: 4, lit: 0.35 }] }));
  const side = paper(null, { color: '#4a3026' });
  return (w, h, d) => {
    const t = r.pick(T).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 0.5, h / 0.35);
    const face = paper(t);
    const m = edged(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [face, face, paper(null, { color: '#3a2a26' }), side, face, face]), 20);
    m.position.y = h / 2; const g = new THREE.Group(); g.add(m); return g;
  };
}

/** 工場街のジオラマ。返り値 { group, items(立ち上がる物), groundTex, ups } */
export function buildFactoryMini(seed = 41) {
  const r = rng(seed), group = new THREE.Group(), items = [], ups = [];
  const add = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; group.add(o); items.push(o); return o; };
  const shed = sheds(r);
  // まんなか奥：大きな第3工場。入口から水色の光がもれる
  {
    const main = add(shed(0.9, 0.42, 0.42), 0, -0.4);
    const open = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22), new THREE.MeshBasicMaterial({ color: '#7fe6ff', toneMapped: false })); open.position.set(0, 0.11, 0.212); main.add(open);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#4fd8ff', transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(0.5, 0.28, 1); halo.position.set(0, 0.12, 0.25); main.add(halo);
    const L = new THREE.PointLight('#7fe6ff', 0.3, 0.8, 1.6); L.position.set(0, 0.12, 0.35); main.add(L);
    open.material.color.setScalar(0.55);
    const roof = edged(new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.02, 0.44), paper(null, { color: '#5a3a2c' }))); roof.position.y = 0.43; main.add(roof);
  }
  // 両側の棟（V字に並ぶ）
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const w = r.range(0.18, 0.3), h = r.range(0.14, 0.34), d = r.range(0.16, 0.26);
    add(shed(w, h, d), s * (0.42 + k * 0.13 + r.range(0, 0.05)), -0.3 + k * 0.24, s * -0.35);
  }
  // 煙突（赤白の帯）と煙
  const stripe = (() => { const c = cv(64, 256), g = c.getContext('2d'); for (let y = 0; y < 256; y += 32) { g.fillStyle = (y / 32) % 2 ? '#e8e0d4' : '#c03a2a'; g.fillRect(0, y, 64, 32); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(40,20,10,${Math.random() * 0.4})`; g.fillRect(Math.random() * 64, Math.random() * 256, 3, 6); } return tx(c); })();
  const smoke = glowTex();
  for (const [x, z, h] of [[-0.62, -0.55, 0.75], [0.5, -0.62, 0.9], [0.78, -0.3, 0.6]]) {
    const ch = add(new THREE.Group(), x, z);
    const tube = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, h, 14), paper(stripe))); tube.position.y = h / 2; ch.add(tube);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff3a2a', toneMapped: false })); lamp.position.y = h + 0.008; ch.add(lamp);
    const puffs = Array.from({ length: 6 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: '#8a8aa0', transparent: true, opacity: 0, depthWrite: false })); ch.add(s); return [s, i / 6]; });
    ups.push(t => { for (const [s, ph] of puffs) { const u = (t * 0.15 + ph) % 1; s.position.set(u * 0.12, h + u * 0.35, -u * 0.05); s.scale.setScalar(0.06 + u * 0.22); s.material.opacity = Math.sin(u * Math.PI) * 0.35; } lamp.visible = Math.sin(t * 4) > 0; });
  }
  // 銀のタンク、配管、クレーン
  const metal = new THREE.MeshStandardMaterial({ color: '#c8d0da', metalness: 0.6, roughness: 0.35 });
  for (const [x, z, rad, h] of [[-0.3, 0.05, 0.06, 0.2], [-0.16, 0.12, 0.045, 0.16], [0.3, 0.1, 0.07, 0.24]]) {
    const tk = add(new THREE.Group(), x, z);
    const b = edged(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 18), metal)); b.position.y = h / 2; tk.add(b);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.02, rad * 1.02, 0.012, 18), new THREE.MeshBasicMaterial({ color: '#4fd8ff', toneMapped: false })); band.position.y = h * 0.6; tk.add(band);
  }
  group.add(paperPipe([new THREE.Vector3(-0.3, 0.16, 0.05), new THREE.Vector3(-0.3, 0.26, 0.05), new THREE.Vector3(-0.3, 0.26, -0.2)], 0.008, '#8a8a92'));
  const yellow = new THREE.MeshStandardMaterial({ color: '#e8b818', roughness: 0.6 });
  {
    const cr = add(new THREE.Group(), 0.62, 0.25, -0.3);
    for (const sx of [-1, 1]) { const leg = edged(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.4, 0.014), yellow)); leg.position.set(sx * 0.12, 0.2, 0); cr.add(leg); }
    const beam = edged(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), yellow)); beam.position.y = 0.4; cr.add(beam);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.14, 0.002), metal); hook.position.set(0.04, 0.33, 0); cr.add(hook);
  }
  // 外の灯り
  for (const [x, z] of [[-0.45, 0.35], [0.45, 0.4], [0, 0.0]]) {
    const L = new THREE.PointLight('#ffb060', 0.1, 0.4, 2); L.position.set(x, 0.12, z); group.add(L);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: '#ffb060', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(0.12); s.position.set(x, 0.12, z); group.add(s); items.push(s);
  }
  return { group, items, groundTex: groundCanvas('tools', r), ups };
}

/** 空き地のジオラマ */
export function buildLotMini(seed = 43) {
  const r = rng(seed), group = new THREE.Group(), items = [], ups = [];
  const add = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; group.add(o); items.push(o); return o; };
  // 奥の九龍城（箱を積んだかたまり）
  for (let x = -0.95; x < 0.95;) {
    const w = r.range(0.08, 0.14);
    for (let z = -0.72; z > -0.78 - 0.01;) { const d = r.range(0.06, 0.1); const c = 1 - Math.abs(x / 0.95); const h = 0.25 + c * 0.45 + r.range(-0.06, 0.1); const b = paperBuildingDetailed(w * 0.97, h, d, r, { cheap: true, bare: true }); add(b, x + w / 2, z); if (r.next() < 0.3) { const a = paperAntenna(r); a.position.set(0, h, -d / 2); b.add(a); } z -= d; }
    x += w;
  }
  // 落書きの壁と金網（コの字）
  const wallT = graffitiWall(1.8, 0.12, r);
  const back = add(new THREE.Group(), 0, -0.5);
  const bw = edged(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.02), [paper(null, { color: '#4a4650' }), paper(null, { color: '#4a4650' }), paper(null, { color: '#5a5660' }), paper(null, { color: '#4a4650' }), paper(wallT), paper(null, { color: '#4a4650' })]), 20); bw.position.y = 0.06; back.add(bw);
  const fT = fenceTex();
  const fence = (len, x, z, ry) => {
    const f = add(new THREE.Group(), x, z, ry);
    const t = fT.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 0.04, 0.16 / 0.04);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.16), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.6 })); m.position.y = 0.08; f.add(m);
    for (let k = 0; k <= Math.round(len / 0.15); k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 6), new THREE.MeshStandardMaterial({ color: '#5a3a2c' })); p.position.set(-len / 2 + k * len / Math.round(len / 0.15), 0.09, 0); f.add(p); }
  };
  fence(1.8, 0, -0.48, 0); fence(1.0, -0.9, 0.0, Math.PI / 2); fence(1.0, 0.9, 0.0, Math.PI / 2);
  // まんなかの丸い穴と、ずれた蓋
  {
    const h = add(new THREE.Group(), -0.05, 0.05);
    const rim = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.02, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#5a5458', side: THREE.DoubleSide })), 50); rim.position.y = 0.01; h.add(rim);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), new THREE.MeshBasicMaterial({ color: '#5ff0ff', toneMapped: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.004; h.add(glow);
    const L = new THREE.PointLight('#5ff0ff', 0.6, 0.8, 1.6); L.position.y = 0.08; h.add(L);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#4fe8ff', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(0.5, 0.2, 1); halo.position.y = 0.05; h.add(halo);
    const stripes = (() => { const c = cv(512, 32), g = c.getContext('2d'); g.fillStyle = '#2a2224'; g.fillRect(0, 0, 512, 32); for (let x = -32; x < 544; x += 24) { g.fillStyle = '#e8b818'; g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 12, 32); g.lineTo(x + 24, 0); g.lineTo(x + 12, 0); g.fill(); } return tx(c); })();
    const lid = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.025, 40), [paper(stripes), paper(null, { color: '#4a4246' }), paper(null, { color: '#2a2224' })]), 50);
    lid.position.set(-0.12, 0.035, -0.1); lid.rotation.set(0.06, 0, -0.08); h.add(lid);
  }
  // ドラム缶と草
  const barrel = new THREE.MeshStandardMaterial({ color: '#6a3a22', roughness: 0.8, metalness: 0.3 });
  for (const [x, z] of [[0.5, 0.35], [0.58, 0.28], [-0.6, -0.2]]) { const b = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), barrel)); b.position.y = 0.04; add(new THREE.Group(), x, z).add(b); }
  const grass = (() => { const c = cv(128, 128), g = c.getContext('2d'); for (let i = 0; i < 40; i++) { const x = 10 + r.next() * 108, h = 30 + r.next() * 95; g.fillStyle = r.pick(['#4a6a2a', '#6a8a3a', '#3a5020']); g.beginPath(); g.moveTo(x - 2, 128); g.lineTo(x + (r.next() - 0.5) * 30, 128 - h); g.lineTo(x + 3, 128); g.fill(); } return tx(c); })();
  const gm = new THREE.MeshStandardMaterial({ map: grass, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  for (let i = 0; i < 60; i++) { const x = (r.next() - 0.5) * 1.7, z = -0.45 + r.next() * 1.1; if (Math.hypot(x + 0.05, z - 0.05) < 0.26) continue; const g = add(new THREE.Group(), x, z, r.next() * 3); for (let k = 0; k < 2; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.04), gm); p.position.y = 0.02; p.rotation.y = k * Math.PI / 2; g.add(p); } }
  // 夕暮れのピンクの灯り
  const dusk = new THREE.PointLight('#ff8ac8', 0.5, 2.0, 1.4); dusk.position.set(0, 0.6, -0.9); group.add(dusk);
  return { group, items, groundTex: groundCanvas('wip', r), ups };
}
