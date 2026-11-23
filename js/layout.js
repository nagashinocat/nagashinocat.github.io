// 街区の配置計画（純粋データ）。九龍城の路地：手前から奥へ路地が延び、突き当たりに掲示板ビル
// 座標: x∈[-1,1], z∈[-0.7,0.7]（手前が z 大）、y は高さ
// Bldg: w = x方向の幅, d = z方向の奥行き, face = 正面の向き（east=+x, west=-x, south=+z）
import { rng } from './rng.js';

export const ALLEY = 0.3;
const X = 1, Z = 0.7;
const PROFILE = {
  games: { inner: [0.5, 1.0], outer: [0.75, 1.3], front: [0.09, 0.17], styles: ['tenement', 'neon', 'tower'] },
  tools: { inner: [0.2, 0.42], outer: [0.3, 0.6], front: [0.14, 0.26], styles: ['factory', 'shed'] },
  wip:   { inner: [0.12, 0.38], outer: [0.25, 0.55], front: [0.12, 0.22], styles: ['scaffold', 'hut'] },
};
const SIGN_TEXTS = ['酒', '質', '麻雀', '薬', '理髪', '大吉', '電脳', '按摩', '中華', '居酒屋', '貸室', '茶', '金', '湯', '當', '歯科', '修理', 'BAR', 'HOTEL', '24H', '珈琲', '拉麺', '占', '両替', '麺', '飯店', '電器', '萬興樓'];
const TOOL_TEXTS = ['旋盤', '溶接', '鉄工所', '危険', '火気厳禁', '試作', '修理', '研磨', '板金', '油'];
const WIP_TEXTS = ['工事中', '立入禁止', '足元注意', '安全第一', '資材', '仮設'];
const BB_D = 0.2, BB_Z = -Z + BB_D / 2 + 0.01;

