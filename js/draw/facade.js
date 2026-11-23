// 建物の正面テクスチャ（漫画調）
import { INK, inkRect, inkLine, screentone, crosshatch } from './manga.js';

const WARM = ['#ffd27a', '#ffc861', '#ffe2a3', '#fff1c9'];
const WALLS = {
  games: ['#3a1a33', '#2f1630', '#45203a', '#2a1a3a', '#4a2236', '#36203f'],
  tools: ['#5b4a46', '#4c4140', '#66503f', '#53473f'],
  wip: ['#8a8378', '#9a9284', '#7d7a72'],
};
const NEON = ['#ff4fa3', '#4fd8ff', '#b46bff', '#ffb21f'];

export const PX_PER_UNIT = 420;
export function facadeSize(b) {
  const s = PX_PER_UNIT;
  return { w: Math.max(48, Math.round(b.w * s)), h: Math.min(1024, Math.max(48, Math.round(b.h * s))) };
}

export function drawFacade(canvas, b, district, r) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const wall = r.pick(WALLS[district] || WALLS.games);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  if (district === 'tools') tools(ctx, W, H, r);
  else if (district === 'wip') wip(ctx, W, H, r);
  else games(ctx, W, H, r, b);
  // 影側（右）にトーン、地面寄りにカケアミ
  screentone(ctx, W * 0.72, 0, W * 0.28, H, { dot: 1, spacing: 4 });
  crosshatch(ctx, 0, H * 0.9, W, H * 0.1, { density: 2, gap: 4 });
  // 輪郭
  inkRect(ctx, 1.5, 1.5, W - 3, H - 3, { weight: 3 });
}

function windowGrid(ctx, W, H, r, { cw, ch, top, bottom, lit = 0.55 }) {
  const cols = Math.max(1, Math.floor((W - 6) / cw));
  const rows = Math.max(1, Math.floor((H - top - bottom) / ch));
  const ox = (W - cols * cw) / 2;
  const cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push([ox + i * cw, top + j * ch, i, j]);
  return { cells, cols, rows, cw, ch, lit };
}

