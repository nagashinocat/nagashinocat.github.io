import test from 'node:test';
import assert from 'node:assert/strict';
import { popupAngle, foldAngle } from '../js/scene/popup.js';
const H = Math.PI / 2;
test('delay前は寝ている', () => assert.equal(popupAngle(0.1, 0.3), 0));
test('最後は立つ', () => assert.ok(Math.abs(popupAngle(5, 0.3) - H) < 1e-6));
test('途中で行き過ぎる', () => {
  let max = 0; for (let t = 0.3; t < 1.2; t += 0.01) max = Math.max(max, popupAngle(t, 0.3));
  assert.ok(max > H + 0.03);
});
test('畳むは逆', () => {
  assert.ok(Math.abs(foldAngle(0.1, 0.3) - H) < 1e-6);
  assert.equal(foldAngle(5, 0.3), 0);
  for (let t = 0; t < 2; t += 0.05) { const a = foldAngle(t, 0.3); assert.ok(a >= 0 && a <= H + 1e-9); }
});
test('dur で速さが変わる', () => assert.ok(popupAngle(0.2, 0, 0.15) > popupAngle(0.2, 0, 0.7)));
