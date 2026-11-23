// 九龍城の部品（Meshy のモデルを分けて塗ったもの）を読む
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export async function loadKowloonParts(base = 'assets/models/') {
  const list = await (await fetch(base + 'kowloon.json')).json();
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  return Promise.all(list.map(async p => {
    const g = await loader.loadAsync(base + p.file);
    let geo = null; g.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry; });
    geo.computeBoundingBox();
    return { ...p, geometry: geo };
  }));
}
