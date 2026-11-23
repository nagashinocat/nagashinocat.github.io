# 開発置き場ホームページ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 飛び出す絵本の漫画調ネオン街で、看板から作品を選んで遊べる nagashinocat.github.io を作る。

**Architecture:** ビルド工程なしの静的サイト。ES モジュール＋import map で Three.js を CDN から読む。絵はすべて canvas で描いて板（紙の切り絵）に貼る。ロジック（作品データ・配置・掲示板・選択）は DOM/Three に依存しない純粋モジュールにして node:test で試験し、見た目は Playwright のスクリーンショットで確認する。

**Tech Stack:** HTML/CSS/JS（ES2022 モジュール）、three@0.170.0（cdn.jsdelivr.net、addons の EffectComposer/UnrealBloomPass を含む）、node:test、Playwright 1.63（試験専用・本番に入れない）、ffmpeg（CM動画の圧縮）。

**Spec:** `docs/superpowers/specs/2026-11-23-dev-hub-homepage-design.md`

## Global Constraints

- 公開先: GitHub Pages ユーザーサイト、リポジトリ `nagashinocat/nagashinocat.github.io`（ルート直下に index.html）。サーバーなし。
- 3ページ: `games`＝ネオンの繁華街／`tools`＝ボロい工場街（錆びトタン・煙突の町工場）／`wip`＝工事中の空き地。
- 見た目: 「最後の一撃」の配色（夕暮れオレンジ→紫→群青の空、黄色い窓格子、ピンク #ff4fa3・水色 #4fd8ff のネオン縁、白く光る高速道路）を**漫画調**で。黒い墨の輪郭線、網点トーン、カケアミ。窓枠・手すり・室外機・配管・看板文字まで描き込む。**用途不明のチューブ・ダクトを大量に**。
- 作品の看板はゆっくり明滅＋「▶」。飾り看板は明滅しない。
- 掲示板は各ページ1つ（繁華街＝ネオン電光掲示板ビル／工場街＝ブラウン管の積み上げ／空き地＝工事用電光表示板）、画面は縦長タワー型。アイドル時はオレンジのドット文字で作品名を流し、`isNew` を先頭に「NEW」付きで。
- PC: 看板にカーソル→掲示板にCM、クリック→遊ぶ。スマホ: 1回タップ→CM、同じ看板をもう1回タップ（または掲示板の「あそぶ」）→遊ぶ。
- 作品を足すのは `data/works.json` に1件足すだけ。`url` が空なら「工事中」。
- 作品一覧への近道を常に表示（WebGL が使えない端末ではこれが本体）。
- 縦画面スマホ最優先で軽く。乱数は種を固定し、毎回同じ街になる。
- 後から差し替える絵は背景透明 PNG（建物データの `art` 欄）。
- すべての画面文字は日本語。

## Review Focus

1. **WebGL がない／初期化に失敗した端末** → 3D を出さず作品一覧ページがそのまま使える（Task 7 で試験）。
2. **`url` が空の作品の看板を2回タップ** → どこにも飛ばず掲示板に「工事中」（Task 5 で試験）。
3. **CM動画が読めない・自動再生を拒否された** → 掲示板はタイトル＋一言のドット文字表示に戻る（Task 8 で試験）。
4. **本が開く途中・ページめくり中の連打** → 入力は無視され、二重めくりや途中状態の固まりが起きない（Task 6 で試験）。
5. **長い作品名（「鉛筆削りがなかった僕は、旋盤で削ることにした。」）と幅 360px の画面** → 看板・掲示板・一覧ではみ出さない（Task 3・7 で試験）。

---

## ファイル構成

```
index.html                 入口。import map、#app(canvas), #ui, #list
css/style.css              UI・一覧・読み込み画面
data/works.json            作品データ（唯一の追加場所）
assets/cm/*.mp4            圧縮済みCM（Task 8）
js/main.js                 起動・WebGL判定・全体の配線
js/works.js                作品データの読込・検証・振り分け
js/rng.js                  種固定乱数
js/layout.js               街区の配置計画（純粋データ）
js/draw/manga.js           漫画の画材（墨線・トーン・カケアミ）
js/draw/facade.js          建物の正面テクスチャ
js/draw/clutter.js         チューブ・ダクト・室外機・洗濯物・電線
js/draw/sign.js            看板テクスチャ
js/billboard.js            掲示板の状態機械＋ドット文字描画
js/selection.js            カーソル/タップ選択の状態機械
js/scene/popup.js          飛び出す角度の時間関数
js/scene/book.js           本とページめくり
js/scene/district.js       配置計画→Three のグループ
js/scene/stage.js          レンダラ・カメラ・ブルーム・品質段階
js/list.js                 作品一覧（近道・WebGLなし時の本体）
tests/*.test.js            node:test
tests/e2e/smoke.mjs        Playwright 確認
tests/serve.mjs            試験用の静的サーバ（node:http）
```

