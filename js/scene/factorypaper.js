// 工場街のページ：錆びた古い工場の大きな入口。中はぴかぴかの最新工場（ロボットアーム、ガラスの箱、ホログラム、光る炉）
// 建物は紙の箱に印刷した絵、光と濡れた床は本物の光で
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { paperAC, paperPipe } from './paper.js';
import { holoPanel } from './signs.js';
import { glowTex } from './parts.js';
import { rng } from '../rng.js';
import { orderForStands } from '../layout.js';

const ROOT = new URL('../../', import.meta.url).href;
const INK = '#1a1018';
const JP = '"Dela Gothic One","Hiragino Kaku Gothic StdN","Noto Sans JP",sans-serif';
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tx = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
const paper = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, ...o });
// 紙の箱の折り目（うすい輪郭線）
const edgeM = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22 });
function edged(mesh, ang = 30) { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, ang), edgeM)); return mesh; }

// ---------- 印刷する絵 ----------
// 錆びてはがれた白いトタン壁（窓の列つき）
function rustWall(Wm, Hm, r, { windows = [], label = null, ppu = 760 } = {}) {
  const W = Math.min(2048, Math.round(Wm * ppu)), H = Math.min(2048, Math.round(Hm * ppu)), s = W / Wm;
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#5a3424'; g.fillRect(0, 0, W, H);              // 下地の錆
  // はがれ残った白い塗装（ぼこぼこの島）
  g.fillStyle = '#aaa194'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 260; i++) {
    const x = r.next() * W, y = r.next() * H, rr = 1 + r.next() ** 4 * 14;
    g.fillStyle = r.next() < 0.7 ? `rgba(92,46,26,${0.5 + r.next() * 0.5})` : `rgba(40,24,20,${0.4 + r.next() * 0.4})`;
    g.beginPath(); g.moveTo(x + rr, y); for (let a = 0.6; a < 6.3; a += 0.6) { const q = rr * (0.5 + r.next() * 0.8); g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.8); } g.fill();
  }
  // 大きな錆の広がり（下と継ぎ目ほど濃い）
  for (let i = 0; i < 14; i++) { const x = r.next() * W, y = H * (0.4 + r.next() * 0.6), rr = 40 + r.next() * 120; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(96,44,20,0.55)'); gg.addColorStop(1, 'rgba(96,44,20,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // 上と下ほど黒ずむ
  { const gg = g.createLinearGradient(0, 0, 0, H); gg.addColorStop(0, 'rgba(20,14,14,0.45)'); gg.addColorStop(0.25, 'rgba(20,14,14,0)'); gg.addColorStop(0.8, 'rgba(30,20,16,0)'); gg.addColorStop(1, 'rgba(30,20,16,0.5)'); g.fillStyle = gg; g.fillRect(0, 0, W, H); }
  // 錆と雨のたれ
  for (let i = 0; i < W / 2; i++) { const x = r.next() * W, y = r.next() * H, l = 20 + r.next() * 260; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, r.next() < 0.5 ? 'rgba(110,50,22,0.6)' : 'rgba(26,20,20,0.45)'); gr.addColorStop(1, 'rgba(110,50,22,0)'); g.fillStyle = gr; g.fillRect(x, y, 1.5 + r.next() * 3, l); }
  // 波板のすじ
  for (let x = 0; x < W; x += 9) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x, 0, 3, H); g.fillStyle = 'rgba(0,0,0,0.09)'; g.fillRect(x + 4, 0, 3, H); }
  // 継ぎ目
  g.fillStyle = 'rgba(30,16,12,0.55)'; for (let y = 0; y < H; y += Math.round(0.16 * s)) g.fillRect(0, y, W, 3);
  for (let x = 0; x < W; x += Math.round(0.24 * s)) g.fillRect(x, 0, 2, H);
  // 窓の列（割れたガラス、たまに暖かい明かり）
  for (const wr of windows) {
    const { x0, x1, y, h, n, lit = 0.15 } = wr, ww = (x1 - x0) / n;
    for (let k = 0; k < n; k++) {
      const X = (x0 + k * ww) * s, Y = H - (y + h) * s, w = ww * s * 0.86, hh = h * s;
      g.fillStyle = '#2a2224'; g.fillRect(X - 4, Y - 4, w + 8, hh + 8);
      const on = r.next() < lit;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) {
        const px = X + a * w / 3 + 2, py = Y + b * hh / 2 + 2, pw = w / 3 - 4, ph = hh / 2 - 4;
        const broken = r.next() < 0.25;
        g.fillStyle = on ? (broken ? '#3a2a20' : '#ffcc78') : broken ? '#0c0a10' : `rgb(${40 + r.next() * 30},${50 + r.next() * 30},${70 + r.next() * 30})`;
        g.fillRect(px, py, pw, ph);
        if (!on && !broken) { g.fillStyle = 'rgba(200,220,255,0.15)'; g.beginPath(); g.moveTo(px, py + ph); g.lineTo(px + pw * 0.5, py); g.lineTo(px + pw * 0.7, py); g.lineTo(px + pw * 0.2, py + ph); g.fill(); }
        if (broken) { g.strokeStyle = 'rgba(200,210,230,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(px + pw * r.next(), py + ph * r.next()); g.lineTo(px + pw, py + ph * 0.3); g.stroke(); }
      }
    }
  }
  // 窓の下に黒い雨だれ
  for (const wr of windows) { const ww = (wr.x1 - wr.x0) / wr.n; for (let k = 0; k < wr.n; k++) for (let j = 0; j < 8; j++) { const X = (wr.x0 + k * ww + r.next() * ww * 0.86) * s, Y = H - wr.y * s; const l = 30 + r.next() * 140; const gg = g.createLinearGradient(0, Y, 0, Y + l); gg.addColorStop(0, 'rgba(20,14,14,0.6)'); gg.addColorStop(1, 'rgba(20,14,14,0)'); g.fillStyle = gg; g.fillRect(X, Y, 2 + r.next() * 4, l); } }
  // 大きなペンキの文字（看板の字は 猫 / ながしの猫 / nagashinocat だけ）
  if (label) {
    const { x, y, px, text } = label;
    g.font = `${px * s}px ${JP}`; g.textBaseline = 'middle'; g.fillStyle = 'rgba(34,30,32,0.92)'; g.fillText(text, x * s, H - y * s);
    for (let i = 0; i < 40; i++) { const dx = x * s + r.next() * g.measureText(text).width, dy = H - y * s + px * s * 0.35; g.fillRect(dx, dy, 2, 10 + r.next() * 50); } // ペンキのたれ
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(201,194,180,${r.next()})`; g.fillRect(x * s + r.next() * g.measureText(text).width, H - y * s - px * s / 2 + r.next() * px * s, 3, 3); } // かすれ
  }
  g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
  return tx(c);
}
// 中の壁：明るい金属パネルと棚、細い配管、水色の表示
function techWall(Wm, Hm, r) {
  const ppu = 700, W = Math.min(2048, Math.round(Wm * ppu)), H = Math.min(1024, Math.round(Hm * ppu));
  const c = cv(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a2430'); gr.addColorStop(1, '#3a4656'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 60 + r.next() * 40) { g.fillStyle = `rgba(200,215,230,${0.08 + r.next() * 0.12})`; g.fillRect(x, 0, 6 + r.next() * 18, H); }
  for (let y = H * 0.3; y < H; y += H * 0.22) { g.fillStyle = 'rgba(230,236,244,0.35)'; g.fillRect(0, y, W, 5); for (let x = 0; x < W; x += 30) { g.fillStyle = `rgba(${r.next() < 0.5 ? '210,220,235' : '120,140,160'},0.6)`; g.fillRect(x, y - 24 - r.next() * 30, 22, 24 + r.next() * 30); } }
  for (let i = 0; i < 60; i++) { g.fillStyle = r.pick(['#5fe0ff', '#9ff', '#fff', '#ffd84f']); g.fillRect(r.next() * W, r.next() * H, 6 + r.next() * 20, 3 + r.next() * 6); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2);
  return tx(c);
}
// 天井：暗い梁と光の帯
function ceilingTex() {
  const c = cv(512, 1024), g = c.getContext('2d');
  g.fillStyle = '#10141c'; g.fillRect(0, 0, 512, 1024);
  for (let y = 0; y < 1024; y += 64) { g.fillStyle = '#2a3240'; g.fillRect(0, y, 512, 8); }
  for (let x = 0; x < 512; x += 128) { g.fillStyle = '#2a3240'; g.fillRect(x, 0, 8, 1024); }
  return tx(c);
}
// 外の濡れた地面（水たまりの所だけ透けて、下の鏡が映る）
function groundTex(Wm, Lm, r, { inside = false } = {}) {
  const ppu = 512, W = Math.min(2048, Math.round(Wm * ppu)), H = Math.min(2048, Math.round(Lm * ppu));
  const c = cv(W, H), g = c.getContext('2d');
  if (inside) { // 磨いた床に黄色い線
    g.fillStyle = 'rgba(70,80,96,0.55)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(20,24,30,${r.next() * 0.25})`; g.fillRect(r.next() * W, r.next() * H, 2 + r.next() * 40, 2 + r.next() * 6); }
    for (let y = 0; y < H; y += Math.round(0.2 * ppu)) { g.fillStyle = 'rgba(10,12,16,0.5)'; g.fillRect(0, y, W, 2); }
    for (const fx of [0.36, 0.64]) { g.fillStyle = 'rgba(255,200,30,0.95)'; g.fillRect(W * fx - 4, 0, 8, H); }
    for (const fx of [0.16, 0.84]) { for (let y = 0; y < H; y += 60) { g.fillStyle = 'rgba(255,200,30,0.85)'; g.fillRect(W * fx - 3, y, 6, 34); } }
  } else { // 割れたアスファルト、泥、水たまり
    g.fillStyle = '#2a2428'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 300; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '10,8,10' : '90,80,78'},${r.next() * 0.35})`; g.fillRect(r.next() * W, r.next() * H, 2 + r.next() * 4, 2 + r.next() * 4); }
    g.strokeStyle = 'rgba(8,6,8,0.8)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { let x = r.next() * W, y = r.next() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r.next() - 0.5) * 80; y += (r.next() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) { const x = r.next() * W, y = r.next() * H, rx = 40 + r.next() * 200, ry = rx * (0.3 + r.next() * 0.4); const gg = g.createRadialGradient(x, y, 0, x, y, rx); gg.addColorStop(0, 'rgba(0,0,0,0.95)'); gg.addColorStop(0.8, 'rgba(0,0,0,0.75)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.beginPath(); g.ellipse(x, y, rx, ry, r.next(), 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }
  return tx(c);
}
// 破れた布（はためく三角）
function clothTex(r) {
  const c = cv(256, 256), g = c.getContext('2d');
  g.fillStyle = '#9a948c'; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 0);
  for (let x = 256; x >= 0; x -= 16) g.lineTo(x, 120 + Math.sin(x * 0.05) * 30 + (x > 80 && x < 180 ? 100 : 0) + r.next() * 30);
  g.fill();
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r.next() < 0.5 ? '60,40,30' : '200,190,170'},${r.next() * 0.4})`; g.fillRect(r.next() * 256, r.next() * 220, 2 + r.next() * 6, 2 + r.next() * 10); }
  for (let i = 0; i < 12; i++) { g.strokeStyle = 'rgba(40,30,26,0.5)'; g.beginPath(); g.moveTo(r.next() * 256, 0); g.lineTo(r.next() * 256, 200); g.stroke(); }
  return tx(c);
}
// ホログラムの設計図（掲示板に何も映していないとき）
function blueprintCanvas() {
  const c = cv(640, 360), g = c.getContext('2d');
  g.fillStyle = '#04223a'; g.fillRect(0, 0, 640, 360);
  g.strokeStyle = 'rgba(120,220,255,0.25)'; g.lineWidth = 1; for (let x = 0; x < 640; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 360); g.stroke(); } for (let y = 0; y < 360; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(640, y); g.stroke(); }
  g.strokeStyle = '#bff4ff'; g.lineWidth = 2;
  for (let k = 0; k < 14; k++) { const x = 170 + k * 22, rr = 60 + Math.sin(k * 0.5) * 30; g.beginPath(); g.ellipse(x, 180, 14, rr, 0, 0, 7); g.stroke(); }
  g.beginPath(); g.moveTo(150, 180); g.lineTo(500, 180); g.stroke();
  g.font = '18px monospace'; g.fillStyle = '#9fe2ff'; g.fillText('nagashinocat', 24, 34); g.fillText('猫 -03', 24, 336);
  return c;
}

