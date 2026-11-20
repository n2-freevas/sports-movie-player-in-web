# sports-video-player

タップとスワイプだけで「N秒スキップ」と「速度変更」ができる動画プレーヤー。Webコンポーネントとして設計。
主にスポーツ観戦や、動画によるプレーの分析では、これらの操作を少ない手数(ジェスチャー)で行えることは非常に重要であると考えており、その要求を満たす。

## インテグレート方法

Webコンポーネントとして提供しているため、ビルド済みのjsを HTMLでインポートし、任意の箇所で `<sports-video-player>` を記述すると、クライアントサイドレンダリングのタイミングで動画プレイヤーが呼び出される。

```html
<script type="module" src="sports-video-player.js"></script>
<sports-video-player file-picker></sports-video-player>
```

## 操作方法

| 操作 | 動作 |
| --- | --- |
| 左 ダブルタップ | 巻き戻し（続けてタップで追加） |
| 右 ダブルタップ | 送り（続けてタップで追加） |
| 中央タップ | 再生・停止 |
| 左右タップ | 操作パネルの表示切り替え |
| 縦スワイプ | 上で速く、下で遅く（0.1〜2倍）。等倍未満はスキップ秒数も「10秒×速度」 |
| 2本指でピンチ | 動画を拡大・縮小（1〜4倍） |
| 2本指でドラッグ | 拡大中に見る場所を動かす |

### キーボードショートカット

YouTube と同じキー割り当て。プレーヤーをクリック（タップ）するか Tab キーで選択した状態で効く（ページの他の場所では効かない）。

| キー | 動作 |
| --- | --- |
| `Space` / `K` | 再生・停止（Tab キーでボタンを選んでいるときの `Space` はそのボタンを押す。クリック・タップで押したボタンにフォーカスが残っていても、`Space` は再生・停止） |
| `J` / `L` | 10秒戻る・進む（`skip-seconds`。等倍未満は「秒数×速度」） |
| `←` / `→` | 5秒戻る・進む（`skip-seconds` の半分。等倍未満は「秒数×速度」） |
| `,` / `.` | 停止中に1コマ戻る・進む（30fps とみなして 1/30 秒） |
| `↓` / `↑`、`<` / `>`（`Shift` + `,` / `.`） | 再生速度を1段階下げる・上げる（`↑` `↓` は YouTube では音量だが、このプレーヤーでは速度） |
| `+` / `-` / `Z` | 動画を拡大・縮小・等倍に戻す（1〜4倍。`=` `;` でも拡大。キー配列による違いを吸収するため） |
| `Shift` + 矢印 | 拡大中に見る場所を動かす（等倍のときは `Shift` なしと同じ） |
| `Home` / `End` | 先頭・末尾へ |
| `0`〜`9` | 動画の 0%〜90% の位置へ |
| `?` | 操作方法を開く・閉じる |

`Ctrl`・`Cmd`・`Alt` を押しながらのキーと、日本語入力の変換中はショートカットにしない。

### マウス・トラックパッド

| 操作 | 動作 |
| --- | --- |
| `Ctrl` または `Shift` + ホイール、トラックパッドのピンチ | マウスの位置を中心に動画を拡大・縮小（ブラウザ自体の拡大は止める） |
| 拡大中にホイール（2本指でなぞる） | 見る場所を動かす（等倍のときはページのスクロールのまま） |
| 拡大中に `Shift` + ドラッグ | つかんで見る場所を動かす |

拡大するのは動画だけで、操作パネルなどの表示は拡大しない。別の動画を読み込むと等倍に戻る。


## プロパティ・カスタムイベント

### 属性

数値の属性に不正な値（数値でない、下限未満）を指定した場合は既定値を使う。属性は後から変更しても即座に反映される。

| 属性 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `file-picker` | 真偽値 | なし | 上部バーと、動画未選択時の画面中央に「動画ファイルを選択」ボタンを出す |
| `src` | 文字列 | なし | 動画のURL。設定・変更するとその動画を読み込む（ネット上の動画の再生は動作保証外） |
| `double-tap-ms` | 数値（ms、1以上） | `200` | ダブルタップとみなす猶予。1回目を離してから2回目の指を置くまでの時間 |
| `streak-ms` | 数値（ms、1以上） | `500` | ダブルタップ後、続けてタップして追加でスキップできる猶予 |
| `zone-left` | 割合 | `37%` | 左領域（巻き戻し）の右端。`37`・`37%`・`0.37` のいずれの書き方でもよい |
| `zone-right` | 割合 | `63%` | 右領域（送り）の左端。`zone-left` より小さい場合は両方とも既定値に戻す |
| `skip-seconds` | 数値（秒、0以上） | `10` | 1回のスキップ秒数。等倍より遅いときは「この秒数 × 再生速度」になる |
| `swipe-step-px` | 数値（px、1以上） | `32` | 縦スワイプで速度が1段階変わる移動量 |
| `rates` | 数値のリスト | `0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2` | 選べる速度の段階。カンマまたは空白で区切る。昇順に並べ替え、重複は除く |
| `autohide-ms` | 数値（ms、0以上） | `3000` | 再生中、操作がないときに操作パネルを隠すまでの時間。`0` で自動で隠さない |
| `fullscreen` | 真偽値 | なし | 全画面表示中に自動で付く（読み取り専用。スタイル調整用） |

