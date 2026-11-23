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
