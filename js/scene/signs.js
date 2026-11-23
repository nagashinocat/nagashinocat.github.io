// 看板のいろいろ：ネオン管・中から光る行灯看板・アメリカの電球看板・丸いネオン・色あせたペンキ看板
// どれも小さめ。壁からアームで突き出すか、壁に貼る
import * as THREE from 'three';
import { INK } from '../draw/manga.js';
import { glowTex } from './parts.js';

const hull = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const metal = new THREE.MeshBasicMaterial({ color: '#3a3438' });
const darkBack = new THREE.MeshBasicMaterial({ color: '#120a12' });
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tx = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const chars = s => [...s];
const isLatin = s => !/[　-鿿＀-￯]/.test(s);
const JP = '"Dela Gothic One","Hiragino Kaku Gothic StdN","Noto Sans JP",sans-serif';
const RETRO = '"Righteous","Monoton","Dela Gothic One",sans-serif';

// 文字を箱に収める（縦なら1文字ずつ下へ）
function layout(g, text, W, H, vertical, font, maxPx) {
  if (vertical && !isLatin(text)) {
    const cs = chars(text).filter(c => c !== '︎' && c !== '️');
    const cols = cs.length > 9 ? 2 : 1;
    const per = Math.ceil(cs.length / cols);
    const px = Math.min(maxPx, (H * 0.86) / per, (W * 0.84) / cols);
    g.font = `${px}px ${font}`;
    const out = [];
    for (let c = 0; c < cols; c++) for (let i = 0; i < per; i++) {
      const ch = cs[c * per + i]; if (!ch) continue;
      const x = W / 2 + ((cols - 1) / 2 - c) * px * 1.05, y = H / 2 + (i - (per - 1) / 2) * px * 1.0;
      out.push([ch === 'ー' ? '｜' : ch, x, y, '、。'.includes(ch)]);
    }
    return { px, out, rotate: false };
  }
  let px = maxPx; g.font = `${px}px ${font}`;
  const len = vertical ? H * 0.88 : W * 0.88, cross = vertical ? W * 0.8 : H * 0.8;
  px = Math.min(px, cross);
  g.font = `${px}px ${font}`;
  while (px > 6 && g.measureText(text).width > len) { px -= 1; g.font = `${px}px ${font}`; }
  return { px, out: [[text, W / 2, H / 2, false]], rotate: vertical };
}
function paintText(g, L, W, H, draw) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [s, x, y, punct] of L.out) {
    g.save();
    if (L.rotate) { g.translate(W / 2, H / 2); g.rotate(Math.PI / 2); g.translate(-W / 2, -H / 2); }
    draw(s, x + (punct ? L.px * 0.3 : 0), y - (punct ? L.px * 0.3 : 0));
    g.restore();
  }
}