---

### Task 1: 作品データと読込

**Files:** Create `data/works.json`, `js/works.js`, `tests/works.test.js`, `package.json`（`"type":"module"`, `"scripts":{"test":"node --test tests/"}`、依存なし）

**Interfaces:**
- Produces: `validateWorks(raw: unknown): Work[]`（不正な項目は捨てて console.warn）、`worksByDistrict(works: Work[]): {games: Work[], tools: Work[], wip: Work[]}`、`isPlayable(w: Work): boolean`、`loadWorks(url='data/works.json'): Promise<Work[]>`
- `Work = {id: string, title: string, district: 'games'|'tools'|'wip', url: string, blurb: string, cm?: string, shot?: string, color?: string, isNew?: boolean, art?: string}`

`works.json` 初期内容（url は絶対パス `/xxx/`）:
games: aiaigasa「while it's raining」、chounouryokusha-no-shoumei「超能力者の証明」、neko-tasukete「ちょっと、うちの猫ちゃんを助けてあげて」、senban-enpitsu「鉛筆削りがなかった僕は、旋盤で削ることにした。」、whale-watch「クジラが見てる」(`/whale-watch/`)、saigo-no-ichigeki「最後の一撃」(url 空、district は games のまま)。tools: nankai-sim「南海トラフ地震シミュレーター」(`/nankai-sim/`)、drawing-to-3d「3D読み込みツール」(url 空)。wip: さいきょうせいぶつ、皆に代わってお捌きよ‼︎、3D刀鍛冶、空想の偉人、サメかサメ以外か、アルマジロトカゲ飼育（url 空）。blurb は各1行、短く。

