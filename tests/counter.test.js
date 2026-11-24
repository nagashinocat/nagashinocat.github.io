import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCount, shouldCount, counterDigits } from '../js/counter.js';

test('GoatCounter の数（"1,234"）を数にする', () => {
  assert.equal(parseCount({ count: '1,234' }), 1234);
  assert.equal(parseCount({ count: '7' }), 7);
  assert.equal(parseCount({ count: '1 234' }), 1234);
  assert.equal(parseCount({}), null);
  assert.equal(parseCount(null), null);
  assert.equal(parseCount({ count: 'abc' }), null);
});
test('手元の確認（localhost・撮影モード）では数えない', () => {
  assert.equal(shouldCount({ hostname: 'nagashinocat.github.io', search: '' }), true);
  assert.equal(shouldCount({ hostname: 'localhost', search: '' }), false);
  assert.equal(shouldCount({ hostname: '127.0.0.1', search: '' }), false);
  assert.equal(shouldCount({ hostname: 'nagashinocat.github.io', search: '?manual' }), false);
});
test('カウンターの桁：6桁にゼロ埋め、あふれたら桁を増やす、不明なら横棒', () => {
  assert.equal(counterDigits(42), '000042');
  assert.equal(counterDigits(1234567), '1234567');
  assert.equal(counterDigits(null), '------');
});
