// 配置計画 → Three のグループ（紙の建物・看板・ダクト類・掲示板）
import * as THREE from 'three';
import { drawFacade, facadeSize } from '../draw/facade.js';
import { drawSign } from '../draw/sign.js';
import { drawClutterStrip } from '../draw/clutter.js';
import { INK, screentone, crosshatch, inkLine } from '../draw/manga.js';
import { rng } from '../rng.js';
import { addKowloon } from './kowloon.js';

const H = Math.PI / 2;
const inkMat = new THREE.LineBasicMaterial({ color: INK });
const hullMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const YAW = { east: Math.PI / 2, west: -Math.PI / 2, south: 0 };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

function stripTextures(r) {
  const out = {};
  for (const k of ['duct', 'tube', 'wire']) {
    out[k] = [0, 1, 2].map(() => { const c = canvas(64, 256); drawClutterStrip(c, k, r); const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
  }
  return out;
}

function roofTexture(r, district) {
  const c = canvas(64, 64), g = c.getContext('2d');
  g.fillStyle = district === 'tools' ? '#4a3c38' : district === 'wip' ? '#77736b' : '#24142a';
  g.fillRect(0, 0, 64, 64);
  screentone(g, 0, 0, 64, 64, { dot: 1, spacing: 4 });
  for (let i = 0; i < 4; i++) { g.fillStyle = r.pick(['#8c8a86', '#5b5560', '#a8a39a']); const x = r.range(4, 44), y = r.range(4, 44); g.fillRect(x, y, 14, 10); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(x, y, 14, 10); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, 62, 62);
  return tex(c);
}

export function groundTexture(kind, seed = 1) {
  const r = rng(seed + 31);
  const c = canvas(1024, 720), g = c.getContext('2d');
  const base = kind === 'games' ? '#231a2b' : kind === 'tools' ? '#3a3431' : '#6b5d4c';
  g.fillStyle = base; g.fillRect(0, 0, 1024, 720);
  // 道路
  g.strokeStyle = kind === 'wip' ? 'rgba(40,30,20,0.6)' : 'rgba(255,255,255,0.12)';
  g.setLineDash([12, 10]); g.lineWidth = 3;
  for (let y = 72; y < 720; y += 144) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.setLineDash([]);
  if (kind === 'games') {
    // 路面に映るネオン
    for (let i = 0; i < 40; i++) { const x = r.range(0, 1024), y = r.range(0, 720), col = r.pick(['255,79,163', '79,216,255', '255,178,31']); const gr = g.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, `rgba(${col},0.35)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - 40, y - 40, 80, 80); }
  }
  // 路地（中央の帯）：濡れた路面にネオンが縦に映り込む
  const ax0 = 512 - 64, aw = 128;
  g.fillStyle = kind === 'games' ? '#140c1c' : kind === 'tools' ? '#2a2422' : '#5a4c3c';
  g.fillRect(ax0, 0, aw, 720);
  if (kind !== 'wip') {
    for (let i = 0; i < 70; i++) {
      const x = ax0 + r.range(4, aw - 4), y = r.range(0, 720), len = r.range(30, 160), col = kind === 'games' ? r.pick(['255,79,163', '79,216,255', '255,178,31', '180,107,255', '255,59,59']) : '255,170,90';
      const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},0.55)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x, y, r.range(2, 7), len);
    }
    // 水たまりのハイライト
    for (let i = 0; i < 24; i++) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.ellipse(ax0 + r.range(10, aw - 10), r.range(0, 720), r.range(6, 22), r.range(2, 5), 0, 0, 7); g.stroke(); }
  }
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(ax0, 0); g.lineTo(ax0, 720); g.moveTo(ax0 + aw, 0); g.lineTo(ax0 + aw, 720); g.stroke();
  if (kind === 'wip') { for (let i = 0; i < 300; i++) { g.fillStyle = r.pick(['#5a4c3c', '#7d6a54', '#4b4036']); g.fillRect(r.range(0, 1024), r.range(0, 720), r.range(2, 8), r.range(2, 6)); } }
  screentone(g, 0, 0, ax0, 720, { dot: 1.2, spacing: 6, color: 'rgba(0,0,0,0.35)' });
  screentone(g, ax0 + aw, 0, 1024 - ax0 - aw, 720, { dot: 1.2, spacing: 6, color: 'rgba(0,0,0,0.35)' });
  crosshatch(g, 0, 0, 1024, 720, { density: 1, gap: 14, color: 'rgba(0,0,0,0.1)' });
  for (let i = 0; i < 30; i++) inkLine(g, [[r.range(0, 1024), r.range(0, 720)], [r.range(0, 1024), r.range(0, 720)]], { weight: 0.8, r });
  return tex(c);
}

function box(b, facadeTex, roofTex) {
  const front = new THREE.MeshBasicMaterial({ map: facadeTex });
  const side = new THREE.MeshBasicMaterial({ map: facadeTex, color: 0x8a7a96 });
  const shade = new THREE.MeshBasicMaterial({ map: facadeTex, color: 0x5a4a66 });
  const roof = new THREE.MeshBasicMaterial({ map: roofTex });
  const geo = new THREE.BoxGeometry(b.fw, b.h, b.fd);
  const mesh = new THREE.Mesh(geo, [shade, side, roof, roof, front, shade]); // +x,-x,+y,-y,+z,-z
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), inkMat));
  // 太い墨の輪郭（裏返した一回り大きい箱）
  const o = 0.007;
  mesh.add(new THREE.Mesh(new THREE.BoxGeometry(b.fw + o, b.h + o, b.fd + o), hullMat));
  return mesh;
}

function tubePath(d, r) {
  const [a, b] = [new THREE.Vector3(...d.from), new THREE.Vector3(...d.to)];
  if (d.type === 'wire') {
    const mid = a.clone().lerp(b, 0.5); mid.y -= a.distanceTo(b) * 0.12;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }
  // ダクト・チューブ：直角に曲がって這う
  const out = r.range(0.008, 0.03);
  const y = Math.min(a.y, b.y) + r.range(-0.04, 0.03);
  const pts = [a, new THREE.Vector3(a.x, a.y, a.z + out), new THREE.Vector3(a.x, y, a.z + out), new THREE.Vector3(b.x, y, Math.max(a.z, b.z) + out), new THREE.Vector3(b.x, b.y, b.z + out), b];
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
}

export function buildDistrict(plan, works, textures, opts = {}) {
  const r = rng(plan.buildings.length * 13 + plan.kind.length);
  const root = new THREE.Group();
  root.name = `district-${plan.kind}`;
  const byId = new Map(works.map(w => [w.id, w]));
  const strips = stripTextures(r);
  const roofs = [0, 1, 2].map(() => roofTexture(r, plan.kind));
  const rows = Math.max(...plan.buildings.map(b => b.row)) + 1;
  const pivots = [], signs = [], workSigns = [];
  const bmap = new Map();

  for (const b0 of plan.buildings) {
    // 正面の幅 fw と奥行き fd（建物の向きで x/z が入れ替わる）
    const side = b0.face === 'east' || b0.face === 'west';
    const b = { ...b0, fw: side ? b0.d : b0.w, fd: side ? b0.w : b0.d };
    const { w, h } = facadeSize({ w: b.fw, h: b.h }, plan.kind === 'games' && b.strip === 'inner' ? 1.8 : 1);
    const c = canvas(w, h);
    drawFacade(c, { ...b, w: b.fw }, plan.kind, rng(r.int(1, 1e9)));
    const ft = tex(c);
    const mesh = box(b, ft, r.pick(roofs));
    if (b.art) new THREE.TextureLoader().load(b.art, t => { t.colorSpace = THREE.SRGBColorSpace; mesh.material[4].map = t; mesh.material[4].transparent = true; mesh.material[4].needsUpdate = true; });
    mesh.position.set(0, b.h / 2, -b.fd / 2);
    // 折り目は建物の正面の下辺。路地を向いて立ち上がる
    const pivot = new THREE.Group();
    pivot.rotation.order = 'YXZ';
    const yaw = YAW[b.face] ?? 0;
    pivot.position.set(b.face === 'east' ? b.x + b.w / 2 : b.face === 'west' ? b.x - b.w / 2 : b.x, 0, b.face === 'south' ? b.z + b.d / 2 : b.z);
    pivot.rotation.y = yaw;
    pivot.add(mesh);
    pivot.rotation.x = -H;
    pivot.userData = { delay: (rows - 1 - b.row) * 0.13 + (b.strip === 'outer' ? 0.18 : 0) + r.range(0, 0.1), bldg: b, yaw };
    root.add(pivot);
    pivots.push(pivot);
    bmap.set(b.id, { b, mesh, yaw });
  }

  // 看板：路地にせり出す縦看板は、どの建物に付いても画面（手前）を向く
  for (const s of plan.signs) {
    const host = bmap.get(s.bldgId);
    if (!host) continue;
    const { b, mesh, yaw } = host;
    const isWork = !!s.workId;
    const juts = !!s.project && b.face !== 'south';
    let ww, hh;
    if (isWork) { ww = 0.075; hh = Math.min(0.3, b.h * 0.7); }
    else if (juts) { ww = r.range(0.035, 0.06); hh = r.range(0.09, 0.2); }
    else { ww = Math.min(b.fw * 0.85, s.w * 0.22); hh = s.vertical ? Math.min(b.h * 0.5, s.h * 0.35) : s.h * 0.35; ww = s.vertical ? Math.min(ww, hh * 0.4) : ww; }
    const px = 200, ratio = ww / hh;
    const c = canvas(Math.round(ratio > 1 ? px * ratio : px), Math.round(ratio > 1 ? px : px / ratio));
    drawSign(c, { text: s.text, color: s.color, isWork, vertical: s.vertical || juts });
    const faceMat = new THREE.MeshBasicMaterial({ map: tex(c), color: isWork ? 0xffffff : 0xdddddd });
    const edgeMat = new THREE.MeshBasicMaterial({ color: '#1d1220' });
    const t = 0.008;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, t), [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, faceMat]);
    sign.add(new THREE.Mesh(new THREE.BoxGeometry(ww + 0.006, hh + 0.006, t + 0.004), hullMat));
    const y = THREE.MathUtils.clamp(s.v * b.h, hh / 2 + 0.03, b.h - hh / 2 - 0.005);
    if (juts) {
      // 壁から路地へ突き出す。ローカルで手前(+z)が路地、看板の面は世界の +z（カメラ）を向く
      const ux = THREE.MathUtils.clamp((s.u - 0.5) * b.fw, -b.fw / 2 + 0.01, b.fw / 2 - 0.01);
      sign.rotation.y = -yaw;
      sign.position.set(ux, y - b.h / 2, b.fd / 2 + ww / 2 + 0.012);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, ww + 0.02), new THREE.MeshBasicMaterial({ color: INK }));
      arm.position.set(ux, y - b.h / 2 + hh / 2 - 0.004, b.fd / 2 + ww / 2 + 0.006);
      mesh.add(arm);
    } else {
      const x = THREE.MathUtils.clamp((s.u - 0.5) * b.fw, -b.fw / 2 + ww / 2, b.fw / 2 - ww / 2);
      sign.position.set(x, y - b.h / 2, b.fd / 2 + t / 2 + 0.002 + r.range(0, 0.004));
    }
    mesh.add(sign);
    sign.userData.color = s.color;
    if (isWork) { Object.assign(sign.userData, { workId: s.workId, phase: r.range(0, 6), faceMat }); workSigns.push(sign); }
    signs.push(sign);
  }

  // ダクト・チューブ・電線・洗濯物・煙突・クレーン・フェンス
  const decor = new THREE.Group();
  decor.scale.y = 0.001;
  const outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  for (const d of plan.decor) {
    if (d.type === 'duct' || d.type === 'tube' || d.type === 'wire') {
      const rad = d.type === 'duct' ? r.range(0.005, 0.01) : d.type === 'tube' ? r.range(0.002, 0.0048) : 0.0012;
      const curve = tubePath(d, r);
      const len = curve.getLength();
      const t = r.pick(strips[d.type]).clone(); t.needsUpdate = true; t.repeat.set(1, Math.max(1, len * 14));
      const segs = d.type === 'wire' ? 12 : 40;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, rad, d.type === 'duct' ? 6 : 5, false), new THREE.MeshBasicMaterial({ map: t }));
      decor.add(tube);
      if (d.type !== 'wire') decor.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, rad * 1.45, 6, false), outline));
    } else if (d.type === 'laundry') {
      const a = new THREE.Vector3(...d.from), b = new THREE.Vector3(...d.to);
      a.z += 0.02; b.z += 0.02;
      decor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), inkMat));
      const n = r.int(2, 5);
      for (let i = 0; i < n; i++) {
        const p = a.clone().lerp(b, (i + 0.5) / n);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.012, r.range(0.012, 0.022)), new THREE.MeshBasicMaterial({ color: r.pick(['#f2f2f2', '#ff8fb8', '#8fd3ff', '#ffe07a', '#9b4a5c']), side: THREE.DoubleSide }));
        cloth.position.copy(p); cloth.position.y -= 0.009;
        decor.add(cloth);
      }
    } else if (d.type === 'chimney') {
      const hgt = d.to[1] - d.from[1];
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, hgt, 8), new THREE.MeshBasicMaterial({ color: '#7a3b2e' }));
      ch.position.set(d.from[0], d.from[1] + hgt / 2, d.from[2]);
      ch.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.024, hgt, 8), outline));
      for (let k = 1; k < 4; k++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.008, 8), new THREE.MeshBasicMaterial({ color: k % 2 ? '#e8e2d2' : '#c23b3b' })); band.position.y = hgt / 2 - k * 0.02; ch.add(band); }
      ch.userData.smoke = true;
      decor.add(ch);
    } else if (d.type === 'crane') {
      const hgt = d.to[1];
      const mat = new THREE.MeshBasicMaterial({ color: '#ffc21a' });
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.03, hgt, 0.03), mat);
      mast.position.set(d.from[0], hgt / 2, d.from[2]);
      mast.add(new THREE.LineSegments(new THREE.EdgesGeometry(mast.geometry), inkMat));
      const jib = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.025, 0.025), mat);
      jib.position.set(d.from[0] + 0.22, hgt, d.from[2]);
      jib.add(new THREE.LineSegments(new THREE.EdgesGeometry(jib.geometry), inkMat));
      const hook = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(d.from[0] + 0.5, hgt, d.from[2]), new THREE.Vector3(d.from[0] + 0.5, hgt * 0.55, d.from[2])]), inkMat);
      decor.add(mast, jib, hook);
    } else if (d.type === 'fence') {
      const c = canvas(512, 48), g = c.getContext('2d');
      g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 512, 48);
      for (let x = -48; x < 512; x += 24) { g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(x, 48); g.lineTo(x + 12, 34); g.lineTo(x + 24, 34); g.lineTo(x + 12, 48); g.fill(); }
      g.fillStyle = INK; g.font = 'bold 22px sans-serif'; g.fillText('工事中　ご迷惑をおかけします　工事中', 24, 26);
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, 510, 46);
      const len = d.to[0] - d.from[0];
      const f = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), new THREE.MeshBasicMaterial({ map: tex(c), side: THREE.DoubleSide }));
      f.position.set((d.from[0] + d.to[0]) / 2, 0.03, d.from[2] + 0.18);
      decor.add(f);
    }
  }
  root.add(decor);

  // 高速道路（繁華街のみ）
  let cars = null;
  if (false) {
    const zH = -0.7 + (1.4 / rows) * 3;
    const road = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.012, 0.06), new THREE.MeshBasicMaterial({ color: '#3a3346' }));
    road.position.set(0, 0.2, zH);
    road.add(new THREE.LineSegments(new THREE.EdgesGeometry(road.geometry), inkMat));
    for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: '#cfefff' })); rail.position.set(0, 0.009, s * 0.03); road.add(rail); }
    for (let x = -0.9; x <= 0.9; x += 0.3) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.03), new THREE.MeshBasicMaterial({ color: '#2c2633' })); leg.position.set(x, -0.1, 0); road.add(leg); }
    cars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.008, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff }), 28);
    cars.userData.list = Array.from({ length: 28 }, (_, i) => ({ x: r.range(-1.05, 1.05), lane: i % 2 ? 0.014 : -0.014, v: (i % 2 ? -1 : 1) * r.range(0.25, 0.5), red: i % 2 === 1 }));
    cars.userData.list.forEach((c, i) => cars.setColorAt(i, new THREE.Color(c.red ? '#ff5a6a' : '#fff6d8')));
    road.add(cars);
    road.userData.rise = true;
    decor.add(road);
  }

  // 掲示板
  const bb = bmap.get(plan.billboard.bldgId);
  const screenTex = textures.billboard;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: 0x000000 });
  let screen;
  if (plan.kind === 'tools') {
    // ブラウン管の積み上げ：1枚の画面を区切って映す
    screen = new THREE.Group();
    const cols = 2, rowsN = 5, tw = bb.b.w * 0.42, th = tw * 0.8;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rowsN; j++) {
      const tv = new THREE.Mesh(new THREE.BoxGeometry(tw, th, tw * 0.9), new THREE.MeshBasicMaterial({ color: r.pick(['#5c5a54', '#3d3a3f', '#7a6f5c']) }));
      tv.add(new THREE.LineSegments(new THREE.EdgesGeometry(tv.geometry), inkMat));
      const g = new THREE.PlaneGeometry(tw * 0.82, th * 0.78);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / cols, (rowsN - 1 - j + uv.getY(k)) / rowsN);
      const glass = new THREE.Mesh(g, screenMat);
      glass.position.z = tw * 0.451; glass.userData.billboard = true;
      tv.add(glass);
      tv.position.set((i - (cols - 1) / 2) * tw * 1.04 + r.range(-0.004, 0.004), bb.b.h / 2 + th / 2 + j * th * 1.02, 0);
      tv.rotation.y = r.range(-0.08, 0.08);
      screen.add(tv);
    }
    bb.mesh.add(screen);
  } else {
    const sw = bb.b.fw * 0.86, sh = plan.kind === 'games' ? sw * 1.05 : Math.min(bb.b.h * 0.62, sw * 3.4);
    screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
    screen.position.set(0, bb.b.h / 2 - sh / 2 - (plan.kind === 'games' ? 0.17 : 0.05), bb.b.fd / 2 + 0.008);
    screen.userData.billboard = true;
    const frameCol = plan.kind === 'wip' ? '#ffd400' : '#ff4fa3';
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.08, sh * 1.03), new THREE.MeshBasicMaterial({ color: frameCol }));
    frame.position.z = -0.002; screen.add(frame);
    screen.add(new THREE.LineSegments(new THREE.EdgesGeometry(frame.geometry), inkMat));
    bb.mesh.add(screen);
  }
  const screenParts = [];
  screen.traverse(o => { if (o.userData.billboard) screenParts.push(o); });

  const extra = plan.kind === 'games' ? addKowloon(root, plan, bmap, decor, r, { pivots, signs }) : null;
  if (extra) { extra.wet.visible = false; }
  root.userData = { kind: plan.kind, pivots, decor, workSigns, signs, screenParts, screenMat, cars, extra,
    view: plan.kind === 'games' ? { position: new THREE.Vector3(0, 0.04, 0.66), target: new THREE.Vector3(0, 0.6, -0.6), fov: a => a < 0.9 ? 80 : 64 } : null };
  return root;
}

// 毎フレーム：看板の明滅、車、選択中の強調
export function animateDistrict(group, time, dt, selectedId) {
  const u = group.userData;
  u.extra?.animate(time, dt);
  if (u.extra) u.extra.wet.visible = u.decor.scale.y > 0.5;
  for (const s of u.workSigns) {
    const on = s.userData.workId === selectedId;
    const k = on ? 1.35 : 0.8 + 0.2 * Math.sin(time * (Math.PI * 2 / 2.4) + s.userData.phase);
    (s.userData.faceMat || s.material).color.setScalar(k);
    const sc = on ? 1.12 : 1; s.scale.setScalar(s.scale.x + (sc - s.scale.x) * Math.min(1, dt * 10));
  }
  if (u.cars) {
    const m = new THREE.Matrix4();
    u.cars.userData.list.forEach((c, i) => { c.x += c.v * dt; if (c.x > 1.05) c.x = -1.05; if (c.x < -1.05) c.x = 1.05; m.makeTranslation(c.x, 0.012, c.lane); u.cars.setMatrixAt(i, m); });
    u.cars.instanceMatrix.needsUpdate = true;
  }
}