// ネオン管：暗い板の上に、光る管で文字と縁
function neonFace(text, color, W, H, vertical) {
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#140a14'; g.fillRect(0, 0, W, H);
  // 板のビスと細かい傷
  g.fillStyle = '#2a2028'; for (const [x, y] of [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  const L = layout(g, text, W, H, vertical, JP, Math.min(W, H) * 0.8);
  const tube = (lw, col, blur) => { g.lineWidth = lw; g.strokeStyle = col; g.shadowColor = color; g.shadowBlur = blur; g.lineJoin = 'round';
    paintText(g, L, W, H, (s, x, y) => g.strokeText(s, x, y)); };
  tube(L.px * 0.14, color, L.px * 0.5);
  tube(L.px * 0.07, '#ffffff', L.px * 0.15);
  // 縁の管
  g.shadowColor = color; g.shadowBlur = 14; g.strokeStyle = color; g.lineWidth = 4;
  g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 10); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.stroke();
  return c;
}
// 行灯看板：乳白の板が中から光る、印刷の文字
function lightboxFace(text, color, W, H, vertical) {
  const c = cv(W, H), g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H);
  const light = ['#fff8e8', '#fff2d0', '#f0faff'][text.length % 3];
  bg.addColorStop(0, light); bg.addColorStop(0.5, '#ffffff'); bg.addColorStop(1, light);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 色帯
  g.fillStyle = color; vertical ? g.fillRect(0, 0, W, H * 0.06) : g.fillRect(0, H * 0.84, W, H * 0.16);
  const L = layout(g, text, W, H * (vertical ? 0.92 : 0.84), vertical, JP, Math.min(W, H) * 0.7);
  g.fillStyle = ['#c4142c', '#1a2a8a', '#111111', '#0a6a3a'][(text.charCodeAt(0) || 0) % 4];
  paintText(g, L, W, H * (vertical ? 0.92 : 0.84), (s, x, y) => g.fillText(s, x, y + (vertical ? H * 0.04 : 0)));
  // 内側の影（蛍光灯のむら）
  const sh = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,40,20,0.25)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  // よごれ
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,40,30,${Math.random() * 0.15})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 2 + Math.random() * 12); }
  return c;
}
// アメリカの看板：赤い板に白い縁、レトロな字（電球は別に立体で）
function marqueeFace(text, color, W, H) {
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = color === '#4fd8ff' ? '#0e4a6a' : '#a8141e'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#f4e8c8'; g.lineWidth = Math.min(W, H) * 0.06; g.strokeRect(g.lineWidth, g.lineWidth, W - g.lineWidth * 2, H - g.lineWidth * 2);
  const L = layout(g, text, W, H, false, RETRO, H * 0.55);
  g.fillStyle = '#ffe9a8'; g.shadowColor = '#ffcf6a'; g.shadowBlur = 10;
  paintText(g, L, W, H, (s, x, y) => g.fillText(s, x, y));
  g.shadowBlur = 0; g.strokeStyle = INK; g.lineWidth = 2; paintText(g, L, W, H, (s, x, y) => g.strokeText(s, x, y));
  return c;
}
function roundFace(text, color, S) {
  const c = cv(S, S), g = c.getContext('2d');
  g.fillStyle = '#140a14'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.fill();
  for (const [lw, col, blur] of [[S * 0.05, color, S * 0.12], [S * 0.022, '#fff', 4]]) { g.lineWidth = lw; g.strokeStyle = col; g.shadowColor = color; g.shadowBlur = blur; g.beginPath(); g.arc(S / 2, S / 2, S * 0.4, 0, 7); g.stroke(); }
  const ch = chars(text)[0];
  g.font = `${S * 0.5}px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [lw, col, blur] of [[S * 0.05, color, S * 0.1], [S * 0.022, '#fff', 3]]) { g.lineWidth = lw; g.strokeStyle = col; g.shadowColor = color; g.shadowBlur = blur; g.strokeText(ch, S / 2, S * 0.53); }
  return c;
}
function paintedFace(text, W, H) {
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#d8d0c0'; g.fillRect(0, 0, W, H);
  const L = layout(g, text, W, H, H > W, '"Hiragino Mincho ProN","Noto Serif JP",serif', Math.min(W, H) * 0.75);
  g.fillStyle = '#7a1418'; paintText(g, L, W, H, (s, x, y) => g.fillText(s, x, y));
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 5, 0, 7); g.fill(); }
  return c;
}

/**
 * 看板をつくる。返り値: { group, hit, faceMat, update(t) }
 * kind: 'neon' | 'lightbox' | 'marquee' | 'round' | 'painted'
 * size: [幅, 高さ]（世界の大きさ）
 */
export function makeSign(kind, text, color, size, { vertical = false, rng = Math.random } = {}) {
  const [w, h] = size;
  const group = new THREE.Group();
  const R = 520 / Math.max(w, h);
  const PW = Math.max(32, Math.round(w * R)), PH = Math.max(32, Math.round(h * R));
  let faceMat, update = null;
  const box = (bw, bh, bd, mats) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mats); m.add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.003, bh + 0.003, bd + 0.003), hull)); return m; };
  if (kind === 'neon') {
    const back = box(w, h, 0.003, darkBack); group.add(back);
    faceMat = new THREE.MeshBasicMaterial({ map: tx(neonFace(text, color, PW, PH, vertical)), toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat); face.position.z = 0.0018; group.add(face);
    const back2 = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat); back2.rotation.y = Math.PI; back2.position.z = -0.0018; group.add(back2);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(w * 2.2, h * 1.6, 1); group.add(halo);
    let k = rng() * 10; update = t => { const flick = Math.sin(t * 37 + k) > 0.995 ? 0.4 : 1; faceMat.color.setScalar(flick); };
    group.userData.face = face;
  } else if (kind === 'lightbox') {
    faceMat = new THREE.MeshBasicMaterial({ map: tx(lightboxFace(text, color, PW, PH, vertical)), toneMapped: false });
    const d = Math.min(w, h) * 0.35;
    const m = box(w, h, d, [metal, metal, metal, metal, faceMat, faceMat]); group.add(m);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff2d0', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(w * 1.8, h * 1.4, 1); group.add(halo);
    group.userData.face = m;
  } else if (kind === 'marquee') {
    faceMat = new THREE.MeshBasicMaterial({ map: tx(marqueeFace(text, color, PW, PH)), toneMapped: false });
    const m = box(w, h, 0.006, [metal, metal, metal, metal, faceMat, faceMat]); group.add(m);
    // 縁の電球（追いかけるように点滅）
    const n = Math.max(8, Math.round((w + h) * 2 / 0.012));
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    const M = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const t = i / n * 2 * (w + h); let x, y;
      if (t < w) { x = -w / 2 + t; y = h / 2; } else if (t < w + h) { x = w / 2; y = h / 2 - (t - w); } else if (t < 2 * w + h) { x = w / 2 - (t - w - h); y = -h / 2; } else { x = -w / 2; y = -h / 2 + (t - 2 * w - h); }
      M.makeTranslation(x, y, 0.004); bulbs.setMatrixAt(i, M);
    }
    group.add(bulbs);
    const on = new THREE.Color('#fff0b0'), off = new THREE.Color('#5a4020');
    update = t => { const s = Math.floor(t * 8); for (let i = 0; i < n; i++) bulbs.setColorAt(i, (i + s) % 3 === 0 ? off : on); bulbs.instanceColor.needsUpdate = true; };
    update(0);
    group.userData.face = m;
  } else if (kind === 'round') {
    faceMat = new THREE.MeshBasicMaterial({ map: tx(roundFace(text, color, 256)), transparent: true, toneMapped: false });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.006, 32), [metal, faceMat, faceMat]);
    disc.rotation.x = Math.PI / 2; disc.add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.0015, w / 2 + 0.0015, 0.009, 32), hull));
    group.add(disc);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(w * 2.4); group.add(halo);
    group.userData.face = disc;
  } else {
    faceMat = new THREE.MeshBasicMaterial({ map: tx(paintedFace(text, PW, PH)), transparent: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat); group.add(m);
    group.userData.face = m;
  }
  return { group, hit: group.userData.face, faceMat, update };
}

// 壁から突き出すアーム（L字の金具と斜めの支え）
export function bracket(len, drop = 0.006) {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.0025, len), metal); arm.position.set(0, 0, len / 2); g.add(arm);
  const strut = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.0018, Math.hypot(len * 0.6, drop * 4)), metal);
  strut.position.set(0, -drop * 2, len * 0.3); strut.rotation.x = Math.atan2(drop * 4, len * 0.6); g.add(strut);
  return g;
}

// ================= 看板の種類を増やす（形を切り抜いた紙・木・ブリキ・電球・ネオンの絵） =================
const shapeMesh = (shape, depth, faceMat, sideMat) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geo.computeBoundingBox(); const bb = geo.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  const uv = geo.attributes.uv, p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / w, (p.getY(i) - bb.min.y) / h);
  geo.translate(-(bb.min.x + w / 2), -(bb.min.y + h / 2), -depth / 2);
  const m = new THREE.Mesh(geo, [faceMat, sideMat]);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: '#efe6d6', transparent: true, opacity: 0.5 })));
  return m;
};
const wood = (g, W, H) => { g.fillStyle = '#e9dfc4'; g.fillRect(0, 0, W, H); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(120,90,50,${Math.random() * 0.25})`; g.lineWidth = 1; g.beginPath(); const y = Math.random() * H; g.moveTo(0, y); g.bezierCurveTo(W / 3, y + 4, W * 0.6, y - 4, W, y + 2); g.stroke(); } };
const weather = (g, W, H, n = 220) => { g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 3 + 0.5, 0, 7); g.fill(); } g.globalCompositeOperation = 'source-over'; };
const fit = (g, text, maxW, px, font) => { g.font = `${px}px ${font}`; while (px > 6 && g.measureText(text).width > maxW) { px--; g.font = `${px}px ${font}`; } return px; };
const SLAB = '"Rockwell","Righteous","Dela Gothic One",serif';
const bulbRow = (group, pts, color = '#fff0b0') => {
  const n = pts.length, im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0018, 6, 4), new THREE.MeshBasicMaterial({ color, toneMapped: false }), n);
  const M = new THREE.Matrix4(); pts.forEach(([x, y, z], i) => { M.makeTranslation(x, y, z); im.setMatrixAt(i, M); }); group.add(im); return im;
};
const outlinePts = (shape, step, z) => { const pts = shape.getSpacedPoints(Math.max(8, Math.round(shape.getLength() / step))); return pts.map(p => [p.x, p.y, z]); };