### メソッド

メソッドとプロパティは、要素がページに追加されてから使える（追加した直後ではなく、次のマイクロタスク以降。たとえば `customElements.whenDefined` や `await Promise.resolve()` の後）。

| メソッド | 戻り値 | 説明 |
| --- | --- | --- |
| `loadFile(file: File)` | `Promise<void>` | 端末内の動画ファイルを読み込む。前の動画の参照は解放する。総時間を読み込んだら解決し、読み込みに失敗したとき、または別の動画の読み込みで中断されたとき（`AbortError`）は拒否する |
| `play()` | `void` | 再生する。動画が未読み込みなら何もしない。再生できなかったときは `svp-error`（`code: 'play'`）を発生させる |
| `pause()` | `void` | 停止する |
| `togglePlay()` | `void` | 再生と停止を切り替える |
| `skip(direction: -1 \| 1)` | `number` | `-1` で巻き戻し、`1` で送り。速度に応じた秒数だけ動かし、実際に動いた秒数を返す（先頭・末尾で止まった分は含めない）。総時間の読み込み前は何もせず `0` を返す |

### プロパティ

| プロパティ | 型 | 読み書き | 説明 |
| --- | --- | --- | --- |
| `rate` | `number` | 読み書き | 再生速度。段階にない値は一番近い段階に合わせる。0以下・数値以外は無視する。変更すると画面中央に倍率を表示する |
| `currentTime` | `number` | 読み書き | 再生位置（秒）。0〜総時間の範囲に収める。総時間の読み込み前に書き込んでも無視する |
| `duration` | `number` | 読み取り専用 | 総時間（秒）。読み込み前は `NaN` |
| `paused` | `boolean` | 読み取り専用 | 停止中かどうか |
| `videoElement` | `HTMLVideoElement` | 読み取り専用 | 内部の `<video>` 要素（高度な用途向け） |

### カスタムイベント

すべて `CustomEvent` で、親要素へ伝わり（`bubbles`）、Shadow DOM の外でも受け取れる（`composed`）。内容は `event.detail` に入る。

| イベント | `detail` | 発生するとき |
| --- | --- | --- |
| `svp-load` | `{ name: string, duration: number }` | 動画の総時間を読み込んだ。`name` はファイル名（`src` の場合はURLの末尾） |
| `svp-skip` | `{ direction: -1 \| 1, seconds: number, rate: number, total: number }` | スキップした。`seconds` は今回実際に動いた秒数、`rate` はその時の速度、`total` は連続タップ中の合計秒数（`skip()` から呼んだ場合は `seconds` と同じ） |
| `svp-ratechange` | `{ rate: number, source: 'swipe' \| 'menu' \| 'keyboard' \| 'api' }` | 速度が変わった。`source` は縦スワイプ・速度一覧・キーボード・`rate` プロパティのどれで変えたか。同じ速度を設定したときは発生しない |
| `svp-playstate` | `{ paused: boolean }` | 再生・停止が切り替わった |
| `svp-error` | `{ code: string, message: string }` | 読み込みや再生に失敗した。`message` は画面にも表示する日本語の文言 |

`svp-error` の `code`：

| `code` | 意味 |
| --- | --- |
| `unsupported` | 非対応の形式（MKV など） |
| `decode` | デコードできなかった（ファイルの破損など） |
| `network` | 読み込み中のエラー |
| `aborted` | 読み込みが中断された |
| `play` | 再生を開始できなかった（ブラウザの自動再生の制限など） |
| `unknown` | その他 |

### 使用例

```js
const player = document.querySelector('sports-video-player');

player.addEventListener('svp-skip', (e) => {
  console.log(`${e.detail.total}秒スキップ（${e.detail.rate}倍）`);
});
player.addEventListener('svp-error', (e) => alert(e.detail.message));

await customElements.whenDefined('sports-video-player');
await Promise.resolve(); // 要素の準備を待つ
player.rate = 0.5;
await player.loadFile(file); // file は <input type="file"> などで得た File
player.play();
```


## 開発

```bash
npm install
npm run dev      # http://localhost:5173/demo/（--host 付きなので同じWi-FiのiPhoneからも開ける）
npm test         # 単体テスト（Vitest）
npm run typecheck  # svelte-check
npm run build    # dist/sports-video-player.js（ESM）と dist/sports-video-player.iife.js
```