function games(ctx, W, H, r, b) {
  const cw = r.pick([13, 15, 17]), ch = r.pick([17, 19, 22]);
  const g = windowGrid(ctx, W, H, r, { cw, ch, top: 10, bottom: Math.min(46, H * 0.18) });
  // 階ごとの床のライン
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let j = 0; j <= g.rows; j++) ctx.fillRect(0, 10 + j * ch - 2, W, 2);
  for (const [x, y] of g.cells) {
    const ww = cw - 5, wh = ch - 7;
    const t = r.next();
    const col = t < g.lit ? r.pick(WARM) : t < g.lit + 0.08 ? '#cfe9ff' : '#1a0f22';
    ctx.fillStyle = col;
    ctx.fillRect(x + 2, y + 2, ww, wh);
    // カーテン・人影
    if (col !== '#1a0f22' && r.next() < 0.35) { ctx.fillStyle = 'rgba(120,40,60,0.55)'; ctx.fillRect(x + 2, y + 2, ww * r.range(0.3, 0.6), wh); }
    if (col !== '#1a0f22' && r.next() < 0.06) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + 2 + ww * 0.6, y + wh * 0.5, wh * 0.18, 0, 7); ctx.fill(); ctx.fillRect(x + 2 + ww * 0.45, y + wh * 0.65, ww * 0.3, wh * 0.4); }
    // 窓枠（十字）
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, ww, wh);
    ctx.beginPath(); ctx.moveTo(x + 2 + ww / 2, y + 2); ctx.lineTo(x + 2 + ww / 2, y + 2 + wh); ctx.stroke();
    // 窓の鉄格子（香港の窓ケージ）
    if (r.next() < 0.22) {
      ctx.strokeStyle = 'rgba(30,20,30,0.9)'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) { ctx.moveTo(x + 1 + k * (ww + 2) / 4, y); ctx.lineTo(x + 1 + k * (ww + 2) / 4, y + ch - 3); }
      ctx.moveTo(x, y + ch - 3); ctx.lineTo(x + cw - 1, y + ch - 3);
      ctx.stroke();
    }
    // 室外機
    if (r.next() < 0.16) {
      const ax = x + r.range(0, cw * 0.3), ay = y + ch - 6;
      ctx.fillStyle = '#d8d2c4'; ctx.fillRect(ax, ay, cw * 0.62, 6);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(ax, ay, cw * 0.62, 6);
      ctx.beginPath(); ctx.arc(ax + cw * 0.2, ay + 3, 2, 0, 7); ctx.stroke();
    }
    // 洗濯物
    if (r.next() < 0.07) {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + cw, y + 4); ctx.stroke();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = r.pick(['#f2f2f2', '#ff8fb8', '#8fd3ff', '#ffe07a']); ctx.fillRect(x + 1 + k * cw / 3, y + 4, cw / 4, r.range(4, 8)); }
    }
  }
  // 縦の配管
  const pipes = r.int(1, 3);
  for (let k = 0; k < pipes; k++) {
    const px = r.range(3, W - 6), pw = r.pick([2.5, 3.5, 5]);
    ctx.fillStyle = r.pick(['#7b6f6a', '#5e5560', '#8a5a3c']);
    ctx.fillRect(px, 0, pw, H);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(px, 0, pw, H);
    for (let y = r.range(10, 30); y < H; y += r.range(18, 40)) { ctx.fillStyle = INK; ctx.fillRect(px - 1, y, pw + 2, 2); }
  }
  // 1階：店先とシャッター
  const gy = H - Math.min(46, H * 0.18);
  ctx.fillStyle = '#1b0c1c'; ctx.fillRect(0, gy, W, H - gy);
  let x = 2;
  while (x < W - 8) {
    const sw = r.range(16, 34);
    if (r.next() < 0.6) {
      ctx.fillStyle = r.pick(['#ffcf6e', '#ff9ac9', '#9fe8ff', '#fff1c9']); ctx.fillRect(x, gy + 8, sw - 3, H - gy - 10);
      ctx.fillStyle = r.pick(NEON); ctx.fillRect(x, gy + 3, sw - 3, 4);
    } else {
      ctx.fillStyle = '#6b6470'; ctx.fillRect(x, gy + 6, sw - 3, H - gy - 8);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let y = gy + 8; y < H - 2; y += 2.5) { ctx.moveTo(x, y); ctx.lineTo(x + sw - 3, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x, gy + 3, sw - 3, H - gy - 5);
    x += sw;
  }
  // 屋上の縁と給水塔の影
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, 4);
  // ネオンの縁取り
  if (r.next() < 0.75) {
    const c = r.pick(NEON);
    ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 8; ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(3, H); ctx.lineTo(3, 4); ctx.lineTo(W - 3, 4); if (r.next() < 0.5) ctx.lineTo(W - 3, H); ctx.stroke();
    if (r.next() < 0.5) { const y = r.range(H * 0.2, H * 0.6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }
  // 汚れ・雨だれ
  ctx.strokeStyle = 'rgba(10,5,10,0.25)'; ctx.lineWidth = 1;
  for (let k = 0; k < W / 6; k++) { const sx = r.range(0, W), sy = r.range(0, H * 0.8); inkLine(ctx, [[sx, sy], [sx + r.range(-1, 1), sy + r.range(10, 40)]], { weight: 0.6, r }); ctx.strokeStyle = 'rgba(10,5,10,0.25)'; }
  // 墨線の色を元に戻しておく（最後は輪郭）
  void b;
}

function tools(ctx, W, H, r) {
  // 波板トタン
  const step = r.pick([5, 6, 7]);
  for (let x = 0; x < W; x += step) {
    ctx.fillStyle = (x / step) % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, 0, step / 2, H);
  }
  ctx.strokeStyle = 'rgba(20,11,24,0.45)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); for (let x = 0; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke();
  // 錆
  for (let k = 0; k < W * H / 1800; k++) {
    const x = r.range(0, W), y = r.range(0, H), rr = r.range(3, 14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(150,70,30,0.75)'); g.addColorStop(1, 'rgba(150,70,30,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 3);
    ctx.fillStyle = 'rgba(120,55,25,0.5)'; ctx.fillRect(x, y, 1.2, r.range(8, 30));
  }
  // 継ぎ目の横線とボルト
  for (let y = r.range(30, 60); y < H; y += r.range(40, 70)) {
    ctx.fillStyle = INK; ctx.fillRect(0, y, W, 1.5);
    for (let x = 4; x < W; x += 10) { ctx.beginPath(); ctx.arc(x, y + 4, 1, 0, 7); ctx.fill(); }
  }
  // 曇りガラスの高窓
  const wy = H * r.range(0.12, 0.22);
  for (let x = 6; x < W - 16; x += 18) {
    const lit = r.next() < 0.45;
    ctx.fillStyle = lit ? '#f8c66a' : '#9aa3a0'; ctx.fillRect(x, wy, 13, 10);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(x, wy, 13, 10);
    if (!lit && r.next() < 0.4) inkLine(ctx, [[x + 2, wy + 2], [x + 7, wy + 6], [x + 11, wy + 3]], { weight: 0.7, r });
  }
  // 大きなシャッター
  const sw = Math.min(W * 0.55, 90), sh = Math.min(H * 0.45, 80), sx = r.range(4, W - sw - 4);
  ctx.fillStyle = '#7d7f86'; ctx.fillRect(sx, H - sh, sw, sh);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let y = H - sh; y < H; y += 3) { ctx.moveTo(sx, y); ctx.lineTo(sx + sw, y); }
  ctx.stroke();
  if (r.next() < 0.5) { ctx.fillStyle = '#ffcf6e'; ctx.fillRect(sx + 2, H - sh * 0.25, sw - 4, sh * 0.25); }
  inkRect(ctx, sx, H - sh, sw, sh, { weight: 1.5 });
  // ペンキの社名
  ctx.fillStyle = 'rgba(240,235,220,0.8)';
  ctx.font = `${Math.min(18, W / 6)}px sans-serif`;
  ctx.fillText(r.pick(['長篠製作所', '第二工場', '有限会社', '危険', '火気厳禁', '旋盤', '試作']), 6, H * 0.45);
  screentone(ctx, 0, 0, W, H * 0.12, { dot: 1.3, spacing: 4 });
}

function wip(ctx, W, H, r) {
  // コンクリと足場とブルーシート
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let k = 0; k < W * H / 400; k++) ctx.fillRect(r.range(0, W), r.range(0, H), 2, 2);
  if (r.next() < 0.6) {
    ctx.fillStyle = '#2b5fa8'; const y = r.range(0, H * 0.4);
    ctx.fillRect(0, y, W, r.range(H * 0.3, H * 0.6));
    crosshatch(ctx, 0, y, W, H * 0.5, { density: 1, gap: 7, color: 'rgba(10,20,50,0.5)' });
  }
  ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = 0; x <= W; x += 22) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 10; y <= H; y += 24) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath();
  for (let y = 10; y < H - 24; y += 24) for (let x = 0; x < W - 22; x += 22) { ctx.moveTo(x, y); ctx.lineTo(x + 22, y + 24); }
  ctx.stroke();
  // 工事中の黄黒
  const by = H - 14;
  for (let x = -14; x < W; x += 14) { ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 7, by); ctx.lineTo(x + 14, by); ctx.lineTo(x + 7, H); ctx.fill(); }
  ctx.fillStyle = INK; ctx.fillRect(0, by - 1, W, 1.5);
}
