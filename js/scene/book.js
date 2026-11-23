// 本・空・机・ページめくり・飛び出し
import * as THREE from 'three';
import { popupAngle, foldAngle } from './popup.js';
import { buildDistrict, groundTexture } from './district.js';
import { buildFactory } from './factory.js';
import { buildLot } from './lot.js';
import { INK, screentone, inkLine } from '../draw/manga.js';
import { rng } from '../rng.js';
import { runExclusive } from '../util.js';

export const KINDS = ['games', 'tools', 'wip'];
const H = Math.PI / 2;
const PW = 1.08, PD = 0.78; // 片ページの幅、奥行きの半分
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const wait = s => new Promise(ok => setTimeout(ok, s * 1000));

function skyTexture() {
  const r = rng(77);
  const c = canvas(1024, 512), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#120a3a'); gr.addColorStop(0.35, '#3b1e63'); gr.addColorStop(0.62, '#a8406a'); gr.addColorStop(0.82, '#f0763a'); gr.addColorStop(1, '#ffb15a');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  // 漫画の雲：先に太い墨で全部の丸を描き、上から色で塗ると外側の輪郭だけ残る
  for (let i = 0; i < 8; i++) {
    const cx = r.range(0, 1024), cy = r.range(70, 320), n = r.int(5, 9), s = r.range(14, 30);
    const puffs = Array.from({ length: n }, (_, k) => [cx + (k - n / 2) * s * 1.1 + r.range(-4, 4), cy - Math.sin((k / (n - 1)) * Math.PI) * s * r.range(0.6, 1.1), s * r.range(0.7, 1.1)]);
    puffs.push([cx - n * s * 0.45, cy + s * 0.15, s * 0.6], [cx + n * s * 0.45, cy + s * 0.15, s * 0.6]);
    g.fillStyle = INK; for (const [x, y, rr] of puffs) { g.beginPath(); g.arc(x, y, rr + 2.5, 0, 7); g.fill(); }
    g.fillRect(cx - n * s * 0.55, cy, n * s * 1.1, s * 0.5 + 2.5);
    const col = cy < 190 ? '#7a3f8a' : '#f08a5a';
    g.fillStyle = col; for (const [x, y, rr] of puffs) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    g.fillRect(cx - n * s * 0.55 + 2.5, cy, n * s * 1.1 - 5, s * 0.5);
    g.fillStyle = cy < 190 ? 'rgba(255,170,210,0.35)' : 'rgba(255,225,170,0.6)';
    for (const [x, y, rr] of puffs) { g.beginPath(); g.arc(x - rr * 0.25, y - rr * 0.3, rr * 0.45, 0, 7); g.fill(); }
    screentone(g, cx - n * s * 0.55, cy, n * s * 1.1, s * 0.5, { dot: 0.9, spacing: 3, color: 'rgba(40,10,40,0.4)' });
  }
  screentone(g, 0, 0, 1024, 200, { dot: 1, spacing: 5, color: 'rgba(10,5,30,0.35)' });
  // 星
  for (let i = 0; i < 60; i++) { g.fillStyle = '#fff'; g.fillRect(r.range(0, 1024), r.range(0, 150), 1.5, 1.5); }
  return tex(c);
}

function skylineTexture() {
  const r = rng(9);
  const c = canvas(2048, 512), g = c.getContext('2d');
  let x = 0;
  while (x < 2048) {
    const w = r.range(18, 60), h = r.range(80, 420);
    g.fillStyle = r.pick(['#2a1440', '#331a4a', '#24123a']);
    g.fillRect(x, 512 - h, w, h);
    for (let y = 512 - h + 6; y < 506; y += 8) for (let xx = x + 3; xx < x + w - 3; xx += 6) if (r.next() < 0.35) { g.fillStyle = r.pick(['#ffd27a', '#ffc861', '#fff1c9']); g.fillRect(xx, y, 3, 4); }
    if (r.next() < 0.3) { g.fillStyle = r.pick(['#ff4fa3', '#4fd8ff']); g.fillRect(x, 512 - h, w, 2); }
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, 512 - h, w, h);
    x += w + r.range(-6, 4);
  }
  return tex(c);
}