// 盾の形（ルートの標識ふう、電球の縁）
function shieldShape(w, h) {
  const s = new THREE.Shape(), x0 = -w / 2, x1 = w / 2, y1 = h / 2, y0 = -h / 2;
  s.moveTo(x0 + w * 0.08, y1); s.quadraticCurveTo(0, y1 - h * 0.12, x1 - w * 0.08, y1);
  s.quadraticCurveTo(x1 + w * 0.02, y1 - h * 0.25, x1, y1 - h * 0.3); s.quadraticCurveTo(x1, y0 + h * 0.2, 0, y0);
  s.quadraticCurveTo(x0, y0 + h * 0.2, x0, y1 - h * 0.3); s.quadraticCurveTo(x0 - w * 0.02, y1 - h * 0.25, x0 + w * 0.08, y1);
  return s;
}
function arrowShape(w, h, dir = 1) {
  const s = new THREE.Shape(), a = w * 0.22;
  const P = [[-w / 2, -h / 2], [w / 2 - a, -h / 2], [w / 2 - a, -h / 2 - h * 0.25], [w / 2, 0], [w / 2 - a, h / 2 + h * 0.25], [w / 2 - a, h / 2], [-w / 2, h / 2]].map(([x, y]) => [x * dir, y]);
  s.moveTo(...P[0]); P.slice(1).forEach(p => s.lineTo(...p)); s.closePath(); return s;
}
function batShape(R) { // 質屋の看板の枠（こうもりの形をくずした丸）
  const s = new THREE.Shape(); const n = 64;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = 1 + 0.12 * Math.max(0, Math.cos(a * 2)) ** 3 + 0.06 * Math.sin(a * 6); const x = Math.cos(a) * R * k * 1.15, y = Math.sin(a) * R * k; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  return s;
}

