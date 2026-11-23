// 作品いちらん（近道。WebGL が使えない端末ではこれが本体）
import { worksByDistrict, isPlayable } from './works.js';

export const DISTRICT_LABEL = {
  games: ['繁華街', 'ゲーム'],
  tools: ['工場街', '道具'],
  wip: ['空き地', '工事中の作品'],
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderList(container, works) {
  const by = worksByDistrict(works);
  container.innerHTML = Object.entries(DISTRICT_LABEL).map(([k, [name, sub]]) => by[k].length ? `
    <h4>${name}<small>${sub}</small></h4>
    <div class="cards">${by[k].map(w => `
      <article class="card" style="--c:${esc(w.color || '#ff4fa3')}">
        ${w.isNew ? '<span class="new">NEW</span>' : ''}
        <h3>${esc(w.title)}</h3>
        ${w.blurb ? `<p>${esc(w.blurb)}</p>` : ''}
        ${isPlayable(w) ? `<a href="${esc(w.url)}">あそぶ ▶</a>` : '<span class="soon">工事中</span>'}
      </article>`).join('')}
    </div>` : '').join('');
}
