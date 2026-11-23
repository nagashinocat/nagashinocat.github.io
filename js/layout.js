// 街区の配置計画（純粋データ）。座標: x∈[-1,1], z∈[-0.7,0.7]（手前が z 大）、y は高さ
import { rng } from './rng.js';

const X = 1, Z = 0.7;
const PROFILE = {
  games: { rows: 5, w: [0.11, 0.24], h: [[0.75, 1.25], [0.15, 0.42]], styles: ['neon', 'tenement', 'tower', 'shop'] },
  tools: { rows: 4, w: [0.18, 0.36], h: [[0.32, 0.55], [0.12, 0.26]], styles: ['factory', 'shed', 'tank'] },
  wip:   { rows: 4, w: [0.14, 0.26], h: [[0.25, 0.5], [0.08, 0.2]], styles: ['scaffold', 'hut', 'container'] },
};
const SIGN_TEXTS = ['酒', '質', '麻雀', '薬', '理髪', '大吉', '電脳', '按摩', '中華', '居酒屋', '貸室', '茶', '金', '湯', '當', '歯科', '修理', 'BAR', 'HOTEL', '24H', '珈琲', '拉麺', '占', '両替'];
const charLen = s => [...s].length;

export function planDistrict(kind, works, seed) {
  const P = PROFILE[kind];
  const r = rng(seed * 101 + kind.length * 7);
  const rowD = (2 * Z) / P.rows;
  const buildings = [];
  for (let row = 0; row < P.rows; row++) {
    const zc = -Z + rowD * (row + 0.5);
    const t = row / (P.rows - 1); // 0=奥 1=手前
    let x = -X + r.range(0, 0.04);
    let i = 0;
    while (true) {
      const w = r.range(P.w[0], P.w[1]);
      if (x + w > X) break;
      const cx = x + w / 2;
      const emptyLot = kind === 'wip' && Math.abs(cx) < 0.32 && row >= 1 && row <= 2;
      if (!emptyLot) {
        const hLo = P.h[0][0] + (P.h[1][0] - P.h[0][0]) * t;
        const hHi = P.h[0][1] + (P.h[1][1] - P.h[0][1]) * t;
        const d = rowD * r.range(0.55, 0.9);
        buildings.push({ id: `${kind}-${row}-${i}`, x: cx, z: zc + r.range(-1, 1) * (rowD - d) / 2, w, h: r.range(hLo, hHi), d, style: r.pick(P.styles), row });
      }
      x += w + r.range(0.006, 0.03);
      i++;
    }
  }
  // 掲示板ビル: 奥から2列目の中央に最も近い建物を最も高くする
  const bbRow = 1;
  const bb = buildings.filter(b => b.row === bbRow).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
  bb.h = Math.max(...buildings.map(b => b.h)) + 0.18;
  bb.style = kind === 'games' ? 'billboard' : kind === 'tools' ? 'crt' : 'roadsign';
  const billboard = { bldgId: bb.id, x: bb.x, z: bb.z, w: bb.w, h: bb.h };

  // 作品の看板: 手前の列から優先、掲示板ビル以外、1棟1枚を基本に足りなければ重ねる
  const hosts = buildings.filter(b => b !== bb).sort((a, b) => b.row - a.row || a.x - b.x);
  const front = hosts.filter(b => b.row >= P.rows - 2);
  const order = [...front.filter((_, i) => i % 2 === 0), ...front.filter((_, i) => i % 2 === 1), ...hosts.filter(b => b.row < P.rows - 2)];
  const signs = [];
  works.forEach((w, i) => {
    const host = order[i % order.length];
    const layer = Math.floor(i / order.length);
    const vertical = charLen(w.title) > 12;
    signs.push({ workId: w.id, text: w.title, color: w.color || '#ff4fa3', bldgId: host.id, u: 0.5, v: Math.min(0.8, 0.42 + layer * 0.22), w: vertical ? 0.34 : 0.86, h: vertical ? 0.62 : 0.24, vertical });
  });
  const decoCount = Math.max(3 * works.length, Math.round(buildings.length * 1.2));
  const neon = ['#ff4fa3', '#4fd8ff', '#ffb21f', '#b46bff', '#7cff6b', '#ff3b3b'];
  for (let i = 0; i < decoCount; i++) {
    const host = r.pick(hosts);
    const text = r.pick(SIGN_TEXTS);
    const vertical = r.next() < 0.55;
    signs.push({ workId: null, text, color: r.pick(neon), bldgId: host.id, u: r.range(0.15, 0.85), v: r.range(0.25, 0.95), w: vertical ? r.range(0.14, 0.24) : r.range(0.3, 0.6), h: vertical ? r.range(0.3, 0.55) : r.range(0.1, 0.18), vertical });
  }

  // 用途不明のダクト・チューブ・電線など
  const decor = [];
  const top = b => b.h * r.range(0.3, 0.95);
  for (const b of buildings) {
    // 近所の建物へだけ渡す（同じ列か隣の列、横に近いもの）
    const near = buildings.filter(o => o !== b && Math.abs(o.row - b.row) <= 1 && Math.abs(o.x - b.x) < 0.3);
    const type = r.next() < 0.45 ? 'duct' : 'tube';
    if (near.length) {
      const nb = r.pick(near);
      const y = Math.min(top(b), top(nb));
      decor.push({ type, from: [b.x + r.range(-0.4, 0.4) * b.w, y, b.z + b.d / 2], to: [nb.x + r.range(-0.4, 0.4) * nb.w, Math.min(nb.h * 0.95, y + r.range(-0.08, 0.08)), nb.z + nb.d / 2] });
    } else {
      const x = b.x + r.range(-0.4, 0.4) * b.w;
      decor.push({ type, from: [x, b.h * r.range(0.1, 0.4), b.z + b.d / 2], to: [x + r.range(-0.3, 0.3) * b.w, b.h * r.range(0.5, 0.95), b.z + b.d / 2] });
    }
    if (r.next() < 0.6) decor.push({ type: 'tube', from: [b.x + r.range(-0.4, 0.4) * b.w, 0, b.z + b.d / 2 + 0.004], to: [b.x + r.range(-0.4, 0.4) * b.w, b.h, b.z + b.d / 2 + 0.004] });
  }
  for (const a of buildings) {
    const near = buildings.filter(o => o !== a && Math.abs(o.x - a.x) < 0.4 && Math.abs(o.row - a.row) <= 2);
    if (near.length && r.next() < 0.8) { const b = r.pick(near); decor.push({ type: 'wire', from: [a.x, a.h * r.range(0.6, 1), a.z + a.d / 2], to: [b.x, b.h * r.range(0.6, 1), b.z + b.d / 2] }); }
  }
  if (kind === 'games') for (let i = 0; i < 40; i++) { const b = r.pick(buildings); decor.push({ type: 'laundry', from: [b.x - b.w / 2, top(b), b.z + b.d / 2], to: [b.x + b.w / 2, top(b), b.z + b.d / 2] }); }
  if (kind === 'tools') for (const b of buildings) if (r.next() < 0.35) decor.push({ type: 'chimney', from: [b.x, b.h, b.z], to: [b.x, b.h + r.range(0.25, 0.6), b.z] });
  if (kind === 'wip') {
    decor.push({ type: 'crane', from: [0.05, 0, -0.05], to: [0.05, 1.05, -0.05] });
    decor.push({ type: 'fence', from: [-0.34, 0, 0.0], to: [0.34, 0, 0.0] });
  }
  return { kind, buildings, signs, billboard, decor };
}
