// 空き地：ひび割れたコンクリ・水たまり・落書きの壁と金網、奥にネオンの街。真ん中のマンホールの下に光る研究所
import * as THREE from 'three';
import { INK, screentone, inkLine } from '../draw/manga.js';
import { box, cyl, glow, workSign, screenMesh, hinged, sprout, canvas, tex, hullMat, inkMat, H } from './parts.js';
import { drawSign } from '../draw/sign.js';

const SLAB = 0.11;            // 空き地の地面の高さ（下に研究所の穴を掘るため）
const HX = 0.02, HZ = 0.06, HR = 0.2; // マンホールの穴

function concreteTexture(r) {
  const c = canvas(1024, 768), g = c.getContext('2d');
  g.fillStyle = '#5c5864'; g.fillRect(0, 0, 1024, 768);
  for (let i = 0; i < 1400; i++) { g.fillStyle = r.pick(['rgba(30,28,36,0.35)', 'rgba(120,115,125,0.25)', 'rgba(80,70,60,0.3)']); g.fillRect(r.range(0, 1024), r.range(0, 768), r.range(2, 10), r.range(2, 8)); }
  // 板の継ぎ目とひび
  g.strokeStyle = 'rgba(20,16,24,0.9)'; g.lineWidth = 3;
  for (let x = 0; x < 1024; x += 170) { g.beginPath(); g.moveTo(x + r.range(-10, 10), 0); g.lineTo(x + r.range(-10, 10), 768); g.stroke(); }
  for (let y = 0; y < 768; y += 160) { g.beginPath(); g.moveTo(0, y + r.range(-10, 10)); g.lineTo(1024, y + r.range(-10, 10)); g.stroke(); }
  for (let i = 0; i < 70; i++) { let x = r.range(0, 1024), y = r.range(0, 768); const pts = [[x, y]]; for (let k = 0; k < 5; k++) { x += r.range(-40, 40); y += r.range(-40, 40); pts.push([x, y]); } inkLine(g, pts, { weight: r.range(1, 2.5), jitter: 2, r }); }
  // 水たまり（紫の空とネオンが映る）
  for (let i = 0; i < 11; i++) {
    const x = r.range(0, 1024), y = r.range(0, 768), rx = r.range(18, 60), ry = r.range(8, 24);
    const gr = g.createLinearGradient(x, y - ry, x, y + ry);
    gr.addColorStop(0, '#b05ab8'); gr.addColorStop(0.5, '#4a2a6a'); gr.addColorStop(1, '#221636');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = 'rgba(120,230,255,0.7)'; for (let k = 0; k < 4; k++) g.fillRect(x + r.range(-rx * 0.6, rx * 0.6), y - ry * 0.4, r.range(2, 5), ry * 0.8);
  }
  screentone(g, 0, 0, 1024, 768, { dot: 1, spacing: 5, color: 'rgba(0,0,0,0.25)' });
  return tex(c);
}
function graffitiWall(r, w = 1024, h = 192) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#6a6670'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 128) { g.strokeStyle = 'rgba(20,16,24,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let i = 0; i < 14; i++) {
    const x = r.range(0, w), y = r.range(40, h - 30), col = r.pick(['#e85ad8', '#6ad8e8', '#e8e05a', '#5ae87a', '#e8705a']);
    g.save(); g.translate(x, y); g.rotate(r.range(-0.2, 0.2));
    g.font = `${r.int(30, 60)}px "Dela Gothic One",sans-serif`; g.lineWidth = 7; g.strokeStyle = INK; const t = r.pick(['ZAP', 'B-01', 'ネオン', 'GO', '夜', 'NC', 'ZZZ', '!!']);
    g.strokeText(t, 0, 0); g.fillStyle = col; g.fillText(t, 0, 0); g.restore();
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(30,28,34,0.35)'; g.fillRect(r.range(0, w), r.range(0, h), r.range(1, 4), r.range(4, 30)); }
  screentone(g, 0, 0, w, h, { dot: 1, spacing: 4, color: 'rgba(0,0,0,0.3)' });
  g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(2, 2, w - 4, h - 4);
  return tex(c);
}
function chainTexture() {
  const c = canvas(64, 64), g = c.getContext('2d');
  g.strokeStyle = '#2a2830'; g.lineWidth = 2.5;
  for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke(); g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function labTexture(r) {
  const c = canvas(512, 128), g = c.getContext('2d');
  g.fillStyle = '#0a1a22'; g.fillRect(0, 0, 512, 128);
  for (let x = 0; x < 512; x += 32) { g.fillStyle = '#123040'; g.fillRect(x + 3, 6, 26, 116); g.fillStyle = r.pick(['#4fd8ff', '#2ab0d8', '#9ff0ff']); g.fillRect(x + 6, r.range(20, 100), 20, 3); }
  g.fillStyle = '#ffb840'; g.fillRect(0, 20, 512, 4);
  g.strokeStyle = '#f2c018'; g.lineWidth = 2; for (let x = 0; x < 512; x += 12) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 84); g.stroke(); } g.fillStyle = '#f2c018'; g.fillRect(0, 68, 512, 3);
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}

