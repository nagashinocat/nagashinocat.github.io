// 電光掲示板：状態機械とドット文字描画
import { isPlayable } from './works.js';

const ITEM_SEC = 4, BACK_SEC = 0.8;

export function createBillboard(works) {
  const order = [...works.filter(w => w.isNew), ...works.filter(w => !w.isNew)];
  const byId = new Map(works.map(w => [w.id, w]));
  const failed = new Set();
  let idx = 0, t = 0, current = null, backIn = -1;

  const tickerText = () => {
    const w = order[idx];
    return w ? (w.isNew ? `NEW ＊ ${w.title}` : w.title) : 'nagashinocat の開発置き場';
  };
  const show = w => {
    if (!isPlayable(w)) return { mode: 'wip', workId: w.id, text: `工事中 ＊ ${w.title}` };
    const video = w.cm && !failed.has(w.id) ? w.cm : null;
    return { mode: 'cm', workId: w.id, video, text: w.blurb ? `${w.title} ＊ ${w.blurb}` : w.title };
  };

  return {
    state: () => current ? show(current) : { mode: 'ticker', text: tickerText() },
    preview(id) {
      const w = byId.get(id);
      if (!w) return;
      current = w; backIn = -1;
    },
    clear() { if (current) backIn = BACK_SEC; },
    videoFailed(id) { failed.add(id); },
    tick(dt) {
      if (current) {
        if (backIn >= 0) { backIn -= dt; if (backIn <= 0) { current = null; backIn = -1; t = 0; } }
        return;
      }
      if (!order.length) return;
      t += dt;
      while (t >= ITEM_SEC) { t -= ITEM_SEC; idx = (idx + 1) % order.length; }
    },
    playUrl: () => current && isPlayable(current) ? current.url : null,
  };
}

// ドット文字：縦長画面に文字を縦に並べ、上へ流す。canvas は表示用、cols×rows がドット数
let glyph = null;
export function drawDots(canvas, text, scrollPx, opts = {}) {
  if (opts.dir === 'h') return drawDotsH(canvas, text, scrollPx, opts);
  const { cols = 18, rows = 64, color = '#ff9a1f', bg = '#120808' } = opts;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  if (!glyph) { glyph = document.createElement('canvas'); }
  const cell = cols; // 1文字 = cols×cols ドット
  const chars = [...text, '　', '　'];
  const fullRows = chars.length * cell;
  glyph.width = cols; glyph.height = Math.max(rows, fullRows);
  const g = glyph.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, glyph.width, glyph.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${cell - 2}px "DotGothic16","Hiragino Kaku Gothic StdN",sans-serif`;
  chars.forEach((ch, i) => g.fillText(ch === 'ー' ? '｜' : ch, cols / 2, i * cell + cell / 2 + 1));
  const data = g.getImageData(0, 0, glyph.width, glyph.height).data;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const dx = W / cols, dy = H / rows, rad = Math.min(dx, dy) * 0.36;
  const off = fullRows > rows ? Math.floor(scrollPx) % fullRows : 0;
  for (let y = 0; y < rows; y++) {
    const sy = (y + off) % Math.max(rows, fullRows);
    for (let x = 0; x < cols; x++) {
      const on = data[(sy * cols + x) * 4 + 3] > 110;
      ctx.fillStyle = on ? color : 'rgba(255,154,31,0.08)';
      ctx.beginPath(); ctx.arc((x + 0.5) * dx, (y + 0.5) * dy, on ? rad * 1.1 : rad, 0, 7); ctx.fill();
    }
  }
}

// 横に流すドット文字（正方形や横長の画面用）。2段：上=題、下=一言
let glyphH = null;
export function drawDotsH(canvas, text, scrollPx, { cols = 64, rows = 40, color = '#ff9a1f', bg = '#120808' } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  if (!glyphH) glyphH = document.createElement('canvas');
  const cell = Math.floor(rows * 0.7);
  const g = glyphH.getContext('2d', { willReadFrequently: true });
  g.font = `bold ${cell}px "DotGothic16","Hiragino Kaku Gothic StdN",sans-serif`;
  const tw = Math.ceil(g.measureText(text + '　　').width) + cols;
  glyphH.width = Math.max(cols, tw); glyphH.height = rows;
  g.font = `bold ${cell}px "DotGothic16","Hiragino Kaku Gothic StdN",sans-serif`;
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.fillText(text, cols, rows / 2 + 1);
  const data = g.getImageData(0, 0, glyphH.width, rows).data;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const dx = W / cols, dy = H / rows, rad = Math.min(dx, dy) * 0.38;
  const off = Math.floor(scrollPx) % glyphH.width;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const sx = (x + off) % glyphH.width;
    const on = data[(y * glyphH.width + sx) * 4 + 3] > 110;
    ctx.fillStyle = on ? color : 'rgba(255,154,31,0.08)';
    ctx.beginPath(); ctx.arc((x + 0.5) * dx, (y + 0.5) * dy, on ? rad * 1.1 : rad, 0, 7); ctx.fill();
  }
}
