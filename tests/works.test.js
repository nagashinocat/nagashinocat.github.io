import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateWorks, worksByDistrict, isPlayable } from '../js/works.js';

const ok = (id, extra = {}) => ({ id, title: id.toUpperCase(), district: 'games', url: `/${id}/`, blurb: '', ...extra });

test('不正な項目を捨てる', () => {
  const w = validateWorks([ok('a'), { id: 'b' }, { id: 'c', title: 'C', district: 'mars', url: '', blurb: '' }]);
  assert.deepEqual(w.map(x => x.id), ['a']);
});
test('配列でなければ空', () => assert.deepEqual(validateWorks(null), []));
test('id 重複は先勝ち', () => {
  const w = validateWorks([ok('a', { title: '1' }), ok('a', { title: '2' })]);
  assert.equal(w.length, 1); assert.equal(w[0].title, '1');
});
test('街区に振り分け', () => {
  const d = worksByDistrict([ok('a'), ok('t', { district: 'tools' })]);
  assert.deepEqual(Object.keys(d).sort(), ['games', 'tools', 'wip']);
  assert.equal(d.tools[0].id, 't'); assert.deepEqual(d.wip, []);
});
test('url空は遊べない', () => {
  assert.equal(isPlayable({ url: '' }), false);
  assert.equal(isPlayable({ url: '/a/' }), true);
});
test('同梱の works.json が全件通る', () => {
  const raw = JSON.parse(readFileSync(new URL('../data/works.json', import.meta.url)));
  assert.ok(raw.length >= 14);
  assert.equal(validateWorks(raw).length, raw.length);
});