// ---------- 立体の部品 ----------
function robotArm(r, s = 1) {
  const white = new THREE.MeshStandardMaterial({ color: '#e8ecf0', roughness: 0.35, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: 0.5, metalness: 0.5 });
  const cyan = new THREE.MeshBasicMaterial({ color: '#5fe0ff', toneMapped: false });
  const root = new THREE.Group();
  const base = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s, 0.018 * s, 0.014 * s, 12), dark)); base.position.y = 0.007 * s; root.add(base);
  const turn = new THREE.Group(); turn.position.y = 0.014 * s; root.add(turn);
  const tb = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.011 * s, 0.012 * s, 0.012 * s, 12), white)); tb.position.y = 0.006 * s; turn.add(tb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0115 * s, 0.0012 * s, 6, 20), cyan); ring.rotation.x = Math.PI / 2; ring.position.y = 0.012 * s; turn.add(ring);
  const shoulder = new THREE.Group(); shoulder.position.y = 0.016 * s; turn.add(shoulder);
  const j1 = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.014 * s, 12), dark)); j1.rotation.z = Math.PI / 2; shoulder.add(j1);
  const up = edged(new THREE.Mesh(new THREE.BoxGeometry(0.01 * s, 0.05 * s, 0.01 * s), white)); up.position.y = 0.025 * s; shoulder.add(up);
  const elbow = new THREE.Group(); elbow.position.y = 0.05 * s; shoulder.add(elbow);
  const j2 = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.0065 * s, 0.0065 * s, 0.012 * s, 12), dark)); j2.rotation.z = Math.PI / 2; elbow.add(j2);
  const fore = edged(new THREE.Mesh(new THREE.BoxGeometry(0.008 * s, 0.04 * s, 0.008 * s), white)); fore.position.y = 0.02 * s; elbow.add(fore);
  const wrist = new THREE.Group(); wrist.position.y = 0.04 * s; elbow.add(wrist);
  const hand = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.004 * s, 0.006 * s, 0.01 * s, 8), dark)); hand.position.y = 0.005 * s; wrist.add(hand);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.002 * s, 6, 4), cyan); tip.position.y = 0.011 * s; wrist.add(tip);
  const ph = r.next() * 10, sp = 0.5 + r.next() * 0.5;
  return { group: root, update: t => { const a = t * sp + ph; turn.rotation.y = Math.sin(a * 0.6) * 0.9; shoulder.rotation.x = -0.35 + Math.sin(a) * 0.3; elbow.rotation.x = 1.1 + Math.sin(a * 1.3 + 1) * 0.35; wrist.rotation.x = 0.4 + Math.sin(a * 2) * 0.3; } };
}
function console_(r) {
  const body = new THREE.MeshStandardMaterial({ color: '#8a9098', roughness: 0.5, metalness: 0.4 });
  const c = cv(128, 96), g = c.getContext('2d'); g.fillStyle = '#041824'; g.fillRect(0, 0, 128, 96);
  for (let i = 0; i < 8; i++) { g.fillStyle = r.pick(['#5fe0ff', '#3ab0e0', '#bff4ff']); g.fillRect(8, 8 + i * 10, 20 + r.next() * 90, 5); }
  const scr = new THREE.MeshBasicMaterial({ map: tx(c), toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) });
  const m = edged(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.036, 0.022), [body, body, body, body, scr, body])); m.position.y = 0.018;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.002, 0.023), new THREE.MeshBasicMaterial({ color: '#5fe0ff', toneMapped: false })); strip.position.y = 0.006;
  const grp = new THREE.Group(); grp.add(m, strip); return grp;
}
function glassBooth(w, h, d) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#9fe8ff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = h / 2; g.add(glass);
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: '#8ff0ff', toneMapped: false })); lines.position.y = h / 2; g.add(lines);
  const plinth = edged(new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.006, d * 1.04), new THREE.MeshStandardMaterial({ color: '#6a7480', metalness: 0.5, roughness: 0.4 }))); plinth.position.y = 0.003; g.add(plinth);
  const inner = new THREE.PointLight('#8ff0ff', 0.04, w * 3, 2); inner.position.y = h * 0.8; g.add(inner);
  return g;
}
function tank(h, rad) {
  // 銀の筒に、光る水色のガラス窓が何段か
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#d8dee8', metalness: 0.85, roughness: 0.22 });
  const glowM = new THREE.MeshBasicMaterial({ color: '#4fd8ff', toneMapped: false, transparent: true, opacity: 0.9 });
  const body = edged(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 20), metal), 40); body.position.y = h / 2; g.add(body);
  for (let y = 0.06; y < h - 0.04; y += 0.09) {
    const win = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.01, rad * 1.01, 0.03, 20, 1, true), glowM); win.position.y = y; g.add(win);
    const lip = edged(new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.12, rad * 1.12, 0.006, 20), metal)); lip.position.y = y + 0.018; g.add(lip);
  }
  const cap = edged(new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal)); cap.position.y = h; g.add(cap);
  const L = new THREE.PointLight('#4fd8ff', 0.12, 0.35, 2); L.position.y = h / 2; g.add(L);
  return g;
}
function catwalk(len, y, x, side) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#3a4048', metalness: 0.6, roughness: 0.5 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#f2c21a', roughness: 0.5, emissive: '#3a2a00' });
  const deck = edged(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, len), steel)); deck.position.set(x, y, 0); g.add(deck);
  for (const h of [0.018, 0.034]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, len), yellow); rail.position.set(x - side * 0.034, y + h, 0); g.add(rail); }
  for (let z = -len / 2; z <= len / 2; z += 0.06) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.034, 0.002), yellow); p.position.set(x - side * 0.034, y + 0.017, z); g.add(p); }
  const under = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.003, len), new THREE.MeshBasicMaterial({ color: '#cfefff', toneMapped: false })); under.position.set(x, y - 0.003, 0); under.scale.set(0.3, 1, 1); g.add(under);
  return g;
}

