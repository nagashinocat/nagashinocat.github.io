// ペーパークラフトの建物：単純な箱に、細かく描き込んだ「印刷の絵」を貼る
// 描き込み：窓（明かり・カーテン・人影）、鉄格子のベランダ、室外機、配管と金具、洗濯物、植木鉢、配電箱、錆としみ、雨だれ、網点の影
// 紙らしさ：白い切り口の縁、紙の繊維、少しのたわみ、屋上ののりしろ
import * as THREE from 'three';

const INK = '#1a1018';
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---- 紙と汚れの下地 ----
function grainLayer(g, W, H, r, base) {
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), D = img.data;
  // 粗いムラ（16px）と細かい紙の繊維
  const cw = Math.ceil(W / 24), ch = Math.ceil(H / 24), coarse = new Float32Array(cw * ch).map(() => r.next());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const fx = x / 24, fy = y / 24, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const c00 = coarse[Math.min(ch - 1, iy) * cw + Math.min(cw - 1, ix)], c10 = coarse[Math.min(ch - 1, iy) * cw + Math.min(cw - 1, ix + 1)];
    const c01 = coarse[Math.min(ch - 1, iy + 1) * cw + Math.min(cw - 1, ix)], c11 = coarse[Math.min(ch - 1, iy + 1) * cw + Math.min(cw - 1, ix + 1)];
    const m = (c00 * (1 - tx) + c10 * tx) * (1 - ty) + (c01 * (1 - tx) + c11 * tx) * ty;
    const n = (Math.random() - 0.5) * 18 + (m - 0.5) * 34;
    D[i] += n; D[i + 1] += n * 0.95; D[i + 2] += n * 0.9;
  }
  g.putImageData(img, 0, 0);
}
function stains(g, W, H, r, s) {
  // 雨だれ（上から下へ細く）
  for (let i = 0; i < W * H / 2600 * s; i++) {
    const x = r.range(0, W), y = r.range(0, H), len = r.range(20, 160) * s;
    const gr = g.createLinearGradient(0, y, 0, y + len);
    gr.addColorStop(0, `rgba(40,22,16,${r.range(0.2, 0.45)})`); gr.addColorStop(1, 'rgba(40,22,16,0)');
    g.fillStyle = gr; g.fillRect(x, y, r.range(1, 4) * s, len);
  }
  // 錆としみの斑点
  for (let i = 0; i < W * H / 9000; i++) {
    const x = r.range(0, W), y = r.range(0, H), rr = r.range(4, 30) * s;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const col = r.pick(['110,50,24', '70,40,30', '40,30,30', '140,80,40']);
    gr.addColorStop(0, `rgba(${col},${r.range(0.25, 0.55)})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}
// 網点（印刷の影）
function tone(g, x, y, w, h, s, a = 0.35) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = `rgba(20,8,20,${a})`;
  const sp = 4 * s, rad = 1.1 * s;
  for (let yy = y, j = 0; yy < y + h + sp; yy += sp, j++) for (let xx = x + (j % 2) * sp / 2; xx < x + w + sp; xx += sp) { g.beginPath(); g.arc(xx, yy, rad, 0, 7); g.fill(); }
  g.restore();
}
const line = (g, pts, w = 1.2, col = INK) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
const rect = (g, x, y, w, h, fill, lw = 1.2) => { if (fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); } if (lw) { g.strokeStyle = INK; g.lineWidth = lw; g.strokeRect(x, y, w, h); } };

// ---- 窓まわりの描き込み ----
function windowUnit(g, x, y, w, h, r, s, emit, flat = true) {
  const lit = r.next(), e = emit.getContext('2d');
  const kind = lit < 0.46 ? 'warm' : lit < 0.54 ? 'blue' : 'dark';
  // ガラス
  if (kind === 'dark') {
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#1c1824'); gr.addColorStop(1, '#2a2434');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    line(g, [[x + w * 0.2, y + h * 0.15], [x + w * 0.45, y + h * 0.05]], 1 * s, 'rgba(200,200,255,0.25)');
  } else {
    const c0 = kind === 'warm' ? ['#ffd27a', '#ffb24a'] : ['#cfe8ff', '#8ac0f0'];
    for (const ctx of [g, e]) { const gr = ctx.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, c0[0]); gr.addColorStop(1, c0[1]); ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); }
    // カーテン・物の影・人影
    if (r.next() < 0.5) { const cw = w * r.range(0.25, 0.5); for (const ctx of [g, e]) { ctx.fillStyle = r.pick(['rgba(160,60,60,0.75)', 'rgba(90,110,60,0.7)', 'rgba(200,190,170,0.7)']); ctx.fillRect(x, y, cw, h); } }
    if (r.next() < 0.18) for (const ctx of [g, e]) { ctx.fillStyle = 'rgba(30,15,20,0.8)'; ctx.beginPath(); ctx.arc(x + w * 0.65, y + h * 0.4, h * 0.13, 0, 7); ctx.fill(); ctx.fillRect(x + w * 0.55, y + h * 0.52, w * 0.2, h * 0.5); }
    if (r.next() < 0.3) for (const ctx of [g, e]) { ctx.fillStyle = 'rgba(40,20,20,0.6)'; ctx.fillRect(x + w * 0.1, y + h * 0.6, w * 0.3, h * 0.4); }
  }
  // 窓枠と桟
  rect(g, x, y, w, h, null, 1.6 * s);
  line(g, [[x + w / 2, y], [x + w / 2, y + h]], 1 * s); line(g, [[x, y + h * 0.45], [x + w, y + h * 0.45]], 0.8 * s);
  // 鉄格子のベランダ（はみ出す箱を正面から描く）
  if (flat && r.next() < 0.42) {
    const ox = x - w * 0.12, oy = y - h * 0.08, ow = w * 1.24, oh = h * 1.2;
    g.strokeStyle = '#2a1e1e'; g.lineWidth = 1.1 * s;
    for (let k = 0; k <= 8; k++) line(g, [[ox + ow * k / 8, oy], [ox + ow * k / 8, oy + oh]], 1.1 * s, '#2e2222');
    for (const yy of [oy, oy + oh * 0.35, oy + oh]) line(g, [[ox, yy], [ox + ow, yy]], 1.6 * s, '#2e2222');
    tone(g, ox, oy + oh * 0.85, ow, oh * 0.15, s, 0.5);
    // 植木鉢や箱
    if (r.next() < 0.5) rect(g, ox + ow * r.range(0.1, 0.6), oy + oh * 0.78, ow * 0.18, oh * 0.18, r.pick(['#7a4a2a', '#4a6a3a', '#8a8a7a']), 1 * s);
  }
  // 室外機（窓の横か下）
  if (flat && r.next() < 0.32) {
    const aw = w * 0.55, ah = h * 0.42, ax = x + w + w * 0.06, ay = y + h * 0.5;
    const gr = g.createLinearGradient(ax, ay, ax, ay + ah); gr.addColorStop(0, '#e6e2d8'); gr.addColorStop(1, '#b8b2a6');
    g.fillStyle = gr; g.fillRect(ax, ay, aw, ah); rect(g, ax, ay, aw, ah, null, 1.3 * s);
    g.beginPath(); g.arc(ax + aw * 0.36, ay + ah * 0.5, ah * 0.32, 0, 7); g.stroke();
    for (let k = 0; k < 4; k++) line(g, [[ax + aw * 0.36 - ah * 0.28, ay + ah * 0.5 - ah * 0.2 + k * ah * 0.13], [ax + aw * 0.36 + ah * 0.28, ay + ah * 0.5 - ah * 0.2 + k * ah * 0.13]], 0.7 * s);
    for (let k = 0; k < 5; k++) line(g, [[ax + aw * 0.72, ay + ah * (0.2 + k * 0.14)], [ax + aw * 0.92, ay + ah * (0.2 + k * 0.14)]], 0.8 * s);
    // 水だれ
    const gr2 = g.createLinearGradient(0, ay + ah, 0, ay + ah + h * 1.4); gr2.addColorStop(0, 'rgba(30,20,20,0.45)'); gr2.addColorStop(1, 'rgba(30,20,20,0)');
    g.fillStyle = gr2; g.fillRect(ax + aw * 0.2, ay + ah, 2.5 * s, h * 1.4);
  }
  // ひさしの影と窓下の雨だれ
  tone(g, x - 2 * s, y - 4 * s, w + 4 * s, 4 * s, s, 0.6);
  const gr3 = g.createLinearGradient(0, y + h, 0, y + h * 1.6); gr3.addColorStop(0, 'rgba(40,24,18,0.4)'); gr3.addColorStop(1, 'rgba(40,24,18,0)');
  g.fillStyle = gr3; g.fillRect(x + w * 0.15, y + h, w * 0.7, h * 0.6);
}

/**
 * 建物の面の絵（印刷の紙）を描く。返り値 { color: canvas, emit: canvas }
 * kind: 'front'（窓びっしり）| 'side'（窓まばら・配管）| 'roof'（屋上：給水塔・アンテナ）
 */
export function drawPaperFace(Wm, Hm, kind, r, { ppu = 2400, ground = 0.06, palette, max = 2048, flat = true, windows = null } = {}) {
  ppu = Math.min(ppu, max / Math.max(Wm, Hm));
  const W = Math.max(32, Math.round(Wm * ppu)), H = Math.max(32, Math.round(Hm * ppu));
  const s = ppu / 1400; // 描き込みの太さの基準
  const c = cv(W, H), g = c.getContext('2d');
  const emit = cv(W, H), e = emit.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const base = palette || r.pick(['#8a7a70', '#7a6a66', '#968676', '#6e6460', '#857266', '#7c7466']);
  if (kind === 'roof') {
    grainLayer(g, W, H, r, '#5a524e');
    stains(g, W, H, r, s);
    // 給水塔・換気口・アンテナ（上から）
    for (let i = 0; i < 3; i++) { const x = r.range(0.1, 0.7) * W, y = r.range(0.1, 0.7) * H, R = r.range(0.06, 0.12) * Math.min(W, H); g.fillStyle = '#8a8478'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5 * s; g.stroke(); g.beginPath(); g.arc(x, y, R * 0.6, 0, 7); g.stroke(); }
    for (let i = 0; i < 4; i++) rect(g, r.range(0, 0.8) * W, r.range(0, 0.8) * H, r.range(0.08, 0.2) * W, r.range(0.08, 0.15) * H, r.pick(['#6a645e', '#9a948a', '#4a4440']), 1.2 * s);
    for (let i = 0; i < 6; i++) line(g, [[r.range(0, W), r.range(0, H)], [r.range(0, W), r.range(0, H)]], 1 * s);
  } else {
    grainLayer(g, W, H, r, base);
    // 塗り直しのパッチ（色の違う壁板）
    for (let i = 0; i < 6; i++) { g.fillStyle = r.pick(['rgba(160,140,120,0.35)', 'rgba(110,90,90,0.35)', 'rgba(120,130,120,0.3)', 'rgba(150,110,90,0.35)']); g.fillRect(r.range(-0.1, 0.8) * W, r.range(0, 0.9) * H, r.range(0.2, 0.6) * W, r.range(0.05, 0.3) * H); }
    stains(g, W, H, r, s);
    const floorH = 0.044 * ppu, cols = Math.max(1, Math.round(Wm / (kind === 'front' ? 0.034 : 0.06)));
    const colW = W / cols;
    const g0 = H - ground * ppu;
    // 階のスラブの線
    for (let y = g0 - floorH; y > 0; y -= floorH) { line(g, [[0, y], [W, y]], 1.6 * s, 'rgba(26,16,24,0.7)'); tone(g, 0, y, W, 3 * s, s, 0.4); }
    // 窓
    for (let y = g0 - floorH; y > floorH * 0.3; y -= floorH) for (let i = 0; i < cols; i++) {
      if (kind === 'side' && r.next() < 0.55) continue;
      if (r.next() < 0.06) continue;
      const ww = colW * r.range(0.5, 0.62), wh = floorH * 0.55;
      const wx = i * colW + (colW - ww) / 2 - colW * 0.08, wy = y + floorH * 0.22;
      windowUnit(g, wx, wy, ww, wh, r, s, emit, flat);
      if (windows) windows.push({ x: (wx + ww / 2) / ppu - Wm / 2, y: Hm - (wy + wh / 2) / ppu, w: ww / ppu, h: wh / ppu });
    }
    // 縦の配管と金具（立体の配管を付ける面では描かない）
    for (let k = 0; k < (flat ? (kind === 'side' ? 3 : 2) : 0); k++) {
      const x = r.range(0.05, 0.95) * W, pw = r.range(5, 9) * s;
      const gr = g.createLinearGradient(x, 0, x + pw, 0); gr.addColorStop(0, '#4a3e3a'); gr.addColorStop(0.4, '#9a8a80'); gr.addColorStop(1, '#3a302c');
      g.fillStyle = gr; g.fillRect(x, 0, pw, H); line(g, [[x, 0], [x, H]], 1 * s); line(g, [[x + pw, 0], [x + pw, H]], 1 * s);
      for (let y = r.range(10, 40) * s; y < H; y += r.range(40, 70) * s) rect(g, x - 2 * s, y, pw + 4 * s, 3 * s, '#2a2220', 0.6 * s);
      g.fillStyle = 'rgba(60,30,20,0.35)'; g.fillRect(x + pw, 0, 3 * s, H);
    }
    // 横に這う電線
    for (let k = 0; k < 4; k++) { const y = r.range(0.1, 0.9) * H; g.strokeStyle = 'rgba(20,10,16,0.85)'; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(W / 2, y + r.range(4, 20) * s, W, y + r.range(-10, 10) * s); g.stroke(); }
    // 洗濯物
    for (let k = 0; k < Math.round(W / 300); k++) {
      const x = r.range(0, 0.8) * W, y = r.range(0.1, 0.8) * H, len = r.range(60, 140) * s;
      line(g, [[x, y], [x + len, y + 4 * s]], 1 * s);
      for (let q = 0; q < 4; q++) rect(g, x + q * len / 4 + 3 * s, y + 1 * s, len / 5, r.range(14, 26) * s, r.pick(['#f0ece4', '#e88aa8', '#8ac4e8', '#f0d070', '#9c4a5a', '#5a7a9a']), 0.8 * s);
    }
    // 配電箱・メーター
    for (let k = 0; k < 2; k++) { const x = r.range(0.05, 0.85) * W, y = g0 - r.range(40, 120) * s; rect(g, x, y, 30 * s, 40 * s, '#8a8a7a', 1.2 * s); line(g, [[x + 5 * s, y + 10 * s], [x + 25 * s, y + 10 * s]], 0.8 * s); }
    // 1階：店先・シャッター・のれん
    let x = 0;
    while (x < W - 20 * s) {
      const sw = r.range(70, 140) * s;
      const shop = r.next();
      if (shop < 0.6) {
        for (const ctx of [g, e]) { const gr = ctx.createLinearGradient(0, g0, 0, H); gr.addColorStop(0, r.pick(['#ffcf7a', '#ff9ab8', '#9fe2ff', '#ffe6a8'])); gr.addColorStop(1, '#ff9a4a'); ctx.fillStyle = gr; ctx.fillRect(x + 3 * s, g0 + 10 * s, sw - 6 * s, H - g0 - 12 * s); }
        // 棚・品物・のれん
        for (let k = 0; k < 6; k++) rect(g, x + r.range(6, sw - 20) * s / s, g0 + r.range(20, 60) * s, r.range(6, 14) * s, r.range(6, 12) * s, r.pick(['#c84a3a', '#3a8a5a', '#e0c040', '#4a5a9a']), 0.6 * s);
        const nc = r.pick(['#2a3a6a', '#7a1a1a', '#1a1a1a']);
        for (let k = 0; k < 4; k++) { g.fillStyle = nc; g.fillRect(x + 6 * s + k * (sw - 12 * s) / 4, g0 + 8 * s, (sw - 12 * s) / 4 - 2 * s, 26 * s); }
      } else {
        const gr = g.createLinearGradient(0, g0, 0, H); gr.addColorStop(0, '#8a8a90'); gr.addColorStop(1, '#5a5a62');
        g.fillStyle = gr; g.fillRect(x + 3 * s, g0 + 8 * s, sw - 6 * s, H - g0 - 8 * s);
        for (let y = g0 + 10 * s; y < H; y += 5 * s) line(g, [[x + 3 * s, y], [x + sw - 3 * s, y]], 0.7 * s, 'rgba(30,30,36,0.7)');
        // 落書き
        if (r.next() < 0.6) { g.save(); g.font = `${24 * s}px "Dela Gothic One",sans-serif`; g.fillStyle = r.pick(['#e85ad8', '#6ad8e8', '#e8e05a']); g.strokeStyle = INK; g.lineWidth = 2 * s; const t = r.pick(['ZAP', '夜', 'NC', '!!']); g.strokeText(t, x + 10 * s, H - 20 * s); g.fillText(t, x + 10 * s, H - 20 * s); g.restore(); }
      }
      rect(g, x + 3 * s, g0 + 8 * s, sw - 6 * s, H - g0 - 8 * s, null, 1.6 * s);
      x += sw;
    }
    tone(g, 0, g0, W, 8 * s, s, 0.6);
    // 下のほうの泥はね
    const gr = g.createLinearGradient(0, H - 60 * s, 0, H); gr.addColorStop(0, 'rgba(40,24,20,0)'); gr.addColorStop(1, 'rgba(40,24,20,0.5)');
    g.fillStyle = gr; g.fillRect(0, H - 60 * s, W, 60 * s);
    // 右側に網点の陰
    tone(g, W * 0.86, 0, W * 0.14, H, s, 0.18);
  }
  // 紙の切り口：白い縁
  g.strokeStyle = '#efe8da'; g.lineWidth = 3 * s; g.strokeRect(1.5 * s, 1.5 * s, W - 3 * s, H - 3 * s);
  return { color: c, emit };
}

const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

/** 紙の箱の建物。原点は底面の正面の中央、正面は +z。返り値 Group */
export function paperBuilding(w, h, d, r, opts = {}) {
  // 見える正面は細かく、隠れる面は粗く
  const lo = { ...opts, ppu: 500, max: 512 };
  const faces = {
    front: drawPaperFace(w, h, 'front', r, opts), back: drawPaperFace(w, h, 'side', r, lo),
    right: drawPaperFace(d, h, 'side', r, opts.sides ? opts : lo), left: drawPaperFace(d, h, 'side', r, opts.sides ? opts : lo), roof: drawPaperFace(w, d, 'roof', r, { ...opts, ppu: 1200, max: 1024 }),
  };
  const mat = f => new THREE.MeshStandardMaterial({ map: tex(f.color), emissiveMap: tex(f.emit), emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.92, metalness: 0 });
  const mats = [mat(faces.right), mat(faces.left), mat(faces.roof), new THREE.MeshStandardMaterial({ color: '#2a2224' }), mat(faces.front), mat(faces.back)];
  // 紙のたわみ：正面を少しふくらませる
  const geo = new THREE.BoxGeometry(w, h, d, 6, 12, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i), x = pos.getX(i);
    if (Math.abs(z - d / 2) < 1e-6 || Math.abs(z + d / 2) < 1e-6) pos.setZ(i, z + Math.sign(z) * Math.sin((x / w + 0.5) * Math.PI) * Math.sin((y / h + 0.5) * Math.PI) * 0.0015);
  }
  geo.computeVertexNormals();
  const box = new THREE.Mesh(geo, mats);
  box.position.set(0, h / 2, -d / 2);
  const g = new THREE.Group();
  g.add(box);
  // 紙の白い切り口（角の線）
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: '#f2ece0' }));
  edges.position.copy(box.position); g.add(edges);
  // 屋上ののりしろ
  const tabMat = new THREE.MeshStandardMaterial({ color: '#d8cfbe', roughness: 1, side: THREE.DoubleSide });
  for (const [sx, sz, rw] of [[0, 1, w], [0, -1, w], [1, 0, d], [-1, 0, d]]) {
    if (r.next() < 0.5) continue;
    const tab = new THREE.Mesh(new THREE.PlaneGeometry(rw * 0.8, 0.006), tabMat);
    tab.position.set(sx * w / 2, h + 0.002, -d / 2 + sz * d / 2);
    tab.rotation.y = sx ? Math.PI / 2 : 0; tab.rotation.x = 0.25 * (sz || sx);
    g.add(tab);
  }
  g.userData.box = box;
  return g;
}

// ================= 紙の部品 =================
const paperMat = (map, opts = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, ...opts });
const edgeMat = new THREE.LineBasicMaterial({ color: '#d8cdbb', transparent: true, opacity: 0.32 });
const withEdges = (mesh, thresh = 30) => { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thresh), edgeMat)); return mesh; };
const cache = {};
function printed(key, w, h, draw) {
  if (cache[key]) return cache[key];
  const c = cv(w, h), g = c.getContext('2d'); draw(g, w, h);
  return (cache[key] = tex(c));
}
// 室外機：前は格子とファン、上は通気口
function acTextures() {
  const front = printed('ac-front', 192, 128, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ece8de'); gr.addColorStop(1, '#bdb6a8'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
    g.lineWidth = 2.5; g.beginPath(); g.arc(W * 0.36, H / 2, H * 0.36, 0, 7); g.stroke();
    g.lineWidth = 1.2; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(W * 0.36 - H * 0.34, H / 2 + k * H * 0.08); g.lineTo(W * 0.36 + H * 0.34, H / 2 + k * H * 0.08); g.stroke(); }
    g.beginPath(); g.arc(W * 0.36, H / 2, H * 0.06, 0, 7); g.fill();
    for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(W * 0.72, H * (0.16 + k * 0.09)); g.lineTo(W * 0.92, H * (0.16 + k * 0.09)); g.stroke(); }
    g.fillStyle = 'rgba(70,40,20,0.35)'; g.fillRect(0, H * 0.82, W, H * 0.18);
  });
  const side = printed('ac-side', 64, 64, (g, W, H) => { g.fillStyle = '#c8c2b4'; g.fillRect(0, 0, W, H); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2); g.lineWidth = 1; for (let y = 10; y < H; y += 6) { g.beginPath(); g.moveTo(6, y); g.lineTo(W - 6, y); g.stroke(); } });
  return { front, side };
}
export function paperAC(r) {
  const t = acTextures();
  const side = paperMat(t.side), front = paperMat(t.front);
  const m = withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.015, 0.014), [side, side, side, side, front, side]));
  const g = new THREE.Group(); g.add(m);
  // 支えの金具
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.016), paperMat(null, { color: '#3a3030' })); b.position.set(sx * 0.008, -0.0085, 0); g.add(b); }
  return g;
}
// 鉄格子のかご：格子をくり抜いた紙の箱
function cageTexture() {
  return printed('cage', 128, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = '#3a2a28';
    for (let k = 0; k <= 7; k++) g.fillRect(k * (W - 6) / 7, 0, 6, H);
    for (const y of [0, H * 0.35, H - 8]) g.fillRect(0, y, W, 8);
    g.fillStyle = 'rgba(120,60,30,0.6)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * W, Math.random() * H, 3, 3);
  });
}
export function paperCage(w, h, d, r) {
  const t = cageTexture();
  const bars = paperMat(t, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const floor = paperMat(null, { color: '#4a3a34' });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [bars, bars, paperMat(null, { color: '#3a2a28' }), floor, bars, null].map(x => x || bars));
  m.position.z = d / 2;
  const g = new THREE.Group(); g.add(m);
  // 中の物（植木鉢・段ボール・洗濯物）
  if (r.next() < 0.6) { const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, h * 0.25, d * 0.5), paperMat(null, { color: r.pick(['#8a6a4a', '#5a7a4a', '#c8b89a', '#6a5a8a']) })); b.position.set(r.range(-w * 0.25, w * 0.25), -h / 2 + h * 0.13, d * 0.4); g.add(withEdges(b)); }
  if (r.next() < 0.4) for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.22, h * 0.35), paperMat(null, { color: r.pick(['#f0ece4', '#e88aa8', '#8ac4e8', '#f0d070']), side: THREE.DoubleSide })); c.position.set(-w * 0.3 + k * w * 0.3, h * 0.15, d * 0.6); g.add(c); }
  return g;
}
// 配管：角ばった紙の筒（印刷の錆）
function pipeTexture(col) {
  return printed('pipe' + col, 64, 256, (g, W, H) => {
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,0.35)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.4)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,50,20,${Math.random() * 0.5})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 6, 4 + Math.random() * 20); }
    g.fillStyle = INK; for (let y = 30; y < H; y += 70) g.fillRect(0, y, W, 3);
  });
}
export function paperPipe(points, rad, col = '#6a5a52') {
  const g = new THREE.Group();
  const m = paperMat(pipeTexture(col));
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 6, 1), m);
    seg.position.copy(a).lerp(b, 0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(withEdges(seg, 20));
    if (i > 0) { const j = new THREE.Mesh(new THREE.BoxGeometry(rad * 2.4, rad * 2.4, rad * 2.4), m); j.position.copy(a); g.add(withEdges(j)); }
  }
  return g;
}
// 柱（角柱）と床の張り出し
function concreteTex(key, col) {
  return printed(key, 128, 512, (g, W, H) => {
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,24,20' : '200,190,170'},${Math.random() * 0.25})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 2 + Math.random() * 8); }
    for (let i = 0; i < 20; i++) { const x = Math.random() * W, y = Math.random() * H; const gr = g.createLinearGradient(0, y, 0, y + 80); gr.addColorStop(0, 'rgba(50,26,18,0.45)'); gr.addColorStop(1, 'rgba(50,26,18,0)'); g.fillStyle = gr; g.fillRect(x, y, 3, 80); }
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2);
  });
}
// 屋根：トタンの波板（印刷）を折った紙
function tinTexture(col) {
  return printed('tin' + col, 256, 128, (g, W, H) => {
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 10) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, 0, 4, H); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 5, 0, 4, H); }
    for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(120,50,20,${Math.random() * 0.6})`; g.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 10, 3 + Math.random() * 14); }
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, H - 2);
  });
}
export function paperAwning(w, depth, col, r) {
  const m = paperMat(tinTexture(col), { side: THREE.DoubleSide });
  const a = withEdges(new THREE.Mesh(new THREE.BoxGeometry(w, 0.0015, depth), m));
  a.position.set(0, 0, depth / 2); a.rotation.x = 0.35;
  const g = new THREE.Group(); g.add(a);
  // 支えの棒
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.0018, depth), paperMat(null, { color: '#2a2220' })); p.position.set(sx * w * 0.45, -0.006, depth / 2); p.rotation.x = -0.3; g.add(p); }
  return g;
}
// 給水塔（8角の紙の筒）
export function paperTank(r) {
  const body = paperMat(printed('tank', 256, 128, (g, W, H) => { g.fillStyle = '#9a948a'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 32) { g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, 0, 32, H); } for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(110,50,20,${Math.random() * 0.5})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 8 + Math.random() * 20); } }));
  const g = new THREE.Group();
  const t = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.035, 8), body), 20); t.position.y = 0.035; g.add(t);
  const cap = withEdges(new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.01, 8), body), 20); cap.position.y = 0.0575; g.add(cap);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.018, 0.002), paperMat(null, { color: '#3a3030' })); l.position.set(x * 0.014, 0.009, z * 0.014); g.add(l); }
  return g;
}
export function paperAntenna(r) {
  const m = paperMat(null, { color: '#2a2224' });
  const g = new THREE.Group();
  const h = r.range(0.05, 0.12);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.0016, h, 0.0016), m); pole.position.y = h / 2; g.add(pole);
  for (let k = 0; k < 3; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02 - k * 0.004, 0.0012, 0.0012), m); bar.position.y = h * (0.6 + k * 0.15); g.add(bar); }
  return g;
}

