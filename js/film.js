// 録画した場面（本が開く・ページをめくる）を、街の上に重ねて再生する
// 終わったら（または飛ばしたら）ふわっと消えて、下の本物の街が見える
const ROOT = new URL('../', import.meta.url).href;
export const orientation = () => (innerWidth < innerHeight ? 'port' : 'land');
export const filmUrl = (name, o = orientation()) => `${ROOT}assets/film/${name}-${o}.mp4`;

export function createFilm(el) {
  let ending = null;
  el.muted = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = 'auto';
  const show = on => { el.classList.toggle('on', on); };
  return {
    get playing() { return !!ending; },
    /** 再生して、終わるか飛ばされるまで待つ。再生できなければ false を返す */
    async play(url, { onStart } = {}) {
      el.src = url;
      try {
        await new Promise((ok, ng) => { el.oncanplay = ok; el.onerror = ng; setTimeout(() => ng(new Error('timeout')), 8000); el.load(); });
        el.currentTime = 0;
        await el.play();
      } catch { show(false); el.removeAttribute('src'); return false; }
      show(true); onStart && onStart();
      await new Promise(ok => { ending = ok; el.onended = ok; });
      ending = null;
      return true;
    },
    skip() { if (ending) { el.pause(); const f = ending; ending = null; f(); } },
    async hide(ms = 450) { show(false); await new Promise(ok => setTimeout(ok, ms)); el.pause(); },
    prefetch(url) { const l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'video'; l.href = url; document.head.append(l); },
  };
}
