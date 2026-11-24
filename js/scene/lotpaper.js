// 空き地のページ：金網と落書きの壁に囲まれた荒れた空き地。真ん中に大きな丸い蓋が半分ずれて、地下の光る施設がのぞく。
// 遠くにネオンの高層ビル、夕暮れの紫の空。建物は紙、光と水たまりは本物の光で
import * as THREE from 'three';
import { boardSign } from './signs.js';
import { paperBuildingDetailed, paperAntenna, paperTank } from './paper.js';
import { glowTex } from './parts.js';
import { rng } from '../rng.js';
import { orderForStands } from '../layout.js';

const ROOT = new URL('../../', import.meta.url).href;
const INK = '#1a1018';
const JP = '"Dela Gothic One","Hiragino Kaku Gothic StdN","Noto Sans JP",sans-serif';
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tx = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
const paper = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, ...o });
const edgeM = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22 });
function edged(mesh, ang = 30) { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, ang), edgeM)); return mesh; }

const HX = -0.06, HZ = 0.12, HR = 0.3; // 穴の中心と半径

// 夕暮れの空と、遠くのネオンの街（空の絵）
function skyCanvas(r) {
  const c = cv(2048, 1024), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, '#120c2e'); gr.addColorStop(0.35, '#3a2066'); gr.addColorStop(0.55, '#a44a8c'); gr.addColorStop(0.68, '#ff8aa8'); gr.addColorStop(1, '#2a1a30');
  g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 30; i++) { const x = r.next() * 2048, y = 150 + r.next() * 400, rr = 120 + r.next() * 260; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(255,170,210,0.2)'); gg.addColorStop(1, 'rgba(255,170,210,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${r.next() * 0.8})`; g.fillRect(r.next() * 2048, r.next() * 300, 1.5, 1.5); }
  return c;
}
export function skylineTex(r) {
  const c = cv(2048, 512), g = c.getContext('2d');
  g.clearRect(0, 0, 2048, 512);
  const layer = (n, hMin, hMax, col, lit) => {
    for (let i = 0; i < n; i++) {
      const w = 30 + r.next() * 70, x = r.next() * 2048, h = hMin + r.next() * (hMax - hMin), y = 512 - h;
      g.fillStyle = col; g.fillRect(x, y, w, h);
      if (r.next() < 0.2) { g.fillRect(x + w * 0.4, y - 30, 3, 30); }
      const neon = r.pick(['#5fe8ff', '#ff5fd2', '#8a7aff', '#4fffd0']);
      if (r.next() < lit) { g.fillStyle = neon; g.globalAlpha = 0.85; g.fillRect(x, y, w, 4); g.fillRect(x + w - 4, y, 4, h * 0.6); g.globalAlpha = 1; }
      for (let wy = y + 8; wy < 512; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (r.next() < 0.28) { g.fillStyle = r.next() < 0.7 ? '#ffe6a8' : neon; g.globalAlpha = 0.5 + r.next() * 0.5; g.fillRect(wx, wy, 3, 4); g.globalAlpha = 1; }
    }
  };
  layer(70, 60, 180, '#2a1e44', 0.2);
  layer(40, 140, 330, '#1c1434', 0.5);
  layer(14, 260, 470, '#140e28', 0.9);
  return tx(c);
}
// ひび割れたコンクリートの地面：雑草、泥、水たまり（そこは透かして空を映す）、真ん中に丸い穴
function groundCanvas(Wm, Lm, r, z0 = 0) {
  const ppu = 640, W = Math.min(2048, Math.round(Wm * ppu)), H = Math.min(2048, Math.round(Lm * ppu)), s = W / Wm;
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#4a4448'; g.fillRect(0, 0, W, H);
  // 板石の継ぎ目と色むら
  for (let y = 0; y < H; y += 0.18 * s) for (let x = 0; x < W; x += 0.22 * s) { g.fillStyle = `rgba(${r.next() < 0.5 ? '20,16,18' : '120,110,112'},${r.next() * 0.25})`; g.fillRect(x + 2, y + 2, 0.22 * s - 4, 0.18 * s - 4); if (r.next() < 0.6) { g.fillStyle = 'rgba(12,10,12,0.5)'; g.fillRect(x, y, 0.22 * s, 2); g.fillRect(x, y, 2, 0.18 * s); } }
  for (let i = 0; i < W * H / 120; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '10,8,10' : '140,130,128'},${r.next() * 0.3})`; g.fillRect(r.next() * W, r.next() * H, 1 + r.next() * 3, 1 + r.next() * 3); }
  // ひび
  g.strokeStyle = 'rgba(8,6,8,0.9)';
  for (let i = 0; i < 70; i++) { g.lineWidth = 1 + r.next() * 2; let x = r.next() * W, y = r.next() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r.next() - 0.5) * 70; y += (r.next() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); }
  // 苔と雑草の色
  for (let i = 0; i < 90; i++) { const x = r.next() * W, y = r.next() * H, rr = 20 + r.next() * 90; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(70,90,40,0.5)'); gg.addColorStop(1, 'rgba(70,90,40,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // 穴のまわりの土台（石の輪）
  const hx = (HX + Wm / 2) * s, hy = (HZ - z0 + Lm / 2) * s;
  g.fillStyle = '#5a5458'; g.beginPath(); g.arc(hx, hy, (HR + 0.07) * s, 0, 7); g.fill();
  for (let a = 0; a < Math.PI * 2; a += 0.12) { g.strokeStyle = 'rgba(16,12,14,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx + Math.cos(a) * HR * s, hy + Math.sin(a) * HR * s); g.lineTo(hx + Math.cos(a) * (HR + 0.07) * s, hy + Math.sin(a) * (HR + 0.07) * s); g.stroke(); }
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(hx, hy, HR * s, 0, 7); g.fill(); // 穴
  // 水たまり（半透明に抜く。下の「水」が映る）
  const pud = [];
  for (let i = 0; i < 40; i++) {
    const x = r.next() * W, y = r.next() * H, rx = 60 + r.next() * 220, ry = rx * (0.3 + r.next() * 0.4);
    if (Math.hypot(x - hx, y - hy) < (HR + 0.12) * s + rx) continue;
    const gg = g.createRadialGradient(x, y, 0, x, y, rx); gg.addColorStop(0, 'rgba(0,0,0,1)'); gg.addColorStop(0.8, 'rgba(0,0,0,1)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gg; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore();
    pud.push([x, y]);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}
// 金網（ひし形の網、錆）
export function fenceTex() {
  const c = cv(256, 256), g = c.getContext('2d');
  g.strokeStyle = 'rgba(70,60,60,0.95)'; g.lineWidth = 2.4;
  for (let k = -256; k < 512; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k, 256); g.lineTo(k + 256, 0); g.stroke(); }
  const t = tx(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// 落書きの壁（字は 猫 / ながしの猫 / nagashinocat だけ）
export function graffitiWall(Wm, Hm, r) {
  const ppu = 700, W = Math.min(2048, Math.round(Wm * ppu)), H = Math.round(Hm * ppu);
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#5a5660'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 0.3 * ppu) { g.fillStyle = 'rgba(20,16,20,0.7)'; g.fillRect(x, 0, 3, H); }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '20,16,20' : '150,146,150'},${r.next() * 0.3})`; g.fillRect(r.next() * W, r.next() * H, 2, 2); }
  const words = ['猫', 'nagashinocat', 'ながしの猫', '猫', 'nagashinocat'];
  for (let x = 30; x < W - 60; x += 160 + r.next() * 200) {
    const wd = r.pick(words), col = r.pick(['#ff5fd2', '#5fe8ff', '#b8ff5f', '#ffd84f', '#a07aff']);
    const px = Math.min(H * 0.55, 600 / Math.max(2, wd.length));
    g.save(); g.translate(x, H * (0.5 + (r.next() - 0.5) * 0.3)); g.rotate((r.next() - 0.5) * 0.3);
    g.font = `${px}px ${JP}`; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = px * 0.18; g.strokeStyle = '#141018'; g.strokeText(wd, 0, 0);
    g.globalAlpha = 0.55 + r.next() * 0.35; g.fillStyle = col; g.fillText(wd, 0, 0); g.globalAlpha = 1;
    g.lineWidth = px * 0.04; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.strokeText(wd, 0, 0);
    g.restore();
  }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(90,86,96,${r.next() * 0.6})`; g.fillRect(r.next() * W, r.next() * H, 3, 3); } // はがれ
  for (let i = 0; i < 30; i++) { const x = r.next() * W; const gg = g.createLinearGradient(0, H * 0.3, 0, H); gg.addColorStop(0, 'rgba(20,16,14,0)'); gg.addColorStop(1, 'rgba(20,16,14,0.5)'); g.fillStyle = gg; g.fillRect(x, H * 0.3, 2 + r.next() * 6, H * 0.7); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2);
  return tx(c);
}
// 蓋の表：錆びた鉄板、手描きの三角と猫、縞の縁
function lidTop(r) {
  const c = cv(1024, 1024), g = c.getContext('2d');
  g.fillStyle = '#4a4246'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r.next() < 0.6 ? '110,52,26' : '30,24,26'},${r.next() * 0.5})`; g.beginPath(); g.arc(r.next() * 1024, r.next() * 1024, 1 + r.next() ** 3 * 14, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(20,16,18,0.6)'; g.lineWidth = 4; g.beginPath(); g.arc(512, 512, 470, 0, 7); g.stroke(); g.beginPath(); g.arc(512, 512, 300, 0, 7); g.stroke();
  // 白い三角に猫の横顔
  g.strokeStyle = 'rgba(230,226,216,0.85)'; g.lineWidth = 10; g.beginPath(); g.moveTo(512, 260); g.lineTo(700, 560); g.lineTo(324, 560); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(230,226,216,0.85)'; g.beginPath(); g.arc(512, 470, 52, 0, 7); g.fill(); g.beginPath(); g.moveTo(472, 440); g.lineTo(478, 384); g.lineTo(508, 424); g.fill(); g.beginPath(); g.moveTo(552, 440); g.lineTo(546, 384); g.lineTo(516, 424); g.fill();
  g.font = `110px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('猫', 512, 680);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(74,66,70,${r.next()})`; g.fillRect(250 + r.next() * 520, 260 + r.next() * 480, 4, 4); } // かすれ
  return tx(c);
}
function hazardSide() {
  const c = cv(1024, 64), g = c.getContext('2d');
  g.fillStyle = '#2a2224'; g.fillRect(0, 0, 1024, 64);
  for (let x = -64; x < 1088; x += 48) { g.fillStyle = '#e8b818'; g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 24, 64); g.lineTo(x + 48, 0); g.lineTo(x + 24, 0); g.fill(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(110,50,24,${Math.random() * 0.7})`; g.fillRect(Math.random() * 1024, Math.random() * 64, 3 + Math.random() * 12, 2 + Math.random() * 8); }
  const t = tx(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); return t;
}
// 地下の縦穴の内壁：足場の輪、柱、光るパネル
function shaftTex(r) {
  const c = cv(1024, 1024), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#0e2a30'); gr.addColorStop(1, '#04161c'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = 'rgba(120,220,230,0.35)'; g.fillRect(x, 0, 6, 1024); }
  for (let y = 80; y < 1024; y += 170) { g.fillStyle = 'rgba(180,240,250,0.6)'; g.fillRect(0, y, 1024, 5); g.fillStyle = 'rgba(255,200,80,0.8)'; g.fillRect(0, y + 10, 1024, 3); for (let x = 0; x < 1024; x += 16) { g.fillStyle = 'rgba(180,240,250,0.4)'; g.fillRect(x, y - 20, 2, 20); } }
  for (let i = 0; i < 80; i++) { g.fillStyle = r.pick(['#5fe8ff', '#9ff', '#4fffd0', '#fff']); g.globalAlpha = 0.5 + r.next() * 0.5; g.fillRect(r.next() * 1024, r.next() * 1024, 8 + r.next() * 40, 4 + r.next() * 10); } g.globalAlpha = 1;
  // 三角の注意マーク（光る）
  g.strokeStyle = '#7ff8ff'; g.lineWidth = 6; for (const x of [200, 700]) { g.beginPath(); g.moveTo(x, 420); g.lineTo(x + 40, 490); g.lineTo(x - 40, 490); g.closePath(); g.stroke(); }
  const t = tx(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t;
}
// 草むら（紙を切った草）
function grassTex(r) {
  const c = cv(256, 256), g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = 20 + r.next() * 216, h = 60 + r.next() * 190, lean = (r.next() - 0.5) * 80;
    g.fillStyle = r.pick(['#4a6a2a', '#6a8a3a', '#3a5020', '#8aa04a', '#5a6a3a']);
    g.beginPath(); g.moveTo(x - 3, 256); g.quadraticCurveTo(x + lean * 0.3, 256 - h * 0.6, x + lean, 256 - h); g.quadraticCurveTo(x + lean * 0.3 + 2, 256 - h * 0.6, x + 4, 256); g.fill();
  }
  return tx(c);
}

/**
 * 空き地。works は工事中（wip）の作品。返り値 { scene, ups, stands, towerScreen, screenTex }
 */
export async function buildLotPaper({ seed = 33, works = null, screenCanvas = null } = {}) {
  const r = rng(seed);
  const scene = new THREE.Scene(), ups = [], stands = [];
  const skyC = skyCanvas(r), skyT = tx(skyC);
  scene.background = skyT;
  // 水たまりや金属に映る空（夕焼けの色）
  const env = tx(skyC); env.mapping = THREE.EquirectangularReflectionMapping; scene.environment = env; scene.environmentIntensity = 0.6;
  scene.fog = new THREE.FogExp2('#3a2448', 0.24);
  scene.add(new THREE.HemisphereLight('#a070c0', '#2a1a20', 0.55));
  const dusk = new THREE.DirectionalLight('#ff9ac0', 0.4); dusk.position.set(0.3, 0.6, -2); scene.add(dusk);

  const GW = 3.2, GL = 2.6, GZ = -0.3;
  // ---- 地面と水たまり ----
  const water = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.02, envMapIntensity: 1.0 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.004, GZ); scene.add(water);
  // 水面に穴を開ける（縦穴の上に水が張らないように）
  water.geometry = new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); sh.moveTo(-GW / 2, -GL / 2); sh.lineTo(GW / 2, -GL / 2); sh.lineTo(GW / 2, GL / 2); sh.lineTo(-GW / 2, GL / 2); sh.closePath(); const h = new THREE.Path(); h.absarc(HX, -(HZ - GZ), HR + 0.01, 0, Math.PI * 2, true); sh.holes.push(h); return sh; })(), 48);
  const gC = groundCanvas(GW, GL, r, GZ);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), paper(tx(gC), { transparent: true, alphaTest: 0.02, depthWrite: true }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.0, GZ); scene.add(ground);
  // 遠くのネオンの街（板）
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: skylineTex(r), transparent: true, fog: false, toneMapped: false }));
  skyline.position.set(0, 0.62, -3.2); scene.add(skyline);

  // ---- 奥に見える九龍城：箱を積み重ねた巨大なかたまり。窓の明かりと、屋上のアンテナ、ネオン ----
  {
    const kw = new THREE.Group();
    const X0 = -1.7, X1 = 0.45, Z0 = -1.45, Z1 = -2.1;
    for (let x = X0; x < X1;) {
      const w = r.range(0.1, 0.2);
      for (let z = Z0; z > Z1;) {
        const d = r.range(0.1, 0.18);
        // 真ん中ほど高く、ふちはぎざぎざ
        const c = 1 - Math.abs((x - (X0 + X1) / 2) / ((X1 - X0) / 2));
        const h = 0.38 + c * 0.6 + r.range(-0.1, 0.14) + (Z0 - z) * 0.25;
        const b = paperBuildingDetailed(w * 0.98, h, d * 0.98, r, { cheap: true, bare: true });
        b.position.set(x + w / 2, 0, z - d / 2); kw.add(b);
        if (r.next() < 0.35) { const a = paperAntenna(r); a.scale.setScalar(1.6); a.position.set(x + w * r.next(), h, z - d / 2); kw.add(a); }
        if (r.next() < 0.15) { const t = paperTank(r); t.scale.setScalar(1.4); t.position.set(x + w / 2, h, z - d / 2); kw.add(t); }
        z -= d;
      }
      x += w;
    }
    // はみ出したベランダ・看板のネオン（文字なしの光の板）
    const neonCols = ['#ff5fd2', '#5fe8ff', '#ffd84f', '#8a7aff', '#ff6a3a'];
    for (let i = 0; i < 22; i++) {
      const col = r.pick(neonCols), w = r.range(0.012, 0.03), h = r.range(0.01, 0.04);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true, opacity: 0.85 }));
      m.position.set(r.range(X0 + 0.05, X1 - 0.05), r.range(0.25, 0.75), Z0 + 0.012); kw.add(m);
    }
    // 窓の明かりがもれる霞
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ff8ac8', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); haze.scale.set(2.2, 0.6, 1); haze.position.set((X0 + X1) / 2, 0.35, Z0 + 0.05); kw.add(haze);
    const L = new THREE.PointLight('#ff9ad0', 0.6, 1.4, 1.6); L.position.set((X0 + X1) / 2, 0.4, Z0 + 0.3); kw.add(L);
    scene.add(kw);
  }

  // ---- 奥と左の壁、金網 ----
  const wallM = paper(graffitiWall(3.2, 0.22, r));
  const back = edged(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.03), [paper(null, { color: '#4a4650' }), paper(null, { color: '#4a4650' }), paper(null, { color: '#5a5660' }), paper(null, { color: '#4a4650' }), wallM, paper(null, { color: '#4a4650' })]), 20);
  back.position.set(0, 0.11, -1.25); scene.add(back);
  const leftW = edged(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 1.6), [paper(graffitiWall(1.6, 0.2, r)), paper(null, { color: '#4a4650' }), paper(null, { color: '#5a5660' }), paper(null, { color: '#4a4650' }), paper(null, { color: '#4a4650' }), paper(null, { color: '#4a4650' })]), 20);
  leftW.position.set(-1.05, 0.1, -0.45); scene.add(leftW);
  const rightW = edged(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 1.4), [paper(null, { color: '#4a4650' }), paper(graffitiWall(1.4, 0.3, r)), paper(null, { color: '#5a5660' }), paper(null, { color: '#4a4650' }), paper(null, { color: '#4a4650' }), paper(null, { color: '#4a4650' })]), 20);
  rightW.position.set(1.15, 0.15, -0.55); scene.add(rightW);
  const fT = fenceTex();
  const rustM = new THREE.MeshStandardMaterial({ color: '#5a3a2c', roughness: 0.8, metalness: 0.4 });
  const fence = (len, h, x, z, rotY, y0) => {
    const t = fT.clone(); t.needsUpdate = true; t.repeat.set(len / 0.06, h / 0.06);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.5 }));
    m.position.set(x, y0 + h / 2, z); m.rotation.y = rotY; scene.add(m);
    const dir = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));
    for (let k = 0; k <= Math.round(len / 0.22); k++) { const p = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, h + 0.04, 6), rustM)); p.position.set(x, y0 + (h + 0.04) / 2, z).addScaledVector(dir, -len / 2 + k * len / Math.round(len / 0.22)); p.rotation.z = (r.next() - 0.5) * 0.08; scene.add(p); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, len, 5), rustM); top.rotation.z = Math.PI / 2; top.rotation.y = rotY; top.position.set(x, y0 + h, z); scene.add(top);
    // 有刺鉄線（くるくる）
    const pts = []; for (let i = 0; i <= 200; i++) { const u = i / 200, a = u * Math.PI * 2 * 30; pts.push(new THREE.Vector3(-len / 2 + u * len, Math.sin(a) * 0.012, Math.cos(a) * 0.012)); }
    const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#3a3034' })); wire.position.set(x, y0 + h + 0.02, z); wire.rotation.y = rotY; scene.add(wire);
  };
  fence(3.2, 0.26, 0, -1.25, 0, 0.22);
  fence(1.6, 0.36, -1.05, -0.45, Math.PI / 2, 0.2);
  fence(1.4, 0.24, 1.15, -0.55, Math.PI / 2, 0.3);
  // 左上の枯れ木（影絵）
  {
    const c = cv(512, 512), g = c.getContext('2d'); g.strokeStyle = '#120c14'; g.lineCap = 'round';
    const br = (x, y, a, l, w, d) => { if (d > 7 || l < 6) return; const x2 = x + Math.cos(a) * l, y2 = y - Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a + 0.3 + r.next() * 0.4, l * 0.72, w * 0.7, d + 1); br(x2, y2, a - 0.3 - r.next() * 0.4, l * 0.7, w * 0.7, d + 1); };
    br(256, 512, Math.PI / 2, 150, 22, 0);
    const tree = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, alphaTest: 0.3, color: '#1a1020' }));
    tree.position.set(-1.25, 0.55, -1.3); scene.add(tree);
  }

  // ---- 大きな丸い縦穴 ----
  {
    const ringM = paper(null, { color: '#6a6266' });
    const rim = edged(new THREE.Mesh(new THREE.CylinderGeometry(HR + 0.035, HR + 0.045, 0.03, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#5a5458', roughness: 0.9, side: THREE.DoubleSide })), 50);
    rim.position.set(HX, 0.008, HZ); scene.add(rim);
    const rimTop = new THREE.Mesh(new THREE.RingGeometry(HR, HR + 0.04, 48), ringM); rimTop.rotation.x = -Math.PI / 2; rimTop.position.set(HX, 0.023, HZ); scene.add(rimTop);
    // 内壁（下へ深く、光る施設）
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, 0.9, 48, 1, true), new THREE.MeshStandardMaterial({ map: shaftTex(r), emissive: '#ffffff', emissiveMap: shaftTex(r), emissiveIntensity: 0.9, side: THREE.BackSide, roughness: 0.6 }));
    shaft.position.set(HX, -0.45 + 0.02, HZ); scene.add(shaft);
    // 足場の輪と手すり
    for (const y of [-0.12, -0.3, -0.52]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.82, 0.006, 6, 40), new THREE.MeshStandardMaterial({ color: '#e8b818', emissive: '#3a2a00' })); ring.rotation.x = Math.PI / 2; ring.position.set(HX, y, HZ); scene.add(ring); const deck = new THREE.Mesh(new THREE.RingGeometry(HR * 0.82, HR, 40), new THREE.MeshStandardMaterial({ color: '#2a3a40', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); deck.rotation.x = -Math.PI / 2; deck.position.set(HX, y - 0.02, HZ); scene.add(deck); }
    // 底の光と、真ん中の柱
    const floor = new THREE.Mesh(new THREE.CircleGeometry(HR, 40), new THREE.MeshBasicMaterial({ color: '#5ff0ff', toneMapped: false })); floor.rotation.x = -Math.PI / 2; floor.position.set(HX, -0.86, HZ); scene.add(floor);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const col = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 0.02), new THREE.MeshBasicMaterial({ color: k % 2 ? '#7ff8ff' : '#2a6a74', toneMapped: false })); col.position.set(HX + Math.cos(a) * HR * 0.55, -0.45, HZ + Math.sin(a) * HR * 0.55); scene.add(col); }
    const up = new THREE.PointLight('#5ff0ff', 1.6, 1.4, 1.6); up.position.set(HX, 0.06, HZ); scene.add(up);
    const deep = new THREE.PointLight('#5ff0ff', 2, 1.2, 1.4); deep.position.set(HX, -0.4, HZ); scene.add(deep);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#4fe8ff', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(0.6, 0.18, 1); halo.position.set(HX + 0.05, 0.04, HZ + 0.05); scene.add(halo);
    ups.push(t => { up.intensity = 1.5 + 0.2 * Math.sin(t * 1.7); });
  }
  // ---- 半分ずれた蓋 ----
  {
    const R = HR + 0.05, T = 0.034;
    const top = paper(lidTop(r)), side = paper(hazardSide(), { roughness: 0.8 }), bottom = paper(null, { color: '#2a2224' });
    const lid = edged(new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 64), [side, top, bottom]), 50);
    const lidG = new THREE.Group(); lidG.add(lid);
    lidG.position.set(HX - 0.17, 0.05, HZ - 0.2); lidG.rotation.set(0.07, 0.5, -0.1); scene.add(lidG);
    // 取っ手
    for (const a of [0.3, 2.2, 4.0]) { const h = edged(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#6a3a24', roughness: 0.6, metalness: 0.5 }))); h.position.set(Math.cos(a) * R * 0.8, T / 2, Math.sin(a) * R * 0.8); h.rotation.y = -a + Math.PI / 2; lidG.add(h); }
    // 蓋の下からこぼれるオレンジの灯り（裏の照明）
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.006, 0.01), new THREE.MeshBasicMaterial({ color: '#ffb050', toneMapped: false })); bar.position.set(0.1, -T / 2 - 0.004, 0.18); bar.rotation.y = -0.4; lidG.add(bar);
    const bar2 = bar.clone(); bar2.position.set(0.24, -T / 2 - 0.004, -0.02); bar2.rotation.y = -1.3; lidG.add(bar2);
    const warm = new THREE.PointLight('#ffa040', 0.5, 0.5, 2); warm.position.set(0.15, -0.04, 0.1); lidG.add(warm);
  }
  // ---- 湯気（穴から立ちのぼる） ----
  {
    const steamM = []; const N = 14;
    for (let i = 0; i < N; i++) {
      const m = new THREE.SpriteMaterial({ map: glowTex(), color: '#c8d8e8', transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m); scene.add(s); steamM.push([s, i / N, r.next()]);
    }
    ups.push(t => { for (const [s, ph, k] of steamM) { const u = ((t * 0.12 + ph) % 1); s.position.set(HX + 0.12 + (k - 0.5) * 0.2 + u * 0.05, 0.03 + u * 0.5, HZ - 0.05 + (k - 0.5) * 0.1); s.scale.setScalar(0.12 + u * 0.4); s.material.opacity = Math.sin(u * Math.PI) * 0.13; } });
  }
  // ---- 草むら、ドラム缶、木箱 ----
  {
    const gm = new THREE.MeshStandardMaterial({ map: grassTex(r), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
    const tufts = [];
    for (let i = 0; i < 140; i++) {
      const x = (r.next() - 0.5) * 2.2, z = -1.2 + r.next() * 1.9;
      if (Math.hypot(x - HX, z - HZ) < HR + 0.08) continue;
      const near = Math.abs(x) > 0.7 || z < -0.9 || Math.hypot(x - HX, z - HZ) < HR + 0.2;
      if (!near && r.next() < 0.6) continue;
      const h = 0.03 + r.next() * 0.07;
      const g = new THREE.Group();
      for (let k = 0; k < 2; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(h * 1.2, h), gm); p.position.y = h / 2; p.rotation.y = k * Math.PI / 2 + r.next(); g.add(p); }
      g.position.set(x, 0, z); scene.add(g); tufts.push([g, r.next() * 6]);
    }
    ups.push(t => { for (const [g, ph] of tufts) g.rotation.z = Math.sin(t * 1.2 + ph) * 0.05; });
    const barrelT = (() => { const c = cv(256, 256), g = c.getContext('2d'); g.fillStyle = '#6a3a22'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '30,16,10' : '150,80,40'},${r.next() * 0.5})`; g.fillRect(r.next() * 256, r.next() * 256, 2 + r.next() * 10, 2 + r.next() * 10); } for (const y of [40, 128, 216]) { g.fillStyle = 'rgba(20,12,8,0.7)'; g.fillRect(0, y, 256, 8); } return tx(c); })();
    for (const [x, z, tilt] of [[0.62, 0.62, 0], [0.74, 0.48, 0], [-0.75, -0.6, 0.0], [0.9, -0.9, 1.4]]) {
      const b = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 16), paper(barrelT, { roughness: 0.7, metalness: 0.3 }))); b.position.set(x, tilt ? 0.045 : 0.065, z); b.rotation.z = tilt; scene.add(b);
    }
    const woodT = (() => { const c = cv(128, 128), g = c.getContext('2d'); g.fillStyle = '#5a4030'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 32) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, 128, 3); } g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 128); g.stroke(); return tx(c); })();
    for (const [x, z, s, ry] of [[-0.62, 0.7, 0.09, 0.3], [-0.85, 0.3, 0.07, -0.2], [0.5, -0.95, 0.08, 0.6]]) { const b = edged(new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s), paper(woodT))); b.position.set(x, s * 0.4, z); b.rotation.y = ry; scene.add(b); }
  }
  // ---- 古い電光掲示板（作品の予告を映す） ----
  let towerScreen, screenTex;
  {
    const c = screenCanvas || (() => { const k = cv(640, 360), g = k.getContext('2d'); g.fillStyle = '#100810'; g.fillRect(0, 0, 640, 360); g.font = `120px ${JP}`; g.fillStyle = '#ffd400'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('猫', 320, 180); return k; })();
    screenTex = tx(c);
    const sw = 0.42, sh = sw * 9 / 16, x = 0.55, y = 0.52, z = -1.5;
    towerScreen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
    towerScreen.position.set(x, y, z + 0.012); towerScreen.rotation.y = -0.15; scene.add(towerScreen);
    const frameM = new THREE.MeshStandardMaterial({ color: '#2a2226', roughness: 0.7, metalness: 0.4 });
    const box = edged(new THREE.Mesh(new THREE.BoxGeometry(sw + 0.03, sh + 0.03, 0.02), frameM)); box.position.set(x, y, z); box.rotation.y = -0.15; scene.add(box);
    for (const sx of [-1, 1]) { const pole = edged(new THREE.Mesh(new THREE.BoxGeometry(0.012, y - sh / 2, 0.012), rustM)); pole.position.set(x + sx * sw * 0.3, (y - sh / 2) / 2, z - 0.02); scene.add(pole); }
    const L = new THREE.PointLight('#ffd890', 0.25, 0.6, 2); L.position.set(x, y - 0.1, z + 0.15); scene.add(L);
  }
  // ---- 工事中の作品の看板：空き地の手前に杭で ----
  {
    const list = orderForStands(works || (await (await fetch(ROOT + 'data/works.json')).json()).filter(w => w.district === 'wip'));
    const spots = [[-0.52, 0.52, 0.35], [0.42, 0.44, -0.35], [-0.72, 0.05, 0.6], [0.62, 0.05, -0.55], [-0.4, -0.5, 0.2], [0.35, -0.6, -0.2]];
    for (let i = 0; i < list.length; i++) {
      const [x, z, ry] = spots[i % spots.length], extra = Math.floor(i / spots.length) * 0.12;
      const b = await boardSign(list[i]); b.group.position.set(x + Math.sign(x) * extra, 0, z - extra); b.group.rotation.y = ry; scene.add(b.group); stands.push(b.hit);
    }
  }
  return { scene, ups, stands, towerScreen, screenTex };
}

export const LOT_CAM = { pos: [0.22, 0.13, 0.82], look: [-0.1, 0.06, -0.3], fov: 58 };