/**
 * 立体の部品つきの紙の建物。原点は底面の正面の中央、正面は +z。
 * 正面の窓に合わせて：鉄格子のかご・室外機、柱、各階の張り出し、雨どい、屋上の給水塔・アンテナ・小屋、1階の日よけ
 */
export function paperBuildingDetailed(w, h, d, r, opts = {}) {
  const windows = [];
  const front = drawPaperFace(w, h, 'front', r, { ...opts, flat: false, windows });
  const lo = { ...opts, ppu: 500, max: 512 };
  const faces = { front, back: drawPaperFace(w, h, 'side', r, lo), right: drawPaperFace(d, h, 'side', r, lo), left: drawPaperFace(d, h, 'side', r, lo), roof: drawPaperFace(w, d, 'roof', r, { ...opts, ppu: 1200, max: 1024 }) };
  const mat = f => new THREE.MeshStandardMaterial({ map: tex(f.color), emissiveMap: tex(f.emit), emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.92 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat(faces.right), mat(faces.left), mat(faces.roof), new THREE.MeshStandardMaterial({ color: '#2a2224' }), mat(faces.front), mat(faces.back)]);
  box.position.set(0, h / 2, -d / 2);
  const g = new THREE.Group(); g.add(withEdges(box));
  const colTex = concreteTex('col' + (opts.palette || ''), opts.palette || '#8a7a70');
  const cm = paperMat(colTex);
  // 柱：両端と、ときどき間に
  const cols = [-w / 2 + 0.005, w / 2 - 0.005]; if (w > 0.14) cols.push(r.range(-w * 0.2, w * 0.2));
  for (const x of cols) { const c = withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.01, h, 0.008), cm)); c.position.set(x, h / 2, 0.004); g.add(c); }
  // 各階の張り出し（2〜3階ごと）
  const floorH = 0.044; let k = 0;
  for (let y = (opts.ground ?? 0.06) + floorH; y < h - 0.02; y += floorH, k++) {
    if (k % 2 && r.next() < 0.6) continue;
    const s = withEdges(new THREE.Mesh(new THREE.BoxGeometry(w + 0.006, 0.004, 0.012), cm)); s.position.set(0, y, 0.006); g.add(s);
  }
  // 窓まわりの立体：鉄格子・室外機
  for (const wn of windows) {
    const t = r.next();
    if (t < 0.4) { const c = paperCage(wn.w * 1.25, wn.h * 1.3, 0.012, r); c.position.set(wn.x, wn.y, 0); g.add(c); }
    else if (t < 0.65) { const a = paperAC(r); a.position.set(wn.x + wn.w * 0.6, wn.y - wn.h * 0.35, 0.008); g.add(a); }
  }
  // 雨どい
  for (let q = 0; q < r.int(1, 2); q++) {
    const x = r.pick([-1, 1]) * r.range(w * 0.25, w * 0.45);
    g.add(paperPipe([new THREE.Vector3(x, 0.002, 0.016), new THREE.Vector3(x, h - 0.012, 0.016), new THREE.Vector3(x, h - 0.004, 0.006)], r.range(0.0028, 0.0036), r.pick(['#6a5a52', '#7a5a44', '#8a8478'])));
  }
  if (r.next() < 0.7) { const y = r.range(0.08, h * 0.6); g.add(paperPipe([new THREE.Vector3(-w / 2, y, 0.014), new THREE.Vector3(w / 2, y, 0.014)], 0.0024, '#5a4a4c')); }
  // 1階の日よけ
  if (r.next() < 0.75) { const a = paperAwning(w * 0.9, 0.034, r.pick(['#8a3a2a', '#4a6a7a', '#7a7a6a', '#3a5a3a']), r); a.position.set(0, (opts.ground ?? 0.06) + 0.004, 0.004); g.add(a); }
  // 屋上：給水塔・アンテナ・小屋（トタン屋根）
  if (r.next() < 0.6) { const t = paperTank(r); t.position.set(r.range(-w * 0.25, w * 0.25), h, -d * r.range(0.3, 0.7)); g.add(t); }
  for (let q = 0; q < r.int(1, 3); q++) { const a = paperAntenna(r); a.position.set(r.range(-w * 0.4, w * 0.4), h, -d * r.range(0.1, 0.9)); g.add(a); }
  if (r.next() < 0.5) {
    const hw = w * 0.4, hd = d * 0.35, hh = 0.035;
    const hut = withEdges(new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), cm)); hut.position.set(r.range(-w * 0.2, w * 0.2), h + hh / 2, -d * 0.6); g.add(hut);
    const roof = withEdges(new THREE.Mesh(new THREE.BoxGeometry(hw * 1.15, 0.002, hd * 1.2), paperMat(tinTexture('#6a5a50')))); roof.position.copy(hut.position).add(new THREE.Vector3(0, hh / 2 + 0.003, 0)); roof.rotation.x = 0.12; g.add(roof);
  }
  // 屋上の手すり
  const rail = paperMat(null, { color: '#3a3030' });
  for (const z of [0, -d]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0015, 0.0015), rail); b.position.set(0, h + 0.012, z); g.add(b); }
  for (let x = -w / 2; x <= w / 2 + 1e-6; x += 0.02) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.012, 0.0012), rail); p.position.set(x, h + 0.006, 0); g.add(p); }
  g.userData = { windows, w, h, d };
  return g;
}
