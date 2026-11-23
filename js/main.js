// 起動と配線
import { loadWorks, worksByDistrict } from './works.js';
import { renderList, DISTRICT_LABEL } from './list.js';
import { createBillboard, drawDots } from './billboard.js';
import { createSelection } from './selection.js';
import { planDistrict } from './layout.js';

const $ = id => document.getElementById(id);
const KINDS = ['games', 'tools', 'wip'];
const SEED = 11;

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

function openList(solo = false) {
  $('list').hidden = false;
  $('list').classList.toggle('solo', solo);
  if (!solo) $('close-list').focus();
}
function closeList() { $('list').hidden = true; $('open-list').focus(); }

async function start() {
  let works = [];
  try { works = await loadWorks('data/works.json'); } catch (e) { console.warn('作品データを読めませんでした', e); }
  renderList($('list-body'), works);
  $('open-list').addEventListener('click', () => openList());
  $('close-list').addEventListener('click', closeList);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('list').hidden && !$('list').classList.contains('solo')) closeList(); });

  if (!hasWebGL()) return fallback();
  try { await startCity(works); }
  catch (e) { console.warn('3Dの街を開けませんでした', e); fallback(); }
}

function fallback() {
  $('loading').remove();
  $('app').remove();
  $('open-list').hidden = true;
  openList(true);
}

async function startCity(works) {
  const THREE = await import('three');
  const { createStage } = await import('./scene/stage.js');
  const { createBook } = await import('./scene/book.js');
  const { animateDistrict } = await import('./scene/district.js');

  const by = worksByDistrict(works);
  const plans = Object.fromEntries(KINDS.map(k => [k, planDistrict(k, by[k], SEED)]));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = createStage($('app'));
  const coarse = matchMedia('(pointer: coarse)').matches;
  const strong = (navigator.hardwareConcurrency || 4) >= 6 && !coarse;
  stage.setTier(strong ? 'high' : 'low');

  // 掲示板の画面
  const bc = document.createElement('canvas'); bc.width = 180; bc.height = 640;
  const screenTex = new THREE.CanvasTexture(bc); screenTex.colorSpace = THREE.SRGBColorSpace;
  const bw = document.createElement('canvas'); bw.width = 320; bw.height = 320;
  const wideTex = new THREE.CanvasTexture(bw); wideTex.colorSpace = THREE.SRGBColorSpace;
  const { KOWLOON } = await import('./scene/picture.js');
  const book = createBook(stage, { works, plans, billboardTex: screenTex, billboardWideTex: wideTex, pictures: { games: KOWLOON }, reducedMotion });
  const billboard = createBillboard(works);
  const selection = createSelection(billboard, { navigate: url => { location.href = url; } });
  const hub = { stage, book, billboard, selection, plans, screenTex, wideTex, ready: false, selected: null };
  window.__hub = hub;

  // 品質：最初の60フレームが重ければ下げる
  let frames = 0, acc = 0;
  let scroll = 0, lastText = '';
  stage.onFrame(dt => {
    if (frames < 60) { frames++; acc += dt; if (frames === 60 && acc / 60 > 1 / 38 && stage.tier === 'high') stage.setTier('low'); }
    selection.locked = book.busy;
    billboard.tick(dt);
    const st = billboard.state();
    hub.selected = st.mode === 'ticker' ? null : st.workId;
    if (st.text !== lastText) { lastText = st.text; scroll = 0; updatePlayButton(st); }
    scroll += dt * 26;
    if (!hub.videoActive) {
      const color = st.mode === 'wip' ? '#ffd400' : '#ff9a1f';
      if (book.current === 'games') { drawDots(bw, st.text, scroll * 1.6, { dir: 'h', cols: 48, rows: 48, color }); wideTex.needsUpdate = true; }
      else { drawDots(bc, st.text, scroll, { color }); screenTex.needsUpdate = true; }
    }
    if (book.district) animateDistrict(book.district, book.time, dt, hub.selected);
  });

  // 看板の操作
  const el = stage.renderer.domElement;
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || book.busy) return;
    const hit = stage.pick(e.clientX, e.clientY);
    el.style.cursor = hit ? 'pointer' : 'grab';
    if (hit?.workId) selection.hover(hit.workId);
  });
  el.addEventListener('pointerup', e => {
    if (stage.lastDragDistance > 8) return; // ドラッグは選択にしない
    selection.tap(stage.pick(e.clientX, e.clientY));
  });

  const hint = $('hint'), play = $('play');
  function updatePlayButton(st) {
    if (st.mode === 'ticker') { play.hidden = true; hint.hidden = !hub.ready; return; }
    hint.hidden = true;
    play.hidden = false;
    const w = works.find(x => x.id === st.workId);
    play.classList.toggle('wip', st.mode === 'wip');
    play.textContent = st.mode === 'wip' ? `工事中：${w.title}` : `▶ あそぶ：${w.title}`;
    play.disabled = st.mode === 'wip';
  }
  play.addEventListener('click', () => selection.tap({ billboard: true }));

  // ページめくり
  const setLabel = k => {
    $('district-name').textContent = DISTRICT_LABEL[k][0];
    $('district-sub').textContent = DISTRICT_LABEL[k][1];
    $('prev').disabled = k === KINDS[0];
    $('next').disabled = k === KINDS.at(-1);
  };
  const turn = d => {
    const i = KINDS.indexOf(book.current) + d;
    if (i < 0 || i >= KINDS.length || book.busy) return;
    selection.tap(null);
    book.turnTo(KINDS[i]);
  };
  book.onChange = setLabel;
  $('prev').addEventListener('click', () => turn(-1));
  $('next').addEventListener('click', () => turn(1));
  addEventListener('keydown', e => { if (!$('list').hidden) return; if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1); });
  setLabel('games');

  await book.open();
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 700);
  $('turn').hidden = false;
  hint.textContent = coarse ? '看板をタップ → もう一度タップであそぶ' : '看板にカーソル → クリックであそぶ';
  hint.hidden = false;
  hub.ready = true;
}

start();
