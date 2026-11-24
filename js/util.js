// 小さな道具：タップ判定・排他実行・動画の停止・掲示板の描き直し判定

// 指を置いてから離すまでの距離で、タップかドラッグかを決める
export function createTapGuard(limit = 8) {
  let start = null, moved = 0;
  return {
    down(x, y) { start = [x, y]; moved = 0; },
    move(x, y) { if (start) moved = Math.max(moved, Math.hypot(x - start[0], y - start[1])); },
    up(x, y) { if (!start) return false; this.move(x, y); const tap = moved <= limit; start = null; return tap; },
    cancel() { start = null; moved = 0; },
    get dragging() { return !!start && moved > limit; },
  };
}

// state.busy の間は走らせず、失敗しても必ず busy を戻す
export async function runExclusive(state, fn) {
  if (state.busy) return;
  state.busy = true;
  try { return await fn(); } finally { state.busy = false; }
}

// 映している動画以外は止める
export function syncVideos(videos, activeSrc) {
  for (const [src, v] of videos) if (src !== activeSrc && !v.paused) v.pause();
}

// ドットが1つ分動いたか、中身が変わった時だけ描き直す（動画は毎回）
export function shouldRedraw(state, key, scroll, media) {
  const step = Math.floor(scroll);
  if (media === 'video' || state.key !== key || state.step !== step) { state.key = key; state.step = step; return true; }
  return false;
}