function deskTexture() {
  const r = rng(5);
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#2a1712'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { const y = r.range(0, 512); inkLine(g, [[0, y], [170, y + r.range(-6, 6)], [340, y + r.range(-6, 6)], [512, y + r.range(-6, 6)]], { weight: r.range(0.5, 1.6), jitter: 3, r }); }
  g.globalAlpha = 0.4; screentone(g, 0, 0, 512, 512, { dot: 1, spacing: 5 }); g.globalAlpha = 1;
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  return t;
}

function coverTexture() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#5a1424'; g.fillRect(0, 0, 256, 256);
  screentone(g, 0, 0, 256, 256, { dot: 1, spacing: 3, color: 'rgba(0,0,0,0.3)' });
  g.strokeStyle = '#d6a64a'; g.lineWidth = 4; g.strokeRect(14, 14, 228, 228);
  return tex(c);
}

function halfPlane(map, side) {
  const g = new THREE.PlaneGeometry(PW - 0.06, PD * 2 - 0.06);
  const uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, side === 'L' ? uv.getX(k) * 0.5 : 0.5 + uv.getX(k) * 0.5);
  g.rotateX(-Math.PI / 2);
  g.translate(side === 'L' ? -PW / 2 : PW / 2, 0.003, 0);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map }));
}

