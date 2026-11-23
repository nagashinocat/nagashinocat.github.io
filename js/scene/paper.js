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
function windowUnit(g, x, y, w, h, r, s, emit) {
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
  if (r.next() < 0.42) {
    const ox = x - w * 0.12, oy = y - h * 0.08, ow = w * 1.24, oh = h * 1.2;
    g.strokeStyle = '#2a1e1e'; g.lineWidth = 1.1 * s;
    for (let k = 0; k <= 8; k++) line(g, [[ox + ow * k / 8, oy], [ox + ow * k / 8, oy + oh]], 1.1 * s, '#2e2222');
    for (const yy of [oy, oy + oh * 0.35, oy + oh]) line(g, [[ox, yy], [ox + ow, yy]], 1.6 * s, '#2e2222');
    tone(g, ox, oy + oh * 0.85, ow, oh * 0.15, s, 0.5);
    // 植木鉢や箱
    if (r.next() < 0.5) rect(g, ox + ow * r.range(0.1, 0.6), oy + oh * 0.78, ow * 0.18, oh * 0.18, r.pick(['#7a4a2a', '#4a6a3a', '#8a8a7a']), 1 * s);
  }
  // 室外機（窓の横か下）
  if (r.next() < 0.32) {
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
export function drawPaperFace(Wm, Hm, kind, r, { ppu = 2400, ground = 0.06, palette, max = 2048 } = {}) {
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
      windowUnit(g, i * colW + (colW - ww) / 2 - colW * 0.08, y + floorH * 0.22, ww, wh, r, s, emit);
    }
    // 縦の配管と金具
    for (let k = 0; k < (kind === 'side' ? 3 : 2); k++) {
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
