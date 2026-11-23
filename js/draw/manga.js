// 漫画の画材：墨線・網点トーン・カケアミ
export const INK = '#140b18';

export function inkRect(ctx, x, y, w, h, { weight = 2 } = {}) {
  ctx.lineWidth = weight;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x, y, w, h);
}

// 手描きっぽく揺れる墨線。pts: [[x,y],...]
export function inkLine(ctx, pts, { weight = 2, jitter = 0.6, r } = {}) {
  ctx.lineWidth = weight;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = r ? (r.next() - 0.5) * jitter : 0, jy = r ? (r.next() - 0.5) * jitter : 0;
    i ? ctx.lineTo(x + jx, y + jy) : ctx.moveTo(x + jx, y + jy);
  });
  ctx.stroke();
}

// 網点。濃さは dot（半径）と spacing で
export function screentone(ctx, x, y, w, h, { dot = 1.1, spacing = 4, color = 'rgba(20,11,24,0.55)' } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let j = 0, yy = y; yy < y + h + spacing; yy += spacing, j++) {
    for (let xx = x + (j % 2 ? spacing / 2 : 0); xx < x + w + spacing; xx += spacing) {
      ctx.moveTo(xx + dot, yy);
      ctx.arc(xx, yy, dot, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

// カケアミ（斜線の重ね）。density 1..3
export function crosshatch(ctx, x, y, w, h, { density = 1, angle = 0.8, gap = 5, color = 'rgba(20,11,24,0.5)', weight = 0.8 } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  const L = w + h;
  for (let k = 0; k < density; k++) {
    const a = angle + k * 1.1;
    const dx = Math.cos(a), dy = Math.sin(a);
    ctx.beginPath();
    for (let s = -L; s < L; s += gap) {
      const cx = x + w / 2 - dy * s, cy = y + h / 2 + dx * s;
      ctx.moveTo(cx - dx * L, cy - dy * L);
      ctx.lineTo(cx + dx * L, cy + dy * L);
    }
    ctx.stroke();
  }
  ctx.restore();
}
