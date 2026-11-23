// 漫画調の3D部品：墨の輪郭つきの箱・円柱、作品の看板、光のにじみ
import * as THREE from 'three';
import { INK } from '../draw/manga.js';
import { drawSign } from '../draw/sign.js';

export const H = Math.PI / 2;
export const hullMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
export const inkMat = new THREE.MeshBasicMaterial({ color: INK });
export const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const tex = (c, repeat) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; };
const matOf = m => m instanceof THREE.Material ? m : m instanceof THREE.Texture ? new THREE.MeshBasicMaterial({ map: m }) : new THREE.MeshBasicMaterial(typeof m === 'string' || typeof m === 'number' ? { color: m } : m);

// 箱：mats は1つか6面分。o は輪郭の太さ
export function box(w, h, d, mats, o = 0.005) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(mats) ? mats.map(matOf) : matOf(mats));
  if (o) m.add(new THREE.Mesh(new THREE.BoxGeometry(w + o, h + o, d + o), hullMat));
  return m;
}
export function cyl(rt, rb, h, mat, seg = 16, o = 0.004, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), matOf(mat));
  if (o) m.add(new THREE.Mesh(new THREE.CylinderGeometry(rt + o / 2, rb + o / 2, h + (open ? 0 : o), seg, 1, open), hullMat));
  return m;
}
export function glow(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}
let _g = null;
export function glowTex() {
  if (_g) return _g;
  const c = canvas(64, 64), g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (_g = tex(c));
}
// 作品の縦看板（押せる）
export function workSign(w, sw, sh, r) {
  const c = canvas(150, Math.round(150 * sh / sw));
  drawSign(c, { text: w.title, color: w.color || '#4fd8ff', isWork: true, vertical: true });
  const faceMat = new THREE.MeshBasicMaterial({ map: tex(c) });
  const edge = new THREE.MeshBasicMaterial({ color: '#1d1220' });
  const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.006), [edge, edge, edge, edge, faceMat, faceMat]);
  m.add(new THREE.Mesh(new THREE.BoxGeometry(sw + 0.005, sh + 0.005, 0.009), hullMat));
  m.userData = { workId: w.id, phase: r.range(0, 6), faceMat, color: w.color };
  return m;
}
// 画面（掲示板）：タップで遊べる
export function screenMesh(w, h, texture) {
  const screenMat = new THREE.MeshBasicMaterial({ map: texture, color: 0x000000, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
  m.userData.billboard = true;
  return { mesh: m, screenMat };
}
// ヒンジで立ち上がる板を作る（a: 0=寝ている, π/2=立っている）
export function hinged(obj, pos, axis, delay, dir = 1) {
  const p = new THREE.Group();
  p.position.copy(pos);
  p.add(obj);
  const set = a => { if (axis === 'x') p.rotation.x = dir * (H - a); else p.rotation.z = dir * (H - a); };
  p.userData = { delay, stand: set, bldg: { row: Math.round(4 - delay * 4) } };
  set(0);
  return p;
}
// 下から生える（高さ方向の拡大）
export function sprout(obj, delay) {
  const p = new THREE.Group();
  p.add(obj);
  const set = a => { const k = Math.max(0.001, Math.min(1, a / H)); p.scale.set(1, k, 1); p.visible = k > 0.01; };
  p.userData = { delay, stand: set, bldg: { row: Math.round(4 - delay * 4) } };
  set(0);
  return p;
}
// 筋状の光（ライン・帯）
export function stripTexture(color, alongX = true) {
  const c = canvas(64, 8), g = c.getContext('2d');
  const gr = alongX ? g.createLinearGradient(0, 0, 0, 8) : g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, color); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 8);
  return tex(c);
}
