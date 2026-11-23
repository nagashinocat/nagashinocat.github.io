// 路地の作り込み（Meshy の部品の建物に合わせて）
// 建物の正面の出っぱり（部品ごとに測った格子）を使って、看板・配管・電線・日よけ・提灯を壁にきちんと沿わせる。
// 電線と配管は路地から見える所だけ。電線は奥から手前へ走らせ、建物を突き抜けないよう金具の長さを決める。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { INK } from '../draw/manga.js';
import { ALLEY } from '../layout.js';
import { makeSign, bracket } from './signs.js';
import { glowTex } from './parts.js';

const hull = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const ink = new THREE.MeshBasicMaterial({ color: INK });
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tx = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const NEON = ['#ff4fa3', '#4fd8ff', '#ffb21f', '#b46bff', '#7cff6b', '#ff3b3b', '#ff7a2a'];
const JP_TEXT = ['酒', '麺', '薬', '質', '茶', '湯', '當', '金', '大吉', '麻雀', '按摩', '理髪', '歯科', '修理', '電器', '飯店', '中華', '拉麺', '居酒屋', '両替', '占', '珈琲', '貸室', '旅館', '雀荘', '萬興樓', '大東電器', '龍華'];
const US_TEXT = ['OPEN', 'BAR', '24HR', 'DINER', 'MOTEL', 'HOTEL', 'LIQUOR', 'HOT DOG', 'COFFEE', 'NOODLE', 'CAFE', 'VACANCY'];

// ---- 建物の正面の出っぱり ----
function sampler(e) {
  const { b, pivot, info } = e;
  const { pick, sc, flip } = info;
  const [NX, NY] = pick.grid;
  const yaw = pivot.userData.yaw;
  const P0 = pivot.position.clone();
  const R = new THREE.Matrix4().makeRotationY(yaw), Ri = new THREE.Matrix4().makeRotationY(-yaw);
  const prof = (mx, my) => {
    const ix = Math.min(NX - 1, Math.max(0, Math.floor((mx - pick.x0) / pick.w * NX)));
    const iy = Math.min(NY - 1, Math.max(0, Math.floor(my * NY)));
    return flip ? -pick.back[iy][ix] : pick.front[iy][ix];
  };
  // 正面の局所座標：X=間口方向、Y=高さ、Z=路地へ向かう向き（0=建物の枠の正面）
  const depth = (X, Y) => {
    const mx = (flip ? -X : X) / sc[0], my = Y / sc[1];
    return -b.fd / 2 + sc[2] * prof(mx, my);
  };
  const maxDepth = (X0, X1, Y0, Y1) => {
    let m = -9;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) m = Math.max(m, depth(X0 + (X1 - X0) * i / 6, Math.max(0, Y0 + (Y1 - Y0) * j / 6)));
    return m;
  };
  const toWorld = (X, Y, Z) => new THREE.Vector3(X, Y, Z).applyMatrix4(R).add(P0);
  const toLocal = w => w.clone().sub(P0).applyMatrix4(Ri);
  const normal = new THREE.Vector3(0, 0, 1).applyMatrix4(R);
  return { b, depth, maxDepth, toWorld, toLocal, normal, yaw, half: b.fw / 2 };
}