export function planDistrict(kind, works, seed) {
  const P = PROFILE[kind];
  const r = rng(seed * 101 + kind.length * 7);
  const buildings = [];
  const rowOf = z => Math.min(4, Math.max(0, Math.floor((z + Z) / (2 * Z / 5))));

  // 両側の2つの帯（路地沿い＝inner、その外＝outer）を、奥から手前へ並べる
  for (const side of [-1, 1]) {
    for (const strip of ['inner', 'outer']) {
      const x0 = strip === 'inner' ? ALLEY / 2 : 0.56, x1 = strip === 'inner' ? 0.52 : X;
      let z = -Z + (strip === 'inner' ? BB_D + 0.02 : 0);
      let i = 0;
      while (true) {
        const d = r.range(P.front[0], P.front[1]) * (strip === 'outer' ? 1.4 : 1);
        if (z + d > Z) break;
        const inset = strip === 'inner' ? r.range(0, 0.012) : r.range(0, 0.04);
        const wmax = x1 - x0 - inset;
        const w = strip === 'inner' ? r.range(wmax * 0.75, wmax) : r.range(wmax * 0.6, wmax);
        const xc = side * (x0 + inset + w / 2);
        const [lo, hi] = P[strip];
        const front = (z + d / 2 + Z) / (2 * Z); // 0=奥 1=手前
        const h = r.range(lo, hi) * (1 - front * 0.25);
        const emptyLot = kind === 'wip' && strip === 'inner' && front > 0.3 && front < 0.55;
        if (!emptyLot) buildings.push({ id: `${kind}-${side < 0 ? 'L' : 'R'}${strip[0]}-${i}`, x: xc, z: z + d / 2, w, h, d, style: r.pick(P.styles), row: rowOf(z + d / 2), face: side < 0 ? 'east' : 'west', strip });
        z += d + r.range(0.002, 0.012);
        i++;
      }
    }
  }
  // 突き当たりの掲示板ビル
  const bb = { id: `${kind}-billboard`, x: 0, z: BB_Z, w: ALLEY - 0.004, d: BB_D, h: Math.max(...buildings.map(b => b.h)) + (kind === 'games' ? 0.55 : 0.18), style: kind === 'games' ? 'billboard' : kind === 'tools' ? 'crt' : 'roadsign', row: 0, face: 'south', strip: 'end' };
  buildings.push(bb);
  const billboard = { bldgId: bb.id, x: bb.x, z: bb.z, w: bb.w, h: bb.h };

  // 作品の看板：路地沿いの建物、手前から左右交互に
  const inner = buildings.filter(b => b.strip === 'inner');
  const bySide = s => inner.filter(b => (b.x < 0) === s).sort((a, b) => b.z - a.z);
  const L = bySide(true), R = bySide(false);
  const order = [];
  for (let i = 0; i < Math.max(L.length, R.length); i++) { if (L[i]) order.push(L[i]); if (R[i]) order.push(R[i]); }
  // 一番手前は画面の端で切れやすいので1つ奥から
  const hosts = order.length > 6 ? [...order.slice(3), ...order.slice(0, 3)] : order;
  const signs = [];
  works.forEach((w, i) => {
    const host = hosts[i % hosts.length];
    const layer = Math.floor(i / hosts.length);
    signs.push({ workId: w.id, text: w.title, color: w.color || '#ff4fa3', bldgId: host.id, u: 0.5, v: Math.min(0.85, 0.36 + layer * 0.2 + r.range(0, 0.12)), w: 0.34, h: 0.62, vertical: true, project: true });
  });
  const texts = kind === 'tools' ? TOOL_TEXTS : kind === 'wip' ? WIP_TEXTS : SIGN_TEXTS;
  const neon = ['#ff4fa3', '#4fd8ff', '#ffb21f', '#b46bff', '#7cff6b', '#ff3b3b'];
  const decoCount = Math.max(3 * works.length, Math.round(inner.length * (kind === 'games' ? 2.6 : 1.3)));
  for (let i = 0; i < decoCount; i++) {
    const host = r.next() < 0.85 ? r.pick(inner) : r.pick(buildings.filter(b => b.strip === 'outer'));
    const vertical = r.next() < 0.6;
    signs.push({ workId: null, text: r.pick(texts), color: r.pick(neon), bldgId: host.id, u: r.range(0.1, 0.9), v: r.range(0.12, 0.95), w: vertical ? r.range(0.14, 0.24) : r.range(0.3, 0.6), h: vertical ? r.range(0.3, 0.55) : r.range(0.1, 0.18), vertical, project: vertical && r.next() < 0.7 });
  }

  // 路地の小物
  const decor = [];
  const faceX = b => b.face === 'east' ? b.x + b.w / 2 : b.face === 'west' ? b.x - b.w / 2 : b.x;
  const along = b => b.z + r.range(-0.4, 0.4) * b.d;
  for (const b of buildings) {
    const type = r.next() < 0.45 ? 'duct' : 'tube';
    if (b.strip === 'end') { decor.push({ type, from: [b.x - b.w * 0.4, 0, b.z + b.d / 2], to: [b.x - b.w * 0.4, b.h * 0.9, b.z + b.d / 2] }); continue; }
    const x = faceX(b), z = along(b);
    // 壁を這う
    decor.push({ type, from: [x, b.h * r.range(0, 0.3), z], to: [x, b.h * r.range(0.55, 0.98), z + r.range(-0.3, 0.3) * b.d] });
  }
  // 路地をまたぐダクト・チューブ・電線
  const crossers = inner.filter(b => b.x < 0);
  for (const a of crossers) {
    const opp = inner.filter(b => b.x > 0).sort((p, q) => Math.abs(p.z - a.z) - Math.abs(q.z - a.z))[0];
    if (!opp) continue;
    const y = Math.min(a.h, opp.h) * r.range(0.35, 0.9);
    decor.push({ type: r.next() < 0.5 ? 'tube' : 'duct', from: [faceX(a), y, along(a)], to: [faceX(opp), y + r.range(-0.05, 0.05), along(opp)] });
    decor.push({ type: 'wire', from: [faceX(a), Math.min(a.h, y + r.range(0.05, 0.2)), along(a)], to: [faceX(opp), Math.min(opp.h, y + r.range(0, 0.2)), along(opp)] });
  }
  if (kind === 'games') {
    for (let i = 0; i < 7; i++) {
      const z = -0.4 + i * 0.16 + r.range(-0.03, 0.03), y = r.range(0.16, 0.32);
      decor.push({ type: 'lantern', from: [-ALLEY / 2, y, z], to: [ALLEY / 2, y + r.range(-0.02, 0.02), z + r.range(-0.03, 0.03)] });
    }
    for (const b of inner) if (r.next() < 0.6) { const x = faceX(b), y = b.h * r.range(0.3, 0.9), z = along(b); decor.push({ type: 'laundry', from: [x, y, z - b.d * 0.3], to: [x + Math.sign(-b.x) * 0.03, y, z + b.d * 0.3] }); }
    for (let i = 0; i < 5; i++) decor.push({ type: 'steam', from: [r.pick([-1, 1]) * r.range(0.06, 0.1), 0, r.range(-0.3, 0.6)], to: [0, 0.3, 0] });
  }
  if (kind === 'tools') for (const b of buildings.filter(b => b.strip === 'outer')) if (r.next() < 0.45) decor.push({ type: 'chimney', from: [b.x, b.h, b.z], to: [b.x, b.h + r.range(0.25, 0.55), b.z] });
  if (kind === 'wip') {
    decor.push({ type: 'crane', from: [-0.3, 0, 0.05], to: [-0.3, 1.0, 0.05] });
    decor.push({ type: 'fence', from: [-ALLEY / 2 - 0.02, 0, 0.5], to: [ALLEY / 2 + 0.02, 0, 0.5] });
  }
  return { kind, buildings, signs, billboard, decor };
}

// ---- 紙の路地：作品ごとのスタンド看板の置き場所 ----
// 手前（カメラのすぐ先）から奥へ、左右交互に1つずつ。数が多いときは間を詰めて、タワーの手前に収める
export function standSlots(n, { front = 0.34, back = -0.7 } = {}) {
  const rows = Math.ceil(n / 2);
  const step = n > 1 ? Math.min(0.13, (front - back) / (rows - 0.55)) : 0;
  return Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return { side, z: +(front - Math.floor(i / 2) * step - (side > 0 ? step * 0.45 : 0)).toFixed(4) };
  });
}
// 並び：ゲーム（NEW→遊べる→近日）→ 道具 → 工事中
export function orderForStands(works) {
  const rank = w => ({ games: 0, tools: 1, wip: 2 }[w.district] ?? 3) * 10 + (w.isNew ? 0 : 1) + (w.url ? 0 : 2);
  return works.map((w, i) => [w, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
}
