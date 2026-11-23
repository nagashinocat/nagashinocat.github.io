// 路地の生きもの：黒猫（歩く・座る・寝る・のびる、タッチで影に溶けてワープ）と、空を泳ぐクジラ（タッチで星の潮吹き）
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const ROOT = new URL('../../', import.meta.url).href;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

// 骨を「世界の軸」のまわりに回す（骨ごとの向きのちがいを吸収する）
function rigOf(root) {
  root.updateMatrixWorld(true);
  const bones = {};
  root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const rest = new Map();
  for (const b of Object.values(bones)) rest.set(b, { q: b.quaternion.clone(), p: b.position.clone(), wq: b.getWorldQuaternion(new THREE.Quaternion()), wp: b.getWorldPosition(new THREE.Vector3()) });
  const rootInv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const tmpQ = new THREE.Quaternion(), ax = new THREE.Vector3();
  return {
    bones, rest,
    reset() { for (const [b, r] of rest) { b.quaternion.copy(r.q); b.position.copy(r.p); } },
    // axis はモデルの座標で。各骨の休み姿勢の向きで、ローカル軸に直してから回す
    rot(name, axis, a) {
      const b = bones[name] || bones[THREE.PropertyBinding.sanitizeNodeName(name)]; if (!b || !a) return; const r = rest.get(b);
      ax.set(...axis).applyQuaternion(tmpQ.copy(rootInv).multiply(r.wq).invert()).normalize();
      b.quaternion.multiply(tmpQ.setFromAxisAngle(ax, a));
    },
  };
}

// 輪郭がうっすら光る（暗い路地でも黒猫の形が分かるように）
function rim(mat, color, k) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.rimC = { value: new THREE.Color(color).multiplyScalar(k) };
    sh.fragmentShader = 'uniform vec3 rimC;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += rimC * pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);');
  };
}

// 星のテクスチャ
let starTex;
function starTexture() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 7 : 18; g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); }
  g.fill();
  starTex = new THREE.CanvasTexture(c); return starTex;
}

// 影（足もとのぼんやりした楕円）
function shadowMesh() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m;
}

