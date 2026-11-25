import test from 'node:test';
import assert from 'node:assert/strict';
import { standSlots, orderForStands } from '../js/layout.js';

test('スタンド看板：手前から奥へ、左右交互に1つずつ', () => {
  const s = standSlots(5);
  assert.equal(s.length, 5);
  assert.deepEqual(s.map(x => x.side), [-1, 1, -1, 1, -1]);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].z < s[i - 1].z, '奥へ進む');
  assert.ok(s[0].z <= 0.52 && s[0].z >= 0.4, '最初はカメラのすぐ先の1軒目');
});
test('スタンド看板：数が多くても路地の奥（タワーの手前）までに収まる', () => {
  const s = standSlots(20);
  assert.equal(s.length, 20);
  assert.ok(s.at(-1).z > -0.75, `最後 z=${s.at(-1).z}`);
  const gaps = s.slice(2).map((x, i) => s[i].z - x.z);
  assert.ok(Math.min(...gaps) >= 0.05, '同じ側で詰まりすぎない');
});
test('スタンド看板の並び：遊べるゲーム→道具→工事中、NEWが先', () => {
  const W = [
    { id: 'w1', district: 'wip' }, { id: 't1', district: 'tools', url: '/t/' }, { id: 'g1', district: 'games', url: '/g/' },
    { id: 'g2', district: 'games', url: '/g2/', isNew: true }, { id: 'g3', district: 'games', url: '' },
  ];
  assert.deepEqual(orderForStands(W).map(w => w.id), ['g2', 'g1', 'g3', 't1', 'w1']);
});
