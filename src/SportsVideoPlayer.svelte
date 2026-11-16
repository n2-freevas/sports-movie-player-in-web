<!--
  <sports-video-player> 本体。4つの層を下から重ねる（設計書 2.1）。
    1. 動画層       <video playsinline>（OS標準の操作パネルは使わない）
    2. ジェスチャー層 GestureLayer
    3. 反応表示層   SkipRipple / RateOverlay / 右上の倍率 / メッセージ
    4. 操作パネル層 Controls（と、動画未選択時の EmptyState）
  動画の状態と操作は PlayerController、パネルの表示は AutoHide、全画面は FullscreenController に任せる。
-->
<svelte:options
  customElement={{
    tag: 'sports-video-player',
    shadow: 'open',
    props: {
      filePicker: { attribute: 'file-picker', type: 'Boolean' },
      src: { attribute: 'src', type: 'String' },
      doubleTapMs: { attribute: 'double-tap-ms', type: 'Number' },
      streakMs: { attribute: 'streak-ms', type: 'Number' },
      zoneLeft: { attribute: 'zone-left', type: 'String' },
      zoneRight: { attribute: 'zone-right', type: 'String' },
      skipSeconds: { attribute: 'skip-seconds', type: 'Number' },
      swipeStepPx: { attribute: 'swipe-step-px', type: 'Number' },
      rates: { attribute: 'rates', type: 'String' },
      autohideMs: { attribute: 'autohide-ms', type: 'Number' },
    },
    extend: extendElement,
  }}
/>

