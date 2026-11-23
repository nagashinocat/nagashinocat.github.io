// レンダラ・カメラ・ブルーム・品質段階・ピック
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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

  function placeCamera() {
    const W = container.clientWidth || 1, H = container.clientHeight || 1;
    const aspect = W / H;
    const portrait = aspect < 0.9;
    // 縦画面は上から覗き込む、横画面は斜めから
    const basePitch = portrait ? 40 : 21;
    const vfov = camera.fov * DEG;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const halfW = portrait ? 0.6 : 1.18;
    const dist = Math.max(halfW / Math.tan(hfov / 2), (portrait ? 0.9 : 1.05) / Math.tan(vfov / 2));
    TARGET.x = portrait ? look.pan : 0;
    TARGET.y = portrait ? 0.36 : 0.5;
    const pitch = (basePitch + look.pitch) * DEG, yaw = look.yaw * DEG;
    camera.position.set(
      TARGET.x + dist * Math.cos(pitch) * Math.sin(yaw),
      TARGET.y + dist * Math.sin(pitch),
      TARGET.z + dist * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(TARGET.x, TARGET.y, TARGET.z);
    stage.portrait = portrait;
  }

  function resize() {
    const W = container.clientWidth || 1, H = container.clientHeight || 1;
    const pr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 2 : 1.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); }
    placeCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ドラッグで ±12° だけ覗き込む
  let drag = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: look.tyaw, pitch: look.tpitch, pan: look.tpan, moved: 0 }; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    // 縦画面は横にスライドして街を見渡す、横画面は少し回り込む
    if (stage.portrait) look.tpan = THREE.MathUtils.clamp(drag.pan - dx * 0.0035, -0.48, 0.48);
    else look.tyaw = THREE.MathUtils.clamp(drag.yaw - dx * 0.08, -12, 12);
    look.tpitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.06, -8, 10);
  });
  window.addEventListener('pointerup', () => { stage.lastDragDistance = drag?.moved ?? 0; drag = null; });

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
    placeCamera();
    for (const cb of frameCbs) cb(dt);
    composer ? composer.render() : renderer.render(scene, camera);
  }

  const stage = {
    renderer, scene, camera, lastDragDistance: 0,
    get tier() { return tier; },
    setTier(t) { tier = t; buildComposer(); resize(); },
    onFrame(cb) { frameCbs.push(cb); },
    setPickables(list) { pickables.length = 0; pickables.push(...list); },
    pick,
    dispose() { running = false; ro.disconnect(); renderer.dispose(); },
  };
  buildComposer();
  resize();
  loop();
  return stage;
}
