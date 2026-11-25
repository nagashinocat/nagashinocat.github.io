// 路地のページ（lab/paper.html から）
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { paperBuilding, paperBuildingDetailed } from './paper.js';
import { makeSign, makeSign2, makeSign3, bracket, standSign, shopStand } from './signs.js';
import { groundTextures, chochin } from './alley.js';
import { glowTex } from './parts.js';
import { rng } from '../rng.js';
import { roundTower } from './tower.js';
import { standSlots, orderForStands } from '../layout.js';

const ROOT = new URL('../../', import.meta.url).href;
export async function buildAlleyPaper({ seed = 5, entry = 0.62, works = null, screenCanvas = null } = {}) {
const stands = [];
let towerScreen = null, screenTex = null;
const r = rng(seed);
const ups = [];
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#1e1030', 0.75);
// 空：紺〜紫のグラデーション、月、雲
{
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#070a24'); gr.addColorStop(0.55, '#1c1442'); gr.addColorStop(1, '#4a2060'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()})`; g.fillRect(Math.random() * 1024, Math.random() * 260, 1.2, 1.2); }
  for (let i = 0; i < 14; i++) { const x = Math.random() * 1024, y = 60 + Math.random() * 200; const gg = g.createRadialGradient(x, y, 0, x, y, 120); gg.addColorStop(0, 'rgba(120,90,160,0.35)'); gg.addColorStop(1, 'rgba(120,90,160,0)'); g.fillStyle = gg; g.fillRect(x - 120, y - 120, 240, 240); }
  g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(820, 90, 34, 0, 7); g.fill(); const mg = g.createRadialGradient(820, 90, 30, 820, 90, 110); mg.addColorStop(0, 'rgba(220,220,255,0.35)'); mg.addColorStop(1, 'rgba(220,220,255,0)'); g.fillStyle = mg; g.fillRect(700, 0, 240, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
scene.add(new THREE.HemisphereLight('#4a3a7a', '#1a0c14', 0.34));
const moon = new THREE.DirectionalLight('#7a88ff', 0.18); moon.position.set(-1, 2, 1); scene.add(moon);
const ALLEY = 0.26;
const tops = [];
// 看板の山札：同じ種類×同じ字は二度出さない
const DECK = (() => {
  // 看板の文字は「猫」「ながしの猫」「nagashinocat」だけ
  const N3 = ['猫', 'ながしの猫', 'nagashinocat'];
  const T = {
    neon: N3, lightbox: N3, marquee: ['nagashinocat', 'ながしの猫', '猫'], round: ['猫'], shield: ['nagashinocat 猫', 'ながしの猫 猫'],
    arrow: N3, plank: N3, tin: ['nagashinocat', 'ながしの猫'], pawn: ['猫猫'], bulbvert: ['猫', 'ながしの猫'], neonicon: ['cat', 'cat', 'star', 'cocktail'],
    cloth: ['猫', 'ながしの猫'], nobori: ['猫', 'ながしの猫'], enamel: N3, letters: ['nagashinocat', '猫', 'ながしの猫'], barber: ['猫'], led: ['nagashinocat ＊ ながしの猫 ＊ 猫'], fan: ['猫'],
  };
  const d = []; for (const [k, list] of Object.entries(T)) for (const t of list) d.push([k, t]);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  // 左右で半分ずつ（左右どちらにも看板が付くように）
  // 左右それぞれに全部の組み合わせを1枚ずつ（同じ側では被らない）
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return { '-1': shuffle(d), '1': shuffle(d) };
})();
// 路地の両側の紙の建物
for (const side of [-1, 1]) {
  let z = 0.62;
  while (z > -0.8) {
    const d = r.range(0.12, 0.2), w = r.range(0.16, 0.26), h = side < 0 ? r.range(0.42, 0.7) : (r.next() < 0.35 ? r.range(0.42, 0.62) : r.range(0.17, 0.3));
    tops.push({ side, z0: z - d, z1: z, h });
    const b = paperBuildingDetailed(d, h, w, r);  // 正面（+z）を路地へ向ける
    b.position.set(side * ALLEY / 2, 0, z - d / 2);
    b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(b);
    // 看板・提灯と、その光
    const nSigns = side < 0 ? r.int(5, 8) : r.int(4, 7);
    const occ = [];
    for (let k = 0, tries = 0; k < nSigns && tries < 40; tries++) {
      const deck = DECK[side]; if (!deck.length) break;
      const [kind, text] = deck.pop(); const color = r.pick(['#ff4fa3', '#4fd8ff', '#ffb21f', '#b46bff', '#ff3b3b', '#7cff6b']);
      const SIZE = { marquee: [0.012 + text.length * 0.007, 0.02], round: [0.04, 0.04], shield: [0.04, 0.045], arrow: [0.07, 0.022], plank: [0.07, 0.025], tin: [0.03, 0.04], pawn: [0.05, 0.05], bulbvert: [0.03, 0.03 + [...text].length * 0.025], neonicon: [0.045, 0.045],
        cloth: [0.03, 0.03 + [...text].length * 0.025], nobori: [0.022, 0.1], enamel: [0.06, 0.024], letters: [0.018 * [...text].length, 0.022], barber: [0.012, 0.05], led: [0.1, 0.014], fan: [0.07, 0.04] };
      const cls = r.next(), k2 = cls < 0.3 ? 0.85 : cls < 0.7 ? 0.62 : 0.42;
      const size = (SIZE[kind] || [0.026, 0.03 + [...text].length * 0.02]).map(v => v * k2);
      const S3 = ['cloth', 'nobori', 'enamel', 'letters', 'barber', 'led', 'fan'], S2 = ['shield', 'arrow', 'plank', 'tin', 'pawn', 'bulbvert', 'neonicon'];
      const make = () => S3.includes(kind) ? makeSign3(kind, text, color, size, { rng: () => r.next() }) : S2.includes(kind) ? makeSign2(kind, text, color, size, { rng: () => r.next() }) : makeSign(kind, text, color, size, { vertical: size[1] > size[0], rng: () => r.next() });
      const y = r.range(0.085, Math.max(0.09, h * 0.85 - size[1])), zz = z - d * r.range(0.1, 0.9);
      const flat = ['plank', 'tin', 'arrow', 'enamel', 'letters', 'fan', 'led'].includes(kind) ? r.next() < 0.75 : kind === 'barber' ? true : r.next() < 0.2;
      const half = flat ? Math.max(size[0], 0.01) / 2 : 0.008;
      if (occ.some(o => Math.abs(o.z - zz) < o.hz + half + 0.004 && Math.abs(o.y - y) < o.hy + size[1] / 2 + 0.004)) { deck.unshift([kind, text]); continue; }
      occ.push({ z: zz, y, hz: half, hy: size[1] / 2 });
      k++;
      const sg = make(); sg.group.userData.sharp = true;
      if (sg.update) ups.push(sg.update);
      if (flat) {
        sg.group.position.set(side * (ALLEY / 2 - 0.003), y, zz);
        sg.group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        sg.group.rotation.z = r.range(-0.04, 0.04);
        scene.add(sg.group);
      } else {
        const gap = r.range(0.004, 0.02);
        const out = (kind === 'marquee' ? 0.006 : size[0]) / 2 + gap;
        sg.group.position.set(side * (ALLEY / 2 - out - (kind === 'marquee' ? size[0] / 2 - 0.004 : 0)), y, zz);
        sg.group.rotation.y = r.range(-0.08, 0.08);
        scene.add(sg.group);
        const arm = bracket(out + (kind === 'marquee' ? size[0] / 2 : 0) + 0.004); arm.position.set(side * ALLEY / 2, y + size[1] / 2 - 0.003, zz); arm.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(arm);
      }
      if (k2 > 0.55) { const L = new THREE.PointLight(color === '#7cff6b' ? '#ffb070' : color, 0.04, 0.26, 2); L.position.copy(sg.group.position); scene.add(L); }
    }
    // 低い建物の屋上に大きな看板
    if (side > 0 && h < 0.35 && r.next() < 0.6) {
      const kind = r.pick(['bulbvert', 'lightbox', 'marquee', 'neon']);
      const text = kind === 'marquee' ? 'nagashinocat' : r.pick(['猫', 'ながしの猫']);
      const size = kind === 'marquee' ? [0.14, 0.05] : kind === 'bulbvert' ? [0.04, 0.03 + [...text].length * 0.03] : [0.16, 0.05];
      const sg = kind === 'bulbvert' ? makeSign2(kind, text, r.pick(['#ffb21f', '#ff4fa3']), size, { rng: () => r.next() }) : makeSign(kind, text, r.pick(['#ff4fa3', '#4fd8ff', '#ffb21f']), size, { vertical: size[1] > size[0], rng: () => r.next() });
      sg.group.userData.sharp = true;
      if (sg.update) ups.push(sg.update);
      const zc = z - d / 2, x = ALLEY / 2 + 0.06, top = h + 0.02 + size[1] / 2;
      sg.group.position.set(x, top, zc); sg.group.rotation.y = -0.55; scene.add(sg.group);
      const pm = new THREE.MeshStandardMaterial({ color: '#2a2224', roughness: 0.9 });
      for (const dx of [-0.4, 0.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.0025, top - h, 0.0025), pm); leg.position.set(x + dx * size[0] * Math.cos(0.55), (top + h) / 2 - size[1] / 4, zc + dx * size[0] * Math.sin(0.55)); scene.add(leg); }
      const L = new THREE.PointLight('#ffb070', 0.04, 0.3, 2); L.position.set(x, top, zc + 0.03); scene.add(L);
    }
    z -= d + r.range(0.0, 0.01);
  }
}
// 上をバンバン走る電線：左の壁の高い所から、右の低い屋根の電柱へ。奥から手前への束も
{
  const pts = []; const wireMat = new THREE.MeshBasicMaterial({ color: '#0c070e' });
  const geos = [];
  const add = (a, b, sag, rad = 0.0007) => { const m = a.clone().lerp(b, 0.5); m.y -= sag; geos.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 12, rad, 3)); };
  // 右の屋根に電柱
  const poles = [];
  for (const t of tops.filter(t => t.side > 0)) {
    const z = (t.z0 + t.z1) / 2, x = ALLEY / 2 + 0.03, hh = r.range(0.16, 0.26);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, hh, 6), new THREE.MeshStandardMaterial({ color: '#3a2e2a', roughness: 0.9 }));
    pole.position.set(x, t.h + hh / 2, z); scene.add(pole);
    for (let k = 0; k < 3; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0022, 0.0022), pole.material); arm.position.set(x, t.h + hh - 0.008 - k * 0.012, z); arm.rotation.y = Math.PI / 2; scene.add(arm); }
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.016, 8), new THREE.MeshStandardMaterial({ color: '#8a8a80' })); tr.position.set(x + 0.008, t.h + hh - 0.04, z); scene.add(tr);
    poles.push({ x, z, top: t.h + hh - 0.008 });
  }
  // 電柱どうしを奥から手前へ（3段×数本）
  poles.sort((a, b) => a.z - b.z);
  for (let i = 0; i + 1 < poles.length; i++) for (let k = 0; k < 3; k++) for (const dz of [-0.015, 0.015]) add(new THREE.Vector3(poles[i].x, poles[i].top - k * 0.012, poles[i].z + dz), new THREE.Vector3(poles[i + 1].x, poles[i + 1].top - k * 0.012, poles[i + 1].z + dz), 0.012 + k * 0.004);
  // 左の壁の高い所から、右の電柱へ（路地の上を斜めに）
  for (const p of poles) for (let k = 0; k < 3; k++) { const lt = tops.filter(t => t.side < 0); const t = r.pick(lt); const z = r.range(t.z1 - 0.02, t.z0 + 0.02); add(new THREE.Vector3(-ALLEY / 2 + 0.004, r.range(0.18, Math.min(0.34, t.h * 0.95)), z), new THREE.Vector3(p.x, p.top - r.range(0, 0.03), p.z + r.range(-0.02, 0.02)), r.range(0.02, 0.06), r.range(0.0005, 0.0009)); }
  // 路地の上空を奥から手前へ走る束
  for (let k = 0; k < 7; k++) { const x = r.range(-ALLEY / 2 + 0.02, ALLEY / 2 + 0.02), y = r.range(0.24, 0.32); for (let z = 0.6; z > -0.8; z -= 0.2) add(new THREE.Vector3(x, y, z), new THREE.Vector3(x + r.range(-0.01, 0.01), y + r.range(-0.01, 0.01), z - 0.2), r.range(0.008, 0.02), r.range(0.0005, 0.0009)); }
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  scene.add(new THREE.Mesh(mergeGeometries(geos), wireMat));
}
// 作品のスタンド看板：お店の前に、手前から奥へ1つずつ（バナー＋題名）
{
  const all = works || (await (await fetch(ROOT + 'data/works.json')).json()).filter(w => w.district === 'games');
  const list = orderForStands(all), slots = standSlots(list.length);
  const TYPES = ['pillar', 'easel', 'hang'];
  for (let i = 0; i < list.length; i++) {
    const { side, z } = slots[i];
    const s = await shopStand(list[i], TYPES[i % 3]);
    s.group.position.set(side * (ALLEY / 2 - 0.022), 0.003, z);
    s.group.rotation.y = side * -0.45;
    scene.add(s.group); stands.push(s.hit);
  }
}
// 奥のタワー：ジオラマと同じ丸いタワー（画面は横長 16:9）
{
  let c = screenCanvas;
  if (!c) {
    c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d');
    const im = new Image(); im.src = ROOT + 'assets/shots/neko-tasukete.jpg'; await im.decode().catch(() => {});
    g.fillStyle = '#000'; g.fillRect(0, 0, 640, 360); if (im.naturalWidth) { const k = Math.max(640 / im.naturalWidth, 360 / im.naturalHeight); g.drawImage(im, (640 - im.naturalWidth * k) / 2, (360 - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); }
  }
  screenTex = new THREE.CanvasTexture(c); screenTex.colorSpace = THREE.SRGBColorSpace;
  const tw = roundTower({ R: 0.22, H: 1.6, screenTex, rng: () => r.next() });
  tw.group.position.set(0, 0, -1.05); scene.add(tw.group); ups.push(tw.update); towerScreen = tw.screen;
}
// 提灯の列と光
for (const side of [-1, 1]) for (let z = 0.5; z > -0.6; z -= r.range(0.03, 0.06)) {
  if (r.next() < 0.3) continue;
  const m = chochin(r); m.scale.setScalar(0.5); m.position.set(side * (ALLEY / 2 - 0.012), 0.045, z); scene.add(m);
  if (r.next() < 0.25) { const L = new THREE.PointLight('#ff6a3a', 0.025, 0.14, 2); L.position.copy(m.position); scene.add(L); }
}
// 路地の入口を手前へのばす（大通りから入ってくる場面用。いつもの路地の並びは変えない）
if (entry > 0.62) {
  const r2 = rng(seed + 100);
  for (const side of [-1, 1]) {
    let z = entry;
    while (z > 0.64) {
      const d = Math.min(r2.range(0.12, 0.2), z - 0.62), w = r2.range(0.16, 0.26), h = side < 0 ? r2.range(0.42, 0.7) : (r2.next() < 0.4 ? r2.range(0.42, 0.62) : r2.range(0.2, 0.32));
      const b = paperBuildingDetailed(d, h, w, r2, { cheap: true });
      b.position.set(side * ALLEY / 2, 0, z - d / 2); b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(b);
      // 提灯をぽつぽつ
      if (r2.next() < 0.7) { const s = chochin(r2); s.scale.setScalar(0.5); s.position.set(side * (ALLEY / 2 - 0.012), r2.range(0.04, 0.06), z - d / 2); scene.add(s);
        const L = new THREE.PointLight('#ff8a4a', 0.03, 0.2, 2); L.position.copy(s.position); scene.add(L); }
      z -= d;
    }
  }
}
// 濡れた路面
{
  const len = entry + 0.98, cz = (entry + 0.08 - 0.9) / 2;
  const gt = groundTextures(r, ALLEY + 0.04, len);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(ALLEY + 0.04, len), new THREE.MeshStandardMaterial({ map: gt.top, transparent: true, depthWrite: false, roughness: 0.6 }));
  top.rotation.x = -Math.PI / 2; top.position.set(0, 0.002, cz); scene.add(top);
  const mirror = new Reflector(new THREE.PlaneGeometry(ALLEY + 0.04, len), { textureWidth: 1024, textureHeight: 2048, color: 0xb0a0c0 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0.001, cz); scene.add(mirror);
}

return { scene, ups, stands, towerScreen, screenTex };
}
