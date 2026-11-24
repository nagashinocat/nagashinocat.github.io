// 起動と配線
import { loadWorks, worksByDistrict } from './works.js';
import { renderList, DISTRICT_LABEL } from './list.js';
import { createBillboard, drawDots } from './billboard.js';
import { createSelection } from './selection.js';
import { syncVideos, shouldRedraw } from './util.js';

const $ = id => document.getElementById(id);

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

function openList(solo = false) {
  $('list').hidden = false;
  $('list').classList.toggle('solo', solo);
  if (!solo) $('close-list').focus();
}
function closeList() { $('list').hidden = true; }

async function start() {
  let works = [];
  try { works = await loadWorks('data/works.json'); } catch (e) { console.warn('作品データを読めませんでした', e); }
  renderList($('list-body'), works);
  $('close-list').addEventListener('click', closeList);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('list').hidden && !$('list').classList.contains('solo')) closeList(); });

  if (!hasWebGL()) return fallback();
  try { await startCity(works); }
  catch (e) { console.warn('3Dの街を開けませんでした', e); fallback(); }
}

function fallback() {
  try { window.__hub?.world?.dispose(); } catch { /* もう止まっている */ }
  $('loading')?.remove();
  $('app')?.remove();
  openList(true);
}

async function startCity(works) {
  const { createWorld } = await import('./scene/world.js');
  // 看板の文字は一度だけ描くので、先にフォントを待つ（最大2.5秒）
  try { await Promise.race([Promise.all(['400 40px "Dela Gothic One"', '400 40px "DotGothic16"', '400 40px "Righteous"'].map(f => document.fonts.load(f))), new Promise(ok => setTimeout(ok, 2500))]); } catch { /* 代わりの字で描く */ }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const strong = (navigator.hardwareConcurrency || 4) >= 6 && !coarse;
  const manual = new URLSearchParams(location.search).has('manual');
  // タワーの画面（横長 16:9）
  const screen = document.createElement('canvas'); screen.width = 640; screen.height = 360;
  const world = await createWorld($('app'), { works, screenCanvas: screen, tier: strong ? 'high' : 'low', reducedMotion, manual });
  const billboard = createBillboard(works);
  const selection = createSelection(billboard, { navigate: url => { location.href = url; } });
  const hub = { world, billboard, selection, works, screen, ready: false, selected: null, videoReady: false };
  window.__hub = hub;
  // 訪問者を数えて、路地のカウンターに出す
  import('./counter.js').then(m => m.visit()).then(n => world.setVisitors(n)).catch(() => {});
  if (manual) { window.__frame = t => world.renderAt(t); document.title = 'ready'; } // 撮影・確認用

  // 選ばれた看板は明るく脈打つ
  const faceBase = new WeakMap();
  let scroll = 0, lastText = '', drawAcc = 0;
  const redraw = {};
  world.onFrame((dt, t) => {
    selection.locked = !world.inAlley;
    billboard.tick(dt);
    const st = billboard.state();
    hub.selected = st.mode === 'ticker' ? null : st.workId;
    for (const h of world.stands) { if (!faceBase.has(h)) faceBase.set(h, h.userData.faceMat.color.clone()); const on = h.userData.workId === hub.selected; h.userData.faceMat.color.copy(faceBase.get(h)).multiplyScalar(on ? 1.35 + 0.25 * Math.sin(t * 6) : 1); }
    if (st.text !== lastText) { lastText = st.text; scroll = 0; updatePlayButton(st); }
    scroll += dt * 26;
    syncVideos(videos, st.mode === 'cm' ? st.video : null);
    const color = st.mode === 'wip' ? '#ffd400' : '#ff9a1f';
    const media = st.mode === 'cm' ? mediaFor(st) : null;
    if (media) { drawAcc += dt; if (drawAcc < 1 / 30) return; drawAcc = 0; }
    else if (!shouldRedraw(redraw, st.mode + st.text, scroll * 0.45, null)) return;
    const band = screen.height * 0.2;
    const dots = (target, h) => drawDots(target, st.text, scroll * 0.45, { dir: 'h', cols: Math.round(target.width / 6), rows: Math.round(h / 6), color, bg: '#120808' });
    if (media) {
      // CM：動画か画面写真を映し、下にドット文字の帯
      const ctx = screen.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, screen.width, screen.height);
      const mw = media.videoWidth || media.naturalWidth, mh = media.videoHeight || media.naturalHeight;
      const k = Math.max(screen.width / mw, (screen.height - band) / mh) * (media.tagName === 'IMG' ? 1 + 0.08 * Math.sin(t * 0.4) : 1);
      const pan = media.tagName === 'IMG' ? Math.sin(t * 0.25) * 0.5 + 0.5 : 0.5;
      ctx.drawImage(media, (screen.width - mw * k) * pan, (screen.height - band - mh * k) / 2, mw * k, mh * k);
      const strip = stripCanvas(screen.width, band);
      dots(strip, band);
      ctx.drawImage(strip, 0, screen.height - band);
    } else dots(screen, screen.height);
    world.screenTex.needsUpdate = true;
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

  // 触れる：看板（1回目で予告・2回目で遊ぶ）、タワーの画面（遊ぶ）、猫、クジラ
  const el = world.renderer.domElement;
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !world.inAlley) return;
    const hit = world.pick(e.clientX, e.clientY);
    el.style.cursor = hit ? 'pointer' : 'grab';
    if (hit?.workId) selection.hover(hit.workId);
  });
  el.addEventListener('pointerup', e => {
    if (!world.isTap(e.clientX, e.clientY)) return; // ドラッグは選択にしない
    if (!world.inAlley || world.busy) { skipIntro(); return; } // 本が開いている・めくっている途中のタップは早送り
    const hit = world.pick(e.clientX, e.clientY);
    if (hit?.cat) { world.cat.tap(world.time); return; }
    if (hit?.whale) { world.whale.tap(world.time); return; }
    selection.tap(hit);
  });

  const hint = $('hint'), play = $('play'), skip = $('skip');
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
  function skipIntro() { world.skip(); }
  skip.addEventListener('click', skipIntro);

  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 700);
  if (!world.inAlley) skip.hidden = false;
  await new Promise(ok => { const w = () => world.inAlley ? ok() : setTimeout(w, 100); w(); });
  skip.hidden = true;
  // ページをめくる：路地（ゲーム）⇔ 第3工場（道具）⇔ 空き地（工事中）
  const turnNav = $('turn');
  const showPage = k => { $('district-name').textContent = DISTRICT_LABEL[k][0]; $('district-sub').textContent = DISTRICT_LABEL[k][1]; $('prev').disabled = k === world.PAGES[0]; $('next').disabled = k === world.PAGES.at(-1); };
  async function turn(dir) {
    const i = world.PAGES.indexOf(world.page) + dir, k = world.PAGES[i];
    if (!k || world.busy) return;
    billboard.clear(); selection.hover(null);
    $('prev').disabled = $('next').disabled = true;
    hint.hidden = true; skip.hidden = false; // めくりの途中も飛ばせる
    try { await world.turnTo(k); } catch (e) { console.warn(e); }
    skip.hidden = true; hint.hidden = false;
    showPage(world.page);
  }
  $('prev').addEventListener('click', () => turn(-1));
  $('next').addEventListener('click', () => turn(1));
  showPage(world.page); turnNav.hidden = false;
  hint.textContent = coarse ? '看板をタップ → もう一度タップであそぶ' : '看板にカーソル → クリックであそぶ';
  hint.hidden = false;
  hub.ready = true;
}

start();