// ---- 提灯（ちょうちん）と行灯 ----
function chochinTexture(ch, color) {
  const c = cv(256, 256), g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(60,10,10,0.5)'; g.lineWidth = 2; for (let y = 8; y < 256; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.font = '120px "Hiragino Mincho ProN","Noto Serif JP",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1a0a0a'; g.fillText(ch, 64, 132); g.fillText(ch, 192, 132);
  return tx(c);
}
export function chochin(r) {
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.006 + 0.0065 * Math.sin(t * Math.PI), (t - 0.5) * 0.022)); }
  const mat = new THREE.MeshBasicMaterial({ map: chochinTexture(r.pick(['祭', '酒', '麺', '福', '亭', '寿']), r.pick(['#e8341f', '#e8341f', '#f2e6c8', '#ff7a1a'])), toneMapped: false });
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), mat);
  body.add(new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p.x + 0.0008, p.y)), 16), hull));
  g.add(body);
  for (const y of [-0.0115, 0.0115]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.002, 12), ink); cap.position.y = y; g.add(cap); }
  const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.006, 0.0012), ink); tassel.position.y = -0.016; g.add(tassel);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ff6a40', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(0.07); g.add(halo);
  return g;
}
function andon(r) {
  const c = cv(128, 256), gg = c.getContext('2d');
  gg.fillStyle = '#fff3d8'; gg.fillRect(0, 0, 128, 256);
  gg.strokeStyle = '#3a2216'; gg.lineWidth = 6; gg.strokeRect(3, 3, 122, 250);
  gg.lineWidth = 2; for (let x = 32; x < 128; x += 32) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, 256); gg.stroke(); }
  gg.font = '70px "Hiragino Mincho ProN","Noto Serif JP",serif'; gg.textAlign = 'center'; gg.fillStyle = '#9a1a14';
  const t = r.pick(['御食事', '酒処', 'おでん', '焼鳥', '一品']); [...t].forEach((ch, i) => gg.fillText(ch, 64, 70 + i * 70));
  const mat = new THREE.MeshBasicMaterial({ map: tx(c), toneMapped: false });
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, 0.014), [mat, mat, new THREE.MeshBasicMaterial({ color: '#3a2216' }), ink, mat, mat]);
  box.add(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.016), hull)); box.position.y = 0.022; g.add(box);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.007, 0.003), new THREE.MeshBasicMaterial({ color: '#3a2216' })); leg.position.y = 0.0035; g.add(leg);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffcf8a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(0.07); halo.position.y = 0.022; g.add(halo);
  return g;
}