export function buildLot(works, textures, r) {
  const root = new THREE.Group(); root.name = 'district-wip';
  const pivots = [];
  const decor = new THREE.Group(); decor.scale.y = 0.001; root.add(decor);
  const add = p => { root.add(p); pivots.push(p); return p; };

  // 地面の厚い板（真ん中に丸い穴）。下から持ち上がる
  const shape = new THREE.Shape(); shape.moveTo(-0.98, -0.68); shape.lineTo(0.98, -0.68); shape.lineTo(0.98, 0.68); shape.lineTo(-0.98, 0.68); shape.lineTo(-0.98, -0.68);
  const hole = new THREE.Path(); hole.absellipse(HX, -HZ, HR, HR, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false, curveSegments: 40 });
  geo.rotateX(-H); // 上面が y=SLAB
  const ct = concreteTexture(r); ct.repeat.set(1 / 1.96, 1 / 1.36); ct.offset.set(0.5, 0.5);
  const slab = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ map: ct }), new THREE.MeshBasicMaterial({ color: '#3a3640' })]);
  slab.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), inkMat));
  add(sprout(slab, 0.0));
  // 穴の中：光る研究所（筒の内壁・足場・明かり）
  const pit = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, SLAB, 40, 1, true), new THREE.MeshBasicMaterial({ map: labTexture(r), side: THREE.BackSide }));
  wall.position.set(HX, SLAB / 2, HZ); pit.add(wall);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(HR, 40), new THREE.MeshBasicMaterial({ color: '#0e3a4a' }));
  bottom.rotation.x = -H; bottom.position.set(HX, 0.006, HZ); pit.add(bottom);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const b = box(0.012, 0.05, 0.012, '#2a4a5a', 0.002); b.position.set(HX + Math.cos(a) * HR * 0.6, 0.03, HZ + Math.sin(a) * HR * 0.6); pit.add(b); const l = glow('#4fd8ff', 0.05, 0.8); l.position.set(b.position.x, 0.06, b.position.z); pit.add(l); }
  const deck = new THREE.Mesh(new THREE.RingGeometry(HR * 0.5, HR * 0.85, 32), new THREE.MeshBasicMaterial({ color: '#2a3a44', side: THREE.DoubleSide })); deck.rotation.x = -H; deck.position.set(HX, 0.04, HZ); pit.add(deck);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.5, 0.0025, 6, 40), new THREE.MeshBasicMaterial({ color: '#f2c018' })); rail.rotation.x = H; rail.position.set(HX, 0.055, HZ); pit.add(rail);
  const pglow = glow('#4fd8ff', 0.7, 0.55); pglow.position.set(HX, SLAB + 0.02, HZ); pit.add(pglow);
  // 研究所の画面（掲示板）：穴の奥の壁に
  const { mesh: screen, screenMat } = screenMesh(0.16, 0.09, textures.billboard);
  screen.position.set(HX + 0.02, 0.06, HZ - HR * 0.92); pit.add(screen);
  // 穴の縁（コンクリの輪）
  const rim = new THREE.Mesh(new THREE.TorusGeometry(HR + 0.012, 0.016, 8, 48), new THREE.MeshBasicMaterial({ color: '#7a7480' }));
  rim.rotation.x = H; rim.position.set(HX, SLAB, HZ); rim.add(new THREE.Mesh(new THREE.TorusGeometry(HR + 0.012, 0.021, 8, 48), hullMat)); pit.add(rim);
  const hl = new THREE.Mesh(new THREE.TorusGeometry(HR - 0.004, 0.003, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); hl.rotation.x = H; hl.position.set(HX, SLAB - 0.01, HZ); pit.add(hl);
  add(sprout(pit, 0.15));

  // ふた：最後にパカッと開く（穴の奥側の縁がちょうつがい）
  const lidC = canvas(512, 512), lg = lidC.getContext('2d');
  lg.fillStyle = '#6a6470'; lg.beginPath(); lg.arc(256, 256, 252, 0, 7); lg.fill();
  for (let i = 0; i < 400; i++) { lg.fillStyle = r.pick(['rgba(110,55,30,0.6)', 'rgba(30,26,34,0.5)', 'rgba(150,140,150,0.3)']); lg.beginPath(); lg.arc(r.range(30, 480), r.range(30, 480), r.range(2, 12), 0, 7); lg.fill(); }
  lg.strokeStyle = '#efe8dc'; lg.lineWidth = 8; lg.beginPath(); lg.moveTo(256, 120); lg.lineTo(360, 280); lg.lineTo(152, 280); lg.closePath(); lg.stroke();
  lg.font = 'bold 72px sans-serif'; lg.fillStyle = '#efe8dc'; lg.textAlign = 'center'; lg.fillText('B-01', 256, 370);
  screentone(lg, 0, 0, 512, 512, { dot: 1.2, spacing: 5, color: 'rgba(0,0,0,0.3)' });
  lg.strokeStyle = INK; lg.lineWidth = 10; lg.beginPath(); lg.arc(256, 256, 248, 0, 7); lg.stroke();
  const edgeC = canvas(256, 16), eg = edgeC.getContext('2d');
  for (let x = 0; x < 256; x += 16) { eg.fillStyle = (x / 16) % 2 ? '#f2c018' : '#1a1418'; eg.beginPath(); eg.moveTo(x, 16); eg.lineTo(x + 8, 0); eg.lineTo(x + 16, 0); eg.lineTo(x + 8, 16); eg.fill(); }
  const et = tex(edgeC); et.wrapS = THREE.RepeatWrapping; et.repeat.set(6, 1);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(HR + 0.02, HR + 0.02, 0.022, 48), [new THREE.MeshBasicMaterial({ map: et }), new THREE.MeshBasicMaterial({ map: tex(lidC) }), new THREE.MeshBasicMaterial({ color: '#3a3440' })]);
  lid.add(new THREE.Mesh(new THREE.CylinderGeometry(HR + 0.025, HR + 0.025, 0.027, 48), hullMat));
  for (const a of [-0.9, 0.9, Math.PI]) { const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: '#6b3a2a' })); handle.position.set(Math.cos(a) * HR * 0.7, 0.012, Math.sin(a) * HR * 0.7); handle.rotation.y = -a; lid.add(handle); }
  const lidPivot = new THREE.Group();
  lidPivot.add(lid);
  // 閉じた状態（穴の上）→ 開いた状態（左へずれて、右側が持ち上がって傾く）
  const closed = new THREE.Vector3(HX, SLAB + 0.012, HZ), open = new THREE.Vector3(HX - 0.2, SLAB + 0.045, HZ + 0.03);
  lidPivot.userData = { delay: 0.85, bldg: { row: 0 }, stand: a => { const k = a / H; lidPivot.position.lerpVectors(closed, open, k); lidPivot.rotation.set(-0.08 * k, 0.4, 0.2 * k); } };
  lidPivot.userData.stand(0);
  root.add(lidPivot); pivots.push(lidPivot);

  // 奥の落書きの壁と金網、左の金網
  const gw = graffitiWall(r);
  const gm = new THREE.MeshBasicMaterial({ map: gw });
  const wallB = box(1.9, 0.2, 0.03, [gm, gm, '#55515a', '#55515a', gm, gm]); wallB.position.set(0, 0.1, -0.015);
  add(hinged(wallB, new THREE.Vector3(0, SLAB, -0.6), 'x', 0.3, 1));
  const chain = chainTexture();
  for (const [pos, len, rotY, delay] of [[new THREE.Vector3(0, SLAB + 0.2, -0.6), 1.9, 0, 0.4], [new THREE.Vector3(-0.92, SLAB, 0), 1.2, H, 0.35]]) {
    const g = new THREE.Group();
    const t = chain.clone(); t.needsUpdate = true; t.repeat.set(len * 40, 4);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.12), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
    net.position.y = 0.06; g.add(net);
    for (let x = -len / 2; x <= len / 2 + 0.001; x += 0.18) { const p = cyl(0.004, 0.004, 0.14, '#4a4248', 8, 0.003); p.position.set(x, 0.07, 0); g.add(p); }
    const wire = new THREE.Mesh(new THREE.BoxGeometry(len, 0.002, 0.002), inkMat); wire.position.y = 0.135; g.add(wire);
    g.rotation.y = rotY;
    const piv = hinged(g, pos, rotY ? 'z' : 'x', delay, rotY ? 1 : 1);
    add(piv);
  }
  // 錆びたドラム缶・パレット・雑草
  const barrel = cyl(0.035, 0.035, 0.08, '#7a3a22', 16, 0.004); barrel.position.set(0.62, SLAB + 0.04, 0.42);
  for (const y of [-0.02, 0.02]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0365, 0.0365, 0.004, 16), new THREE.MeshBasicMaterial({ color: '#4a2214' })); band.position.y = y; barrel.add(band); }
  add(sprout(barrel, 0.6));
  const pallet = box(0.12, 0.02, 0.09, '#6a5038'); pallet.position.set(-0.6, SLAB + 0.01, 0.4); add(sprout(pallet, 0.6));
  const weeds = new THREE.Group();
  const bladeGeo = new THREE.PlaneGeometry(0.0025, 0.016).translate(0, 0.008, 0);
  const bladeMat = new THREE.MeshBasicMaterial({ color: '#4a6a2a', side: THREE.DoubleSide });
  const n = 420, inst = new THREE.InstancedMesh(bladeGeo, bladeMat, n);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    let x, z; do { x = r.range(-0.95, 0.95); z = r.range(-0.58, 0.66); } while (Math.hypot(x - HX, z - HZ) < HR + 0.05);
    Q.setFromEuler(E.set(r.range(-0.4, 0.4), r.range(0, 6), r.range(-0.4, 0.4)));
    M.compose(new THREE.Vector3(x, SLAB, z), Q, new THREE.Vector3(1, r.range(0.6, 1.6), 1));
    inst.setMatrixAt(i, M); inst.setColorAt(i, new THREE.Color(r.pick(['#4a6a2a', '#6a8a3a', '#3a5a22', '#8a9a4a'])));
  }
  weeds.add(inst); decor.add(weeds);

  // 湯気（穴から立ちのぼる）
  const steam = [];
  const sc = canvas(64, 64), sg = sc.getContext('2d');
  for (let i = 0; i < 6; i++) { const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, rr = 10 + Math.random() * 10; const gr = sg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(220,240,255,0.5)'); gr.addColorStop(1, 'rgba(220,240,255,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64); }
  const stT = tex(sc);
  for (let k = 0; k < 10; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: stT, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { t: r.range(0, 1), speed: r.range(0.12, 0.2), x: HX + r.range(-0.1, 0.1), z: HZ + r.range(-0.1, 0.1) }; decor.add(s); steam.push(s); }

  // 工事中の作品：柱に立つ工事看板
  const workSigns = works.map((w, i) => {
    const s = workSign({ ...w, color: w.color || '#ffd400' }, 0.08, 0.22, r);
    const SPOTS = [[-0.4, 0.22], [0.42, 0.24], [-0.62, 0.0], [0.64, 0.02], [-0.36, -0.28], [0.44, -0.26], [-0.72, -0.4], [0.74, -0.38]];
    const [x, z] = SPOTS[i % SPOTS.length];
    s.position.set(x, SLAB + 0.16 + Math.floor(i / SPOTS.length) * 0.24, z);
    const post = box(0.006, 0.06, 0.006, '#c8b020', 0.002); post.position.set(s.position.x, SLAB + 0.03, s.position.z - 0.004); decor.add(post);
    const cone = cyl(0.002, 0.014, 0.03, '#ff7a1a', 10, 0.003); cone.position.set(s.position.x + 0.03, SLAB + 0.015, s.position.z + 0.02); decor.add(cone);
    decor.add(s);
    return s;
  });
  // 工事中の黄色い看板（飾り）
  const kc = canvas(256, 96); drawSign(kc, { text: '立入禁止', color: '#ffd400', isWork: false, vertical: false });
  const ks = box(0.16, 0.06, 0.006, [INK, INK, INK, INK, new THREE.MeshBasicMaterial({ map: tex(kc) }), INK]); ks.position.set(-0.5, SLAB + 0.25, -0.58); decor.add(ks);

  root.userData = {
    kind: 'wip', pivots, decor, workSigns, signs: workSigns, screenParts: [screen], screenMat, cars: null,
    view: { position: new THREE.Vector3(-0.1, SLAB + 0.15, 0.92), target: new THREE.Vector3(0.04, SLAB + 0.07, -0.3), fov: a => a < 0.9 ? 80 : 56 },
    extra: { wet: new THREE.Group(), animate(time, dt) { for (const s of steam) { const u = s.userData; u.t += dt * u.speed; const k = u.t % 1; s.position.set(u.x + Math.sin(u.t * 4) * 0.01, SLAB + k * 0.25, u.z); s.scale.setScalar(0.05 + k * 0.12); s.material.opacity = Math.sin(k * Math.PI) * 0.45; } } },
  };
  return root;
}
