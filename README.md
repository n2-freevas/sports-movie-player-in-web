# sports-video-player

タップとスワイプだけで「N秒スキップ」と「速度変更」ができる動画プレーヤー（Webコンポーネント）。
仕様は [docs/](docs/) の要件定義・設計書を参照。

## 使い方

```html
<script type="module" src="sports-video-player.js"></script>
<sports-video-player file-picker></sports-video-player>
```

| 操作 | 動作 |
| --- | --- |
| 左（〜37%）ダブルタップ | 巻き戻し（続けてタップで追加） |
| 右（63%〜）ダブルタップ | 送り（続けてタップで追加） |
| 中央タップ | 再生・停止 |
| 左右タップ | 操作パネルの表示切り替え |
| 縦スワイプ | 上で速く、下で遅く（0.1〜2倍）。等倍未満はスキップ秒数も「10秒×速度」 |

操作方法は、下部バーの「？」ボタンからプレーヤー内でも確認できる（開くと動画は停止する）。

属性：`file-picker` `src` `double-tap-ms` `streak-ms` `zone-left` `zone-right` `skip-seconds` `swipe-step-px` `rates` `autohide-ms`（`fullscreen` は自動で付く）
メソッド・プロパティ：`loadFile(file)` `play()` `pause()` `togglePlay()` `skip(-1|1)` `rate` `currentTime` `duration` `paused`
イベント：`gvp-load` `gvp-skip` `gvp-ratechange` `gvp-playstate` `gvp-error`（`code` は `unsupported` / `decode` / `network` / `aborted` / `play` / `unknown`）

## ソースの構成（Svelte 5）

```
src/
  index.ts                     エントリ（カスタム要素の登録）
  SportsVideoPlayer.svelte     本体。4層を重ね、属性・公開メソッド・イベントをつなぐ
  components/
    GestureLayer.svelte        ジェスチャー層（pointer-tracker → tap-classifier）
    Controls.svelte            操作パネル（上部バー・再生ボタン・下部バー）
    SeekBar.svelte / SpeedMenu.svelte / EmptyState.svelte
    SkipRipple.svelte / RateOverlay.svelte   反応表示
    HelpOverlay.svelte         操作方法（下部バーの「？」で開く）
    Icon.svelte / icons.ts     SVGアイコン
  lib/                         画面に依存しないロジック
    playback-math.ts           スキップ秒数・速度段階の計算（純粋関数）
    pointer-tracker.ts         指の動きの分類
    tap-classifier.ts          シングル／ダブル／連続タップの分類
    player-controller.svelte.ts  動画の状態と操作（読み込み・再生・スキップ・速度）
    autohide.svelte.ts         操作パネルの自動非表示
    fullscreen.svelte.ts       全画面／疑似全画面
    element-api.ts             rate・currentTime などのプロパティを要素に追加
    events.ts                  公開イベントの型とエラー文言
```

## 開発

```bash
npm install
npm run dev      # http://localhost:5173/demo/（--host 付きなので同じWi-FiのiPhoneからも開ける）
npm test         # 単体テスト（Vitest）
npm run typecheck  # svelte-check
npm run build    # dist/sports-video-player.js（ESM）と dist/sports-video-player.iife.js
```

デモページは `?src=/testdata/xxx.MOV` で開発サーバー上の動画を直接読み込める（`testdata/` は git 管理外）。
