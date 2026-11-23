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

  // 掲示板の画面（ページごとに形が違う）
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, tex: t }; };
  const screens = { games: mk(320, 320), tools: mk(480, 300), wip: mk(480, 270) };
  const book = createBook(stage, { works, plans, screens, reducedMotion });
  const billboard = createBillboard(works);
  const selection = createSelection(billboard, { navigate: url => { location.href = url; } });
  const hub = { stage, book, billboard, selection, plans, works, screens, ready: false, selected: null, videoReady: false };
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
    const color = st.mode === 'wip' ? '#ffd400' : book.current === 'tools' ? '#7fe6ff' : '#ff9a1f';
    const { c: cv, tex: ct } = screens[book.current];
    const media = st.mode === 'cm' ? mediaFor(st) : null;
    const band = cv.height * 0.22;
    const dots = (target, h) => drawDots(target, st.text, scroll * 1.6, { dir: 'h', cols: Math.round(target.width / 6), rows: Math.round(h / 6), color, bg: book.current === 'tools' ? '#04141c' : '#120808' });
    if (media) {
      // CM：動画か画面写真を映し、下にドット文字の帯
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      const mw = media.videoWidth || media.naturalWidth, mh = media.videoHeight || media.naturalHeight;
      const k = Math.max(cv.width / mw, (cv.height - band) / mh) * (media.tagName === 'IMG' ? 1 + 0.08 * Math.sin(book.time * 0.4) : 1);
      const pan = media.tagName === 'IMG' ? Math.sin(book.time * 0.25) * 0.5 + 0.5 : 0.5;
      ctx.drawImage(media, (cv.width - mw * k) * pan, (cv.height - band - mh * k) / 2, mw * k, mh * k);
      const strip = stripCanvas(cv.width, band);
      dots(strip, band);
      ctx.drawImage(strip, 0, cv.height - band);
    } else dots(cv, cv.height);
    ct.needsUpdate = true;
    if (book.district) animateDistrict(book.district, book.time, dt, hub.selected);
  });

  // CM：動画は選ばれた時だけ読む。失敗したら文字表示へ
  const videos = new Map(), shots = new Map(), strips = {};
  const stripCanvas = (w, h) => { const key = w + 'x' + h; if (!strips[key]) { const c = document.createElement('canvas'); c.width = w; c.height = Math.max(8, Math.round(h)); strips[key] = c; } return strips[key]; };
  function mediaFor(st) {
    if (st.video) {
      let v = videos.get(st.video);
      if (!v) {
        v = document.createElement('video');
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
        v.setAttribute('playsinline', '');
        v.addEventListener('error', () => billboard.videoFailed(st.workId));
        v.src = st.video;
        v.play().catch(() => billboard.videoFailed(st.workId));
        videos.set(st.video, v);
      }
      for (const [src, o] of videos) if (src !== st.video && !o.paused) o.pause();
      if (v.paused && !v.error) v.play().catch(() => {});
      if (v.readyState >= 2) { hub.videoReady = true; return v; }
    }
    if (st.shot) {
      let im = shots.get(st.shot);
      if (!im) { im = new Image(); im.src = st.shot; shots.set(st.shot, im); }
      if (im.complete && im.naturalWidth) return im;
    }
    return null;
  }
  for (const v of videos.values()) v.pause();

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

  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 700);
  await book.open();
  $('turn').hidden = false;
  hint.textContent = coarse ? '看板をタップ → もう一度タップであそぶ' : '看板にカーソル → クリックであそぶ';
  hint.hidden = false;
  hub.ready = true;
}

start();