<script module lang="ts">
  import { extendElement } from './lib/element-api';
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import Controls from './components/Controls.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import GestureLayer from './components/GestureLayer.svelte';
  import RateOverlay from './components/RateOverlay.svelte';
  import SkipRipple from './components/SkipRipple.svelte';
  import { AutoHide } from './lib/autohide.svelte';
  import type { PlayerSnapshot } from './lib/element-api';
  import { createEmitter } from './lib/events';
  import { FullscreenController } from './lib/fullscreen.svelte';
  import {
    DEFAULT_RATES,
    formatRate,
    formatSkipLabel,
    parseRates,
    parseRatio,
    rateIndexFromSwipe,
    type Direction,
    type Zone,
  } from './lib/playback-math';
  import { PlayerController } from './lib/player-controller.svelte';

  interface Props {
    filePicker?: boolean;
    src?: string;
    doubleTapMs?: number;
    streakMs?: number;
    zoneLeft?: string;
    zoneRight?: string;
    skipSeconds?: number;
    swipeStepPx?: number;
    rates?: string;
    autohideMs?: number;
  }

  let {
    filePicker = false,
    src,
    doubleTapMs,
    streakMs,
    zoneLeft,
    zoneRight,
    skipSeconds,
    swipeStepPx,
    rates,
    autohideMs,
  }: Props = $props();

  /** 縦スワイプ終了後に倍率表示を消すまで */
  const RATE_HIDE_AFTER_SWIPE_MS = 600;
  /** メニュー・APIで速度を変えたときの倍率表示時間 */
  const RATE_FLASH_MS = 900;
  /** スキップ表示を出しておく時間 */
  const SKIP_VISIBLE_MS = 650;

  // ───────────── 設定値（属性。設計書 3.3） ─────────────

  /** 数値属性：未指定・不正なら既定値 */
  const num = (value: number | undefined, fallback: number, min: number) =>
    value != null && Number.isFinite(value) && value >= min ? value : fallback;

  const settings = $derived.by(() => {
    let left = parseRatio(zoneLeft ?? null) ?? 0.37;
    let right = parseRatio(zoneRight ?? null) ?? 0.63;
    if (left > right) [left, right] = [0.37, 0.63];
    return {
      zoneLeft: left,
      zoneRight: right,
      doubleTapMs: num(doubleTapMs, 200, 1),
      streakMs: num(streakMs, 500, 1),
      skipSeconds: num(skipSeconds, 10, 0),
      swipeStepPx: num(swipeStepPx, 32, 1),
      autohideMs: num(autohideMs, 3000, 0),
    };
  });

  // ───────────── 状態 ─────────────

  const hostEl = $host<HTMLElement>();
  const emit = createEmitter(hostEl);
  const player = new PlayerController(emit);
  const fullscreen = new FullscreenController(hostEl);

  let menuOpen = $state(false);
  let seeking = $state(false);
  const panel = new AutoHide(
    () => settings.autohideMs,
    () => !player.paused && !menuOpen && !seeking,
  );

  let gesture: GestureLayer | undefined = $state();
  let fileInput: HTMLInputElement;

  // ── 反応表示 ──
  type SkipView = { visible: boolean; label: string; at: { x: number; y: number } | null; seq: number };
  const skipView = $state<Record<'left' | 'right', SkipView>>({
    left: { visible: false, label: '', at: null, seq: 0 },
    right: { visible: false, label: '', at: null, seq: 0 },
  });
  const skipTimers: Record<'left' | 'right', ReturnType<typeof setTimeout> | undefined> = { left: undefined, right: undefined };
  let streakTotal = 0;

  let rateOverlayVisible = $state(false);
  let rateTimer: ReturnType<typeof setTimeout> | undefined;
  let swipeStartIndex = 0;

  // ───────────── 属性・状態の変化への反応 ─────────────

  $effect(() => fullscreen.listen());

  // 全画面中は fullscreen 属性を付ける（スタイル調整用）
  $effect(() => {
    hostEl.toggleAttribute('fullscreen', fullscreen.active);
  });

  // rates 属性
  $effect(() => {
    const list = parseRates(rates ?? null) ?? [...DEFAULT_RATES];
    untrack(() => player.setRates(list));
  });

  // src 属性（ファイル選択で読み込んだ動画は src を外しても残す）
  $effect(() => {
    const url = src;
    untrack(() => {
      if (url) startLoad(() => player.loadUrl(url));
    });
  });

  // 停止中は表示したまま。再生が始まったら自動で隠すタイマーを始める
  $effect(() => {
    const paused = player.paused;
    untrack(() => (paused ? panel.show() : panel.restart()));
  });

  // メニューやシーク操作が終わったら、隠すタイマーをやり直す
  $effect(() => {
    void menuOpen;
    void seeking;
    untrack(() => panel.restart());
  });

  // エラー時は操作パネルを出す
  $effect(() => {
    if (player.error) untrack(() => panel.show());
  });

  onDestroy(() => {
    panel.cancel();
    clearTimeout(rateTimer);
    clearTimeout(skipTimers.left);
    clearTimeout(skipTimers.right);
    // 要素が削除されたら古い動画の参照を解放する（NFR-06）
    player.release();
  });

  // ───────────── 公開メソッド（設計書 3.5） ─────────────

  /** 動画を読み込む。前の動画の参照は解放する */
  export function loadFile(file: File): Promise<void> {
    return startLoad(() => player.loadFile(file));
  }

  export function play(): void {
    player.play();
  }

  export function pause(): void {
    player.pause();
  }

  export function togglePlay(): void {
    player.togglePlay();
  }

  /** 速度に応じた秒数だけ動かし、実際に動いた秒数を返す */
  export function skip(direction: -1 | 1): number {
    const moved = player.skipBy(direction, settings.skipSeconds);
    if (moved == null) return 0;
    emit('gvp-skip', { direction, seconds: moved, rate: player.rate, total: moved });
    return moved;
  }

  /** rate プロパティの書き込み（element-api.ts から呼ばれる） */
  export function setRate(rate: number): void {
    player.setRate(rate, 'api');
    flashRate();
  }

  /** currentTime プロパティの書き込み（element-api.ts から呼ばれる） */
  export function setCurrentTime(time: number): void {
    player.seek(time);
  }

  /** プロパティの読み取り（element-api.ts から呼ばれる） */
  export function getSnapshot(): PlayerSnapshot {
    return {
      rate: player.rate,
      currentTime: player.video?.currentTime ?? 0,
      duration: player.hasMetadata ? player.duration : NaN,
      paused: player.video?.paused ?? true,
      video: player.video,
    };
  }

  // ───────────── 内部処理 ─────────────

  function startLoad(load: () => Promise<void>): Promise<void> {
    gesture?.reset();
    streakTotal = 0;
    panel.show();
    const p = load();
    p.catch(() => {
      /* gvp-error と画面表示で知らせる */
    });
    return p;
  }

  function onFileChange() {
    const file = fileInput.files?.[0];
    fileInput.value = ''; // 同じファイルをもう一度選べるようにする
    if (file) loadFile(file);
  }

  // ── ジェスチャー ──

  function onSingleTap(zone: Zone) {
    if (zone === 'center' && player.source != null) player.togglePlay();
    else panel.toggle();
  }

  function onSkipGesture(direction: Direction, at: { x: number; y: number }) {
    const moved = player.skipBy(direction, settings.skipSeconds);
    if (moved == null) return; // 動画の情報を読み込む前のスキップは無視
    streakTotal += moved;
    showSkip(direction, streakTotal, at);
    emit('gvp-skip', { direction, seconds: moved, rate: player.rate, total: streakTotal });
  }

  function onSwipeMove(deltaY: number) {
    const i = rateIndexFromSwipe(
      swipeStartIndex,
      deltaY,
      settings.swipeStepPx,
      player.rates.length,
      player.minRateIndex,
    );
    if (i !== player.rateIndex) player.setRateIndex(i, 'swipe');
  }

  // ── 反応表示 ──

  function showSkip(direction: Direction, total: number, at: { x: number; y: number }) {
    const side = direction < 0 ? 'left' : 'right';
    const other = direction < 0 ? 'right' : 'left';
    skipView[other].visible = false;
    const view = skipView[side];
    view.label = formatSkipLabel(direction, total);
    view.at = at;
    view.seq += 1;
    view.visible = true;
    clearTimeout(skipTimers[side]);
    skipTimers[side] = setTimeout(() => (skipView[side].visible = false), SKIP_VISIBLE_MS);
  }

  /** 倍率を出す。hideAfterMs を省略すると出したまま */
  function showRate(hideAfterMs?: number) {
    rateOverlayVisible = true;
    clearTimeout(rateTimer);
    if (hideAfterMs != null) rateTimer = setTimeout(() => (rateOverlayVisible = false), hideAfterMs);
  }

  function flashRate() {
    showRate(RATE_FLASH_MS);
  }