// ---- 路面：砂まじりのアスファルト、側溝、グレーチング、マンホール、水たまり ----
export function groundTextures(r, W, L) {
  const PX = 1100; // 1単位あたりの画素
  const w = Math.round(W * PX), h = Math.round(L * PX);
  const c = cv(w, h), g = c.getContext('2d');
  const img = g.createImageData(w, h), D = img.data;
  // 粗いムラ＋細かい砂粒
  const coarse = new Float32Array(Math.ceil(w / 16) * Math.ceil(h / 16)).map(() => Math.random());
  const cw = Math.ceil(w / 16);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const m = coarse[Math.floor(y / 16) * cw + Math.floor(x / 16)];
    const n = Math.random();
    const grain = n > 0.93 ? 34 : n < 0.06 ? -30 : (n - 0.5) * 22;
    const v = 56 + m * 22 + grain;
    D[i] = v * 1.08; D[i + 1] = v * 0.94; D[i + 2] = v * 0.9; D[i + 3] = 236;
  }
  g.putImageData(img, 0, 0);
  // 小石
  for (let i = 0; i < w * h / 900; i++) { g.fillStyle = r.pick(['#8a7e74', '#5a5048', '#a09484', '#3a3230']); g.beginPath(); g.ellipse(r.range(0, w), r.range(0, h), r.range(1, 3), r.range(1, 2.5), r.range(0, 3), 0, 7); g.fill(); }
  // 側溝（両脇のコンクリの縁石とふた）
  const gutter = Math.round(0.022 * PX);
  for (const x0 of [0, w - gutter]) {
    g.fillStyle = '#6a625c'; g.fillRect(x0, 0, gutter, h);
    for (let y = 0; y < h; y += Math.round(0.03 * PX)) {
      g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x0 + 2, y + 2, gutter - 4, Math.round(0.03 * PX) - 4);
      if (r.next() < 0.25) { g.fillStyle = '#1e1a1c'; g.fillRect(x0 + 5, y + 6, gutter - 10, Math.round(0.03 * PX) - 12); g.strokeStyle = '#4a4448'; g.lineWidth = 2; for (let k = x0 + 8; k < x0 + gutter - 6; k += 5) { g.beginPath(); g.moveTo(k, y + 6); g.lineTo(k, y + Math.round(0.03 * PX) - 6); g.stroke(); } }
    }
  }
  // マンホール
  for (let i = 0; i < 2; i++) {
    const x = w * r.range(0.35, 0.65), y = h * r.range(0.25, 0.75), R = 0.016 * PX;
    g.fillStyle = '#3a3438'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    g.strokeStyle = '#5a5458'; g.lineWidth = 2; for (let k = -R; k < R; k += 6) { g.beginPath(); g.moveTo(x - R, y + k); g.lineTo(x + R, y + k); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
  }
  // ひび・汚れ・紙くず
  g.strokeStyle = 'rgba(14,8,16,0.85)';
  for (let i = 0; i < 46; i++) { g.lineWidth = r.range(0.8, 2); let x = r.range(gutter, w - gutter), y = r.range(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += r.range(-20, 20); y += r.range(-30, 30); g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(20,10,8,0.35)'; g.beginPath(); g.ellipse(r.range(0, w), r.range(0, h), r.range(10, 40), r.range(6, 20), r.range(0, 3), 0, 7); g.fill(); }
  for (let i = 0; i < 18; i++) { g.fillStyle = r.pick(['#d8d0c0', '#c84030', '#e8e0a0']); g.save(); g.translate(r.range(gutter, w - gutter), r.range(0, h)); g.rotate(r.range(0, 3)); g.fillRect(-4, -3, 8, 6); g.restore(); }
  // 水たまり：あとで透かして映り込みを見せる。縁は墨
  g.globalCompositeOperation = 'destination-out';
  const puddles = [];
  for (let i = 0; i < 22; i++) {
    const x = r.range(gutter + 10, w - gutter - 10), y = r.range(0, h), rx = r.range(14, 70), ry = r.range(30, 160);
    puddles.push([x, y, rx, ry]);
    const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  }
  // 路地の真ん中ほど濡れている
  for (let i = 0; i < 80; i++) { const x = w / 2 + r.range(-w * 0.3, w * 0.3), y = r.range(0, h), rr = r.range(20, 80); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(14,8,16,0.6)'; g.lineWidth = 1.5;
  for (const p of puddles) { g.beginPath(); g.ellipse(...p, 0, 0, 7); g.stroke(); }
  // 映り込みの代わり（軽い端末）：ネオンが縦に伸びた絵
  const u = cv(256, Math.round(256 * L / W)), ug = u.getContext('2d');
  ug.fillStyle = '#1a1222'; ug.fillRect(0, 0, u.width, u.height);
  for (let i = 0; i < 120; i++) { const x = r.range(0, u.width), y = r.range(0, u.height), len = r.range(60, 240), col = r.pick(['255,79,163', '79,216,255', '255,178,31', '180,107,255', '255,90,60', '255,220,150']); const gr = ug.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},0.85)`); gr.addColorStop(1, `rgba(${col},0)`); ug.fillStyle = gr; ug.fillRect(x, y, r.range(3, 12), len); }
  return { top: tx(c), under: tx(u) };
}

export function addAlley(root, plan, entries, decor, r, { works, reflect = false, tower }) {
  const L = [...entries.values()].filter(e => e.b.strip === 'inner');
  const S = new Map(L.map(e => [e.b.id, sampler(e)]));
  const updates = [];
  const workSigns = [];

  // ---- 看板 ----
  const occupied = new Map(); // 建物ごとの埋まった範囲（局所の X,Y の箱）
  const free = (id, x0, x1, y0, y1) => { const list = occupied.get(id) || []; if (list.some(q => !(x1 < q[0] || x0 > q[1] || y1 < q[2] || y0 > q[3]))) return false; list.push([x0, x1, y0, y1]); occupied.set(id, list); return true; };
  // 突き出し看板：壁の点から、看板の面がカメラ（+z）を向く
  const projecting = (sm, X, Y, sign, w, h, armExtra = 0) => {
    const Z = sm.maxDepth(X - 0.005, X + 0.005, Y - h / 2, Y + h / 2) + 0.003;
    const wall = sm.toWorld(X, Y + h / 2 - 0.004, Z);
    const arm = bracket(w + 0.012 + armExtra);
    arm.position.copy(wall); arm.rotation.y = sm.yaw; decor.add(arm);
    const center = sm.toWorld(X, Y, Z + 0.008 + armExtra + w / 2);
    sign.group.position.copy(center);
    decor.add(sign.group);
    // 看板へ電気を引く短い線
    const lineGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(sm.toWorld(X, Y + h / 2 + 0.02, Z), sm.toWorld(X, Y + h / 2 + 0.004, Z + 0.006), center.clone().add(new THREE.Vector3(0, h / 2, 0))), 6, 0.0005, 3);
    cables.push(lineGeo);
  };
  const flat = (sm, X, Y, sign, w, h) => {
    const Z = sm.maxDepth(X - w / 2, X + w / 2, Y - h / 2, Y + h / 2) + 0.004;
    sign.group.position.copy(sm.toWorld(X, Y, Z));
    sign.group.rotation.y = sm.yaw;
    decor.add(sign.group);
  };
  const cables = [];
  const sorted = L.slice().sort((a, b) => b.b.z - a.b.z);
  const near = sorted.slice(0, 2).map(e => e.b.id);
  const hosts = [];
  { const Ls = sorted.filter(e => e.b.x < 0 && !near.includes(e.b.id)), Rs = sorted.filter(e => e.b.x > 0 && !near.includes(e.b.id)); for (let i = 0; i < Math.max(Ls.length, Rs.length); i++) { if (Ls[i]) hosts.push(Ls[i]); if (Rs[i]) hosts.push(Rs[i]); } }
  const WORK_KIND = ['neon', 'lightbox', 'marquee', 'neon', 'lightbox'];
  works.forEach((w, i) => {
    const e = hosts[i % hosts.length], sm = S.get(e.b.id);
    let kind = WORK_KIND[i % WORK_KIND.length];
    const latin = !/[　-鿿＀-￯]/.test(w.title);
    if (latin && kind === 'lightbox') kind = 'marquee';
    const horiz = kind === 'marquee';
    const [sw, sh] = horiz ? [0.09, 0.032] : [0.034, Math.min(0.15, e.b.h * 0.5)];
    for (let tries = 0; tries < 12; tries++) {
      const X = r.range(-sm.half * 0.6, sm.half * 0.6), Y = r.range(0.12, Math.min(0.32, e.b.h - sh));
      if (!free(e.b.id, X - 0.02, X + 0.02, Y - sh / 2 - 0.01, Y + sh / 2 + 0.01) && tries < 11) continue;
      const sign = makeSign(kind, w.title, w.color || r.pick(NEON), [sw, sh], { vertical: !horiz, rng: () => r.next() });
      projecting(sm, X, Y, sign, horiz ? 0.004 : sw, sh, horiz ? sw / 2 : 0);
      sign.hit.userData = { workId: w.id, phase: r.range(0, 6), faceMat: sign.faceMat, color: w.color };
      workSigns.push(sign.hit);
      if (sign.update) updates.push(sign.update);
      break;
    }
  });
  // 飾りの看板：いろいろな種類を小さく、たくさん
  for (const e of L) {
    const sm = S.get(e.b.id);
    const n = Math.round(e.b.fw * 60 + e.b.h * 8);
    for (let k = 0; k < n; k++) {
      const t = r.next();
      let kind, text, size, how;
      if (t < 0.3) { kind = 'neon'; text = r.pick(JP_TEXT); size = [0.022, Math.min(0.1, 0.03 + [...text].length * 0.018)]; how = 'project'; }
      else if (t < 0.55) { kind = 'lightbox'; text = r.pick(JP_TEXT); size = r.next() < 0.6 ? [0.022, Math.min(0.11, 0.03 + [...text].length * 0.02)] : [Math.min(0.1, 0.03 + [...text].length * 0.018), 0.022]; how = size[0] < size[1] ? 'project' : 'flat'; }
      else if (t < 0.68) { kind = 'marquee'; text = r.pick(US_TEXT); size = [0.012 + text.length * 0.0062, 0.018]; how = 'project'; }
      else if (t < 0.78) { kind = 'round'; text = r.pick(JP_TEXT); size = [0.034, 0.034]; how = 'project'; }
      else { kind = 'painted'; text = r.pick(JP_TEXT); size = r.next() < 0.5 ? [0.03, 0.03 + [...text].length * 0.03] : [0.03 + [...text].length * 0.03, 0.03]; how = 'flat'; }
      const [sw, sh] = size;
      const X = r.range(-sm.half + 0.01, sm.half - 0.01), Y = r.range(0.07, Math.max(0.08, e.b.h * 0.85 - sh));
      const fx = how === 'flat' ? sw / 2 : 0.012;
      if (!free(e.b.id, X - fx, X + fx, Y - sh / 2, Y + sh / 2)) continue;
      const color = r.pick(NEON);
      const sign = makeSign(kind, text, color, size, { vertical: sh > sw, rng: () => r.next() });
      if (how === 'flat') flat(sm, X, Y, sign, sw, sh);
      else projecting(sm, X, Y, sign, kind === 'marquee' ? 0.004 : sw, sh, kind === 'marquee' ? sw / 2 : 0);
      if (sign.update) updates.push(sign.update);
    }
  }

  // ---- 1階：日よけ、屋台、提灯、行灯 ----
  const awnMat = col => { const c = cv(64, 16), g = c.getContext('2d'); for (let x = 0; x < 64; x += 8) { g.fillStyle = (x / 8) % 2 ? col : '#efe6d6'; g.fillRect(x, 0, 8, 16); } g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 12, 64, 4); return new THREE.MeshBasicMaterial({ map: tx(c) }); };
  for (const e of L) {
    const sm = S.get(e.b.id);
    if (r.next() < 0.2) continue;
    const span = e.b.fw * 0.92, y = r.range(0.05, 0.065);
    const Z = sm.maxDepth(-span / 2, span / 2, 0.0, y + 0.01) + 0.002;
    const top = awnMat(r.pick(['#a8323c', '#2f5d7a', '#3d6b3a', '#8a6a2a', '#6a3a6a'])), dark = new THREE.MeshBasicMaterial({ color: '#2a1a1a' });
    const awn = new THREE.Mesh(new THREE.BoxGeometry(span, 0.0015, 0.032), [dark, dark, top, top, dark, dark]);
    awn.add(new THREE.Mesh(new THREE.BoxGeometry(span + 0.002, 0.003, 0.034), hull));
    awn.position.copy(sm.toWorld(0, y, Z + 0.015)); awn.rotation.set(0, sm.yaw, 0); awn.rotateX(0.42);
    decor.add(awn);
    if (r.next() < 0.65) {
      const n = Math.max(1, Math.floor(span / 0.03));
      for (let k = 0; k < n; k++) { const l = chochin(r); l.position.copy(sm.toWorld(-span / 2 + (k + 0.5) * span / n, y - 0.025, Z + 0.03)); decor.add(l); }
    }
    if (r.next() < 0.45) { const a = andon(r); a.position.copy(sm.toWorld(r.range(-span / 2, span / 2), 0.004, Z + 0.03)); decor.add(a); }
    // カウンター
    const cnt = new THREE.Mesh(new THREE.BoxGeometry(span * 0.7, 0.02, 0.012), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshBasicMaterial({ color: i === 2 ? '#8a6a50' : '#3e2a22' })));
    cnt.add(new THREE.Mesh(new THREE.BoxGeometry(span * 0.7 + 0.002, 0.022, 0.014), hull));
    cnt.position.copy(sm.toWorld(r.range(-span * 0.1, span * 0.1), 0.01, Z + 0.007)); cnt.rotation.y = sm.yaw;
    decor.add(cnt);
  }

  // ---- 配管：壁に沿わせ、金具で留める（路地から見える面だけ） ----
  const pipeBy = new Map();
  const addPipe = (pts, rad, color) => {
    const curve = pts.length === 2 ? new THREE.LineCurve3(...pts) : new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.02);
    if (!pipeBy.has(color)) pipeBy.set(color, { body: [], hull: [] });
    const e = pipeBy.get(color), segs = pts.length === 2 ? 2 : 20;
    e.body.push(new THREE.TubeGeometry(curve, segs, rad, 8, false));
    e.hull.push(new THREE.TubeGeometry(curve, segs, rad * 1.45, 8, false));
  };
  const clamps = [];
  const PIPE = ['#6a5a52', '#5a4a4c', '#7a5a44', '#8a8478', '#4a4048'];
  for (const e of L) {
    const sm = S.get(e.b.id);
    // 縦の雨どい
    for (let k = 0; k < r.int(1, 2); k++) {
      const X = r.pick([-1, 1]) * r.range(sm.half * 0.55, sm.half * 0.9), rad = r.range(0.0022, 0.0034);
      const top = e.b.h * r.range(0.6, 0.95);
      const Z = sm.maxDepth(X - rad, X + rad, 0, top) + rad + 0.002;
      const zTop = sm.depth(X, top - 0.01) + 0.001;
      const color = r.pick(PIPE);
      addPipe([sm.toWorld(X, 0.003, Z), sm.toWorld(X, top - 0.012, Z), sm.toWorld(X, top - 0.004, (Z + zTop) / 2), sm.toWorld(X, top, zTop)], rad, color);
      for (let y = 0.04; y < top - 0.02; y += 0.05) { const zw = sm.depth(X, y); clamps.push([sm.toWorld(X, y, (zw + Z) / 2), Z - zw, sm.yaw]); }
    }
    // 横に走る管
    if (r.next() < 0.7) {
      const Y = r.range(0.07, Math.min(0.35, e.b.h * 0.7)), rad = r.range(0.0015, 0.0028);
      const x0 = -sm.half + 0.004, x1 = sm.half - 0.004;
      const Z = sm.maxDepth(x0, x1, Y - rad, Y + rad) + rad + 0.002;
      const color = r.pick(PIPE);
      const zl = sm.depth(x0, Y) + 0.001, zr = sm.depth(x1, Y) + 0.001;
      addPipe([sm.toWorld(x0, Y, zl), sm.toWorld(x0 + 0.004, Y, Z), sm.toWorld(x1 - 0.004, Y, Z), sm.toWorld(x1, Y, zr)], rad, color);
      for (let x = x0 + 0.03; x < x1 - 0.02; x += 0.05) { const zw = sm.depth(x, Y); clamps.push([sm.toWorld(x, Y, (zw + Z) / 2), Z - zw, sm.yaw]); }
    }
  }
  for (const [color, e] of pipeBy) {
    decor.add(new THREE.Mesh(mergeGeometries(e.body), new THREE.MeshBasicMaterial({ color })));
    decor.add(new THREE.Mesh(mergeGeometries(e.hull), hull));
  }
  if (clamps.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.0025, 1), new THREE.MeshBasicMaterial({ color: '#2a2224' }), clamps.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
    clamps.forEach(([p, len, yaw], i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw); M.compose(p, Q, new THREE.Vector3(1, 1, Math.max(0.002, len))); im.setMatrixAt(i, M); });
    decor.add(im);
  }

  // ---- 電線：奥から手前へ。壁の金具から金具へ、建物を突き抜けないように ----
  const wireGeos = [...cables];
  const insul = [];
  for (const side of [-1, 1]) {
    const row = L.filter(e => (e.b.x < 0) === (side < 0)).sort((a, b) => a.b.z - b.b.z); // 奥→手前
    const nRuns = 16;
    for (let k = 0; k < nRuns; k++) {
      const baseY = r.range(0.12, 0.42);
      const out = r.range(0.004, 0.018);
      const anchors = [];
      for (const e of row) {
        if (e.b.h < baseY + 0.03) continue;
        const sm = S.get(e.b.id);
        for (const X of [-sm.half * 0.7, sm.half * 0.7]) {
          const Y = baseY + r.range(-0.012, 0.012);
          anchors.push({ sm, X, Y, Z: sm.maxDepth(X - 0.006, X + 0.006, Y - 0.006, Y + 0.006) + out });
        }
      }
      // 奥から手前の順に並べ替え（世界の z）
      anchors.forEach(a => { a.w = a.sm.toWorld(a.X, a.Y, a.Z); });
      anchors.sort((a, b) => a.w.z - b.w.z);
      for (let i = 0; i + 1 < anchors.length; i++) {
        const A = anchors[i], B = anchors[i + 1];
        const sag = r.range(0.006, 0.02);
        // たわんだ線の途中で建物に刺さらないか確かめ、刺さるなら金具を伸ばす
        let push = 0;
        for (let s = 1; s < 8; s++) {
          const t = s / 8, p = A.w.clone().lerp(B.w, t); p.y -= Math.sin(t * Math.PI) * sag;
          for (const e of row) {
            const sm = S.get(e.b.id), l = sm.toLocal(p);
            if (Math.abs(l.x) <= sm.half && l.y > 0 && l.y < e.b.h) { const need = sm.depth(l.x, l.y) + 0.003 - l.z; if (need > push) push = need; }
          }
        }
        const nA = A.sm.normal, nB = B.sm.normal;
        const a = A.w.clone().addScaledVector(nA, push), b = B.w.clone().addScaledVector(nB, push);
        const m = a.clone().lerp(b, 0.5); m.y -= sag * 2;
        wireGeos.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 10, 0.0007, 3, false));
        if (push > 0.002) { wireGeos.push(new THREE.TubeGeometry(new THREE.LineCurve3(A.w, a), 1, 0.0009, 3, false)); }
        insul.push(a);
      }
    }
  }
  decor.add(new THREE.Mesh(mergeGeometries(wireGeos), new THREE.MeshBasicMaterial({ color: '#0e0810' })));
  if (insul.length) {
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.004, 6), new THREE.MeshBasicMaterial({ color: '#d8d0c0' }), insul.length);
    const M = new THREE.Matrix4(); insul.forEach((p, i) => { M.makeTranslation(p.x, p.y + 0.002, p.z); im.setMatrixAt(i, M); });
    decor.add(im);
  }

  // ---- 湯気 ----
  const steam = [];
  const sc = cv(64, 64), sg = sc.getContext('2d');
  for (let i = 0; i < 6; i++) { const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, rr = 10 + Math.random() * 10; const gr = sg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,240,245,0.5)'); gr.addColorStop(1, 'rgba(255,240,245,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64); }
  const stT = tx(sc);
  for (const e of L.filter(() => r.next() < 0.35)) {
    const sm = S.get(e.b.id);
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: stT, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { base: sm.toWorld(r.range(-sm.half * 0.5, sm.half * 0.5), 0.025, sm.maxDepth(-0.01, 0.01, 0, 0.03) + 0.025), t: r.range(0, 3), speed: r.range(0.25, 0.4) };
      decor.add(s); steam.push(s);
    }
  }

  // ---- 路面 ----
  const wet = new THREE.Group();
  const GW = ALLEY + 0.06, GL = 1.32;
  const gt = groundTextures(r, GW, GL);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), new THREE.MeshBasicMaterial({ map: gt.top, transparent: true, depthWrite: false }));
  top.rotation.x = -Math.PI / 2; top.position.set(0, 0.0045, 0.04); wet.add(top);
  if (reflect) {
    const mirror = new Reflector(new THREE.PlaneGeometry(GW, GL), { textureWidth: 512, textureHeight: 1024, color: 0xffffff });
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0.0036, 0.04); wet.add(mirror);
  } else {
    const under = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), new THREE.MeshBasicMaterial({ map: gt.under }));
    under.rotation.x = -Math.PI / 2; under.position.set(0, 0.0036, 0.04); wet.add(under);
  }
  root.add(wet);

  // ---- 突き当たりのタワー：画面・ネオン・サーチライト ----
  let screenMat = null, screen = null;
  const beams = [];
  if (tower) {
    const sm = sampler(tower);
    const w = tower.b.fw * 0.62, h = w * 1.05, Y = tower.b.h * 0.66;
    const Z = sm.maxDepth(-w / 2, w / 2, Y - h / 2, Y + h / 2) + 0.004;
    screenMat = new THREE.MeshBasicMaterial({ map: tower.screenTex, color: 0x000000, toneMapped: false });
    screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screen.position.copy(sm.toWorld(0, Y, Z)); screen.rotation.y = sm.yaw; screen.userData.billboard = true;
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.06, h * 1.05), new THREE.MeshBasicMaterial({ color: '#ff4fa3', toneMapped: false }));
    frame.position.z = -0.0015; screen.add(frame);
    decor.add(screen);
    const ns = makeSign('neon', '開発街', '#ff3b6a', [w * 0.9, w * 0.3], { rng: () => r.next() });
    ns.group.position.copy(sm.toWorld(0, Y + h / 2 + w * 0.22, sm.maxDepth(-w / 2, w / 2, Y + h / 2, Y + h / 2 + w * 0.4) + 0.006)); ns.group.rotation.y = sm.yaw; decor.add(ns.group);
    if (ns.update) updates.push(ns.update);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.copy(sm.toWorld(s * tower.b.fw * 0.25, tower.b.h * 0.98, -tower.b.fd * 0.4));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 2.4, 16, 1, true), beamMat);
      cone.position.y = 1.2; cone.rotation.z = Math.PI; pivot.add(cone);
      pivot.userData = { s, phase: r.range(0, 6) };
      decor.add(pivot); beams.push(pivot);
    }
  }

  return {
    wet, workSigns, screenParts: screen ? [screen] : [], screenMat,
    animate(time, dt) {
      for (const u of updates) u(time);
      for (const s of steam) { const u = s.userData; u.t += dt * u.speed; const k = u.t % 1; s.position.copy(u.base).add(new THREE.Vector3(Math.sin(u.t * 3) * 0.004, k * 0.09, 0)); s.scale.setScalar(0.02 + k * 0.05); s.material.opacity = Math.sin(k * Math.PI) * 0.45; }
      for (const p of beams) p.rotation.z = -p.userData.s * (0.3 + Math.sin(time * 0.5 + p.userData.phase) * 0.25);
    },
  };
}
