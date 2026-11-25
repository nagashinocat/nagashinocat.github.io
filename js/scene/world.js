// 紙の街：閉じた本が開いてジオラマの街が立ち上がり、大通りから路地へ入る。路地では看板・猫・クジラに触れる
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildDiorama } from './diorama.js';
import { buildAlleyPaper } from './alleypaper.js';
import { addCat, addWhale } from './creatures.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildFactoryMini, buildLotMini } from './minidiorama.js';
import { counterBoard } from './counterboard.js';
import { optimizeScene, adaptiveResolution, mergeStatic, findDynamic, markSharp, lightsForSharp, DETAIL_LAYER, SHARP_LAYER, OCCLUDER_LAYER } from './perf.js';
import { createTapGuard } from '../util.js';

const clamp01 = x => Math.min(1, Math.max(0, x));
const ease = t => t * t * (3 - 2 * t);
const smooth01 = x => ease(clamp01(x));

// ---- カメラの道すじ ----
const K = [ // [時刻, 位置, 注視点, fov]
  [0.0, [0.9, 2.4, 2.6], [0, 0, 0], 40],
  [3.8, [0.3, 1.5, 2.1], [0, 0.1, 0], 44],
  [8.6, [0, 0.14, 1.12], [0, 0.34, -0.5], 56],
  [10.2, [0, 0.12, 0.9], [0, 0.32, -0.5], 56],
  [12.8, [0, 0.065, 0.25], [0, 0.3, -0.72], 60],
  [15.2, [0, 0.055, -0.32], [0, 0.42, -0.72], 64],
];
const KA = [ // 路地：大通りの続きとして、タワーを見たまま前へ進み続ける
  [0, [0, 0.06, 1.38], [0, 0.42, -1.05], 64],
  [2.0, [0, 0.055, 1.0], [0, 0.34, -1.0], 61],
  [4.6, [-0.01, 0.045, 0.66], [0.03, 0.3, -0.9], 58],
];
K.moveEnd = true; KA.moveStart = true; // つなぎ目で止まらない
export const T_X = 13.6, X_DUR = 1.6;   // 大通りと路地が溶け合う時間
export const T_ALLEY = T_X + KA.at(-1)[0]; // 路地に着いて操作できるようになる時刻

// キーを通るなめらかな曲線の上を、速さが急に変わらないように動く
const paths = new Map();
function pathOf(keys) {
  if (paths.has(keys)) return paths.get(keys);
  const V = a => new THREE.Vector3(...a);
  const pc = new THREE.CatmullRomCurve3(keys.map(k => V(k[1])), false, 'centripetal');
  const lc = new THREE.CatmullRomCurve3(keys.map(k => V(k[2])), false, 'centripetal');
  const T = keys.map(k => k[0]), n = T.length, m = [];
  const sl = i => 1 / (T[i + 1] - T[i]);
  for (let i = 0; i < n; i++) m.push(i === 0 ? (keys.moveStart ? sl(0) : 0) : i === n - 1 ? (keys.moveEnd ? sl(n - 2) : 0) : 2 / (1 / sl(i - 1) + 1 / sl(i)));
  const P = { pc, lc, T, m }; paths.set(keys, P); return P;
}
function camAt(c, t, keys, aspect) {
  const { pc, lc, T, m } = pathOf(keys), n = T.length;
  t = Math.min(T[n - 1], Math.max(0, t));
  let i = 0; while (i < n - 2 && t > T[i + 1]) i++;
  const h = T[i + 1] - T[i], x = (t - T[i]) / h;
  const h00 = 2 * x ** 3 - 3 * x ** 2 + 1, h10 = x ** 3 - 2 * x ** 2 + x, h01 = -2 * x ** 3 + 3 * x ** 2, h11 = x ** 3 - x ** 2;
  const idx = h00 * i + h10 * h * m[i] + h01 * (i + 1) + h11 * h * m[i + 1];
  const u = clamp01(idx / (n - 1));
  c.position.copy(pc.getPoint(u)); c.lookAt(lc.getPoint(u));
  const fi = Math.min(n - 2, Math.floor(idx)), fr = idx - fi; c.fov = keys[fi][3] + (keys[fi + 1][3] - keys[fi][3]) * fr;
  // 縦長の画面では横が狭くなるので、少し引いて見せる
  if (aspect < 1) c.fov = Math.min(95, c.fov * (1 + (1 - aspect) * 0.55));
  c.aspect = aspect; c.updateProjectionMatrix();
}

