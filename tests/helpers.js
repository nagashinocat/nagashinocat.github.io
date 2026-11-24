// 試験用: 呼び出しを記録する偽 canvas
const NOOP = () => {};
export function recCanvas(width = 256, height = 512) {
  const log = [];
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return s => ({ width: [...s].length * parseFloat(t.font || '10px') });
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return (...a) => ({ addColorStop: NOOP, _g: a });
      if (k in t) return t[k];
      return (...args) => log.push([k, ...args.map(a => typeof a === 'number' ? +a.toFixed(3) : a)]);
    },
    set(t, k, v) { t[k] = v; log.push(['set', k, v]); return true; },
  });
  return { width, height, getContext: () => ctx, log };
}