- [ ] **Step 1: 失敗する試験**
```js
test('不正な項目を捨てる', () => {
  const w = validateWorks([{id:'a',title:'A',district:'games',url:'/a/',blurb:''},{id:'b'},{id:'c',title:'C',district:'mars',url:'',blurb:''}]);
  assert.deepEqual(w.map(x=>x.id), ['a']);
});
test('id 重複は先勝ち', ...);           // 2件目を捨てる
test('街区に振り分け', ...);            // games/tools/wip のキーが常にある（空配列でも）
test('url 空は遊べない', () => assert.equal(isPlayable({url:''}), false));
test('同梱の works.json が全件通る', ...); // fs で読み、validate 後の件数 = 元の件数
```
- [ ] **Step 2:** `npm test` → FAIL（モジュールなし）
- [ ] **Step 3:** `js/works.js` を実装、`data/works.json` を書く
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: 作品データと読込`

### Task 2: 種固定乱数と街区の配置計画

**Files:** Create `js/rng.js`, `js/layout.js`, `tests/layout.test.js`

**Interfaces:**
- Produces: `rng(seed: number): {next(): number /*[0,1)*/, range(a,b): number, int(a,b): number /*両端含む*/, pick<T>(arr:T[]): T}`（mulberry32）
- Produces: `planDistrict(kind: 'games'|'tools'|'wip', works: Work[], seed: number): Plan`
- `Plan = {kind, buildings: Bldg[], signs: SignSpot[], billboard: {x,z,w,h}, decor: Decor[]}`
- `Bldg = {id: string, x, z, w, h, d, style: string, row: number, art?: string}`（`art` は差し替え用の透明PNGのパス。作品看板が載る建物は `Work.art` を引き継ぐ。buildDistrict は `art` があれば facade の代わりにその画像を貼る）（単位は本のページ上の座標：x ∈ [-1,1]、z ∈ [-0.7,0.7]、手前が z 大）
- `SignSpot = {workId: string|null, bldgId: string, u: number, v: number /*壁面上 0..1*/, w, h, vertical: boolean}`（workId null は飾り）
- `Decor = {type: 'duct'|'tube'|'wire'|'chimney'|'crane'|'fence'|'laundry', from:[x,y,z], to:[x,y,z]}`

配置の決まり: 掲示板ビルは games では中央奥（x≈0, z≈-0.3）で最も高い。建物は 4〜6 列の奥行きで手前ほど低く、ページ外にはみ出さない。tools は低い工場＋煙突、wip は空き地中央を空けて足場・クレーン・フェンス。作品看板は手前2列の目に入る高さに優先して置き、飾り看板は作品数の3倍以上。縦長タイトル（12文字超）は `vertical: true`。

- [ ] **Step 1: 失敗する試験**
```js
test('同じ種なら同じ計画', () => assert.deepEqual(planDistrict('games',W,7), planDistrict('games',W,7)));
test('作品ごとに看板がちょうど1つ', ...);       // games の各 work.id が signs に1回
test('飾り看板は作品数の3倍以上', ...);
test('建物同士が重ならない', ...);              // x-z 矩形の交差なし
test('全建物がページ内', ...);                  // |x±w/2|<=1, |z±d/2|<=0.7
test('掲示板ビルが最も高い', ...);              // games
test('12文字超の作品名は縦看板', ...);
test('ダクト・チューブ類が建物数以上', ...);     // decor の duct+tube 数 >= buildings 数
test('作品0件でも落ちない', ...);
```
- [ ] **Step 2:** FAIL を確認
- [ ] **Step 3:** 実装（格子に並べて乱数で幅・高さを揺らし、重なりは配置時に弾く）
- [ ] **Step 4:** PASS
- [ ] **Step 5:** commit `feat: 種固定の街区配置`

### Task 3: 漫画調の画材・建物・看板テクスチャ

**Files:** Create `js/draw/manga.js`, `js/draw/facade.js`, `js/draw/clutter.js`, `js/draw/sign.js`, `tests/draw.test.js`, `tests/e2e/draw-sheet.html`（全テクスチャを並べて見る確認用ページ）

**Interfaces:**
- Produces: `inkRect(ctx,x,y,w,h,{weight})`、`screentone(ctx,x,y,w,h,{dot,spacing,color})`、`crosshatch(ctx,x,y,w,h,{density,angle})`、`inkLine(ctx,pts,{weight,jitter,r})`（r は rng）
- Produces: `drawFacade(canvas: HTMLCanvasElement|OffscreenCanvas, b: Bldg, district: string, r): void` — 窓格子（黄・白・消灯の混在）、窓枠、手すり、室外機、配管、ベランダの洗濯物、縁のネオン線、影側にトーン、輪郭は墨。tools は錆びトタン波板＋汚れ、wip は足場とブルーシート。
- Produces: `drawClutterStrip(canvas, kind: 'duct'|'tube'|'wire', r)` — 束・曲がり・途中で途切れる・継ぎ目のバンド。
- Produces: `drawSign(canvas, {text: string, color: string, isWork: boolean, vertical: boolean}): void` — 文字は箱に収まるまで縮める（最小 10px 相当）、収まらなければ2行（縦なら2列）。isWork なら右下に「▶」。
- Produces: `fitText(measure: (s:string,px:number)=>number, text, boxW, maxPx, minPx): {px:number, lines:string[]}`（純粋。sign.js が使う）

- [ ] **Step 1: 失敗する試験**（node:test、`fitText` は幅を `s.length*px` とする偽 measure で）
```js
test('短い文字は最大サイズ', () => assert.equal(fitText(m,'超能力者の証明',200,40,10).px, 28)); // 7*28=196
test('長い文字は2行に割る', () => {
  const f = fitText(m,'鉛筆削りがなかった僕は、旋盤で削ることにした。',120,40,10);
  assert.equal(f.lines.length, 2); assert.ok(f.lines.every(l=>l.length*f.px<=120));
});
test('どうしても入らなければ最小サイズで省略記号', ...);
```
canvas 描画の関数は記録用の偽 ctx（呼び出しを配列に積む）で「同じ乱数で同じ呼び出し列」「輪郭の墨線が最後に描かれる」を試験。
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 実装。`draw-sheet.html` に games/tools/wip の建物各4枚、看板（短い・長い・縦・飾り）、ダクト類を並べる。
- [ ] **Step 4:** `npm test` PASS。`node tests/e2e/smoke.mjs --sheet` で `draw-sheet.html` を 1280×900 で撮影し、目視で「漫画の墨線・トーンが見える／長い題が箱に収まる」を確認。
- [ ] **Step 5:** commit `feat: 漫画調テクスチャ`

### Task 4: 掲示板

**Files:** Create `js/billboard.js`, `tests/billboard.test.js`

**Interfaces:**
- Produces: `createBillboard(works: Work[]): Billboard`
- `Billboard = {state(): BState, preview(workId: string): void, clear(): void, videoFailed(workId): void, tick(dtSec: number): void, playUrl(): string|null}`
- `BState = {mode: 'ticker', text: string} | {mode: 'cm', workId, video: string|null, text: string} | {mode: 'wip', workId, text: string}`
- Produces: `drawDots(canvas, text: string, scrollPx: number, {dot:4, color:'#ff9a1f'})` — ドット文字。縦長画面なので文字を縦に流す。

決まり: ticker は `isNew` を先に「NEW ＊ 題」、続いて残りを works.json の順。1件 4 秒。`preview` は cm があれば cm モード、なければタイトル＋blurb の cm モード（video null）、url 空なら wip モード「工事中 ＊ 題」。`clear()` 後 0.8 秒で ticker に戻る。`playUrl()` は cm モードで url があるときだけ返す。

- [ ] **Step 1: 失敗する試験**
```js
test('NEW が先頭', ...);
test('4秒で次の作品', ...);            // tick(4.01) で text が変わる
test('cmなし作品はタイトル＋一言', ...);
test('url空は工事中、playUrlはnull', ...);
test('動画失敗で文字表示に戻る', () => { b.preview('aiaigasa'); b.videoFailed('aiaigasa'); assert.equal(b.state().video, null); });
test('clear後0.8秒でticker', ...);
```
- [ ] **Step 2:** FAIL → **Step 3:** 実装 → **Step 4:** PASS
- [ ] **Step 5:** commit `feat: 掲示板の状態機械とドット文字`

### Task 5: 選択（カーソルとタップ）

**Files:** Create `js/selection.js`, `tests/selection.test.js`

**Interfaces:**
- Consumes: `Billboard`（Task 4）
- Produces: `createSelection(billboard: Billboard, {navigate: (url:string)=>void}): Selection`
- `Selection = {hover(workId: string|null): void, tap(target: {workId: string}|{billboard: true}|null): void, locked: boolean}`

決まり: `hover` は preview/clear を呼ぶだけ（遊ばない）。`tap` 1回目＝preview、同じ看板2回目または `{billboard:true}`＝`playUrl()` があれば navigate、なければ何もしない。別の看板をタップしたら preview 先を切り替え（1回目扱い）。空タップで clear。`locked` が true の間はすべて無視。

- [ ] **Step 1: 失敗する試験**
```js
test('1回目は予告だけ', ...);         // navigate 呼ばれない
test('同じ看板2回で遊ぶ', ...);        // navigate('/aiaigasa/')
test('別の看板は切替のみ', ...);
test('掲示板タップで遊ぶ', ...);
test('工事中は2回押しても飛ばない', ...);  // Review Focus 2
test('ロック中は無視', ...);
```
- [ ] **Step 2〜4**、**Step 5:** commit `feat: 看板の選択`

### Task 6: 本・飛び出し・街区シーン

**Files:** Create `js/scene/popup.js`, `js/scene/book.js`, `js/scene/district.js`, `js/scene/stage.js`, `tests/popup.test.js`

**Interfaces:**
- Produces: `popupAngle(t: number, delay: number, dur=0.7): number`（ラジアン、0=寝ている、π/2=立つ。delay 前は 0、少し行き過ぎて戻る easeOutBack、t→∞ で π/2）、`foldAngle(t, delay, dur)`＝逆向き
- Produces: `createStage(container: HTMLElement): {renderer, scene, camera, setTier(tier: 'low'|'high'), onFrame(cb: (dt)=>void), pick(clientX, clientY): {workId}|{billboard:true}|null, dispose()}` — 視点は本を斜め上から覗く固定位置、ドラッグで ±12° だけ振れる。high のみ UnrealBloom。縦画面と横画面でカメラ距離を変え、本がはみ出さない。
- Produces: `buildDistrict(plan: Plan, works: Work[], textures): THREE.Group` — 各建物は正面・側面の板（facade テクスチャ）を下辺の折り目で回す。看板は建物に貼った板で `userData.workId`。作品看板は明度を 0.6↔1.0 で 2.4 秒周期。掲示板は `CanvasTexture`（ドット）または `VideoTexture`。
- Produces: `createBook(stage): {open(): Promise<void>, turnTo(kind): Promise<void>, current: kind, busy: boolean}` — 閉じた本→表紙が開く→ページ上の建物が手前から奥へ delay をずらして立つ→掲示板点灯。めくりは逆に畳む→ページ回転→次を立てる。`busy` 中の `turnTo` は即 resolve して何もしない。
- 空: 夕暮れグラデーションの大きな板を本の奥に（漫画の集中線を薄く重ねる）。机は暗い木目。

- [ ] **Step 1: 失敗する試験**（popup.js のみ純粋）
```js
test('delay前は寝ている', () => assert.equal(popupAngle(0.1,0.3), 0));
test('最後は立つ', () => assert.ok(Math.abs(popupAngle(5,0.3)-Math.PI/2)<1e-6));
test('途中で行き過ぎる', ...);  // ある t で > π/2
test('畳むは逆', ...);
```
- [ ] **Step 2〜4:** popup 試験 PASS
- [ ] **Step 5:** `tests/e2e/smoke.mjs` に「本が開いた後のスクショ（390×844 と 1280×800）」「看板の座標で pick が workId を返す」「turnTo を3回連打しても current が1つ進むだけ」（Review Focus 4）を追加して通す
- [ ] **Step 6:** commit `feat: 飛び出す本と街区`

### Task 7: 起動・ページめくりUI・作品一覧

**Files:** Create `index.html`, `css/style.css`, `js/main.js`, `js/list.js`, `tests/serve.mjs`、Modify `tests/e2e/smoke.mjs`

**Interfaces:**
- Consumes: Task 1〜6 の全部
- Produces: `renderList(container, works): void`（街区ごとの見出し、題・一言・「あそぶ」/「工事中」。360px で横にはみ出さない）

UI: 画面下に「◀ ▶」のめくりボタンと街区名（繁華街／工場街／空き地）、右上に「作品いちらん」。ページ端のスワイプでもめくれる。読み込み中は閉じた本の上に「ひらいています…」。`prefers-reduced-motion` では飛び出しを 0.15 秒に短縮。端末の品質: `devicePixelRatio`・`hardwareConcurrency`・最初の 60 フレームの平均で low/high を決め、low ではブルームなし・画素比 1.5 上限。WebGL 作成失敗時は `#list` を全画面で表示（Review Focus 1）。`<title>` は「nagashinocat の開発置き場」、OGP 画像は Task 9。