// ================= 黒猫 =================
export async function addCat(scene, { height = 0.034, area = { x: [-0.09, 0.09], z: [-0.75, 0.55] }, seed = 1 } = {}) {
  const g = await loader.loadAsync(ROOT + 'assets/models/cat.glb');
  const model = g.scene; model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.roughness = 0.75; rim(o.material, '#a89cff', 1.6); } } });
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  const k = height / size.y;
  const body = new THREE.Group(); body.add(model); model.scale.setScalar(k); model.position.y = -box.min.y * k;
  const cat = new THREE.Group(); cat.add(body); scene.add(cat);
  const shadow = shadowMesh(); shadow.scale.set(height * 1.4, height * 1.9, 1); shadow.position.y = 0.0035; scene.add(shadow);
  // 目のあたりに小さな光（暗い路地でも猫だと分かるように）
  const eye = new THREE.PointLight('#ffe08a', 0.006, 0.08, 2); eye.position.set(0, height * 0.85, height * 0.6); cat.add(eye);
  // タッチ判定用の見えない球
  const hit = new THREE.Mesh(new THREE.SphereGeometry(height * 0.9, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = height * 0.5; cat.add(hit);
  const rig = rigOf(model);

  let rs = seed >>> 0; const rnd = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pickSpot = () => new THREE.Vector3(area.x[0] + (area.x[1] - area.x[0]) * rnd(), 0, area.z[0] + (area.z[1] - area.z[0]) * rnd());

  // ふるまい：walk → (sit | sleep | stretch) → walk ...、タッチで warp
  const st = { mode: 'walk', t0: 0, dur: 0, from: new THREE.Vector3(), to: pickSpot(), heading: 0, phase: 0, warpTo: null };
  cat.position.copy(pickSpot()); st.from.copy(cat.position);
  const SPEED = height * 0.75; // 1秒にからだ1つ弱
  function next(t) {
    const r = rnd();
    if (st.mode === 'walk') {
      st.mode = r < 0.35 ? 'sit' : r < 0.65 ? 'stretch' : 'sleep';
      st.dur = { sit: 3 + rnd() * 3, stretch: 3.2, sleep: 8 + rnd() * 6 }[st.mode];
    } else { st.mode = 'walk'; st.to = pickSpot(); st.dur = 0; }
    st.t0 = t;
  }

  // ---- 姿勢 ----
  const legs = [['rear', 'L', 0], ['front', 'L', 0.25], ['rear', 'R', 0.5], ['front', 'R', 0.75]];
  function poseWalk(ph, w) {
    for (const [fr, s, off] of legs) {
      const p = (ph + off) * Math.PI * 2, sw = Math.sin(p), lift = Math.max(0, Math.cos(p));
      rig.rot(`${fr}Upr.${s}`, [1, 0, 0], -0.4 * sw * w);
      if (fr === 'front') { rig.rot(`frontLwr.${s}`, [1, 0, 0], 0.7 * lift * w); rig.rot(`frontFoot.${s}`, [1, 0, 0], 0.4 * lift * w); }
      else { rig.rot(`rearLwr.${s}`, [1, 0, 0], 0.35 * lift * w); rig.rot(`rearHorselink.${s}`, [1, 0, 0], -0.45 * lift * w); }
    }
    rig.rot('spine2', [0, 0, 1], 0.05 * Math.sin(ph * Math.PI * 2) * w);
    rig.rot('neck1', [1, 0, 0], 0.05 * Math.sin(ph * Math.PI * 4) * w);
  }
  function poseTail(t, curl) {
    const names = ['tail_01', 'tail1', 'tail2', 'tail3', 'tail4', 'tail_06'];
    names.forEach((n, i) => rig.rot(n, [0, 1, 0], 0.25 * Math.sin(t * 1.6 - i * 0.7) * (1 - curl) + curl * 0.45));
  }
  // 座る：お尻を落として、前足をまっすぐ立てる
  function poseSit(w) {
    rig.rot('hips', [1, 0, 0], -0.75 * w); rig.rot('spine2', [1, 0, 0], -0.2 * w);
    for (const s of ['L', 'R']) {
      rig.rot(`rearUpr.${s}`, [1, 0, 0], -0.7 * w); rig.rot(`rearLwr.${s}`, [1, 0, 0], 2.2 * w); rig.rot(`rearHorselink.${s}`, [1, 0, 0], -0.9 * w);
      rig.rot(`frontUpr.${s}`, [1, 0, 0], 0.95 * w);
    }
    rig.rot('neck1', [1, 0, 0], 0.65 * w);
  }
  // のび：前足を前へまっすぐ、胸を下げてお尻を上げる
  function poseStretch(w) {
    rig.rot('spine2', [1, 0, 0], 0.38 * w); rig.rot('chest', [1, 0, 0], 0.5 * w); rig.rot('spine_04', [1, 0, 0], 0.15 * w);
    for (const s of ['L', 'R']) { rig.rot(`frontUpr.${s}`, [1, 0, 0], -1.85 * w); rig.rot(`frontLwr.${s}`, [1, 0, 0], 0.15 * w); rig.rot(`rearUpr.${s}`, [1, 0, 0], 0.3 * w); rig.rot(`frontFoot.${s}`, [1, 0, 0], 0.5 * w); }
    rig.rot('neck1', [1, 0, 0], -0.75 * w); rig.rot('head', [1, 0, 0], -0.25 * w);
    rig.rot('jaw', [1, 0, 0], 0.35 * w * smooth((w - 0.6) / 0.4)); // あくび
  }
  // 寝る：足をたたんで、おなかを地面につけて丸くなる
  function poseSleep(w, breath) {
    for (const s of ['L', 'R']) {
      rig.rot(`rearUpr.${s}`, [1, 0, 0], -1.2 * w); rig.rot(`rearLwr.${s}`, [1, 0, 0], 2.3 * w); rig.rot(`rearHorselink.${s}`, [1, 0, 0], -1.0 * w);
      rig.rot(`frontUpr.${s}`, [1, 0, 0], -1.0 * w); rig.rot(`frontLwr.${s}`, [1, 0, 0], 2.4 * w);
    }
    rig.rot('spine2', [0, 1, 0], 0.3 * w); rig.rot('chest', [0, 1, 0], 0.3 * w);
    rig.rot('neck1', [1, 0, 0], 0.45 * w); rig.rot('neck1', [0, 1, 0], 0.6 * w); rig.rot('head', [0, 0, 1], 0.3 * w);
    rig.rot('chest', [1, 0, 0], 0.04 * Math.sin(breath) * w);
    rig.rot('tail_01', [1, 0, 0], -1.0 * w);
  }
  const bodyDrop = { sit: 0.3, stretch: 0.06, sleep: 0.38 };

  let lastT = 0, warp = null;
  function update(t) {
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    rig.reset();
    let walkW = 0, drop = 0;
    if (warp) { // 影に溶けて、別の場所の影から出てくる
      const u = (t - warp.t0) / 2.4;
      if (u < 0.35) { const v = smooth(u / 0.35); body.scale.set(1 + v * 0.3, 1 - v * 0.98, 1 + v * 0.3); shadow.scale.set(height * (1.4 + v * 0.8), height * (1.9 + v * 0.8), 1); }
      else if (u < 0.6) { const v = smooth((u - 0.35) / 0.25); body.visible = false; cat.position.lerpVectors(warp.from, warp.to, v); shadow.scale.set(height * 2.2 * (1 - v * 0.6), height * 2.7 * (1 - v * 0.6), 1); }
      else { const v = smooth((u - 0.6) / 0.4); body.visible = true; cat.position.copy(warp.to); body.scale.set(1.3 - v * 0.3, 0.02 + v * 0.98, 1.3 - v * 0.3); shadow.scale.set(height * (1.4 + (1 - v) * 0.6), height * (1.9 + (1 - v) * 0.6), 1); }
      poseSit(0.0); poseTail(t, 0);
      if (u >= 1) { warp = null; body.scale.set(1, 1, 1); st.mode = 'sit'; st.t0 = t; st.dur = 2.5; }
    } else {
      const el = t - st.t0;
      if (st.mode === 'walk') {
        const d = new THREE.Vector3().subVectors(st.to, cat.position); d.y = 0;
        const want = Math.atan2(d.x, d.z);
        let dh = want - st.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        st.heading += dh * Math.min(1, dt * 3);
        const ramp = smooth(el / 0.6);
        const sp = SPEED * ramp * (Math.abs(dh) > 1.2 ? 0.3 : 1);
        cat.position.x += Math.sin(st.heading) * sp * dt; cat.position.z += Math.cos(st.heading) * sp * dt;
        st.phase += dt * sp / (height * 0.55);
        walkW = ramp; poseWalk(st.phase, walkW); poseTail(t, 0);
        if (d.length() < height * 0.3) next(t);
      } else {
        const inn = smooth(el / 0.8), out = smooth((st.dur - el) / 0.8), w = Math.min(inn, out);
        if (st.mode === 'sit') { poseSit(w); poseTail(t * 0.5, 0.5 * w); drop = bodyDrop.sit * w; }
        if (st.mode === 'stretch') { const s = smooth(el / 1.2) * smooth((st.dur - el) / 1.0); poseStretch(s); poseTail(t, 0); drop = bodyDrop.stretch * s; }
        if (st.mode === 'sleep') { poseSleep(w, t * 1.6); poseTail(t * 0.1, w); drop = bodyDrop.sleep * w; }
        if (el > st.dur) next(t);
      }
      cat.rotation.y = st.heading;
    }
    body.position.y = -drop * height;
    shadow.position.x = cat.position.x; shadow.position.z = cat.position.z; shadow.rotation.z = -cat.rotation.y;
  }
  return {
    group: cat, hit, update,
    get mode() { return warp ? 'warp' : st.mode; },
    // 確認用：姿勢を固定して見る
    debugRot(list) { rig.reset(); for (const [n, a] of list) rig.rot(n, [1, 0, 0], a); },
    debugPose(name, w = 1, t = 0) { rig.reset(); body.position.y = 0; ({ walk: () => poseWalk(t, w), sit: () => { poseSit(w); body.position.y = -bodyDrop.sit * w * height; }, stretch: () => { poseStretch(w); body.position.y = -bodyDrop.stretch * w * height; }, sleep: () => { poseSleep(w, 0); poseTail(0, w); body.position.y = -bodyDrop.sleep * w * height; } })[name]?.(); },
    // タッチ：今の場所から少し離れた場所へワープ
    tap(t) {
      if (warp) return;
      let to; for (let i = 0; i < 10; i++) { to = pickSpot(); if (to.distanceTo(cat.position) > 0.35) break; }
      warp = { t0: t, from: cat.position.clone(), to };
    },
  };
}

// ================= 空を泳ぐクジラ =================
export async function addWhale(scene, { length = 0.4, center = [0, 0.74, -0.85], radius = [0.2, 0.38], speed = 0.09 } = {}) {
  const g = await loader.loadAsync(ROOT + 'assets/models/whale.glb');
  const model = g.scene; model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.emissive = new THREE.Color('#3a2a7a'); o.material.emissiveIntensity = 0.5; o.material.emissiveMap = o.material.map; } } });
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = length / size.z;
  const whale = new THREE.Group(); const inner = new THREE.Group(); inner.add(model);
  model.scale.setScalar(k); model.position.set(-c.x * k, -c.y * k, -c.z * k); whale.add(inner); scene.add(whale);
  // 体のまわりの淡い光（夜空でも形が分かるように）
  const glow = new THREE.PointLight('#8a7aff', 0.25, length * 1.6, 2); whale.add(glow);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(length * 0.42, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.scale.set(0.6, 0.6, 1.2); whale.add(hit);
  const rig = rigOf(model);
  // 尾の骨：体の後ろ（-z）ほど大きく上下に振る
  const tail = [], fins = [];
  for (const [b, r] of rig.rest) {
    const lp = model.worldToLocal(r.wp.clone());
    const zr = (lp.z - box.min.z) / size.z; // 0=しっぽの先 1=頭
    if (Math.abs(lp.x) > size.x * 0.25 && zr > 0.35) fins.push([b.name, Math.sign(lp.x)]);
    else if (zr < 0.6) tail.push([b.name, 1 - zr]);
  }
  // 潮吹きの出口（頭の上）
  const blow = new THREE.Vector3(0, (box.max.y - c.y) * k * 0.62, (box.max.z - c.z) * k * 0.55);

  // 星の潮吹き
  const N = 240;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N).fill(-1), sz = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: starTexture() }, scale: { value: 400 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: 'attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * 300. / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * 2.2, 1.) * t.a; }',
  });
  const stars = new THREE.Points(geo, mat); stars.frustumCulled = false; scene.add(stars);
  const PAL = ['#ff5fd2', '#5fe0ff', '#ffd84f', '#8aff7a', '#b88aff', '#ff8a4f', '#ffffff'].map(h => new THREE.Color(h));
  let spoutT = -99, spoutFrom = new THREE.Vector3(), emitted = 0;

  let lastT = 0, ang = 0;
  function update(t) {
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    // 空をゆっくり大きく回る（少し上下にうねる）
    ang += dt * speed / ((radius[0] + radius[1]) / 2);
    const p = (a) => new THREE.Vector3(center[0] + Math.sin(a) * radius[0], center[1] + Math.sin(a * 2) * 0.05, center[2] + Math.cos(a) * radius[1]);
    const here = p(ang), ahead = p(ang + 0.05);
    whale.position.copy(here); whale.lookAt(ahead);
    inner.rotation.z = -Math.sin(ang) * 0.18; // 曲がる方へ少し傾く
    rig.reset();
    const sw = t * 2.2;
    for (const [n, w] of tail) rig.rot(n, [1, 0, 0], 0.09 * Math.sin(sw - w * 2.4) * (0.3 + w));
    for (const [n, s] of fins) rig.rot(n, [0, 0, 1], s * 0.18 * Math.sin(sw * 0.5 + 1));
    inner.position.y = Math.sin(sw) * length * 0.015;
    // 星
    const el = t - spoutT;
    if (el >= 0 && el < 1.1) { // 1.1秒のあいだ噴き出し続ける
      const want = Math.floor(N * el / 1.1);
      whale.updateMatrixWorld(true); spoutFrom.copy(blow); inner.localToWorld(spoutFrom);
      for (; emitted < want; emitted++) {
        const i = emitted % N; life[i] = 0;
        pos.set([spoutFrom.x, spoutFrom.y, spoutFrom.z], i * 3);
        const a = Math.random() * Math.PI * 2, s = 0.04 + Math.random() * 0.12;
        vel.set([Math.cos(a) * s, 0.28 + Math.random() * 0.22, Math.sin(a) * s], i * 3);
        const cc = PAL[Math.floor(Math.random() * PAL.length)]; col.set([cc.r, cc.g, cc.b], i * 3);
        sz[i] = 0.02 + Math.random() * 0.02;
      }
    }
    for (let i = 0; i < N; i++) {
      if (life[i] < 0) { sz[i] = 0; continue; }
      life[i] += dt; const L = life[i];
      vel[i * 3 + 1] -= 0.32 * dt; // 落ちてくる
      vel[i * 3] *= 1 - 0.4 * dt; vel[i * 3 + 2] *= 1 - 0.4 * dt; if (vel[i * 3 + 1] < -0.09) vel[i * 3 + 1] = -0.09; // ひらひら
      pos[i * 3] += vel[i * 3] * dt + Math.sin(L * 3 + i) * 0.004 * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const tw = 0.7 + 0.3 * Math.sin(L * 9 + i * 1.7);
      sz[i] = (pos[i * 3 + 1] < 0.01 || L > 9) ? 0 : (0.022 + (i % 5) * 0.005) * tw * (L < 6 ? 1 : 1 - (L - 6) / 3);
      if (sz[i] === 0) life[i] = -1;
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.size.needsUpdate = true;
  }
  return {
    group: whale, hit, update,
    tap(t) { if (t - spoutT < 1.1) return; spoutT = t; emitted = 0; },
  };
}
