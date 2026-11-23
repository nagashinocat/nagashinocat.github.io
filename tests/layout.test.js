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
test('12文字超の作品名は縦看板', () => {
  const p = planDistrict('games', W.games, 1);
  assert.equal(p.signs.find(s => s.workId === 'neko-tasukete').vertical, true);
  assert.equal(p.signs.find(s => s.workId === 'whale-watch').vertical, false);
});
test('作品0件でも落ちない', () => { for (const k of kinds) assert.ok(planDistrict(k, [], 2).buildings.length > 0); });
test('作品が多くても全部に看板', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ id: 'w' + i, title: 'T' + i, district: 'games', url: '/x/', blurb: '' }));
  const p = planDistrict('games', many, 3);
  assert.equal(p.signs.filter(s => s.workId).length, 40);
});
