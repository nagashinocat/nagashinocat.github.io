// 路地の訪問者カウンター：古い電光の数字板（7セグメントのだいだい色の数字）。数がわかると0から数え上がる
import * as THREE from 'three';
import { counterDigits } from '../counter.js';

const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
function seg7(g, ch, x, y, w, h, on, off) {
  const t = w * 0.16, s = SEG[ch] || '';
  const bars = { a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t], f: [x, y + t, t, h / 2 - t], b: [x + w - t, y + t, t, h / 2 - t], e: [x, y + h / 2, t, h / 2 - t], c: [x + w - t, y + h / 2, t, h / 2 - t] };
  for (const [k, r] of Object.entries(bars)) { g.fillStyle = s.includes(k) ? on : off; g.fillRect(...r); }
}

export function counterBoard({ w = 0.13 } = {}) {
  const C = document.createElement('canvas'); C.width = 640; C.height = 200; const g = C.getContext('2d');
  const tex = new THREE.CanvasTexture(C); tex.colorSpace = THREE.SRGBColorSpace;
  let shown = null, target = null, t0 = 0;
  function draw(n) {
    g.fillStyle = '#140c10'; g.fillRect(0, 0, 640, 200);
    g.strokeStyle = '#6a5a52'; g.lineWidth = 8; g.strokeRect(4, 4, 632, 192);
    // 左：猫の横顔と「猫」
    g.fillStyle = '#ff9a1f'; g.beginPath(); g.arc(62, 108, 30, 0, 7); g.fill();
    g.beginPath(); g.moveTo(38, 92); g.lineTo(42, 58); g.lineTo(60, 82); g.fill(); g.beginPath(); g.moveTo(86, 92); g.lineTo(82, 58); g.lineTo(64, 82); g.fill();
    g.fillStyle = '#140c10'; g.fillRect(48, 102, 8, 10); g.fillRect(68, 102, 8, 10);
    g.font = '34px "Dela Gothic One", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ff9a1f'; g.fillText('猫', 62, 178);
    const d = counterDigits(n), dw = Math.min(70, 500 / d.length);
    for (let i = 0; i < d.length; i++) { const x = 120 + i * (dw + 8); g.fillStyle = '#0a0608'; g.fillRect(x - 4, 26, dw + 8, 148); seg7(g, d[i], x, 34, dw, 132, '#ffa030', 'rgba(255,140,40,0.08)'); }
    tex.needsUpdate = true;
  }
  draw(null);
  const h = w * 200 / 640;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
  const box = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, h * 1.15, 0.012), new THREE.MeshStandardMaterial({ color: '#3a3030', roughness: 0.6, metalness: 0.4 })); box.position.z = -0.0065;
  const group = new THREE.Group(); group.add(box, face);
  const glow = new THREE.PointLight('#ff9a3a', 0.05, 0.25, 2); glow.position.z = 0.04; group.add(glow);
  return {
    group,
    set(n) { if (n == null || n === target) return; target = n; t0 = performance.now(); },
    update() { // 0 から 1.6 秒で数え上がる
      if (target == null) return;
      const u = Math.min(1, (performance.now() - t0) / 1600), v = Math.round(target * (1 - (1 - u) ** 3));
      if (v !== shown) { shown = v; draw(v); }
    },
  };
}