- [ ] **Step 1:** smoke.mjs に試験を追加: 「コンソールエラー 0」「WebGL 無効（`--disable-gpu --disable-webgl` 起動）で一覧が見え、リンクが `/aiaigasa/` を指す」「360×740 で `document.documentElement.scrollWidth <= 360`」「一覧の長い題が折り返される」
- [ ] **Step 2:** `node tests/e2e/smoke.mjs` → FAIL
- [ ] **Step 3:** 実装
- [ ] **Step 4:** PASS、スクショ目視
- [ ] **Step 5:** commit `feat: 起動とページめくり、作品一覧`

### Task 8: CM動画

**Files:** Create `assets/cm/*.mp4`, Modify `data/works.json`（`cm` 欄）, `js/scene/district.js`, `tests/e2e/smoke.mjs`

各ゲームのリポジトリ（aiaigasa, chounouryokusha-no-shoumei, neko-tasukete）から宣伝動画を探し、`ffmpeg -i in -vf "scale='min(540,iw)':-2" -c:v libx264 -preset veryfast -crf 30 -an -movflags +faststart out.mp4` で圧縮（1本 3MB 以下目標）。見つからない作品は `shot` もなしで文字表示。動画は muted・playsinline・loop で、preview 時にだけ読み込む。`error` または `play()` 拒否で `billboard.videoFailed(id)`（Review Focus 3）。縦長は画面いっぱい、横長は上下にドット文字の帯。

- [ ] **Step 1:** smoke に「存在しない cm を指す作品を preview → 掲示板が文字表示に戻る」を追加 → FAIL
- [ ] **Step 2:** 実装・動画追加 → PASS
- [ ] **Step 3:** commit `feat: 掲示板のCM動画`

### Task 9: 仕上げと公開

**Files:** Create `assets/ogp.png`（本が開いた繁華街の 1200×630 スクショ）, `README.md`（作品の足し方：works.json の項目説明と例1件）, `.nojekyll`

- [ ] **Step 1:** smoke 全体を通す（PC・スマホ・WebGLなし・連打・長い題）
- [ ] **Step 2:** スクショ一式を目視: 漫画の墨線、トーン、ダクトの量、ネオン配色が「最後の一撃」と並べて同じ街に見えるか
- [ ] **Step 3:** commit、`git -c push.negotiate=true push -u origin main`
- [ ] **Step 4:** GitHub の Settings → Pages で main / root を公開（本人操作）。`https://nagashinocat.github.io/` を開いて確認
