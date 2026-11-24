// 用途不明のダクト・チューブ・電線の巻きつけ模様（横=周、縦=長さ方向）
import { INK } from './manga.js';

export function drawClutterStrip(canvas, kind, r) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const base = kind === 'duct' ? r.pick(['#9a958c', '#8b8f96', '#a39a86', '#6e6a6f'])
    : kind === 'tube' ? r.pick(['#3b3540', '#5a2f3c', '#2f4a4f', '#6b5a2a', '#c9c0b0'])
    : '#141016';
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  // 円筒らしい陰影（左右が暗い）
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.35, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (kind === 'wire') {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(W * 0.3, 0, W * 0.12, H);
    ctx.fillStyle = INK; for (let y = r.range(20, 60); y < H; y += r.range(60, 120)) ctx.fillRect(0, y, W, 3);
    return;
  }
  // 継ぎ目バンド・テープ・リベット
  const every = kind === 'duct' ? r.range(18, 30) : r.range(30, 70);
  for (let y = r.range(0, every); y < H; y += every) {
    ctx.fillStyle = kind === 'duct' ? INK : r.pick([INK, '#d8c13a', '#c23b3b', '#e8e2d2']);
    ctx.fillRect(0, y, W, kind === 'duct' ? 2 : r.range(2, 5));
    if (kind === 'duct') { ctx.fillStyle = '#2a2328'; for (let x = 4; x < W; x += 9) ctx.fillRect(x, y + 4, 1.5, 1.5); }
  }
  // 汚れ
  ctx.fillStyle = 'rgba(20,11,24,0.25)';
  for (let k = 0; k < H / 12; k++) ctx.fillRect(r.range(0, W), r.range(0, H), r.range(1, 3), r.range(3, 12));
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(1, H); ctx.moveTo(W - 1, 0); ctx.lineTo(W - 1, H); ctx.stroke();
}
