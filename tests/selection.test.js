import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillboard } from '../js/billboard.js';
import { createSelection } from '../js/selection.js';

const W = [
  { id: 'a', title: 'A', district: 'games', url: '/a/', blurb: '' },
  { id: 'b', title: 'B', district: 'games', url: '/b/', blurb: '' },
  { id: 'c', title: 'C', district: 'wip', url: '', blurb: '' },
];
const setup = () => { const went = []; const bb = createBillboard(W); return { bb, went, s: createSelection(bb, { navigate: u => went.push(u) }) }; };

test('1回目は予告だけ', () => { const { s, bb, went } = setup(); s.tap({ workId: 'a' }); assert.equal(bb.state().workId, 'a'); assert.deepEqual(went, []); });
test('同じ看板2回で遊ぶ', () => { const { s, went } = setup(); s.tap({ workId: 'a' }); s.tap({ workId: 'a' }); assert.deepEqual(went, ['/a/']); });
test('別の看板は切替のみ', () => { const { s, bb, went } = setup(); s.tap({ workId: 'a' }); s.tap({ workId: 'b' }); assert.equal(bb.state().workId, 'b'); assert.deepEqual(went, []); s.tap({ workId: 'b' }); assert.deepEqual(went, ['/b/']); });
test('掲示板タップで遊ぶ', () => { const { s, went } = setup(); s.tap({ workId: 'b' }); s.tap({ billboard: true }); assert.deepEqual(went, ['/b/']); });
test('何も選ばずに掲示板タップは何もしない', () => { const { s, went } = setup(); s.tap({ billboard: true }); assert.deepEqual(went, []); });
test('工事中は2回押しても飛ばない', () => { const { s, bb, went } = setup(); s.tap({ workId: 'c' }); s.tap({ workId: 'c' }); s.tap({ billboard: true }); assert.deepEqual(went, []); assert.equal(bb.state().mode, 'wip'); });
test('空タップで解除', () => { const { s, bb, went } = setup(); s.tap({ workId: 'a' }); s.tap(null); bb.tick(1); assert.equal(bb.state().mode, 'ticker'); s.tap({ workId: 'a' }); assert.deepEqual(went, []); });
test('hover は予告と解除だけ', () => { const { s, bb, went } = setup(); s.hover('a'); assert.equal(bb.state().workId, 'a'); s.hover(null); bb.tick(1); assert.equal(bb.state().mode, 'ticker'); assert.deepEqual(went, []); });
test('hover 後のクリックは1回で遊ぶ（PC）', () => { const { s, went } = setup(); s.hover('a'); s.tap({ workId: 'a' }); assert.deepEqual(went, ['/a/']); });
test('ロック中は無視', () => { const { s, bb, went } = setup(); s.locked = true; s.hover('a'); s.tap({ workId: 'a' }); s.tap({ workId: 'a' }); assert.deepEqual(went, []); assert.equal(bb.state().mode, 'ticker'); });
