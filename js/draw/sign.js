// 看板テクスチャと文字の収め方
import { INK, inkRect } from './manga.js';

const chars = s => [...s];

function bestSplit(text) {
  const c = chars(text), mid = c.length / 2;
  let best = Math.round(mid), bestScore = Infinity;
  for (let i = 1; i < c.length; i++) {
    const punct = '、。 ,・'.includes(c[i - 1]) ? -2.5 : 0;
    const score = Math.abs(i - mid) + punct;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return [c.slice(0, best).join(''), c.slice(best).join('')];
}

// measure(s, px) -> 幅。1行で十分大きければ1行、そうでなければ2行。入らなければ最小サイズで省略
export function fitText(measure, text, boxW, maxPx, minPx) {
  const fit1 = lines => {
    let px = maxPx;
    while (px > minPx && lines.some(l => measure(l, px) > boxW)) px--;
    return px;
  };
  const one = fit1([text]);
  const two = bestSplit(text);
  const p2 = fit1(two);
  if (measure(text, one) <= boxW && (one >= maxPx * 0.6 || p2 < one * 1.3)) return { px: one, lines: [text] };
  if (p2 >= one && two.every(l => measure(l, p2) <= boxW)) return { px: p2, lines: two };
  if (measure(text, one) <= boxW) return { px: one, lines: [text] };
  // 省略
  const lines = two.map(l => l);
  let last = chars(lines[1]);
  while (last.length && measure(last.join('') + '…', minPx) > boxW) last.pop();
  let first = chars(lines[0]);
  while (first.length && measure(first.join(''), minPx) > boxW) first.pop();
  return { px: minPx, lines: [first.join(''), last.join('') + '…'] };
}

const FONT = '"Dela Gothic One","Hiragino Kaku Gothic StdN","Noto Sans JP",sans-serif';

export function drawSign(canvas, { text, color, isWork, vertical }) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = Math.min(W, H) * 0.12;
  // 地：暗い箱か、白い光る箱（飾りの一部）
  const lightBox = !isWork && text.length <= 2 && (text.charCodeAt(0) % 3 === 0);
  ctx.fillStyle = lightBox ? '#fff6e6' : '#170a1c';
  ctx.fillRect(0, 0, W, H);
  if (!lightBox) {
    // 内側にネオン管の枠
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = pad * 0.9;
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, pad * 0.18);
    ctx.strokeRect(pad * 0.45, pad * 0.45, W - pad * 0.9, H - pad * 0.9);
    ctx.restore();
  }
  const boxW = (vertical ? H : W) - pad * 2 - (isWork ? Math.min(W, H) * 0.3 : 0);
  const boxCross = (vertical ? W : H) - pad * 2;
  const measure = vertical ? (s, px) => chars(s).length * px * 1.02 : (s, px) => { ctx.font = `${px}px ${FONT}`; return ctx.measureText(s).width; };
  const maxPx = Math.floor(boxCross * 0.92);
  const minPx = Math.max(8, Math.floor(maxPx * 0.22));
  let f = fitText(measure, text, boxW, maxPx, minPx);
  if (f.lines.length === 2) {
    // 2行にすると縦の余裕で小さくなる場合は1行のほうが大きく見える
    const cap2 = Math.min(f.px, Math.floor(boxCross / 2.24));
    let p1 = maxPx; while (p1 > 1 && measure(text, p1) > boxW) p1--;
    if (p1 >= cap2 && p1 >= minPx) f = { px: p1, lines: [text] };
  }
  const px = Math.min(f.px, Math.floor(boxCross / (f.lines.length * 1.12)));
  ctx.font = `${px}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const paint = (fn) => {
    if (!lightBox) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = px * 0.5; ctx.fillStyle = color; fn(); ctx.restore(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.55; fn(); ctx.globalAlpha = 1; }
    else { ctx.fillStyle = color === '#7cff6b' ? '#1d7a2a' : '#c4142c'; fn(); }
  };
  const n = f.lines.length;
  if (!vertical) {
    const cx = (W - (isWork ? Math.min(W, H) * 0.3 : 0)) / 2;
    f.lines.forEach((l, i) => paint(() => ctx.fillText(l, cx, H / 2 + (i - (n - 1) / 2) * px * 1.1)));
  } else {
    // 縦書き：右の列から
    const cy0 = pad + px * 0.55;
    f.lines.forEach((l, i) => {
      const x = W / 2 - (i - (n - 1) / 2) * px * 1.1;
      chars(l).forEach((ch, j) => { const p = '、。'.includes(ch); paint(() => ctx.fillText(ch === 'ー' ? '｜' : ch, x + (p ? px * 0.55 : 0), cy0 + j * px * 1.02 - (p ? px * 0.55 : 0))); });
    });
  }
  if (isWork) {
    const s = Math.min(W, H) * 0.26;
    ctx.font = `${s}px sans-serif`;
    paint(() => ctx.fillText('▶', vertical ? W / 2 : W - pad - s * 0.45, vertical ? H - pad - s * 0.5 : H / 2));
  }
  inkRect(ctx, 1, 1, W - 2, H - 2, { weight: Math.max(2, Math.min(W, H) * 0.03) });
}
