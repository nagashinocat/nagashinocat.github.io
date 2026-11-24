import test from 'node:test';
import assert from 'node:assert/strict';
import { recCanvas } from './helpers.js';
import { fitText, drawSign } from '../js/draw/sign.js';
import { drawFacade } from '../js/draw/facade.js';
import { drawClutterStrip } from '../js/draw/clutter.js';
import { INK } from '../js/draw/manga.js';
import { rng } from '../js/rng.js';

const m = (s, px) => [...s].length * px;
const LONG = '鉛筆削りがなかった僕は、旋盤で削ることにした。';

test('短い文字は最大サイズで1行', () => {
  const f = fitText(m, '超能力者の証明', 200, 40, 10);
  assert.equal(f.px, 28); assert.deepEqual(f.lines, ['超能力者の証明']);
});
test('長い文字は2行に割る', () => {
  const f = fitText(m, LONG, 120, 40, 10);
  assert.equal(f.lines.length, 2);
  assert.ok(f.lines.every(l => m(l, f.px) <= 120));
  assert.equal(f.lines.join(''), LONG);
});
test('どうしても入らなければ最小サイズで省略記号', () => {
  const f = fitText(m, LONG, 40, 40, 10);
  assert.equal(f.px, 10);
  assert.ok(f.lines.every(l => m(l, f.px) <= 40));
  assert.ok(f.lines.at(-1).endsWith('…'));
});
const bld = { id: 'b', x: 0, z: 0, w: 0.2, h: 0.8, d: 0.1, style: 'tenement', row: 2 };
for (const dist of ['games', 'tools', 'wip']) {
  test(`${dist}: 同じ乱数で同じ建物`, () => {
    const a = recCanvas(), b = recCanvas();
    drawFacade(a, bld, dist, rng(5)); drawFacade(b, bld, dist, rng(5));
    assert.ok(a.log.length > 200); assert.deepEqual(a.log, b.log);
  });
  test(`${dist}: 輪郭の墨線が最後`, () => {
    const c = recCanvas(); drawFacade(c, bld, dist, rng(5));
    const lastStroke = c.log.filter(e => e[0] === 'set' && e[1] === 'strokeStyle').at(-1);
    assert.equal(lastStroke[2], INK);
    assert.equal(c.log.at(-1)[0], 'strokeRect');
  });
}
test('違う乱数なら違う建物', () => {
  const a = recCanvas(), b = recCanvas();
  drawFacade(a, bld, 'games', rng(5)); drawFacade(b, bld, 'games', rng(6));
  assert.notDeepEqual(a.log, b.log);
});
test('作品看板には▶が入る、飾りには入らない', () => {
  const a = recCanvas(512, 160), b = recCanvas(512, 160);
  drawSign(a, { text: 'クジラが見てる', color: '#4fd8ff', isWork: true, vertical: false });
  drawSign(b, { text: '麻雀', color: '#4fd8ff', isWork: false, vertical: false });
  const has = c => c.log.some(e => e[0] === 'fillText' && String(e[1]).includes('▶'));
  assert.ok(has(a)); assert.ok(!has(b));
});
test('ダクト模様が描ける', () => { for (const k of ['duct', 'tube', 'wire']) { const c = recCanvas(64, 256); drawClutterStrip(c, k, rng(1)); assert.ok(c.log.length > 5); } });
test('英字の縦看板は文字を90度回して1行で描く', () => {
  const c = recCanvas(120, 480);
  drawSign(c, { text: "while it's raining", color: '#4fd8ff', isWork: true, vertical: true });
  assert.ok(c.log.some(e => e[0] === 'rotate'));
  assert.ok(c.log.some(e => e[0] === 'fillText' && e[1] === "while it's raining"));
});
