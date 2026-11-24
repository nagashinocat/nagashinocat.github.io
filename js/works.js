// 作品データの読込・検証・振り分け
export const DISTRICTS = ['games', 'tools', 'wip'];

const isStr = v => typeof v === 'string';

export function validateWorks(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const w of raw) {
    const good = w && isStr(w.id) && w.id && isStr(w.title) && w.title &&
      DISTRICTS.includes(w.district) && isStr(w.url) && isStr(w.blurb ?? '');
    if (!good || seen.has(w.id)) {
      console.warn('works.json: 読み飛ばした項目', w);
      continue;
    }
    seen.add(w.id);
    out.push({ blurb: '', ...w });
  }
  return out;
}

export function worksByDistrict(works) {
  const d = { games: [], tools: [], wip: [] };
  for (const w of works) d[w.district].push(w);
  return d;
}

export const isPlayable = w => isStr(w?.url) && w.url.length > 0;

export async function loadWorks(url = 'data/works.json') {
  const res = await fetch(url);
  return validateWorks(await res.json());
}
