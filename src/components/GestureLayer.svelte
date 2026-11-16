<!--
  2. ジェスチャー層：動画全体を覆う透明な層。タップとスワイプをすべてここで受け、
  pointer-tracker（指の動き）→ tap-classifier（シングル／ダブル／連続）の順に判定する。
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { zoneOf, type Zone } from '../lib/playback-math';
  import { PointerTracker } from '../lib/pointer-tracker';
  import { TapClassifier } from '../lib/tap-classifier';

  type Side = Exclude<Zone, 'center'>;
  type Point = { x: number; y: number };

  interface Props {
    /** 左領域の右端・右領域の左端（0〜1） */
    zoneLeft: number;
    zoneRight: number;
    doubleTapMs: number;
    streakMs: number;
    onsingletap(zone: Zone): void;
    ondoubletap(side: Side, at: Point): void;
    onstreaktap(side: Side, at: Point): void;
    onstreakend(): void;
    onswipestart(): void;
    /** deltaY：開始位置からの縦の移動（下向きが正） */
    onswipemove(deltaY: number): void;
    onswipeend(): void;
  }

  let {
    zoneLeft,
    zoneRight,
    doubleTapMs,
    streakMs,
    onsingletap,
    ondoubletap,
    onstreaktap,
    onstreakend,
    onswipestart,
    onswipemove,
    onswipeend,
  }: Props = $props();

  let layer: HTMLDivElement;
  let lastTap: Point = { x: 0, y: 0 };

  const classifier = new TapClassifier({
    onSingleTap: (zone) => onsingletap(zone),
    onDoubleTap: (side) => ondoubletap(side, lastTap),
    onStreakTap: (side) => onstreaktap(side, lastTap),
    onStreakEnd: () => onstreakend(),
  });

  const tracker = new PointerTracker({
    onPress: (time) => classifier.press(time),
    onTap: (tap) => {
      lastTap = { x: tap.x, y: tap.y };
      const width = layer.getBoundingClientRect().width || 1;
      classifier.tap(zoneOf(tap.x / width, zoneLeft, zoneRight), tap.downTime, tap.upTime);
    },
    onAbort: () => classifier.abort(),
    onVerticalSwipeStart: () => onswipestart(),
    onVerticalSwipeMove: (dy) => onswipemove(dy),
    onVerticalSwipeEnd: () => onswipeend(),
  });

  $effect(() => {
    classifier.options.doubleTapMs = doubleTapMs;
    classifier.options.streakMs = streakMs;
  });

  /** 動画の読み込み直しなどで、判定途中の状態を捨てる */
  export function reset(): void {
    classifier.reset();
  }

  onDestroy(() => {
    tracker.dispose();
    classifier.reset();
  });

  function local(e: PointerEvent): Point {
    const r = layer.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onpointerdown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const { x, y } = local(e);
    if (tracker.down(e.pointerId, x, y, e.timeStamp)) {
      try {
        layer.setPointerCapture(e.pointerId);
      } catch {
        /* 無視 */
      }
    }
  }

  function onpointermove(e: PointerEvent) {
    const { x, y } = local(e);
    tracker.move(e.pointerId, x, y, e.timeStamp);
  }

  function onpointerup(e: PointerEvent) {
    const { x, y } = local(e);
    tracker.up(e.pointerId, x, y, e.timeStamp);
  }

  function onpointercancel(e: PointerEvent) {
    tracker.cancel(e.pointerId, e.timeStamp);
  }

  // ブラウザの拡大・スクロール・長押しメニューを止める（NFR-04）。
  // touch 系は passive: false で登録する必要があるため、直接 addEventListener する
  $effect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const opts = { passive: false } as const;
    const types = ['touchstart', 'touchmove', 'gesturestart', 'gesturechange', 'gestureend'];
    for (const t of types) layer.addEventListener(t, prevent, opts);
    return () => {
      for (const t of types) layer.removeEventListener(t, prevent);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (タッチ操作専用の層。キーボード操作はプレーヤー全体のショートカットと操作パネルのボタンで行う) -->
<div
  class="gesture"
  part="gesture"
  bind:this={layer}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  {onpointercancel}
  ondblclick={(e) => e.preventDefault()}
  oncontextmenu={(e) => e.preventDefault()}
></div>

<style>
  .gesture {
    position: absolute;
    inset: 0;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
</style>
