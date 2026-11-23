# nagashinocat の開発置き場

https://nagashinocat.github.io/

本を開くと、九龍城の路地・第3工場・空き地が飛び出してきます。看板が作品の入口です。

## 作品の足し方

`data/works.json` に1件足すだけで、街に看板が1枚増え、作品いちらんにも載ります。

```json
{ "id": "my-game", "title": "新しいゲーム", "district": "games", "url": "/my-game/", "blurb": "ひとことの説明", "color": "#4fd8ff", "isNew": true, "shot": "assets/shots/my-game.jpg", "cm": "assets/cm/my-game.mp4" }
```

| 項目 | 意味 |
|---|---|
| `id` | 半角の名前（重ならないように） |
| `title` | 看板に出る題名 |
| `district` | `games`（繁華街）/ `tools`（工場街）/ `wip`（空き地＝工事中） |
| `url` | 遊ぶページ。空 `""` にすると「工事中」 |
| `blurb` | 掲示板と一覧に出るひとこと |
| `color` | 看板のネオンの色（なくてもよい） |
| `isNew` | `true` で掲示板の先頭に「NEW」つきで流れる |
| `shot` | 掲示板に映す画面写真（なくてもよい） |
| `cm` | 掲示板に映す宣伝動画 mp4（なくてもよい。読めなければ文字に戻る） |

宣伝動画は軽くしてから入れます：

```sh
ffmpeg -i 元の動画.mp4 -t 20 -vf "scale='min(540,iw)':-2" -c:v libx264 -preset veryfast -crf 30 -an -movflags +faststart assets/cm/my-game.mp4
```

## 試験

```sh
npm test                     # 仕組みの試験
node tests/e2e/smoke.mjs     # 画面の確認（Playwright）
```
