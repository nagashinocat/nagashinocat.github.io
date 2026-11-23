import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillboard } from '../js/billboard.js';

const W = [
  { id: 'a', title: 'エー', district: 'games', url: '/a/', blurb: 'あ', cm: 'assets/cm/a.mp4' },
  { id: 'b', title: 'ビー', district: 'games', url: '/b/', blurb: 'びー', isNew: true },
  { id: 'c', title: 'シー', district: 'games', url: '', blurb: 'し' },
];
test('NEW が先頭', () => {
  const s = createBillboard(W).state();
  assert.equal(s.mode, 'ticker'); assert.equal(s.text, 'NEW ＊ ビー');
});
test('4秒で次の作品', () => {
  const b = createBillboard(W);
  b.tick(3.9); assert.equal(b.state().text, 'NEW ＊ ビー');
  b.tick(0.2); assert.equal(b.state().text, 'エー');
  b.tick(4.01); assert.equal(b.state().text, 'シー');
  b.tick(4.01); assert.equal(b.state().text, 'NEW ＊ ビー');
});
test('cmありは動画つき', () => {
  const b = createBillboard(W); b.preview('a');
  assert.deepEqual(b.state(), { mode: 'cm', workId: 'a', video: 'assets/cm/a.mp4', text: 'エー ＊ あ' });
  assert.equal(b.playUrl(), '/a/');
});
test('cmなし作品はタイトル＋一言', () => {
  const b = createBillboard(W); b.preview('b');
  assert.equal(b.state().video, null); assert.equal(b.state().text, 'ビー ＊ びー');
});
test('url空は工事中、playUrlはnull', () => {
  const b = createBillboard(W); b.preview('c');
  assert.equal(b.state().mode, 'wip'); assert.equal(b.state().text, '工事中 ＊ シー');
  assert.equal(b.playUrl(), null);
});
test('ticker 中は playUrl null', () => assert.equal(createBillboard(W).playUrl(), null));
test('動画失敗で文字表示に戻る', () => {
  const b = createBillboard(W); b.preview('a'); b.videoFailed('a');
  assert.equal(b.state().video, null); assert.equal(b.state().mode, 'cm');
  b.clear(); b.tick(1); b.preview('a'); assert.equal(b.state().video, null); // 一度失敗した動画は二度と試さない
});
test('clear後0.8秒でticker', () => {
  const b = createBillboard(W); b.preview('a'); b.clear();
  b.tick(0.5); assert.equal(b.state().mode, 'cm');
  b.tick(0.4); assert.equal(b.state().mode, 'ticker');
});
test('作品0件でも落ちない', () => { const b = createBillboard([]); b.tick(5); assert.equal(b.state().mode, 'ticker'); b.preview('zz'); assert.equal(b.state().mode, 'ticker'); });
