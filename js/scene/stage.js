// レンダラ・カメラ・ブルーム・品質段階・ピック
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createTapGuard } from '../util.js';

const DEG = Math.PI / 180;
const TARGET = new THREE.Vector3(0, 0.5, 0);

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d0710');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);

  let tier = 'high', composer = null, bloom = null;
  const frameCbs = [];
  const pickables = [];
  const look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, pan: 0, tpan: 0 };

  function buildComposer() {
    composer?.dispose?.();
    composer = null;
    if (tier !== 'high') return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.4, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    resize();
  }

  // 視点：overview（本を斜め上から）と street（路地の入口）。blend で混ぜる
  const view = { blend: 0, street: null, fly: null };
  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p1 = new THREE.Vector3(), _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
  function overviewPose(aspect) {
    const portrait = aspect < 0.9;
    const basePitch = portrait ? 40 : 21;
    const vfov = camera.fov * DEG;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const halfW = portrait ? 0.6 : 1.18;
    const dist = Math.max(halfW / Math.tan(hfov / 2), (portrait ? 0.9 : 1.05) / Math.tan(vfov / 2));
    TARGET.x = portrait ? look.pan : 0;
    TARGET.y = portrait ? 0.36 : 0.5;
    const pitch = (basePitch + look.pitch) * DEG, yaw = look.yaw * DEG;
    const pos = new THREE.Vector3(
      TARGET.x + dist * Math.cos(pitch) * Math.sin(yaw),
      TARGET.y + dist * Math.sin(pitch),
      TARGET.z + dist * Math.cos(pitch) * Math.cos(yaw));
    const m = new THREE.Matrix4().lookAt(pos, TARGET, camera.up);
    const proj = new THREE.Matrix4().makePerspective(...frustum(camera.fov, aspect, 0.05), 0.05, 60);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m), proj };
  }
  function frustum(fovDeg, aspect, near) {
    const t = near * Math.tan(fovDeg * DEG / 2), w = t * aspect;
    return [-w, w, t, -t];
  }
  function streetPose(aspect) {
    const v = view.street;
    // ドラッグで少しだけ横・縦に動いて、奥行き（視差）を見せる
    const pos = v.position.clone().add(new THREE.Vector3(look.yaw * 0.0016, Math.max(-0.008, look.pitch * 0.0012), 0));
    const m = new THREE.Matrix4().lookAt(pos, v.target.clone().add(new THREE.Vector3(look.yaw * 0.0016, look.pitch * 0.0012, 0)), camera.up);
    const fov = typeof v.fov === 'function' ? v.fov(aspect) : (v.fov || 55);
    const proj = v.projection ? v.projection(aspect) : new THREE.Matrix4().makePerspective(...frustum(fov, aspect, 0.004), 0.004, 40);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m), proj };
  }
  // いまの視点（overview か、路地などの street 視点）と、そこへ向かう途中の補間
  let mode = { kind: 'overview' };
  let trans = null; // { from: {pos, quat, proj}, t, dur, ok }
  function poseOf(m, aspect) {
    if (m.kind === 'overview') return overviewPose(aspect);
    view.street = m.v; return streetPose(aspect);
  }
  function placeCamera() {
    const W = container.clientWidth || 1, H = container.clientHeight || 1;
    const aspect = W / H;
    stage.portrait = aspect < 0.9;
    const b = poseOf(mode, aspect);
    let pos = b.pos, quat = b.quat, proj = b.proj;
    if (trans) {
      const t = Math.min(1, trans.t / trans.dur), e = t * t * (3 - 2 * t);
      const a = trans.from;
      pos = _p1.copy(a.pos).lerp(b.pos, e);
      quat = _q1.copy(a.quat).slerp(b.quat, e);
      proj = _m1.copy(a.proj);
      for (let i = 0; i < 16; i++) proj.elements[i] += (b.proj.elements[i] - a.proj.elements[i]) * e;
    }
    camera.position.copy(pos);
    camera.quaternion.copy(quat);
    camera.projectionMatrix.copy(proj);
    camera.projectionMatrixInverse.copy(proj).invert();
    camera.updateMatrixWorld();
  }
  // target: 'overview' か、{ position, target, fov } の視点
  function flyTo(target, dur = 1.2) {
    return new Promise(ok => {
      trans?.ok();
      trans = { from: { pos: camera.position.clone(), quat: camera.quaternion.clone(), proj: camera.projectionMatrix.clone() }, t: 0, dur, ok };
      mode = target === 'overview' ? { kind: 'overview' } : { kind: 'street', v: target };
    });
  }

  function resize() {
    const W = container.clientWidth || 1, H = container.clientHeight || 1;
    const pr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 2 : 1.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = W / H;
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); }
    placeCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ドラッグで ±12° だけ覗き込む
  let drag = null;
  const el = renderer.domElement;
  const tap = createTapGuard(8);
  el.addEventListener('pointerdown', e => { tap.down(e.clientX, e.clientY); drag = { x: e.clientX, y: e.clientY, yaw: look.tyaw, pitch: look.tpitch, pan: look.tpan, moved: 0 }; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    tap.move(e.clientX, e.clientY);
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    // 縦画面は横にスライドして街を見渡す、横画面は少し回り込む
    if (stage.portrait && mode.kind === 'overview') look.tpan = THREE.MathUtils.clamp(drag.pan - dx * 0.0035, -0.48, 0.48);
    else look.tyaw = THREE.MathUtils.clamp(drag.yaw - dx * 0.08, -12, 12);
    look.tpitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.06, -8, 10);
  });
  window.addEventListener('pointerup', () => { drag = null; });
  window.addEventListener('pointercancel', () => { drag = null; tap.cancel(); });

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = el.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables.filter(o => o.visible), false)[0];
    if (!hit) return null;
    const u = hit.object.userData;
    return u.billboard ? { billboard: true } : u.workId ? { workId: u.workId } : null;
  }

  const clock = new THREE.Clock();
  let running = true;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    look.yaw += (look.tyaw - look.yaw) * Math.min(1, dt * 6);
    look.pitch += (look.tpitch - look.pitch) * Math.min(1, dt * 6);
    look.pan += (look.tpan - look.pan) * Math.min(1, dt * 6);
    if (trans) { trans.t += dt; if (trans.t >= trans.dur) { placeCamera(); const ok = trans.ok; trans = null; ok(); } }
    placeCamera();
    for (const cb of frameCbs) cb(dt);
    composer ? composer.render() : renderer.render(scene, camera);
  }

  const stage = {
    renderer, scene, camera,
    // canvas の pointerup で呼ぶ：この操作がタップなら true
    isTap: (x, y) => tap.up(x, y),
    get tier() { return tier; },
    setTier(t) { tier = t; buildComposer(); resize(); },
    onFrame(cb) { frameCbs.push(cb); },
    flyTo,
    get inStreet() { return mode.kind === 'street' && !trans; },
    setPickables(list) { pickables.length = 0; pickables.push(...list); },
    pick,
    dispose() { running = false; ro.disconnect(); renderer.dispose(); },
  };
  buildComposer();
  resize();
  loop();
  return stage;
}
