// 通路の奥の丸いタワー（ジオラマと路地の両方で使う）
// 青いネオンの輪、冠と尖塔、猫のネオン、「ながしの猫」、横長の大画面、サーチライト4本
import * as THREE from 'three';
import { makeSign, makeSign2 } from './signs.js';

const tx = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

/** R: 半径, H: 高さ, screenTex: 画面のテクスチャ。原点は足元の中心。返り値 { group, screen, update(t) } */
export function roundTower({ R = 0.12, H = 1.05, screenTex, rng = Math.random } = {}) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const x = c.getContext('2d');
  x.fillStyle = '#141838'; x.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 22) for (let xx = 0; xx < 1024; xx += 14) if (rng() < 0.45) { x.fillStyle = rng() < 0.7 ? '#ffcf7a' : '#7fd8ff'; x.fillRect(xx + 3, y + 5, 8, 11); }
  for (let y = 0; y < 1024; y += 88) { x.fillStyle = '#4fd8ff'; x.fillRect(0, y, 1024, 3); }
  const t = tx(c);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, H, 48), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.7 }));
  body.position.y = H / 2; g.add(body);
  for (const y of [H * 0.24, H * 0.52, H - 0.02]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.004, 0.003, 6, 56), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.2, 3), toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  const cm = new THREE.MeshStandardMaterial({ color: '#1e2448', emissive: '#2a3a8a', emissiveIntensity: 0.4 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.75, R, 0.08, 48), cm); crown.position.y = H + 0.04; g.add(crown);
  const crown2 = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.4, R * 0.7, 0.06, 32), cm); crown2.position.y = H + 0.11; g.add(crown2);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.18, 6), new THREE.MeshStandardMaterial({ color: '#8a8ab0' })); spire.position.y = H + 0.23; g.add(spire);
  // 横長の大画面（16:9）
  const sw = R * 1.7, sh = sw * 9 / 16, sy = H * 0.6;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: new THREE.Color(2, 2, 2) }));
  screen.position.set(0, sy, R + 0.006); screen.userData.billboard = true; g.add(screen);
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.06, sh * 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 2.2), toneMapped: false })); fr.position.set(0, sy, R + 0.005); g.add(fr);
  const ups = [];
  const neko = makeSign2('neonicon', 'cat', '#ff3b5a', [R * 1.1, R * 0.92], { rng }); neko.group.position.set(0, sy + sh / 2 + R * 0.62, R + 0.008); g.add(neko.group); if (neko.update) ups.push(neko.update);
  const nm = makeSign('neon', 'ながしの猫', '#ff4fd8', [R * 1.4, R * 0.38], { rng }); nm.group.position.set(0, sy + sh / 2 + R * 1.45, R + 0.008); g.add(nm.group); if (nm.update) ups.push(nm.update);
  const L = new THREE.PointLight('#c04fff', 0.6, 1.4, 2); L.position.set(0, sy, R + 0.3); g.add(L);
  const beam = new THREE.MeshBasicMaterial({ color: '#8fc8ff', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beams = [];
  for (const [sx, a] of [[-1, 0.55], [-1, 0.2], [1, 0.2], [1, 0.55]]) { const p = new THREE.Group(); p.userData.noReflect = true; p.position.set(sx * R * 0.5, H + 0.05, 0); const cn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 3, 12, 1, true), beam); cn.position.y = 1.5; cn.rotation.z = Math.PI; p.add(cn); g.add(p); beams.push([p, sx, a]); }
  const update = tt => { for (const [p, sx, a] of beams) p.rotation.z = -sx * (a + Math.sin(tt * 0.4 + a * 7) * 0.08); for (const u of ups) u(tt); };
  update(0.4);
  return { group: g, screen, update };
}
