import test from 'node:test';
import assert from 'node:assert/strict';
import { createTapGuard, runExclusive, syncVideos, shouldRedraw } from '../js/util.js';

test('ドラッグして離したらタップにならない（同じ操作の距離で判定）', () => {
  const g = createTapGuard(8);
  g.down(100, 100); g.move(160, 100); assert.equal(g.up(160, 100), false);
  g.down(50, 50); assert.equal(g.up(52, 51), true); // 直後の普通のタップは通る
});
test('途中で取り消されたら次の操作に影響しない', () => {
  const g = createTapGuard(8);
  g.down(0, 0); g.move(100, 0); g.cancel();
  g.down(10, 10); assert.equal(g.up(10, 10), true);
});
test('失敗しても busy が戻る', async () => {
  const st = { busy: false };
  await assert.rejects(runExclusive(st, async () => { throw new Error('x'); }));
  assert.equal(st.busy, false);
  let ran = 0; st.busy = true; await runExclusive(st, async () => { ran++; }); assert.equal(ran, 0);
});
test('映していない動画は止める', () => {
  const mk = () => ({ paused: false, pause() { this.paused = true; } });
  const v = new Map([['a', mk()], ['b', mk()]]);
  syncVideos(v, 'a'); assert.equal(v.get('a').paused, false); assert.equal(v.get('b').paused, true);
  syncVideos(v, null); assert.equal(v.get('a').paused, true);
});
test('掲示板はドットが1つ動いたか、中身が変わった時だけ描き直す', () => {
  const s = {};
  assert.equal(shouldRedraw(s, 'A', 0.2, null), true);
  assert.equal(shouldRedraw(s, 'A', 0.9, null), false);
  assert.equal(shouldRedraw(s, 'A', 1.1, null), true);
  assert.equal(shouldRedraw(s, 'B', 1.2, null), true);
  assert.equal(shouldRedraw(s, 'B', 1.3, 'video'), true); // 動画は毎回
});
