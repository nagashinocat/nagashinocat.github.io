// 第3工場：外は錆びてボロボロ、大扉の中は青白く光るハイテク工場
import * as THREE from 'three';
import { INK, screentone, crosshatch, inkLine } from '../draw/manga.js';
import { box, cyl, glow, workSign, screenMesh, hinged, sprout, canvas, tex, hullMat, inkMat, H } from './parts.js';

const FZ = 0.24;                 // 正面の壁の位置
const FW = 1.9, FH = 0.62, FT = 0.04;
const DX0 = -0.34, DX1 = 0.46, DH = 0.42; // 大扉
const IX0 = -0.62, IX1 = 0.74, IZ0 = -0.66, IH = 0.5; // 中のホール

function facadeTexture(r) {
  const c = canvas(1536, 512), g = c.getContext('2d'), W = 1536, Hh = 512;
  g.fillStyle = '#c9c0b4'; g.fillRect(0, 0, W, Hh);
  // 波板
  for (let x = 0; x < W; x += 9) { g.fillStyle = (x / 9) % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 4.5, Hh); }
  // 汚れ・錆のはがれ
  for (let i = 0; i < 1400; i++) {
    const x = r.range(0, W), y = r.range(0, Hh), rr = r.range(1.5, 9);
    g.fillStyle = r.pick(['rgba(110,50,28,0.75)', 'rgba(70,32,20,0.8)', 'rgba(40,28,26,0.7)', 'rgba(150,80,40,0.55)']);
    g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, d = rr * r.range(0.5, 1.2); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8); } g.fill();
  }
  for (let i = 0; i < 420; i++) { const x = r.range(0, W), y = r.range(0, Hh * 0.8); g.fillStyle = r.pick(['rgba(80,40,25,0.45)', 'rgba(40,24,20,0.4)']); g.fillRect(x, y, r.range(1, 3), r.range(20, 140)); }
  // 上の階の割れた窓
  for (let x = 40; x < W - 80; x += 150) {
    const y = 40;
    g.fillStyle = '#1a2230'; g.fillRect(x, y, 110, 80);
    g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x, y, 110, 80);
    g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 27.5, y); g.lineTo(x + k * 27.5, y + 80); g.stroke(); }
    g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x + 110, y + 40); g.stroke();
    for (let k = 0; k < 8; k++) if (r.next() < 0.5) { g.fillStyle = r.next() < 0.5 ? '#0a0a10' : 'rgba(140,190,230,0.5)'; g.fillRect(x + (k % 4) * 27.5 + 2, y + Math.floor(k / 4) * 40 + 2, 24, 37); }
    if (r.next() < 0.4) { g.fillStyle = 'rgba(255,190,90,0.8)'; g.fillRect(x + 4, y + 44, 50, 33); }
  }
  // 「第3工場」のペンキ
  g.font = '100px "Dela Gothic One","Hiragino Kaku Gothic StdN",sans-serif'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(40,30,32,0.9)'; g.fillText('第3', 290, 240); g.fillText('工場', 280, 345);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r.range(0.3, 0.9)})`; g.beginPath(); g.arc(r.range(270, 500), r.range(180, 400), r.range(1, 6), 0, 7); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  // 下の階の窓（あかり）
  for (const x of [80, 300, 1250]) { g.fillStyle = '#ffcf7a'; g.fillRect(x, 400, 120, 70); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x, 400, 120, 70); g.beginPath(); g.moveTo(x + 60, 400); g.lineTo(x + 60, 470); g.stroke(); }
  screentone(g, 0, 0, W, Hh, { dot: 1.2, spacing: 6, color: 'rgba(20,10,10,0.25)' });
  crosshatch(g, 0, Hh * 0.85, W, Hh * 0.15, { density: 2, gap: 6 });
  for (let i = 0; i < 40; i++) inkLine(g, [[r.range(0, W), r.range(0, Hh)], [r.range(0, W), r.range(0, Hh)]].map(([x, y], k) => k ? [x, y] : [x, y]), { weight: 0.8, r });
  g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(2, 2, W - 4, Hh - 4);
  return tex(c);
}
function techWall(r, w = 512, h = 256) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#18202c'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 64) { g.fillStyle = '#222c3a'; g.fillRect(x + 4, 8, 56, h - 16); g.strokeStyle = '#0a0e16'; g.lineWidth = 3; g.strokeRect(x + 4, 8, 56, h - 16); }
  for (let y = 40; y < h; y += 70) { g.fillStyle = '#7fe6ff'; g.shadowColor = '#4fd8ff'; g.shadowBlur = 10; g.fillRect(0, y, w, 3); }
  g.shadowBlur = 0;
  for (let i = 0; i < 40; i++) { g.fillStyle = r.pick(['#4fd8ff', '#9ff0ff', '#ffd24f']); g.fillRect(r.range(0, w), r.range(0, h), 4, 3); }
  return tex(c);
}
function floorTexture(r) {
  const c = canvas(512, 1024), g = c.getContext('2d');
  g.fillStyle = '#3a4250'; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 90; i++) { const x = r.range(0, 512), y = r.range(0, 1024), col = r.pick(['79,216,255', '159,240,255', '255,210,79']); const gr = g.createLinearGradient(0, y, 0, y + 160); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},0.4)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x, y, r.range(3, 10), 160); }
  g.strokeStyle = '#f2c018'; g.lineWidth = 7; for (const x of [150, 362]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  g.strokeStyle = 'rgba(10,14,20,0.6)'; g.lineWidth = 2; for (let y = 0; y < 1024; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  return tex(c);
}
function outsideTexture(r) {
  const c = canvas(1024, 512), g = c.getContext('2d');
  g.fillStyle = '#2a2a30'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { const x = r.range(0, 1024), y = r.range(0, 512); g.fillStyle = 'rgba(90,110,140,0.35)'; g.beginPath(); g.ellipse(x, y, r.range(30, 120), r.range(10, 40), 0, 0, 7); g.fill(); }
  for (let i = 0; i < 22; i++) { const x = r.range(300, 760), y = r.range(0, 512), col = r.pick(['79,216,255', '159,240,255', '255,200,120', '190,120,255']); const gr = g.createLinearGradient(x, 0, x, 512); gr.addColorStop(0, `rgba(${col},0.5)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x, r.range(0, 200), r.range(3, 12), 300); }
  g.strokeStyle = 'rgba(5,5,8,0.9)'; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { let x = r.range(0, 1024), y = r.range(0, 512); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += r.range(-40, 40); y += r.range(-20, 20); g.lineTo(x, y); } g.stroke(); }
  screentone(g, 0, 0, 1024, 512, { dot: 1, spacing: 5, color: 'rgba(0,0,0,0.3)' });
  return tex(c);
}

function robotArm(r) {
  const g = new THREE.Group();
  const white = '#e8ecf0', gray = '#9aa4b0';
  const base = box(0.07, 0.03, 0.07, gray); base.position.y = 0.015; g.add(base);
  const turret = cyl(0.022, 0.026, 0.03, white, 16); turret.position.y = 0.045; g.add(turret);
  const shoulder = new THREE.Group(); shoulder.position.y = 0.06; shoulder.rotation.z = r.range(-0.5, -0.2); g.add(shoulder);
  const upper = box(0.022, 0.12, 0.026, white); upper.position.y = 0.06; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = 0.12; elbow.rotation.z = r.range(1.0, 1.6); shoulder.add(elbow);
  const fore = box(0.018, 0.09, 0.02, white); fore.position.y = 0.045; elbow.add(fore);
  const hand = box(0.028, 0.012, 0.024, gray); hand.position.y = 0.095; elbow.add(hand);
  for (const [p, s] of [[shoulder, 0], [elbow, 0]]) { const j = cyl(0.012, 0.012, 0.03, '#7fe6ff', 12, 0.003); j.rotation.x = H; p.add(j); void s; }
  const jg = glow('#4fd8ff', 0.05, 0.4); jg.position.y = 0.06; g.add(jg);
  g.userData = { shoulder, elbow, phase: r.range(0, 6) };
  return g;
}
function console_(r) {
  const g = box(0.06, 0.07, 0.04, ['#8a929c', '#8a929c', '#b8c0c8', '#555', '#9aa2ac', '#6a7280']);
  g.position.y = 0.035;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.022), new THREE.MeshBasicMaterial({ color: r.pick(['#4fd8ff', '#7fe6ff', '#9ff0ff']) }));
  scr.position.set(0, 0.015, 0.0205); g.add(scr);
  return g;
}

export function buildFactory(works, textures, r) {
  const root = new THREE.Group(); root.name = 'district-tools';
  const pivots = [];
  const decor = new THREE.Group(); decor.scale.y = 0.001; root.add(decor);
  const add = p => { root.add(p); pivots.push(p); return p; };

  // 地面（外は濡れたコンクリ、中はハイテクの床）
  const out = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.7 - FZ + 0.02), new THREE.MeshBasicMaterial({ map: outsideTexture(r) }));
  out.rotation.x = -H; out.position.set(0, 0.005, (0.7 + FZ) / 2); root.add(out);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(IX1 - IX0, FZ - IZ0), new THREE.MeshBasicMaterial({ map: floorTexture(r) }));
  fl.rotation.x = -H; fl.position.set((IX0 + IX1) / 2, 0.005, (FZ + IZ0) / 2); root.add(fl);

  // 中のホール：左右の壁・奥の壁・天井
  const wallT = techWall(r);
  const lw = box(0.02, IH, FZ - IZ0, wallT); lw.position.set(0.01, IH / 2, 0);
  add(hinged(lw, new THREE.Vector3(IX0, 0, (FZ + IZ0) / 2), 'z', 0.1, 1));
  const rw = box(0.02, IH, FZ - IZ0, wallT); rw.position.set(-0.01, IH / 2, 0);
  add(hinged(rw, new THREE.Vector3(IX1, 0, (FZ + IZ0) / 2), 'z', 0.15, -1));
  const back = new THREE.Group();
  const bw = box(IX1 - IX0, IH, 0.02, wallT); bw.position.set((IX0 + IX1) / 2, IH / 2, 0.01); back.add(bw);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshBasicMaterial({ color: '#d8fbff' }));
  portal.position.set(0.08, 0.1, 0.022); back.add(portal);
  const pg = glow('#7fe6ff', 0.22, 0.5); pg.position.set(0.08, 0.1, 0.04); back.add(pg);
  add(hinged(back, new THREE.Vector3(0, 0, IZ0), 'x', 0.2, 1));
  // 天井：梁と光の帯
  const ceil = new THREE.Group();
  for (let x = IX0 + 0.08; x < IX1; x += 0.22) { const beam = box(0.025, 0.03, FZ - IZ0, '#2a3240', 0.004); beam.position.set(x, IH - 0.015, (FZ + IZ0) / 2); ceil.add(beam); }
  for (let z = IZ0 + 0.06; z < FZ - 0.02; z += 0.11) for (let x = IX0 + 0.15; x < IX1 - 0.1; x += 0.26) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.015), new THREE.MeshBasicMaterial({ color: '#f4fdff' })); l.position.set(x, IH - 0.035, z); ceil.add(l); }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(IX1 - IX0, FZ - IZ0), new THREE.MeshBasicMaterial({ color: '#141a24', side: THREE.DoubleSide }));
  roof.rotation.x = H; roof.position.set((IX0 + IX1) / 2, IH, (FZ + IZ0) / 2); ceil.add(roof);
  const ceilP = new THREE.Group(); ceilP.add(ceil); ceilP.position.y = 0;
  decor.add(ceilP);

  // ロボットアーム・ガラスの装置・操作台
  const arms = [];
  for (const [x, rot] of [[-0.24, -0.4], [0.36, 0.4 + Math.PI]]) {
    for (let i = 0; i < 4; i++) {
      const z = 0.1 - i * 0.19;
      const a = robotArm(r); a.position.set(x, 0, z); a.rotation.y = rot + r.range(-0.3, 0.3);
      const sp = sprout(a, 0.35 + i * 0.06); add(sp); arms.push(a);
      const cn = console_(r); cn.position.set(x + (x < 0 ? -0.07 : 0.07), 0, z + 0.05); cn.rotation.y = x < 0 ? 0.3 : -0.3;
      add(sprout(cn, 0.4 + i * 0.06));
      if (i % 2 === 0) {
        const glass = new THREE.Group();
        const gbox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: '#9fdcff', transparent: true, opacity: 0.18, depthWrite: false }));
        gbox.position.y = 0.06; glass.add(gbox);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(gbox.geometry), new THREE.LineBasicMaterial({ color: '#7fe6ff' }));
        edges.position.y = 0.06; glass.add(edges);
        const core = box(0.04, 0.05, 0.03, '#cfd6de', 0.003); core.position.y = 0.03; glass.add(core);
        glass.position.set(x + (x < 0 ? 0.11 : -0.11), 0, z - 0.08);
        add(sprout(glass, 0.45 + i * 0.05));
      }
    }
  }
  // 光る円柱（右奥）と中央のリング
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const tube = cyl(0.035, 0.035, 0.36, new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.45 }), 20, 0.004);
    tube.position.y = 0.18; g.add(tube);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 12), new THREE.MeshBasicMaterial({ color: '#4fd8ff' })); core.position.y = 0.18; g.add(core);
    for (const y of [0.02, 0.34]) { const cap = cyl(0.042, 0.042, 0.03, '#c8d0d8', 20, 0.004); cap.position.y = y; g.add(cap); }
    const gg = glow('#4fd8ff', 0.12, 0.3); gg.position.y = 0.18; g.add(gg);
    g.position.set(0.6, 0, -0.05 - i * 0.15);
    add(sprout(g, 0.5 + i * 0.05));
  }
  const ring = new THREE.Group();
  const tor = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: '#c8d0d8' }));
  tor.rotation.x = H; tor.position.y = 0.2; ring.add(tor);
  const torL = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.004, 6, 40), new THREE.MeshBasicMaterial({ color: '#4fd8ff' })); torL.rotation.x = H; torL.position.y = 0.19; ring.add(torL);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.19, 20), new THREE.MeshBasicMaterial({ color: '#9ff4ff', transparent: true, opacity: 0.7 })); col.position.y = 0.095; ring.add(col);
  const rg = glow('#4fd8ff', 0.2, 0.35); rg.position.y = 0.1; ring.add(rg);
  ring.position.set(0.08, 0, -0.5);
  add(sprout(ring, 0.3));
  // 通路（黄色い手すり）
  for (const x of [IX0 + 0.06, IX1 - 0.06]) {
    const g = new THREE.Group();
    const deck = box(0.1, 0.008, FZ - IZ0 - 0.1, '#2a323c', 0.003); deck.position.y = 0.3; g.add(deck);
    const rail = box(0.004, 0.004, FZ - IZ0 - 0.1, '#f2c018', 0.002); rail.position.set(x < 0 ? 0.05 : -0.05, 0.33, 0); g.add(rail);
    for (let z = -(FZ - IZ0) / 2 + 0.08; z < (FZ - IZ0) / 2 - 0.05; z += 0.06) { const post = box(0.004, 0.03, 0.004, '#f2c018', 0.002); post.position.set(x < 0 ? 0.05 : -0.05, 0.315, z); g.add(post); }
    g.position.set(x, 0, (FZ + IZ0) / 2 + 0.03);
    decor.add(g);
  }
  // ホログラムの画面（掲示板）と小さな画面
  const { mesh: screen, screenMat } = screenMesh(0.32, 0.2, textures.billboard);
  const holo = new THREE.Group();
  holo.add(screen);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.33, 0.21)), new THREE.LineBasicMaterial({ color: '#7fe6ff' }));
  holo.add(frame);
  const hg = glow('#4fd8ff', 0.4, 0.2); hg.position.z = -0.01; holo.add(hg);
  holo.position.set(0.08, 0.33, -0.22);
  decor.add(holo);
  for (const [x, y, z] of [[-0.3, 0.38, -0.05], [-0.18, 0.4, -0.1], [0.52, 0.36, 0.05]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.07), new THREE.MeshBasicMaterial({ color: '#4fd8ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.position.set(x, y, z); decor.add(p);
  }

  // 正面の壁（大扉の穴あき）：最後に後ろから起き上がる
  const shape = new THREE.Shape();
  shape.moveTo(-FW / 2, 0); shape.lineTo(FW / 2, 0); shape.lineTo(FW / 2, FH); shape.lineTo(-FW / 2, FH); shape.lineTo(-FW / 2, 0);
  const hole = new THREE.Path(); hole.moveTo(DX0, 0.001); hole.lineTo(DX0, DH); hole.lineTo(DX1, DH); hole.lineTo(DX1, 0.001); hole.lineTo(DX0, 0.001);
  shape.holes.push(hole);
  const fgeo = new THREE.ExtrudeGeometry(shape, { depth: FT, bevelEnabled: false });
  const ft = facadeTexture(r); ft.repeat.set(1 / FW, 1 / FH); ft.offset.set(0.5, 0);
  const fmesh = new THREE.Mesh(fgeo, [new THREE.MeshBasicMaterial({ map: ft }), new THREE.MeshBasicMaterial({ color: '#4a3a34' })]);
  fmesh.position.z = -FT;
  fmesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(fgeo), inkMat.clone()));
  const facade = new THREE.Group(); facade.add(fmesh);
  // 破れた布（扉の上から垂れる）
  for (const [x, w] of [[DX0 + 0.12, 0.2], [DX1 - 0.1, 0.16], [0.08, 0.12]]) {
    const c = canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#b8b0a2'; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0);
    for (let k = 8; k >= 0; k--) g.lineTo(k * 16, r.range(50, 125));
    g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    screentone(g, 0, 0, 128, 128, { dot: 1, spacing: 4, color: 'rgba(60,40,30,0.35)' });
    for (let k = 0; k < 5; k++) inkLine(g, [[r.range(10, 118), 0], [r.range(10, 118), r.range(40, 100)]], { weight: 1, r });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.9), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, side: THREE.DoubleSide }));
    cloth.position.set(x, DH - w * 0.45, 0.006); cloth.rotation.z = r.range(-0.15, 0.15);
    facade.add(cloth);
  }
  // 壁の照明・配管・手すり
  const lamp = box(0.03, 0.012, 0.02, '#3a3030'); lamp.position.set(DX1 + 0.13, 0.32, 0.012); facade.add(lamp);
  const lg = glow('#ffb860', 0.22, 0.9); lg.position.set(DX1 + 0.13, 0.31, 0.03); facade.add(lg);
  for (const x of [-0.85, -0.42, DX1 + 0.06, 0.86]) { const p = cyl(0.008, 0.008, FH * r.range(0.6, 0.95), '#6b3a2a', 10, 0.003); p.position.set(x, FH * 0.4, 0.012); facade.add(p); }
  for (const y of [0.2, 0.44]) { const rail = box(0.4, 0.006, 0.006, '#3a2a24', 0.002); rail.position.set(-0.68, y, 0.035); facade.add(rail); const deck = box(0.4, 0.008, 0.04, '#4a3a34', 0.003); deck.position.set(-0.68, y - 0.035, 0.02); facade.add(deck); }
  add(hinged(facade, new THREE.Vector3(0, 0, FZ), 'x', 0.62, -1));

  // 外：黄色い車止め・室外機・錆びた配管
  for (const x of [-0.6, -0.48, DX1 + 0.2, 0.72]) { const b = cyl(0.012, 0.012, 0.06, '#e0b21a', 12, 0.004); b.position.set(x, 0.03, FZ + 0.06); add(sprout(b, 0.75)); }
  const ac = box(0.07, 0.05, 0.035, '#c8c0ae'); ac.position.set(-0.86, 0.025, FZ + 0.04); add(sprout(ac, 0.75));

  // 作品の看板：扉の内側、天井から吊るすホログラム看板
  const workSigns = works.map((w, i) => {
    const s = workSign({ ...w, color: w.color || '#4fd8ff' }, 0.075, 0.24, r);
    const x = [DX0 + 0.08, DX1 - 0.08, -0.05, 0.25][i % 4], z = FZ - 0.06 - Math.floor(i / 4) * 0.12;
    s.position.set(x, DH - 0.17, z);
    for (const dx of [-0.026, 0.026]) { const wire = box(0.0012, 0.05, 0.0012, INK, 0); wire.position.set(x + dx, DH - 0.025, z); decor.add(wire); }
    const sg = glow(w.color || '#4fd8ff', 0.25, 0.35); sg.position.set(x, DH - 0.17, z - 0.01); decor.add(sg);
    decor.add(s);
    return s;
  });

  root.userData = {
    kind: 'tools', pivots, decor, workSigns, signs: workSigns, screenParts: [screen], screenMat, cars: null,
    view: { position: new THREE.Vector3(0.04, 0.04, 0.69), target: new THREE.Vector3(0.06, 0.3, -0.3), fov: a => a < 0.9 ? 88 : 74 },
    extra: { wet: new THREE.Group(), animate(time) { for (const a of arms) { const u = a.userData; u.shoulder.rotation.z = -0.35 + Math.sin(time * 0.9 + u.phase) * 0.18; u.elbow.rotation.z = 1.3 + Math.sin(time * 1.3 + u.phase) * 0.3; } } },
  };
  void hullMat;
  return root;
}