</script>

<div class="root" part="root">
  <!-- 1. 動画層 -->
  <video
    bind:this={player.video}
    part="video"
    playsinline
    preload="metadata"
    disablepictureinpicture
    disableremoteplayback
    onloadedmetadata={() => player.onLoadedMetadata()}
    ondurationchange={() => player.onDurationChange()}
    ontimeupdate={() => player.onTimeUpdate()}
    onprogress={() => player.onProgress()}
    onseeked={() => player.onProgress()}
    onplay={() => player.onPlayStateChange()}
    onpause={() => player.onPlayStateChange()}
    onended={() => panel.show()}
    onerror={() => player.onError()}
  ></video>

  <!-- 2. ジェスチャー層 -->
  <GestureLayer
    bind:this={gesture}
    zoneLeft={settings.zoneLeft}
    zoneRight={settings.zoneRight}
    doubleTapMs={settings.doubleTapMs}
    streakMs={settings.streakMs}
    onsingletap={onSingleTap}
    ondoubletap={(side, at) => {
      streakTotal = 0;
      onSkipGesture(side === 'left' ? -1 : 1, at);
    }}
    onstreaktap={(side, at) => onSkipGesture(side === 'left' ? -1 : 1, at)}
    onstreakend={() => (streakTotal = 0)}
    onswipestart={() => {
      swipeStartIndex = player.rateIndex;
      showRate();
    }}
    onswipemove={onSwipeMove}
    onswipeend={() => showRate(RATE_HIDE_AFTER_SWIPE_MS)}
  />

  <!-- 3. 反応表示層（タップは受けない） -->
  <div class="feedback">
    <SkipRipple side="left" {...skipView.left} />
    <SkipRipple side="right" {...skipView.right} />
    <RateOverlay
      visible={rateOverlayVisible}
      rates={player.rates}
      index={player.rateIndex}
      minIndex={player.minRateIndex}
    />
    <!-- 速度が1倍以外のとき、操作パネルを隠していても右上に倍率を出し続ける -->
    <div class="rate-badge" class:show={!panel.visible && player.rate !== 1} part="rate-badge">
      {formatRate(player.rate)}
    </div>
    {#if player.errorMessage}
      <div class="message" role="alert">{player.errorMessage}</div>
    {/if}
  </div>

  <!-- 4. 操作パネル層 -->
  <Controls
    {player}
    visible={panel.visible}
    {filePicker}
    fullscreen={fullscreen.active}
    bind:menuOpen
    bind:seeking
    onpickfile={() => fileInput.click()}
    onselectrate={(i) => {
      player.setRateIndex(i, 'menu');
      flashRate();
    }}
    ontogglefullscreen={() => fullscreen.toggle()}
    onactivity={() => panel.restart()}
  />

  {#if player.source == null}
    <EmptyState {filePicker} onpickfile={() => fileInput.click()} />
  {/if}

  <input
    bind:this={fileInput}
    type="file"
    accept="video/*,.mp4,.mov,.m4v,.webm"
    hidden
    onchange={onFileChange}
  />
</div>

<style>
  :host {
    display: block;
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    color: #fff;
    overflow: hidden;
    contain: layout paint;
    font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Segoe UI', Roboto, sans-serif;
    -webkit-text-size-adjust: 100%;
    --gvp-accent: #ff3b30;
    --gvp-fade: 0.2s;
    --gvp-bar-height: 56px;
  }

  :host([hidden]) {
    display: none;
  }

  /* 疑似全画面（iPhone）／ネイティブ全画面 */
  :host([fullscreen]),
  :host(:fullscreen) {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    max-width: none;
    aspect-ratio: auto;
    z-index: 2147483647;
    border-radius: 0 !important;
  }

  .root {
    position: absolute;
    inset: 0;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  .root :global(*),
  .root :global(*::before),
  .root :global(*::after) {
    box-sizing: border-box;
  }

  /* 既定値のリセット。:where で詳細度を下げ、各コンポーネントの指定を優先させる */
  :where(.root) :global(button) {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  :where(.root) :global(button:focus-visible) {
    outline: 2px solid #fff;
    outline-offset: 2px;
    border-radius: 6px;
  }

  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
    pointer-events: none;
  }

  .feedback {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .rate-badge {
    position: absolute;
    top: calc(10px + env(safe-area-inset-top, 0px));
    right: calc(10px + env(safe-area-inset-right, 0px));
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.55);
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    opacity: 0;
    transition: opacity var(--gvp-fade) ease;
  }

  .rate-badge.show {
    opacity: 1;
  }

  .message {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-width: min(86%, 420px);
    padding: 14px 18px;
    border-radius: 12px;
    background: rgba(30, 30, 30, 0.88);
    font-size: 14px;
    line-height: 1.5;
    text-align: center;
  }
</style>