/**
 * container に紙の街を作る。
 * opts: { works, screenCanvas(640x360), tier: 'high'|'low', reducedMotion, manual }
 * 返り値: { renderer, time, phase, skip(), pick(x,y), isTap(x,y), onFrame(cb), renderAt(t), screenTex, stands, cat, whale, dispose() }
 */
export async function createWorld(container, { works, screenCanvas, tier = 'high', reducedMotion = false, manual = false, record = false, startInAlley = false } = {}) {
  // 画面そのもの（看板・猫・クジラを描く所）はいつも細かく。背景は別に、軽い細かさで描いてから重ねる
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const SHARP_PR = record ? 1 : Math.min(devicePixelRatio, 2);
  let BG_PR = record ? 1 : Math.min(devicePixelRatio, tier === 'high' ? 1 : 0.75);
  renderer.setPixelRatio(SHARP_PR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.append(renderer.domElement);
  const size = () => [container.clientWidth || innerWidth, container.clientHeight || innerHeight];
  let [W, H] = size();
  renderer.setSize(W, H);

  const cam = new THREE.PerspectiveCamera(56, W / H, 0.005, 30); cam.layers.enable(DETAIL_LAYER); const camA = cam.clone();
  const D = await buildDiorama();
  const A = await buildAlleyPaper({ entry: 1.5, works: works?.filter(w => w.district === 'games'), screenCanvas });

  // 2つの場面をそれぞれ描いて、重ねて溶かす（暗転させない）
  const mkComp = (sc, c) => { const k = new EffectComposer(renderer); k.renderToScreen = false; k.setPixelRatio(BG_PR); k.setSize(W, H); k.addPass(new RenderPass(sc, c)); k.addPass(new UnrealBloomPass(new THREE.Vector2(W * BG_PR, H * BG_PR), 0.75, 0.65, 0.88)); k.addPass(new OutputPass()); return k; };
  const compD = mkComp(D.scene, cam), compA = mkComp(A.scene, camA);
  const mix = new THREE.ShaderMaterial({ uniforms: { a: { value: null }, b: { value: null }, k: { value: 0 } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D a, b; uniform float k; varying vec2 vUv; void main(){ vec4 x = texture2D(a, vUv), y = texture2D(b, vUv); float l = dot(y.rgb, vec3(.3,.59,.11)); float m = smoothstep(0., 1., k + l * 0.6 * k * (1. - k)); gl_FragColor = mix(x, y, m); }' });
  const qScene = new THREE.Scene(), qCam = new THREE.Camera(); qScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mix));
  // ページめくり：古いページが右下の角からめくれて、下の新しいページが現れる（紙の裏は生成り色）
  const curl = new THREE.ShaderMaterial({ uniforms: { a: { value: null }, b: { value: null }, k: { value: 0 }, asp: { value: 1 } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform sampler2D a, b; uniform float k, asp; varying vec2 vUv;
      const float PI = 3.14159265;
      bool inside(vec2 q){ return q.x >= 0. && q.x <= asp && q.y >= 0. && q.y <= 1.; }
      vec4 tA(vec2 q){ return texture2D(a, vec2(q.x / asp, q.y)); }
      void main(){
        vec2 p = vec2(vUv.x * asp, vUv.y);
        vec2 n = normalize(vec2(1., 0.42));
        float R = 0.09 + 0.05 * sin(k * PI);
        vec2 P = vec2(asp, 0.) + n * (0.35 - k * (asp + 1.6));
        float s = dot(p - P, n);
        vec4 col; bool done = false;
        vec3 backC = vec3(0.93, 0.88, 0.78);
        // 1) 折り返して上に重なった裏面（平ら）
        if (s < 0.) { float d = PI * R - s; vec2 src = p + n * (d - s); if (inside(src)) { vec4 m = tA(vec2(asp - src.x, src.y) * vec2(1., 1.)); col = vec4(mix(backC, m.rgb * 0.5 + backC * 0.5, 0.18) * (0.82 + 0.18 * clamp(-s / 0.3, 0., 1.)), 1.); done = true; } }
        // 2) 筒の上側（裏面）
        if (!done && s >= 0. && s < R) { float d = R * (PI - asin(s / R)); vec2 src = p + n * (d - s); if (inside(src)) { float sh = 0.55 + 0.45 * sqrt(1. - s / R); col = vec4(backC * sh, 1.); done = true; } }
        // 3) 筒の下側（表面）
        if (!done && s >= 0. && s < R) { float d = R * asin(s / R); vec2 src = p + n * (d - s); if (inside(src)) { float sh = 1. - 0.6 * (s / R) * (s / R); col = vec4(tA(src).rgb * sh, 1.); done = true; } }
        // 4) まだめくれていない所は古いページ、めくれた所は新しいページ（折り目の影つき）
        if (!done) {
          if (s < 0.) col = tA(p);
          else { float shadow = 1. - 0.55 * exp(-(s - R) * 14.); col = vec4(texture2D(b, vUv).rgb * shadow, 1.); }
        }
        gl_FragColor = col;
      }` });
  const cScene = new THREE.Scene(); cScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), curl));
  function outCurl(a, b, k) { curl.uniforms.a.value = a.readBuffer.texture; curl.uniforms.b.value = b.readBuffer.texture; curl.uniforms.k.value = k; curl.uniforms.asp.value = W / H; renderer.setRenderTarget(null); const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; renderer.render(cScene, qCam); renderer.toneMapping = tm; }
  // 背景（軽い細かさ＋光のにじみ）を敷いて、その上に看板・猫・クジラを画面の細かさで描く
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
  function present(comp, scene, camera, exposure) {
    out(comp, comp, 0);
    const bg = scene.background, mirrors = [];
    scene.traverse(o => { if ((o.isReflector || o.type === 'Reflector') && o.visible) { mirrors.push(o); o.visible = false; } });
    scene.background = null;
    renderer.autoClear = false; renderer.clearDepth();
    // 1) 遮る物の奥行きだけ（色は描かない）
    const lay = camera.layers.mask;
    camera.layers.set(OCCLUDER_LAYER); scene.overrideMaterial = depthOnly; renderer.render(scene, camera);
    // 2) 看板・猫・クジラを細かく
    scene.overrideMaterial = null; camera.layers.set(SHARP_LAYER);
    renderer.toneMappingExposure = exposure; renderer.render(scene, camera);
    camera.layers.mask = lay; scene.background = bg; for (const m of mirrors) m.visible = true; renderer.autoClear = true;
  }
  function out(a, b, k) { mix.uniforms.a.value = a.readBuffer.texture; mix.uniforms.b.value = b.readBuffer.texture; mix.uniforms.k.value = k; renderer.setRenderTarget(null); const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; renderer.render(qScene, qCam); renderer.toneMapping = tm; }

  // ---- 閉じた本：左半分（表紙＋左のページ）を背の所で右へ折り重ねておく ----
  const SPY = 0.0052; // 閉じたとき、左右のページの面どうしが重なる高さ
  const spine = new THREE.Group(); spine.position.set(0, SPY, 0); D.scene.add(spine);
  for (const o of [D.book.covers[-1], D.book.pages[-1]]) { o.position.y -= SPY; spine.add(o); }
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 1.56), new THREE.MeshStandardMaterial({ color: '#cfc2a6', roughness: 1 })); edge.position.set(0.56, 0, 0); edge.visible = false; D.scene.add(edge);
  const setBook = u => { spine.rotation.z = -Math.PI * (1 - u); edge.visible = false; };

  // ---- 飛び出す準備：本と机と地面以外は、ぜんぶ下から立ち上がる ----
  const fixed = new Set([D.book.desk, D.book.spine, D.book.covers[1], D.book.pages[1], spine, edge, D.sides[-1].outer, D.sides[1].outer, ...D.ground]);
  const pops = [];
  for (const sd of [-1, 1]) for (const o of D.sides[sd].inner.children) pops.push(o);
  for (const o of D.scene.children) { if (fixed.has(o) || o.isLight || o.isCamera) continue; pops.push(o); }
  // 立ち上がる建物ごとに、中の動かない部品をまとめる（描く回数を減らす）
  { const dynD = findDynamic(D.scene, D.ups); for (const o of pops) if (!o.isMesh && !o.isSprite) await mergeStatic(D.scene, { into: o, dynamic: dynD }); }
  const base = new Map(pops.map(o => [o, o.scale.clone()]));
  const delayOf = o => { const p = new THREE.Vector3(); o.getWorldPosition(p); return Math.max(0, (p.z + 0.9) * 0.9 + Math.abs(p.x) * 0.6); };
  const rawD = pops.map(delayOf), dMax = Math.max(...rawD, 1e-3);
  const POP_SPAN = 4.4;
  const delays = new Map(pops.map((o, i) => [o, POP_SPAN * (rawD[i] / dMax) ** 0.5])); // ゆっくり始まって、だんだん速く
  const durOf = d => 1.4 - 0.9 * (d / POP_SPAN);
  const backOut = x => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  const grow = x => x < 0.5 ? 0.3 * (x / 0.5) ** 2 : 0.3 + 0.7 * backOut((x - 0.5) / 0.5);
  const setPop = t => { for (const o of pops) { const d = delays.get(o); const x = clamp01((t - d) / durOf(d)); const k = x <= 0 ? 0.0001 : grow(x); const s0 = base.get(o); o.scale.set(s0.x, s0.y * k, s0.z); o.visible = x > 0; } };
  // 地面：分厚いカーペットを奥から転がして敷くように手前へ。巻きは残りの長さに合わせて太い
  const G_LEN = 1.6, G_BACK = -0.8, G_W = 2.2, TH = 0.012, PAGE_TOP = 0.0045, CORE = 0.022, R_MAX = 0.13;
  const gBase = new Map(D.ground.map(o => [o, { s: o.scale.clone(), z: o.position.z }]));
  for (const o of D.ground) o.position.y += TH; // 地面の絵はカーペットの上に
  const carpetTex = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#2a1e34'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#ff7ad0'; g.fillRect(0, 0, 16, 2); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sideM = new THREE.MeshStandardMaterial({ color: '#2a1e34', roughness: 0.9, emissive: '#2a1440', emissiveIntensity: 0.8 });
  const edgeM = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.9, emissive: '#3a1a50', emissiveMap: carpetTex, emissiveIntensity: 1 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(G_W, TH, 1), [sideM, sideM, sideM, sideM, edgeM, sideM]); D.scene.add(slab);
  // 巻きの断面：うずまき
  const spiralTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#1c1426'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill();
    g.strokeStyle = '#ff8ad8'; g.lineWidth = 3; g.beginPath(); for (let a = 0; a < Math.PI * 2 * 7; a += 0.05) { const r = 14 + a / (Math.PI * 2) * 16; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke();
    g.strokeStyle = '#4a3a5a'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const rollTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#241a2c'; g.fillRect(0, 0, 64, 512); for (let y = 0; y < 512; y += 40) { g.fillStyle = '#3a2c48'; g.fillRect(0, y, 64, 14); g.fillStyle = 'rgba(255,140,210,0.5)'; g.fillRect(0, y + 16, 64, 3); } for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(160,220,255,0.35)'; g.fillRect(Math.random() * 64, Math.random() * 512, 2, 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const capM = new THREE.MeshStandardMaterial({ map: spiralTex, roughness: 0.9, emissive: '#ffffff', emissiveMap: spiralTex, emissiveIntensity: 0.35 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, G_W, 48), [new THREE.MeshStandardMaterial({ map: rollTex, roughness: 0.5, emissive: '#3a2850', emissiveMap: rollTex, emissiveIntensity: 1.3 }), capM, capM]);
  const rollG = new THREE.Group(); roll.rotation.z = Math.PI / 2; rollG.add(roll); D.scene.add(rollG);
  // 残りの長さ L のとき、巻きの半径（紙の厚み TH を重ねたうずまき）
  const B = (R_MAX * R_MAX - CORE * CORE) / G_LEN, radOf = L => Math.sqrt(CORE * CORE + B * L); // 見栄え優先で太めに
  const setGround = u => {
    const laid = G_LEN * u, rest = G_LEN - laid, r = radOf(rest);
    for (const o of D.ground) { const g = gBase.get(o); o.scale.set(g.s.x, Math.max(1e-4, g.s.y * u), g.s.z); o.position.z = G_BACK + (g.z - G_BACK) * u; o.visible = u > 0; }
    slab.visible = u > 0; slab.scale.z = Math.max(1e-4, laid); slab.position.set(0, PAGE_TOP + TH / 2, G_BACK + laid / 2);
    rollG.visible = u > 0.002 && u < 1;
    // 転がった角度：ds/r を積分した形（巻きがほどけるほど速く回る）
    const ang = (2 / B) * (radOf(G_LEN) - r);
    const bump = Math.abs(Math.sin(ang * 0.5)) * 0.004 * (1 - u); // ごとごと
    rollG.position.set(0, PAGE_TOP + r + Math.max(0, bump), G_BACK + laid + r * 0.15);
    roll.scale.set(r, 1, r); rollG.rotation.x = ang;
  };
  setPop(-1); setGround(0); setBook(0);
  const lamp = new THREE.SpotLight('#ffd8a0', 9, 7, 0.7, 0.6, 1.0); lamp.position.set(-0.8, 2.2, 1.4); lamp.target.position.set(0, 0, 0); D.scene.add(lamp, lamp.target);
  const fog0 = D.scene.fog ? D.scene.fog.density : 0;

  // 路地の動かない物をまとめる（的になる看板・タワーの画面は別のまま）
  const sharpA = []; A.scene.traverse(o => { if (o.userData.sharp) sharpA.push(o); });
  sharpA.push(...A.stands.map(h => h.parent), A.towerScreen);
  await mergeStatic(A.scene, { exclude: sharpA, ups: A.ups });
  for (const o of sharpA) markSharp(o);

  // ---- 生きもの ----
  const whaleD = await addWhale(D.scene, { length: 0.32, center: [0, 0.93, -0.38], radius: [0.38, 0.15], speed: 0.13, phase0: 2.2 });
  whaleD.group.visible = false;
  const cat = await addCat(A.scene, { height: 0.045, area: { x: [-0.06, 0.06], z: [-0.4, 0.34] }, seed: (Math.random() * 1e6) | 0 });
  const whale = await addWhale(A.scene, { length: 0.34, center: [0.01, 0.62, -0.58], radius: [0.06, 0.42], speed: 0.07 });

  // 訪問者カウンター：路地の左の壁、手前の店の上
  const counter = counterBoard({ w: 0.085 });
  counter.group.position.set(-0.088, 0.1, 0.43); counter.group.rotation.y = Math.PI / 2 - 0.95; A.scene.add(counter.group);
  A.ups.push(() => counter.update());

  // 録画のときは灯りを減らさない（いちばんきれいな見た目で撮る）。生きものとカウンターは映さない
  if (!record) { optimizeScene(D.scene, { maxLights: 10 }); optimizeScene(A.scene, { maxLights: 16 }); }
  else for (const o of [cat.group, whale.group, counter.group]) o.visible = false;
  for (const o of [cat.group, whale.group, counter.group]) markSharp(o);
  A.scene.traverse(o => { if (o.isPoints) markSharp(o); }); // クジラの星
  lightsForSharp(A.scene);

  // ---- 路地での見回し（ドラッグで少しだけ） ----
  const look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
  const el = renderer.domElement; el.style.touchAction = 'none';
  const tap = createTapGuard(8);
  let drag = null;
  el.addEventListener('pointerdown', e => { tap.down(e.clientX, e.clientY); drag = { x: e.clientX, y: e.clientY, yaw: look.tyaw, pitch: look.tpitch }; });
  const onMove = e => { if (!drag) return; tap.move(e.clientX, e.clientY); look.tyaw = THREE.MathUtils.clamp(drag.yaw - (e.clientX - drag.x) * 0.0016, -0.2, 0.2); look.tpitch = THREE.MathUtils.clamp(drag.pitch - (e.clientY - drag.y) * 0.0012, -0.08, 0.16); };
  const onUp = () => { drag = null; }, onCancel = () => { drag = null; tap.cancel(); };
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel);

  // ---- ページ：路地（ゲーム）・第3工場（道具）・空き地（工事中）。めくると溶けるように切りかわる ----
  const PAGES = ['games', 'tools', 'wip'];
  const pages = { games: { S: A, comp: compA, cam: camA, exposure: 0.72, targets: [...A.stands, A.towerScreen, cat.hit, whale.hit] } };
  let pmrem = null;
  async function buildPage(kind) {
    if (pages[kind]) return pages[kind];
    const ws = works?.filter(w => w.district === kind);
    const mod = kind === 'tools' ? await import('./factorypaper.js') : await import('./lotpaper.js');
    const S = kind === 'tools' ? await mod.buildFactoryPaper({ works: ws, screenCanvas }) : await mod.buildLotPaper({ works: ws, screenCanvas });
    if (S.scene.userData.needsEnv) { pmrem ??= new THREE.PMREMGenerator(renderer); S.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; S.scene.environmentIntensity = 0.35; }
    const c = new THREE.PerspectiveCamera(56, W / H, 0.005, 30); c.layers.enable(DETAIL_LAYER);
    if (!record) optimizeScene(S.scene, { maxLights: 12 });
    const sharpS = [...S.stands.map(h => h.parent), S.towerScreen];
    await mergeStatic(S.scene, { exclude: sharpS, ups: S.ups });
    for (const o of sharpS) markSharp(o);
    lightsForSharp(S.scene);
    const comp = mkComp(S.scene, c); comp.setSize(W, H);
    const pose = kind === 'tools' ? mod.FACTORY_CAM : mod.LOT_CAM;
    pages[kind] = { S, comp, cam: c, pose, exposure: kind === 'tools' ? 0.8 : 0.78, targets: [...S.stands, S.towerScreen] };
    return pages[kind];
  }
  let page = 'games', turning = null; // turning: { from, to, t0 }
  const TURN = 1.6;
  const poseCam = (P, push, aspect) => {
    const c = P.cam, { pos, look, fov } = P.pose;
    const fwd = new THREE.Vector3(...look).sub(new THREE.Vector3(...pos)).normalize();
    c.position.set(...pos).addScaledVector(fwd, push); c.lookAt(...look); c.fov = aspect < 1 ? Math.min(95, fov * (1 + (1 - aspect) * 0.55)) : fov; c.aspect = aspect; c.updateProjectionMatrix();
  };
  // ---- ページ移動：街から本の見開きへ引いて、中身が沈み、ページがめくれ、次の街が立ち上がって、また入っていく ----
  const TT = 8.4; // めくりの全体の長さ（秒）
  const TK = [
    [0, [0, 0.06, 0.3], [0, 0.3, -0.72], 60],
    [1.6, [0, 0.14, 1.12], [0, 0.34, -0.5], 56],
    [3.0, [0.3, 1.5, 2.1], [0, 0.1, 0], 44],
    [5.6, [0.3, 1.5, 2.1], [0, 0.1, 0], 44],
    [7.2, [0, 0.14, 1.12], [0, 0.34, -0.5], 56],
    [8.4, [0, 0.06, 0.3], [0, 0.3, -0.72], 60],
  ];
  // 見開きの中身：路地の街（最初のジオラマ）と、工場街・空き地の小さなジオラマ
  const groundTex0 = D.ground.top.material.map;
  const content = { games: { set: v => { setPop(v * 5.8); }, ground: groundTex0, ave: true, whale: true } };
  function contentOf(kind) {
    if (content[kind]) return content[kind];
    const M = kind === 'tools' ? buildFactoryMini() : buildLotMini();
    D.scene.add(M.group); if (!record) optimizeScene(D.scene, { maxLights: 12 });
    const pb = new Map(M.items.map(o => [o, o.scale.clone()]));
    const del = new Map(M.items.map(o => { const p = o.getWorldPosition(new THREE.Vector3()); return [o, Math.max(0, (p.z + 0.9) * 0.9 + Math.abs(p.x) * 0.6)]; }));
    const dm = Math.max(...del.values(), 1e-3);
    const set = v => { // v: 0 しまった → 1 立ちきった
      const t = v * 2.6;
      for (const o of M.items) { const d = 1.6 * (del.get(o) / dm) ** 0.5, x = clamp01((t - d) / (1.0 - 0.5 * d / 1.6)), k = x <= 0 ? 1e-4 : grow(x), s0 = pb.get(o); o.scale.set(s0.x, s0.y * k, s0.z); o.visible = x > 0; }
      M.group.visible = v > 0;
    };
    set(0);
    return (content[kind] = { set, ground: M.groundTex, ave: false, whale: false, ups: M.ups });
  }
  // めくれる紙：背を軸に、先が少し遅れてしなりながら反対側へ
  const sheetGeo = new THREE.PlaneGeometry(1.1, 1.56, 30, 1);
  const sheetM = new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 1, side: THREE.DoubleSide });
  const sheet = new THREE.Mesh(sheetGeo, sheetM); sheet.visible = false; D.scene.add(sheet);
  const sheetBase = sheetGeo.attributes.position.array.slice();
  function setSheet(f, dir) { // f: 0..1
    sheet.visible = f > 0 && f < 1;
    if (!sheet.visible) return;
    const th = dir > 0 ? Math.PI * f : Math.PI * (1 - f);       // 0=右に寝ている、π=左に寝ている
    const L = 1.1, kap = -(dir > 0 ? 1 : -1) * 1.6 * Math.sin(Math.PI * f) / L; // しなり
    const pos = sheetGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = sheetBase[i * 3] + L / 2, z = sheetBase[i * 3 + 1];
      let x, y; if (Math.abs(kap) < 1e-4) { x = Math.cos(th) * u; y = Math.sin(th) * u; } else { x = (Math.sin(th + kap * u) - Math.sin(th)) / kap; y = -(Math.cos(th + kap * u) - Math.cos(th)) / kap; }
      pos.setXYZ(i, x, Math.max(0, y) + 0.0065, -z);
    }
    pos.needsUpdate = true; sheetGeo.computeVertexNormals();
  }
  function bookTurnFrame(tt, from, to, dir) {
    const aspect = W / H;
    camAt(cam, tt, TK, aspect);
    const flip = clamp01((tt - 2.6) / 1.4), swapped = flip >= 0.5;
    const A0 = contentOf(from), B0 = contentOf(to);
    // 古い中身が沈み、地面が巻き戻る → めくる → 新しい地面が転がり、中身が立ち上がる
    if (!swapped) { A0.set(1 - smooth01((tt - 1.2) / 1.2)); B0.set(0); setGround(1 - smooth01((tt - 1.3) / 1.2)); }
    else { A0.set(0); B0.set(smooth01((tt - 4.4) / 2.8)); setGround(smooth01((tt - 4.0) / 1.8)); }
    const cur = swapped ? B0 : A0;
    D.ground.top.material.map = cur.ground; D.ground.ave.visible = cur.ave;
    for (const o of Object.values(content)) if (o.ups && o.group?.visible !== false) for (const u of o.ups) u(time);
    whaleD.group.visible = cur.whale && (swapped ? tt > 6.2 : tt < 1.6);
    setSheet(flip, dir);
    // 本を見ているあいだは、机のスタンドをまた灯して霧を薄く（本と街がよく見えるように）
    const bell = smooth01((tt - 1.2) / 1.2) * (1 - smooth01((tt - 5.6) / 1.4));
    lamp.intensity = 6 * bell;
    if (D.scene.fog) D.scene.fog.density = fog0 * (1 - 0.65 * bell);
    for (const u of D.ups) u && u(time, 1 / 60);
    if (whaleD.group.visible) whaleD.update(time);
    for (const k of Object.keys(content)) if (k !== from && k !== to) content[k].set(0);
  }

  async function turnTo(kind) {
    if (turning || kind === page || !PAGES.includes(kind) || time < T_ALLEY) return page;
    turning = { from: page, to: kind, t0: null, dir: PAGES.indexOf(kind) > PAGES.indexOf(page) ? 1 : -1 };
    try { await buildPage(kind); } catch (e) { turning = null; throw e; }
    contentOf(turning.from); contentOf(kind);
    turning.t0 = time;
    await new Promise(ok => { turning.done = ok; });
    return page;
  }

  // ---- 時間と描画 ----
  let time = reducedMotion || startInAlley ? T_ALLEY : 0, introDone = false, paused = false;
  const frameCbs = [];
  const yawQ = new THREE.Quaternion(), pitchQ = new THREE.Quaternion();
  function renderAt(t, dt = 1 / 60) {
    time = t;
    const intro = !turning && !introDone;
    if (intro) {
      const oc = clamp01((t - 0.8) / 3.2);
      setBook(oc < 0.5 ? 4 * oc ** 3 : 1 - (-2 * oc + 2) ** 3 / 2);
      setGround(smooth01((t - 3.4) / 2.8)); // ゆっくり押し出して、ころころ転がり、最後はそっと止まる
      setPop(t - 4.2);
      if (t >= T_ALLEY) introDone = true;
    }
    lamp.intensity = 9 * (1 - ease(clamp01((t - 4.8) / 3.2)));
    if (D.scene.fog) D.scene.fog.density = fog0 * (0.25 + 0.75 * ease(clamp01((t - 3.0) / 4.0)));
    const k = clamp01((t - T_X) / X_DUR);
    const aspect = W / H;
    if (k < 1) { camAt(cam, Math.min(t, K.at(-1)[0]), K, aspect); for (const u of D.ups) u && u(t, dt); whaleD.update(t); const wv = smooth01((t - 8.0) / 1.8); whaleD.group.visible = wv > 0; whaleD.group.scale.setScalar(Math.max(1e-3, wv)); }
    if (k > 0) {
      camAt(camA, t - T_X, KA, aspect);
      // 着いてからはドラッグで少し見回せる
      const lw = smooth01((t - T_ALLEY + 0.5) / 0.8);
      look.yaw += (look.tyaw - look.yaw) * Math.min(1, dt * 6); look.pitch += (look.tpitch - look.pitch) * Math.min(1, dt * 6);
      yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), look.yaw * lw); pitchQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), look.pitch * lw);
      camA.quaternion.premultiply(yawQ).multiply(pitchQ);
      for (const u of A.ups) u && u(t);
      cat.update(t); whale.update(t);
    }
    for (const cb of frameCbs) cb(dt, t);
    // 他のページ（工場・空き地）とめくりの途中
    const aspect2 = W / H;
    const lookQ = q => q.premultiply(yawQ).multiply(pitchQ);
    const drawPage = (kind, push) => { const P = pages[kind]; if (kind !== 'games') { poseCam(P, push, aspect2); lookQ(P.cam.quaternion); for (const u of P.S.ups) u && u(t); } else if (push) camA.position.addScaledVector(camA.getWorldDirection(new THREE.Vector3()), push); renderer.toneMappingExposure = P.exposure; P.comp.render(); return P.comp; };
    if (turning && turning.t0 != null) {
      const tt = turning.skip ? TT : Math.min(TT, t - turning.t0);
      bookTurnFrame(tt, turning.from, turning.to, turning.dir);
      renderer.toneMappingExposure = 0.8;
      const kIn = smooth01(tt / 1.0), kOut = smooth01((tt - 7.6) / 0.8);
      if (kIn < 1) { const a = drawPage(turning.from, 0); compD.render(); out(a, compD, kIn); }
      else if (kOut > 0) { compD.render(); const b = drawPage(turning.to, 0); out(compD, b, kOut); }
      else { compD.render(); out(compD, compD, 0); }
      if (tt >= TT) { page = turning.to; const done = turning.done; turning = null; done && done(); }
      return;
    }
    if (k >= 1 && page !== 'games') { const P = pages[page]; present(drawPage(page, 0), P.S.scene, P.cam, P.exposure); return; }
    if (k >= 1) { renderer.toneMappingExposure = 0.72; compA.render(); present(compA, A.scene, camA, 0.72); return; }
    if (k < 1) { renderer.toneMappingExposure = 0.8; compD.render(); }
    if (k > 0) { renderer.toneMappingExposure = 0.72; compA.render(); }
    out(k < 1 ? compD : compA, k > 0 ? compA : compD, ease(k));
  }

  function resize() {
    [W, H] = size(); if (!W || !H) return;
    renderer.setSize(W, H);
    for (const c of [compD, ...Object.values(pages).map(p => p.comp)]) { c.setPixelRatio(BG_PR); c.setSize(W, H); }
  }
  const ro = new ResizeObserver(resize); ro.observe(container);

  // タッチの相手を探す
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    if (time < T_ALLEY - 0.6 || turning) return null;
    const P = pages[page], targets = P.targets, camP = page === 'games' ? camA : P.cam;
    const r = el.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    camP.updateMatrixWorld(); ray.setFromCamera(ndc, camP);
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const o = hit.object;
    if (o === cat.hit) return { cat: true };
    if (o === whale.hit) return { whale: true };
    if (o === P.S.towerScreen) return { billboard: true };
    return o.userData.workId ? { workId: o.userData.workId } : null;
  }

  const tune = adaptiveResolution({ min: 0.5, max: BG_PR, start: BG_PR, apply: pr => { if (pr === BG_PR) return; BG_PR = pr; for (const c of [compD, ...Object.values(pages).map(p => p.comp)]) { c.setPixelRatio(pr); c.setSize(W, H); } } });
  let running = !manual, last = performance.now();
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (paused) return; // 録画を流しているあいだは描かない
    renderAt(time + dt, dt);
    if (!document.hidden) tune(dt);
  }
  if (running) loop(); else renderAt(time);

  return {
    renderer, cat, whale, PAGES,
    get page() { return page; }, get busy() { return !!turning; },
    get stands() { return Object.values(pages).flatMap(p => p.S.stands); },
    get screenTex() { return pages[page].S.screenTex; },
    turnTo,
    setPaused(v) { paused = v; last = performance.now(); },
    replayIntro() { time = 0; introDone = false; },
    // 録画を見せたあとなどに、アニメーションなしでそのページへ
    async jumpTo(kind) { if (turning || !PAGES.includes(kind)) return; await buildPage(kind); time = Math.max(time, T_ALLEY); page = kind; },
    prepare: buildPage,
    setVisitors(n) { counter.set(n); },
    get time() { return time; },
    get inAlley() { return time >= T_ALLEY; },
    skip() { if (time < T_ALLEY) time = T_ALLEY; if (turning) turning.skip = true; },
    pick, isTap: (x, y) => tap.up(x, y), onFrame(cb) { frameCbs.push(cb); },
    renderAt,
    get __scenes() { return { D: D.scene, A: A.scene, ...Object.fromEntries(Object.entries(pages).filter(([k]) => k !== 'games').map(([k, p]) => [k, p.S.scene])) }; },
    // 確認用：物の画面上の位置
    screenOf(o) { const v = o.getWorldPosition(new THREE.Vector3()).project(page === 'games' ? camA : pages[page].cam), r = el.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; },
    dispose() { running = false; ro.disconnect(); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel); renderer.dispose(); },
  };
}