export function createBook(stage, { works, plans, screens, parts = null, reducedMotion = false }) {
  const { scene } = stage;
  const speed = reducedMotion ? 5 : 1;
  // 空と遠景
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), new THREE.MeshBasicMaterial({ map: skyTexture(), depthWrite: false }));
  sky.position.set(0, 1.1, -3.6); sky.scale.set(1.3, 1.3, 1);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: skylineTexture(), transparent: true, depthWrite: false }));
  far.position.set(0, 0.2, -2.6);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.4), new THREE.MeshBasicMaterial({ map: deskTexture() }));
  desk.rotation.x = -Math.PI / 2; desk.position.set(0, -0.05, 0.4);
  scene.add(sky, far, desk);

  // 本：左半分は固定、右半分は背で回る
  const coverMat = new THREE.MeshBasicMaterial({ map: coverTexture() });
  const paperMat = new THREE.MeshBasicMaterial({ color: '#b9ac92' });
  const ink = new THREE.LineBasicMaterial({ color: INK });
  const mkHalf = side => {
    const grp = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.03, 0.025, PD * 2 + 0.05), coverMat);
    cover.position.set((side === 'L' ? -1 : 1) * (PW + 0.03) / 2, -0.03, 0);
    const paper = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.03, PD * 2), paperMat);
    paper.position.set((side === 'L' ? -1 : 1) * PW / 2, -0.012, 0);
    paper.add(new THREE.LineSegments(new THREE.EdgesGeometry(paper.geometry), ink));
    grp.add(cover, paper);
    return grp;
  };
  const left = mkHalf('L'), right = mkHalf('R');
  scene.add(left, right);
  const grounds = {};
  for (const k of KINDS) grounds[k] = groundTexture(k);
  const baseL = halfPlane(grounds.games, 'L'), baseR = halfPlane(grounds.games, 'R');
  left.add(baseL); right.add(baseR);
  // めくる紙
  const sheet = new THREE.Group();
  const sheetFront = halfPlane(grounds.games, 'R'), sheetBack = halfPlane(grounds.games, 'L');
  sheetBack.geometry = sheetBack.geometry.clone();
  sheetBack.geometry.rotateZ(Math.PI); // 裏面：右側で下向き。めくり終わると左で上向き
  sheet.add(sheetFront, sheetBack); sheet.visible = false;
  scene.add(sheet);

  const districts = {};
  const getDistrict = k => {
    if (!districts[k]) {
      const mine = works.filter(w => w.district === k);
      districts[k] = k === 'tools' ? buildFactory(mine, { billboard: screens.tools.tex }, rng(21))
        : k === 'wip' ? buildLot(mine, { billboard: screens.wip.tex }, rng(31))
        : buildDistrict(plans[k], works, { billboard: screens.games.tex }, { parts, reflect: stage.tier === 'high' });
      districts[k].visible = false; scene.add(districts[k]);
    }
    return districts[k];
  };

  const book = { current: 'games', busy: false, time: 0, district: null, onChange: null };
  let anims = [];
  const tween = (dur, fn) => new Promise(ok => { anims.push({ t: 0, dur: dur / speed, fn, ok }); });
  stage.onFrame(dt => {
    book.time += dt;
    anims = anims.filter(a => { a.t += dt; const x = Math.min(1, a.t / a.dur); a.fn(x); if (x >= 1) { a.ok(); return false; } return true; });
  });

  const stand = (p, a) => p.userData.stand ? p.userData.stand(a) : (p.rotation.x = a - H);
  const streetOf = d => {
    const v = d.userData.view;
    if (v) return v;
    return { position: new THREE.Vector3(0, 0.045, 0.92), target: new THREE.Vector3(0, 0.42, -0.7), fov: 58 };
  };
  async function dive(d) {
    stage.setPickables([...d.userData.workSigns, ...d.userData.screenParts]);
    const v = streetOf(d);
    // 本の手前の路地の入口まで降りて、そこから路地の中へ入っていく
    if (d.userData.gate) await stage.flyTo(d.userData.gate, 1.4 / speed);
    await stage.flyTo(v, (d.userData.gate ? 1.6 : 1.8) / speed);
  }
  async function popUp(d) {
    d.visible = true;
    const piv = d.userData.pivots;
    piv.forEach(p => stand(p, 0));
    d.userData.decor.scale.y = 0.001;
    d.userData.screenMat.color.setScalar(0);
    const maxDelay = Math.max(...piv.map(p => p.userData.delay));
    const dur = 0.7 / speed;
    await tween(maxDelay / speed + dur, x => {
      const t = x * (maxDelay / speed + dur);
      for (const p of piv) stand(p, popupAngle(t, p.userData.delay / speed, dur));
    });
    await tween(0.35, x => { d.userData.decor.scale.y = Math.max(0.001, 1 - (1 - x) ** 3); });
    // 掲示板点灯（チカチカ）
    await tween(0.5, x => { d.userData.screenMat.color.setScalar(x < 0.2 ? 1 : x < 0.3 ? 0.1 : x < 0.45 ? 1 : x < 0.55 ? 0.3 : 1); });
  }
  async function foldDown(d) {
    const piv = d.userData.pivots;
    await tween(0.25, x => { d.userData.decor.scale.y = Math.max(0.001, 1 - x); d.userData.screenMat.color.setScalar(1 - x); });
    const maxDelay = 0.25;
    await tween(maxDelay + 0.45, x => {
      const t = x * (maxDelay + 0.45);
      for (const p of piv) stand(p, foldAngle(t, (p.userData.bldg.row / 5) * maxDelay, 0.45));
    });
    d.visible = false;
  }

  book.open = () => runExclusive(book, async () => {
    right.rotation.z = Math.PI; // 閉じた状態：右半分が左に重なる
    right.position.y = 0.06;
    await wait(0.25 / speed);
    await tween(1.1, x => { const e = 1 - (1 - x) ** 3; right.rotation.z = Math.PI * (1 - e); right.position.y = 0.06 * (1 - e); });
    book.district = getDistrict('games');
    await popUp(book.district);
    await dive(book.district);
  });

  book.turnTo = kind => (kind === book.current || !KINDS.includes(kind)) ? Promise.resolve() : runExclusive(book, async () => {
    const forward = KINDS.indexOf(kind) > KINDS.indexOf(book.current);
    const oldK = book.current;
    await stage.flyTo('overview', 1.0 / speed);
    await foldDown(book.district);
    // めくる：前へは右ページが左へ、戻るは左ページが右へ
    sheetFront.material.map = grounds[oldK]; sheetBack.material.map = grounds[kind];
    if (forward) { baseR.material.map = grounds[kind]; sheet.rotation.z = 0; }
    else { baseL.material.map = grounds[kind]; sheetFront.material.map = grounds[kind]; sheetBack.material.map = grounds[oldK]; sheet.rotation.z = Math.PI; }
    sheet.visible = true;
    await tween(0.6, x => { const e = x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; sheet.rotation.z = forward ? Math.PI * e : Math.PI * (1 - e); sheet.position.y = 0.01 + Math.sin(e * Math.PI) * 0.04; });
    baseL.material.map = grounds[kind]; baseR.material.map = grounds[kind];
    sheet.visible = false;
    book.current = kind;
    book.onChange?.(kind);
    book.district = getDistrict(kind);
    await popUp(book.district);
    await dive(book.district);
  });
  return book;
}