/** もっと種類のある看板。返り値は makeSign と同じ { group, hit, faceMat, update } */
export function makeSign2(kind, text, color, size, { rng = Math.random } = {}) {
  const [w, h] = size, group = new THREE.Group();
  const R = 520 / Math.max(w, h), PW = Math.max(32, Math.round(w * R)), PH = Math.max(32, Math.round(h * R));
  let faceMat, hit, update = null;
  if (kind === 'shield') {
    const c = cv(PW, PH), g = c.getContext('2d');
    g.fillStyle = '#f2ead6'; g.fillRect(0, 0, PW, PH);
    g.fillStyle = '#1a1414'; g.fillRect(0, PH * 0.32, PW, PH * 0.04);
    let px = fit(g, text.split(' ')[0], PW * 0.7, PH * 0.16, SLAB); g.fillStyle = '#1a1414'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.split(' ')[0], PW / 2, PH * 0.22);
    const big = text.split(' ')[1] || '66'; px = fit(g, big, PW * 0.75, PH * 0.42, SLAB); g.fillText(big, PW / 2, PH * 0.6);
    weather(g, PW, PH, 160);
    faceMat = new THREE.MeshStandardMaterial({ map: tx(c), roughness: 0.8, emissive: 0xffffff, emissiveMap: tx(c), emissiveIntensity: 0.25 });
    const sh = shieldShape(w, h);
    hit = shapeMesh(sh, 0.004, faceMat, new THREE.MeshStandardMaterial({ color: '#1a1414' })); group.add(hit);
    bulbRow(group, outlinePts(sh, 0.007, 0.0025).map(([x, y, z]) => [x * 0.92, y * 0.92, z]));
  } else if (kind === 'arrow') {
    const c = cv(PW, PH), g = c.getContext('2d');
    const bg = rng() < 0.5 ? '#2a8a8a' : '#e8a030'; g.fillStyle = bg; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = '#f2ead6'; g.lineWidth = PH * 0.06; g.strokeRect(PH * 0.06, PH * 0.06, PW - PH * 0.12, PH - PH * 0.12);
    g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, text, PW * 0.62, PH * 0.5, SLAB); g.fillStyle = bg === '#e8a030' ? '#7a1a14' : '#f2ead6'; g.fillText(text, PW * 0.44, PH / 2);
    weather(g, PW, PH);
    faceMat = new THREE.MeshStandardMaterial({ map: tx(c), roughness: 0.85 });
    hit = shapeMesh(arrowShape(w, h, rng() < 0.5 ? 1 : -1), 0.003, faceMat, new THREE.MeshStandardMaterial({ color: '#4a3020' })); group.add(hit);
  } else if (kind === 'plank') {
    const c = cv(PW, PH), g = c.getContext('2d'); wood(g, PW, PH);
    g.strokeStyle = '#7a1a14'; g.lineWidth = PH * 0.05; g.strokeRect(PH * 0.08, PH * 0.08, PW - PH * 0.16, PH - PH * 0.16);
    g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, text, PW * 0.8, PH * 0.5, SLAB);
    g.fillStyle = rng() < 0.5 ? '#b01a14' : '#1a1a1a'; g.strokeStyle = '#1a1010'; g.lineWidth = 3; g.strokeText(text, PW / 2, PH / 2); g.fillText(text, PW / 2, PH / 2);
    weather(g, PW, PH, 300);
    faceMat = new THREE.MeshStandardMaterial({ map: tx(c), roughness: 0.9 });
    hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.003), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? faceMat : new THREE.MeshStandardMaterial({ color: '#6a4a2a' }))); group.add(hit);
    for (const sx of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 6, 4), new THREE.MeshStandardMaterial({ color: '#2a2020' })); n.position.set(sx * w * 0.44, 0, 0.0018); group.add(n); }
  } else if (kind === 'tin') {
    const c = cv(PW, PH), g = c.getContext('2d');
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = PW * 0.03; g.beginPath(); g.roundRect(PW * 0.05, PW * 0.05, PW * 0.9, PH - PW * 0.1, PW * 0.05); g.stroke();
    const col = rng() < 0.5 ? '#f2c418' : '#e8341f';
    g.fillStyle = col; g.beginPath(); g.arc(PW / 2, PH * 0.27, PW * 0.2, 0, 7); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#1a1a1a'; g.font = `bold ${PW * 0.14}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', PW / 2, PH * 0.28);
    const words = text.split(' '); words.forEach((t, i) => { fit(g, t, PW * 0.8, PH * 0.12, 'Impact,"Arial Black",sans-serif'); g.fillText(t, PW / 2, PH * (0.55 + i * 0.14)); });
    for (const [x, y] of [[0.1, 0.06], [0.9, 0.06], [0.1, 0.94], [0.9, 0.94]]) { g.fillStyle = '#888'; g.beginPath(); g.arc(PW * x, PH * y, PW * 0.02, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(120,60,20,0.4)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * PW, Math.random() * PH, 3, 3 + Math.random() * 10);
    faceMat = new THREE.MeshStandardMaterial({ map: tx(c), roughness: 0.5, metalness: 0.2 });
    hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.0012), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? faceMat : new THREE.MeshStandardMaterial({ color: '#9a9a9a' }))); group.add(hit);
  } else if (kind === 'pawn') { // 香港の質屋：こうもり枠のネオン＋赤い円に一字、下に吊るした円
    const R0 = w / 2;
    const disc = (ch, r) => { const c = cv(256, 256), g = c.getContext('2d'); g.fillStyle = '#c81e18'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#ffd24a'; g.lineWidth = 8; g.stroke(); g.font = `160px ${JP}`; g.fillStyle = '#ffd24a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 128, 136); const m = new THREE.MeshBasicMaterial({ map: tx(c), toneMapped: false }); const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.004, 32), [new THREE.MeshBasicMaterial({ color: '#4a1010' }), m, m]); d.rotation.x = Math.PI / 2; return { d, m }; };
    const a = disc([...text][0] || '押', R0 * 0.78); group.add(a.d); faceMat = a.m; hit = a.d;
    const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(batShape(R0).getSpacedPoints(80).map(p => new THREE.Vector3(p.x, p.y, 0.003)), true), 120, 0.0016, 6, true), new THREE.MeshBasicMaterial({ color: '#5aff7a', toneMapped: false }));
    group.add(ring);
    const b = disc([...text][1] || '押', R0 * 0.55); b.d.position.y = -R0 * 1.55; group.add(b.d);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.0012, R0 * 0.4, 0.0012), new THREE.MeshBasicMaterial({ color: '#2a2020' })); chain.position.y = -R0 * 1.0; group.add(chain);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#5aff7a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(w * 2.4); group.add(halo);
  } else if (kind === 'bulbvert') { // 縦長、縁に電球、中は黒地に金の字
    const c = cv(PW, PH), g = c.getContext('2d');
    g.fillStyle = '#1a0a0a'; g.fillRect(0, 0, PW, PH);
    const cs = [...text]; const px = Math.min(PW * 0.75, PH * 0.85 / cs.length);
    g.font = `${px}px ${JP}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffcf4a'; g.shadowColor = '#ff8a1a'; g.shadowBlur = px * 0.3;
    cs.forEach((ch, i) => g.fillText(ch, PW / 2, PH / 2 + (i - (cs.length - 1) / 2) * px));
    faceMat = new THREE.MeshBasicMaterial({ map: tx(c), toneMapped: false });
    hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), [0, 0, 0, 0, 0, 0].map((_, i) => i >= 4 ? faceMat : new THREE.MeshBasicMaterial({ color: '#2a1414' }))); group.add(hit);
    const pts = []; const step = 0.0055;
    for (let x = -w / 2; x <= w / 2; x += step) pts.push([x, h / 2, 0.0035], [x, -h / 2, 0.0035]);
    for (let y = -h / 2 + step; y < h / 2; y += step) pts.push([-w / 2, y, 0.0035], [w / 2, y, 0.0035]);
    const bulbs = bulbRow(group, pts, '#ffe6a0');
    const on = new THREE.Color('#fff2b0'), off = new THREE.Color('#6a3a10');
    update = t => { const s = Math.floor(t * 6); for (let i = 0; i < pts.length; i++) bulbs.setColorAt(i, (i + s) % 4 === 0 ? off : on); bulbs.instanceColor.needsUpdate = true; };
    update(0);
  } else if (kind === 'neonicon') { // 絵のネオン：カクテル・星・猫・矢印
    const which = text;
    const tube = (pts, col, closed = false) => { const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x * w, y * h, 0.002)), closed, 'catmullrom', 0.1); group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 8, 0.0014, 6, closed), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }))); };
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#100810', transparent: true, opacity: 0.0 })); group.add(back); hit = back; faceMat = back.material;
    if (which === 'cocktail') { tube([[-0.35, 0.35], [0.35, 0.35], [0, -0.05], [-0.35, 0.35]], color, true); tube([[0, -0.05], [0, -0.38]], color); tube([[-0.18, -0.4], [0.18, -0.4]], color); tube([[0.12, 0.42], [0.3, 0.2]], '#7cff6b'); }
    else if (which === 'star') { const P = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.2 : 0.45; P.push([Math.cos(a) * rr, Math.sin(a) * rr]); } tube(P, color, true); }
    else if (which === 'cat') { tube([[-0.3, -0.4], [-0.32, 0.1], [-0.25, 0.4], [-0.1, 0.18], [0.1, 0.18], [0.25, 0.4], [0.32, 0.1], [0.3, -0.4]], color); tube([[-0.3, -0.4], [0.3, -0.4]], color); tube([[-0.14, 0.0], [-0.1, 0.02]], '#7cff6b'); tube([[0.1, 0.02], [0.14, 0.0]], '#7cff6b'); }
    else { tube([[-0.45, 0], [0.3, 0]], color); tube([[0.1, 0.22], [0.42, 0], [0.1, -0.22]], color); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(w * 2, h * 2, 1); group.add(halo);
    let k = rng() * 10; update = t => { group.visible = !(Math.sin(t * 23 + k) > 0.985); };
  }
  return { group, hit, faceMat, update };
}
