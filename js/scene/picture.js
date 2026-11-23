// 1枚の画像を「飛び出す絵本」にする（Tour Into the Picture 方式）
// 画像の消失点と奥の四角から、奥の壁・左右の壁・路面の4枚を3Dに起こし、
// 元のカメラ位置から見ると画像と同じ景色になるよう射影で貼る。
import * as THREE from 'three';
import { drawSign } from '../draw/sign.js';
import { drawClutterStrip } from '../draw/clutter.js';
import { INK } from '../draw/manga.js';
import { rng } from '../rng.js';

const H = Math.PI / 2;

// 画像ごとの設定（ピクセル座標）
export const KOWLOON = {
  src: 'assets/city-manga.jpg',
  W: 1672, H: 941,
  vp: [878, 635],          // 消失点（地平線）
  f: 1000,                 // 焦点距離（px）
  back: [790, 985, 650],   // 奥の四角：左x, 右x, 路面の高さy
  screen: [848, 250, 975, 372], // 奥のタワーの画面（左上x,y,右下x,y）
  D: 10,                   // 奥の壁までの距離（画像のカメラ単位）
};

// 画像のカメラ空間 (X右, Y上, d奥) ↔ 本の座標
export function pictureSpace(P) {
  const [vx, vy] = P.vp, f = P.f, D = P.D;
  const Xl = (P.back[0] - vx) * D / f, Xr = (P.back[1] - vx) * D / f;
  const Yf = -(P.back[2] - vy) * D / f;
  const dNear = f * (-Yf) / (P.H - vy);
  const s = 1.32 / (D - dNear);
  const Xc = (Xl + Xr) / 2;
  const LIFT = 0.008; // ページの紙より少し上に
  const toBook = (X, Y, d) => new THREE.Vector3((X - Xc) * s, (Y - Yf) * s + LIFT, 0.7 - (d - dNear) * s);
  const project = (X, Y, d) => [vx + f * X / d, vy - f * Y / d]; // 画像のピクセル
  const unproject = (u, v, d) => [(u - vx) * d / f, (vy - v) * d / f];
  const camera = toBook(0, 0, 0);
  return { Xl, Xr, Yf, dNear, s, Xc, D, f, toBook, project, unproject, camera, yTop: d => vy * d / f };
}

