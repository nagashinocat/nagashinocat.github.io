import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rng } from '../js/rng.js';
import { planDistrict } from '../js/layout.js';
import { validateWorks, worksByDistrict } from '../js/works.js';

const W = worksByDistrict(validateWorks(JSON.parse(readFileSync(new URL('../data/works.json', import.meta.url)))));
const kinds = ['games', 'tools', 'wip'];

test('rng は種で決まり [0,1)', () => {
  const a = rng(3), b = rng(3);
  for (let i = 0; i < 50; i++) { const x = a.next(); assert.equal(x, b.next()); assert.ok(x >= 0 && x < 1); }
  const r = rng(9); for (let i = 0; i < 200; i++) { const n = r.int(2, 4); assert.ok(n >= 2 && n <= 4 && Number.isInteger(n)); }
});
test('同じ種なら同じ計画', () => assert.deepEqual(planDistrict('games', W.games, 7), planDistrict('games', W.games, 7)));
for (const k of kinds) {
  test(`${k}: 作品ごとに看板がちょうど1つ`, () => {
    const p = planDistrict(k, W[k], 1);
    for (const w of W[k]) assert.equal(p.signs.filter(s => s.workId === w.id).length, 1, w.id);
  });
  test(`${k}: 飾り看板は作品数の3倍以上`, () => {
    const p = planDistrict(k, W[k], 1);
    assert.ok(p.signs.filter(s => s.workId === null).length >= 3 * W[k].length);
  });
  test(`${k}: 建物同士が重ならない`, () => {
    const b = planDistrict(k, W[k], 1).buildings;
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
      const A = b[i], B = b[j];
      const ox = Math.abs(A.x - B.x) < (A.w + B.w) / 2 - 1e-9, oz = Math.abs(A.z - B.z) < (A.d + B.d) / 2 - 1e-9;
      assert.ok(!(ox && oz), `${A.id} x ${B.id}`);
    }
  });
  test(`${k}: 全建物がページ内`, () => {
    for (const b of planDistrict(k, W[k], 1).buildings) {
      assert.ok(Math.abs(b.x) + b.w / 2 <= 1 + 1e-9, b.id);
      assert.ok(Math.abs(b.z) + b.d / 2 <= 0.7 + 1e-9, b.id);
    }
  });
  test(`${k}: ダクト・チューブ類が建物数以上`, () => {
    const p = planDistrict(k, W[k], 1);
    assert.ok(p.decor.filter(d => d.type === 'duct' || d.type === 'tube').length >= p.buildings.length);
  });
  test(`${k}: 看板は実在の建物に載る`, () => {
    const p = planDistrict(k, W[k], 1); const ids = new Set(p.buildings.map(b => b.id));
    for (const s of p.signs) assert.ok(ids.has(s.bldgId));
  });
}
test('掲示板ビルが最も高い', () => {
  const p = planDistrict('games', W.games, 1);
  const bb = p.buildings.find(b => b.id === p.billboard.bldgId);
  assert.ok(bb); assert.equal(bb.h, Math.max(...p.buildings.map(b => b.h)));
});
test('作品看板は路地にせり出す縦看板（九龍城ふう）', () => {
  const p = planDistrict('games', W.games, 1);
  for (const s of p.signs.filter(s => s.workId)) { assert.equal(s.vertical, true, s.workId); assert.equal(s.project, true, s.workId); }
});
test('作品0件でも落ちない', () => { for (const k of kinds) assert.ok(planDistrict(k, [], 2).buildings.length > 0); });
test('作品が多くても全部に看板', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ id: 'w' + i, title: 'T' + i, district: 'games', url: '/x/', blurb: '' }));
  const p = planDistrict('games', many, 3);
  assert.equal(p.signs.filter(s => s.workId).length, 40);
});

// 路地の構図（2026-11-23 追加指示）
import { ALLEY } from '../js/layout.js';
for (const k of kinds) {
  test(`${k}: 路地は空いている（突き当たりの掲示板ビル以外）`, () => {
    const p = planDistrict(k, W[k], 1);
    for (const b of p.buildings) if (b.id !== p.billboard.bldgId) assert.ok(Math.abs(b.x) - b.w / 2 >= ALLEY / 2 - 1e-9, b.id);
  });
  test(`${k}: 路地沿いの建物は路地を向く`, () => {
    const p = planDistrict(k, W[k], 1);
    for (const b of p.buildings.filter(b => b.id !== p.billboard.bldgId)) assert.equal(b.face, b.x < 0 ? 'east' : 'west', b.id);
  });
  test(`${k}: 掲示板ビルは路地の突き当たりで手前を向く`, () => {
    const p = planDistrict(k, W[k], 1); const bb = p.buildings.find(b => b.id === p.billboard.bldgId);
    assert.equal(bb.face, 'south'); assert.ok(Math.abs(bb.x) < 0.05); assert.ok(bb.z < -0.35);
  });
  test(`${k}: 作品看板は路地沿いの建物に載る`, () => {
    const p = planDistrict(k, W[k], 1); const near = new Set(p.buildings.filter(b => Math.abs(b.x) - b.w / 2 < ALLEY / 2 + 0.02).map(b => b.id));
    for (const s of p.signs.filter(s => s.workId)) assert.ok(near.has(s.bldgId), s.workId);
  });
}
test('掲示板ビルはどの街区でも最も高い', () => { for (const k of kinds) { const p = planDistrict(k, W[k], 1); const bb = p.buildings.find(b => b.id === p.billboard.bldgId); assert.equal(bb.h, Math.max(...p.buildings.map(b => b.h))); } });
test('路地に提灯の列がある（繁華街）', () => assert.ok(planDistrict('games', W.games, 1).decor.filter(d => d.type === 'lantern').length >= 4));