/**
 * 工場街。works は道具（tools）の作品。返り値 { scene, ups, stands, towerScreen, screenTex, camera }
 */
export async function buildFactoryPaper({ seed = 21, works = null, screenCanvas = null } = {}) {
  const r = rng(seed);
  const scene = new THREE.Scene(), ups = [], stands = [];
  scene.fog = new THREE.FogExp2('#0e1220', 0.55);
  // 空：嵐の夜の雲
  {
    const c = cv(1024, 512), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#06080e'); gr.addColorStop(1, '#1c2232'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 40; i++) { const x = r.next() * 1024, y = r.next() * 300, rr = 60 + r.next() * 160; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, 'rgba(70,80,104,0.45)'); gg.addColorStop(1, 'rgba(70,80,104,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    scene.background = tx(c);
  }
  scene.add(new THREE.HemisphereLight('#4a5a7a', '#1a1410', 0.26));
  scene.userData.needsEnv = true; // 金属の映り込み用（描画側で RoomEnvironment を入れる）
  const moon = new THREE.DirectionalLight('#8a9ac8', 0.25); moon.position.set(-1, 2, 2); scene.add(moon);

  const FZ = 0.25, FW = 2.6, FH = 1.0, OW = 1.0, OH = 0.56; // 正面の壁と大きな入口
  const HW = 0.72, HD = 1.9, HH = 0.78; // 中のホール

  // ---- 地面（外：水たまり、中：磨いた床）----
  const mirror = new Reflector(new THREE.PlaneGeometry(3, 3.4), { textureWidth: 1024, textureHeight: 1024, color: 0x8a90a0 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0.0005, -0.4); scene.add(mirror);
  const outG = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.4), new THREE.MeshStandardMaterial({ map: groundTex(3, 1.4, r), transparent: true, roughness: 0.7, depthWrite: false }));
  outG.rotation.x = -Math.PI / 2; outG.position.set(0, 0.0015, FZ + 0.7); scene.add(outG);
  const inG = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HD), new THREE.MeshStandardMaterial({ map: groundTex(HW * 2, HD, r, { inside: true }), transparent: true, roughness: 0.3, depthWrite: false }));
  inG.rotation.x = -Math.PI / 2; inG.position.set(0, 0.0015, FZ - HD / 2); scene.add(inG);

  // ---- 中のホール ----
  const tw = techWall(HD, HH, r);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(HD, HH), paper(tw, { side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: tw, emissiveIntensity: 0.25 })); w.rotation.y = -s * Math.PI / 2; w.position.set(s * HW, HH / 2, FZ - HD / 2); scene.add(w); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HH), paper(techWall(HW * 2, HH, r), { emissive: '#ffffff', emissiveIntensity: 0.15 })); back.position.set(0, HH / 2, FZ - HD); scene.add(back);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HD), paper(ceilingTex())); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HH, FZ - HD / 2); scene.add(ceil);
  // 天井の光の帯（並び）
  const lightM = new THREE.MeshBasicMaterial({ color: '#eaf6ff', toneMapped: false });
  for (let z = FZ - 0.15; z > FZ - HD + 0.1; z -= 0.17) for (const x of [-0.42, -0.14, 0.14, 0.42]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.016), lightM); l.position.set(x, HH - 0.01, z); scene.add(l); }
  for (let z = FZ - 0.3; z > FZ - HD; z -= 0.45) { const L = new THREE.PointLight('#cfe8ff', 0.6, 1.0, 1.5); L.position.set(0, HH - 0.06, z); scene.add(L); }
  // 梁
  const beamM = new THREE.MeshStandardMaterial({ color: '#2a3038', metalness: 0.6, roughness: 0.5 });
  for (let z = FZ - 0.2; z > FZ - HD; z -= 0.34) { const b = edged(new THREE.Mesh(new THREE.BoxGeometry(HW * 2, 0.024, 0.016), beamM)); b.position.set(0, HH - 0.04, z); scene.add(b); for (const s of [-1, 1]) { const col = edged(new THREE.Mesh(new THREE.BoxGeometry(0.022, HH, 0.022), beamM)); col.position.set(s * (HW - 0.02), HH / 2, z); scene.add(col); } }
  // 両側の足場（2段）
  for (const s of [-1, 1]) for (const y of [0.26, 0.5]) { const cw = catwalk(HD - 0.2, y, s * (HW - 0.06), s); cw.position.z = FZ - HD / 2 - 0.05; scene.add(cw); }
  // ロボットアームとガラスの箱、操作台、光るタンク
  const arms = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const z = FZ - 0.18 - k * 0.22;
      const a = robotArm(r, 1.8); a.group.position.set(s * 0.32, 0, z); a.group.rotation.y = -s * Math.PI / 2; scene.add(a.group); arms.push(a);
      const con = console_(r); con.position.set(s * 0.22, 0, z + 0.07); con.rotation.y = -s * 0.4; scene.add(con);
      if (k % 2 === 1) { const b = glassBooth(0.12, 0.09, 0.1); b.position.set(s * 0.5, 0, z); scene.add(b); }
      if (k % 3 === 2) { const t = tank(0.42 + r.next() * 0.2, 0.03); t.position.set(s * 0.6, 0, z - 0.05); scene.add(t); }
    }
  }
  ups.push(t => { for (const a of arms) a.update(t); });
  // 奥：輪の台と光る炉
  {
    const ringM = new THREE.MeshStandardMaterial({ color: '#c8d0da', metalness: 0.7, roughness: 0.3 });
    const zc = FZ - HD + 0.28;
    const deck = edged(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40), ringM)); deck.rotation.x = Math.PI / 2; deck.position.set(0, 0.36, zc); scene.add(deck);
    const deckGlow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.004, 6, 40), new THREE.MeshBasicMaterial({ color: '#5fe0ff', toneMapped: false })); deckGlow.rotation.x = Math.PI / 2; deckGlow.position.set(0, 0.348, zc); scene.add(deckGlow);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#7fe6ff', toneMapped: false, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); core.position.set(0, 0.17, zc); scene.add(core);
    for (let y = 0.03; y < 0.34; y += 0.06) { const band = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.012, 24), ringM)); band.position.set(0, y, zc); scene.add(band); }
    const L = new THREE.PointLight('#5fe0ff', 1.2, 1.4, 1.6); L.position.set(0, 0.2, zc + 0.05); scene.add(L);
    const portal = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#bff4ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); portal.scale.set(0.5, 0.4, 1); portal.position.set(0, 0.2, FZ - HD + 0.02); scene.add(portal);
    ups.push(t => { core.material.opacity = 0.8 + 0.15 * Math.sin(t * 3); L.intensity = 1.1 + 0.2 * Math.sin(t * 3); });
  }
  // ホログラムの大画面（タワーの代わりの掲示板）
  let towerScreen, screenTex;
  {
    const c = screenCanvas || blueprintCanvas();
    screenTex = tx(c);
    const sw = 0.42, sh = sw * 9 / 16;
    const m = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, transparent: true, opacity: 0.9, color: new THREE.Color(1.5, 1.7, 1.9), side: THREE.DoubleSide, depthWrite: false });
    towerScreen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), m); towerScreen.position.set(0.04, 0.5, FZ - 0.7); scene.add(towerScreen);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(sw * 1.03, sh * 1.05)), new THREE.LineBasicMaterial({ color: '#8ff0ff', toneMapped: false })); frame.position.copy(towerScreen.position); scene.add(frame);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#4fd8ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(sw * 1.6, sh * 1.8, 1); halo.position.copy(towerScreen.position).add(new THREE.Vector3(0, 0, -0.01)); scene.add(halo);
    for (const sx of [-1, 1]) { const wire = new THREE.Mesh(new THREE.BoxGeometry(0.001, HH - 0.5 - sh / 2, 0.001), beamM); wire.position.set(towerScreen.position.x + sx * sw * 0.4, (HH + 0.5 + sh / 2) / 2, towerScreen.position.z); scene.add(wire); }
    const L = new THREE.PointLight('#4fd8ff', 0.5, 0.8, 1.6); L.position.copy(towerScreen.position).add(new THREE.Vector3(0, -0.05, 0.12)); scene.add(L);
    ups.push(t => { m.opacity = 0.84 + 0.05 * Math.sin(t * 9) + (Math.random() < 0.006 ? -0.35 : 0); });
  }
  // 小さなホロ表示（飾り）
  for (let k = 0; k < 6; k++) { const s = k % 2 ? 1 : -1; const p = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.06), new THREE.MeshBasicMaterial({ color: '#5fe0ff', transparent: true, opacity: 0.35, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); p.position.set(s * (0.25 + r.next() * 0.15), 0.34 + r.next() * 0.2, FZ - 0.4 - k * 0.2); scene.add(p); }

  // ---- 作品のホロパネル：入口の内側、通路の左右に手前から ----
  {
    const list = orderForStands(works || (await (await fetch(ROOT + 'data/works.json')).json()).filter(w => w.district === 'tools'));
    for (let i = 0; i < list.length; i++) {
      const s = i % 2 ? 1 : -1, z = FZ + 0.12 - Math.floor(i / 2) * 0.16 - (s > 0 ? 0.06 : 0);
      const p = await holoPanel(list[i]); p.group.position.set(s * 0.13, 0, z); p.group.rotation.y = -s * 0.35; scene.add(p.group); stands.push(p.hit); ups.push(p.update);
    }
  }

  // ---- 正面の壁：錆びた古い工場 ----
  {
    const sideW = (FW - OW) / 2, topH = FH - OH;
    const leftT = rustWall(sideW, FH, r, { windows: [{ x0: 0.1, x1: sideW - 0.06, y: 0.3, h: 0.12, n: 3, lit: 0.4 }, { x0: 0.1, x1: sideW - 0.06, y: 0.82, h: 0.1, n: 3, lit: 0.1 }], label: { x: 0.12, y: 0.62, px: 0.16, text: '猫' } });
    const rightT = rustWall(sideW, FH, r, { windows: [{ x0: 0.06, x1: sideW - 0.1, y: 0.82, h: 0.1, n: 3, lit: 0.1 }, { x0: 0.5, x1: sideW - 0.1, y: 0.3, h: 0.1, n: 2, lit: 0.3 }] });
    const topT = rustWall(OW, topH, r, { windows: [{ x0: 0.06, x1: OW - 0.06, y: 0.16, h: 0.16, n: 5, lit: 0.05 }] });
    const sideM = paper(null, { color: '#4a3026' });
    const mk = (w, h, t) => edged(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), [sideM, sideM, sideM, sideM, paper(t), sideM]), 20);
    const L = mk(sideW, FH, leftT); L.position.set(-(OW / 2 + sideW / 2), FH / 2, FZ); scene.add(L);
    const R = mk(sideW, FH, rightT); R.position.set(OW / 2 + sideW / 2, FH / 2, FZ); scene.add(R);
    const T = mk(OW, topH, topT); T.position.set(0, OH + topH / 2, FZ); scene.add(T);
    // 入口の鉄の枠
    const frameM = new THREE.MeshStandardMaterial({ color: '#4a2e22', roughness: 0.8, metalness: 0.3 });
    for (const sx of [-1, 1]) { const f = edged(new THREE.Mesh(new THREE.BoxGeometry(0.03, OH, 0.08), frameM)); f.position.set(sx * (OW / 2 - 0.012), OH / 2, FZ + 0.01); scene.add(f); }
    const lintel = edged(new THREE.Mesh(new THREE.BoxGeometry(OW, 0.03, 0.08), frameM)); lintel.position.set(0, OH - 0.012, FZ + 0.01); scene.add(lintel);
    // 破れた布（入口の上から垂れて、ゆれる）
    for (const [x, w, h] of [[-0.3, 0.26, 0.2], [-0.02, 0.2, 0.12], [0.34, 0.24, 0.24]]) {
      const geo = new THREE.PlaneGeometry(w, h, 8, 8); geo.translate(0, -h / 2, 0);
      const cl = new THREE.Mesh(geo, paper(clothTex(r), { transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
      cl.position.set(x, OH - 0.01, FZ + 0.045); scene.add(cl);
      const pos = geo.attributes.position, base = pos.array.slice();
      ups.push(t => { for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1], k = -y / h; pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 1.4 + base[i * 3] * 20 + x * 9) * 0.01 * k; } pos.needsUpdate = true; });
    }
    // 外階段とベランダ（鉄の手すり）、配管、室外機、壁の灯り、黄色い車止め
    const rustM = new THREE.MeshStandardMaterial({ color: '#5a3a2a', roughness: 0.85, metalness: 0.3 });
    for (const [x, y, w] of [[-0.95, 0.52, 0.34], [-0.72, 0.28, 0.24], [0.98, 0.6, 0.3]]) {
      const deck = edged(new THREE.Mesh(new THREE.BoxGeometry(w, 0.005, 0.06), rustM)); deck.position.set(x, y, FZ + 0.06); scene.add(deck);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.002, 0.002), rustM); rail.position.set(x, y + 0.035, FZ + 0.09); scene.add(rail);
      for (let k = 0; k <= 8; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.035, 0.0015), rustM); p.position.set(x - w / 2 + k * w / 8, y + 0.0175, FZ + 0.09); scene.add(p); }
    }
    const stair = new THREE.Group(); for (let k = 0; k < 10; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.02), rustM); st.position.set(-1.15 + k * 0.02, 0.3 + k * 0.024, FZ + 0.06); stair.add(st); } scene.add(stair);
    scene.add(paperPipe([new THREE.Vector3(-1.25, 0.02, FZ + 0.04), new THREE.Vector3(-1.25, 0.9, FZ + 0.04)], 0.008, '#6a4a3a'));
    scene.add(paperPipe([new THREE.Vector3(-0.62, 0.0, FZ + 0.05), new THREE.Vector3(-0.62, 0.06, FZ + 0.05), new THREE.Vector3(-1.1, 0.06, FZ + 0.05)], 0.007, '#5a3a2a'));
    scene.add(paperPipe([new THREE.Vector3(0.6, 0.0, FZ + 0.04), new THREE.Vector3(0.6, 0.94, FZ + 0.04)], 0.006, '#6a4a3a'));
    for (const [x, y] of [[-1.05, 0.04], [-0.86, 0.04]]) { const ac = paperAC(r); ac.scale.setScalar(2.6); ac.position.set(x, y, FZ + 0.05); scene.add(ac); }
    const warm = glowTex();
    for (const [x, y] of [[-0.6, 0.24], [0.62, 0.42], [-1.0, 0.62]]) {
      const lamp = edged(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.02), new THREE.MeshStandardMaterial({ color: '#3a3030' }))); lamp.position.set(x, y, FZ + 0.04); scene.add(lamp);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.004, 0.016), new THREE.MeshBasicMaterial({ color: '#ffd08a', toneMapped: false })); bulb.position.set(x, y - 0.008, FZ + 0.045); scene.add(bulb);
      const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: warm, color: '#ffb060', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); gs.scale.set(0.16, 0.12, 1); gs.position.set(x, y - 0.02, FZ + 0.06); scene.add(gs);
      const Lw = new THREE.PointLight('#ffb060', 0.08, 0.35, 2); Lw.position.set(x, y - 0.04, FZ + 0.1); scene.add(Lw);
    }
    const yellow = new THREE.MeshStandardMaterial({ color: '#e8b818', roughness: 0.6 }), black = new THREE.MeshStandardMaterial({ color: '#1a1618' });
    for (const x of [-0.62, -0.7, 0.58, 0.66]) { const b = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), yellow)); b.position.set(x, 0.025, FZ + 0.16); scene.add(b); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.006, 8), black); band.position.set(x, 0.04, FZ + 0.16); scene.add(band); }
    // 屋上：ぎざぎざの稜線（小屋・給水塔・はしご・柵）
    for (const [x, w, h] of [[-1.05, 0.3, 0.12], [-0.62, 0.18, 0.06], [0.2, 0.36, 0.08], [0.92, 0.26, 0.16]]) {
      const shed = edged(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), [sideM, sideM, sideM, sideM, paper(rustWall(w, h, r, { windows: h > 0.1 ? [{ x0: 0.03, x1: w - 0.03, y: h * 0.35, h: h * 0.4, n: 2, lit: 0.3 }] : [] })), sideM]), 20);
      shed.position.set(x, FH + h / 2, FZ - 0.05); scene.add(shed);
    }
    for (const [x, y] of [[0.75, FH + 0.04]]) { const tk = edged(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), rustM)); tk.position.set(x, y + 0.13, FZ - 0.1); scene.add(tk); for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.09, 0.004), rustM); leg.position.set(x + sx * 0.035, y + 0.04, FZ - 0.1); scene.add(leg); } }
    for (let x = -1.28; x < 1.3; x += 0.05) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.03, 0.002), rustM); p.position.set(x, FH + 0.015, FZ + 0.025); scene.add(p); }
    { const rail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.002, 0.002), rustM); rail.position.set(0, FH + 0.03, FZ + 0.025); scene.add(rail); }
    // 入口からこぼれる冷たい光
    const spill = new THREE.PointLight('#9fe8ff', 0.6, 1.0, 1.6); spill.position.set(0, 0.25, FZ - 0.05); scene.add(spill);
  }
  return { scene, ups, stands, towerScreen, screenTex };
}

export const FACTORY_CAM = { pos: [-0.1, 0.05, 1.3], look: [0.06, 0.4, -0.6], fov: 58 };