// 射影テクスチャ：各頂点に (U·w, V·w, w) を持たせ、ピクセルごとに割る
const vert = `
attribute vec3 puv;
varying vec3 vP;
void main() { vP = puv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const frag = `
uniform sampler2D map; uniform float shade;
varying vec3 vP;
void main() {
  vec2 uv = vP.xy / vP.z;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 c = texture2D(map, uv);
  gl_FragColor = vec4(c.rgb * shade, 1.0);
  #include <colorspace_fragment>
}`;

// 画像カメラ空間の四角形 corners(4点, 反時計回り) を、ヒンジ基準のローカル座標で作る
function panel(PS, P, tex, cornersTIP, hingeBook, seg = 24) {
  const [a, b, c, d] = cornersTIP; // a=左下 b=右下 c=右上 d=左上（見る向きで）
  const pos = [], puv = [], idx = [];
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const u = i / seg, v = j / seg;
    const lerp = (p, q, t) => p.map((x, k) => x + (q[k] - x) * t);
    const p = lerp(lerp(a, b, u), lerp(d, c, u), v); // TIP座標
    const w = p[2];
    const [px, py] = [P.vp[0] * w + P.f * p[0], P.vp[1] * w - P.f * p[1]];
    puv.push(px / P.W, (P.H * w - py) / P.H, w);
    const bp = PS.toBook(...p).sub(hingeBook);
    pos.push(bp.x, bp.y, bp.z);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
    const k = j * (seg + 1) + i;
    idx.push(k, k + 1, k + seg + 2, k, k + seg + 2, k + seg + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('puv', new THREE.Float32BufferAttribute(puv, 3));
  g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, shade: { value: 1 } }, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide });
  return new THREE.Mesh(g, m);
}

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ctex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

export function buildPictureDistrict(P, works, textures, seed = 3) {
  const r = rng(seed);
  const PS = pictureSpace(P);
  const { Xl, Xr, Yf, D, toBook } = PS;
  const root = new THREE.Group();
  root.name = 'district-picture';
  const tex = new THREE.TextureLoader().load(P.src);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  const pivots = [];
  const addPivot = (mesh, hinge, fold, delay) => {
    const p = new THREE.Group();
    p.position.copy(hinge);
    p.add(mesh);
    p.userData = { delay, stand: a => fold(p, a), bldg: { row: delay > 0.3 ? 0 : 4 } };
    fold(p, 0);
    root.add(p); pivots.push(p);
    return p;
  };
  const dL = PS.unproject(0, 0, 1)[0]; void dL;
  const dNearL = P.f * -Xl / P.vp[0], dNearR = P.f * Xr / (P.W - P.vp[0]);
  // 路面（本のページに印刷されたように寝ている）
  const floor = panel(PS, P, tex, [[Xl - 1.6, Yf, PS.dNear], [Xr + 1.6, Yf, PS.dNear], [Xr + 1.6, Yf, D], [Xl - 1.6, Yf, D]], new THREE.Vector3(), 20);
  root.add(floor);
  // 奥の壁：路面の奥の辺で手前に倒れている
  const yTopD = PS.yTop(D);
  const backHinge = toBook(Xl, Yf, D);
  const back = panel(PS, P, tex, [[Xl, Yf, D], [Xr, Yf, D], [Xr, yTopD, D], [Xl, yTopD, D]], backHinge.clone().setX(0));
  addPivot(back, backHinge.clone().setX(0), (p, a) => { p.rotation.x = H - a; }, 0.35);
  // 左右の壁：外側に倒れている（左は -x、右は +x へ）
  const leftHinge = toBook(Xl, Yf, 0).setZ(0);
  const left = panel(PS, P, tex, [[Xl, Yf, dNearL], [Xl, Yf, D], [Xl, PS.yTop(D), D], [Xl, PS.yTop(dNearL), dNearL]], leftHinge);
  addPivot(left, leftHinge, (p, a) => { p.rotation.z = H - a; }, 0.1);
  const rightHinge = toBook(Xr, Yf, 0).setZ(0);
  const right = panel(PS, P, tex, [[Xr, Yf, D], [Xr, Yf, dNearR], [Xr, PS.yTop(dNearR), dNearR], [Xr, PS.yTop(D), D]], rightHinge);
  addPivot(right, rightHinge, (p, a) => { p.rotation.z = -(H - a); }, 0.18);
  // 壁は少し暗く、奥行きを出す
  left.material.uniforms.shade.value = 1; right.material.uniforms.shade.value = 1;

  // --- 立体の小物：電線・配管・看板（画像のカメラ空間で置いて本へ写す） ---
  const decor = new THREE.Group();
  decor.scale.y = 0.001;
  root.add(decor);
  const B = (X, Y, d) => toBook(X, Y, d);
  const outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const strips = {};
  for (const k of ['duct', 'tube']) strips[k] = [0, 1, 2].map(() => { const c = canvas(64, 256); drawClutterStrip(c, k, r); const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
  const wireMat = new THREE.MeshBasicMaterial({ color: '#0d070f' });
  const tubeMesh = (curve, rad, kind) => {
    const segs = kind === 'wire' ? 16 : 32;
    if (kind === 'wire') return [new THREE.Mesh(new THREE.TubeGeometry(curve, segs, rad, 4, false), wireMat)];
    const t = r.pick(strips[kind]).clone(); t.needsUpdate = true; t.repeat.set(1, Math.max(1, curve.getLength() * 30));
    return [new THREE.Mesh(new THREE.TubeGeometry(curve, segs, rad, 6, false), new THREE.MeshBasicMaterial({ map: t, color: r.pick([0x5a4248, 0x6b4a3a, 0x4a3f52, 0x7a5a48, 0x3d3440]) })), new THREE.Mesh(new THREE.TubeGeometry(curve, segs, rad * 1.5, 6, false), outline)];
  };
  const wallY = d => Math.min(PS.yTop(d) * 0.92, 4.2);
  // 路地をまたぐ電線（たわむ）
  for (let i = 0; i < 110; i++) {
    const d = 2.0 + (D - 2.6) * r.next() ** 0.8, d2 = d + r.range(-0.6, 0.6);
    const hi = r.next() < 0.35; // たまに画面より上を通る
    const y1 = hi ? r.range(0.42 * d, wallY(d)) : r.range(0.35, Math.min(wallY(d), 0.24 * d)), y2 = Math.max(0.3, Math.min(wallY(d2), y1 + r.range(-0.3, 0.3)));
    const a = B(Xl + 0.02, y1, d), b = B(Xr - 0.02, y2, d2);
    const mid = a.clone().lerp(b, 0.5); mid.y -= a.distanceTo(b) * r.range(0.06, 0.18);
    for (const m of tubeMesh(new THREE.QuadraticBezierCurve3(a, mid, b), r.range(0.0005, 0.001) * (0.6 + d / D), 'wire')) decor.add(m);
  }
  // 電線の束（何本も並んで垂れる）
  for (let i = 0; i < 14; i++) {
    const d = r.range(2.4, 8.5), y = r.range(0.4, Math.min(wallY(d) * 0.8, 0.2 * d)), n = r.int(3, 7);
    for (let k = 0; k < n; k++) {
      const a = B(Xl + 0.02, y + k * 0.04, d + k * 0.03), b = B(Xr - 0.02, y + k * 0.03 + r.range(-0.1, 0.1), d + r.range(-0.3, 0.3));
      const mid = a.clone().lerp(b, 0.5); mid.y -= a.distanceTo(b) * (0.12 + k * 0.02);
      for (const m of tubeMesh(new THREE.QuadraticBezierCurve3(a, mid, b), 0.0007, 'wire')) decor.add(m);
    }
  }
  // 路地をまたぐ配管・ダクト（直角に曲がる）
  for (let i = 0; i < 12; i++) {
    const d = r.range(2.6, 9), y = r.next() < 0.5 ? r.range(0.25, 0.16 * d) : r.range(0.45 * d, wallY(d) * 0.85), kind = r.next() < 0.4 ? 'duct' : 'tube';
    const off = r.range(0.05, 0.2), dy = r.range(-0.3, 0.3);
    const pts = [B(Xl, y, d), B(Xl + off, y, d), B(Xl + off, y + dy, d), B(Xr - off, y + dy, d + r.range(-0.2, 0.2)), B(Xr - off, y, d), B(Xr, y, d)];
    for (const m of tubeMesh(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), kind === 'duct' ? r.range(0.0022, 0.004) : r.range(0.001, 0.002), kind)) decor.add(m);
  }
  // 壁を這う配管（縦・横）
  for (const side of [-1, 1]) {
    const X = side < 0 ? Xl + 0.012 : Xr - 0.012;
    for (let i = 0; i < 26; i++) {
      const d = r.range(1.4, D - 0.5), kind = r.next() < 0.35 ? 'duct' : 'tube';
      const pts = r.next() < 0.25
        ? [B(X, 0, d), B(X, Math.min(wallY(d), 0.3 * d) * r.range(0.5, 0.95), d)]
        : (() => { const y = r.range(0.2, Math.min(wallY(d) * 0.9, 0.28 * d)), d2 = Math.min(D - 0.3, d + r.range(0.8, 3)); return [B(X, y, d), B(X, y, (d + d2) / 2), B(X, y + r.range(-0.2, 0.2), d2)]; })();
      const curve = pts.length === 2 ? new THREE.LineCurve3(...pts) : new THREE.CatmullRomCurve3(pts);
      for (const m of tubeMesh(curve, kind === 'duct' ? r.range(0.002, 0.0038) : r.range(0.0009, 0.0019), kind)) decor.add(m);
    }
  }

  // 作品の看板：手前から左右交互に、壁から路地へせり出す縦看板（作品が増えれば看板が増える）
  const workSigns = [], signs = [];
  works.forEach((w, i) => {
    const side = i % 2 ? 1 : -1;
    const d = 2.5 + Math.floor(i / 2) * 1.0 + r.range(-0.1, 0.2);
    const sw = 0.17, sh = 0.62;
    const y = Math.min(wallY(d) - sh / 2 - 0.05, r.range(0.7, 1.1));
    const X = side < 0 ? Xl + sw / 2 + 0.06 : Xr - sw / 2 - 0.06;
    const c = canvas(150, Math.round(150 * sh / sw));
    drawSign(c, { text: w.title, color: w.color || '#ff4fa3', isWork: true, vertical: true });
    const faceMat = new THREE.MeshBasicMaterial({ map: ctex(c) });
    const edgeMat = new THREE.MeshBasicMaterial({ color: '#1d1220' });
    const center = B(X, y, d);
    const wb = sw * PS.s, hb = sh * PS.s, tb = 0.006;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(wb, hb, tb), [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, faceMat]);
    sign.add(new THREE.Mesh(new THREE.BoxGeometry(wb + 0.005, hb + 0.005, tb + 0.003), outline));
    sign.position.copy(center);
    // 壁へのアーム
    const wallX = B(side < 0 ? Xl : Xr, y, d).x;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(center.x - wallX) + wb / 2, 0.003, 0.003), new THREE.MeshBasicMaterial({ color: INK }));
    arm.position.set((center.x + wallX) / 2, center.y + hb / 2 - 0.004, center.z);
    decor.add(arm);
    sign.userData = { workId: w.id, phase: r.range(0, 6), faceMat };
    decor.add(sign);
    workSigns.push(sign); signs.push(sign);
  });

  // 奥のタワーの画面（掲示板）
  const [sx0, sy0, sx1, sy1] = P.screen;
  const dS = D - 0.05;
  const q = [[sx0, sy1], [sx1, sy1], [sx1, sy0], [sx0, sy0]].map(([u, v]) => { const [X, Y] = PS.unproject(u, v, dS); return toBook(X, Y, dS).sub(backHinge.clone().setX(0)); });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(q.flatMap(v => [v.x, v.y, v.z]), 3));
  sg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  sg.setIndex([0, 1, 2, 0, 2, 3]);
  const screenMat = new THREE.MeshBasicMaterial({ map: textures.billboard, color: 0x000000, side: THREE.DoubleSide });
  const screen = new THREE.Mesh(sg, screenMat);
  screen.userData.billboard = true;
  pivots[0].add(screen);

  // 元のカメラ（この位置から見ると画像と一致する）
  const view = { position: PS.camera.clone(), target: PS.camera.clone().add(new THREE.Vector3(0, 0, -1)), picture: P };
  root.userData = { kind: 'games', pivots, decor, workSigns, signs, screenParts: [screen], screenMat, cars: null, view, screenAspect: (sx1 - sx0) / (sy1 - sy0) };
  return root;
}

// 画像の一部（ピクセル矩形）がちょうど画面に入る射影行列
export function pictureProjection(P, aspect, near = 0.004, far = 30) {
  // 画像の高さいっぱい、幅は画面比で中央（タワー寄り）を切り出す。横に広い画面は幅いっぱい
  let w = P.H * aspect, h = P.H, cx = P.vp[0], cy = P.H / 2;
  if (w > P.W) { w = P.W; h = P.W / aspect; cy = Math.min(P.H - h / 2, Math.max(h / 2, P.vp[1] - h * 0.3)); }
  cx = Math.min(P.W - w / 2, Math.max(w / 2, cx));
  const l = (cx - w / 2 - P.vp[0]) / P.f, rr = (cx + w / 2 - P.vp[0]) / P.f;
  const t = (P.vp[1] - (cy - h / 2)) / P.f, b = (P.vp[1] - (cy + h / 2)) / P.f;
  return new THREE.Matrix4().makePerspective(l * near, rr * near, t * near, b * near, near, far);
}
