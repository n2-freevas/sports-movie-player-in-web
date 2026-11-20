<!--
  2. ジェスチャー層：動画全体を覆う透明な層。タップとスワイプをすべてここで受け、
  pointer-tracker（指の動き）→ tap-classifier（シングル／ダブル／連続）の順に判定する。
  2本指（ピンチ・ドラッグ）と、拡大中のマウスの Shift + ドラッグは「つかんで動かす」操作として伝える。
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
    /** 拡大中か。拡大中だけ Shift + マウスのドラッグでつかんで動かせる */
    zoomed: boolean;
    /** つかんで動かす操作（2本指、拡大中の Shift + ドラッグ）を始めた */
    ongrabstart(): void;
    /**
     * from：開始時の中点、to：今の中点（どちらもプレーヤーの幅・高さに対する割合 0〜1）。
     * factor：開始時からの指の間隔の比（マウスは 1）
     */
    ongrabmove(from: Point, to: Point, factor: number): void;
    ongrabend(): void;
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
    zoomed,
    ongrabstart,
    ongrabmove,
    ongrabend,
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
    onMultiStart: (a, b) => {
      grabStart = { mid: mid(a, b), dist: Math.hypot(a.x - b.x, a.y - b.y) };
      ongrabstart();
    },
    onMultiMove: (a, b) => {
      if (!grabStart) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = grabStart.dist > 0 ? dist / grabStart.dist : 1;
      ongrabmove(normalize(grabStart.mid), normalize(mid(a, b)), factor);
    },
    onMultiEnd: () => {
      grabStart = null;
      ongrabend();
    },
  });

  /** つかんで動かす操作の開始時の中点（px）と2本の間隔（px） */
  let grabStart: { mid: Point; dist: number } | null = null;
  /** Shift + ドラッグ中のマウス */
  let mouseGrabId: number | null = null;

  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  /** プレーヤー内の座標（px）を幅・高さに対する割合にする */
  function normalize(p: Point): Point {
    const r = layer.getBoundingClientRect();
    return { x: r.width > 0 ? p.x / r.width : 0.5, y: r.height > 0 ? p.y / r.height : 0.5 };
  }

  $effect(() => {
    classifier.options.doubleTapMs = doubleTapMs;
    classifier.options.streakMs = streakMs;
  });

  /** 動画の読み込み直しなどで、判定途中の状態を捨てる */
  export function reset(): void {
    classifier.reset();
    // 動画の読み込み直しで拡大は等倍に戻るので、つかんで動かす操作も終える
    if (mouseGrabId != null) endMouseGrab(mouseGrabId);
    else if (tracker.state === 'multi') tracker.abort(performance.now());
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
    // 拡大中の Shift + ドラッグ：タップ・スワイプの判定には渡さず、つかんで動かす
    if (e.pointerType === 'mouse' && e.shiftKey && zoomed && mouseGrabId == null) {
      mouseGrabId = e.pointerId;
      grabStart = { mid: { x, y }, dist: 0 };
      try {
        layer.setPointerCapture(e.pointerId);
      } catch {
        /* 無視 */
      }
      ongrabstart();
      return;
    }
    if (tracker.down(e.pointerId, x, y, e.timeStamp)) {
      try {
        layer.setPointerCapture(e.pointerId);
      } catch {
        /* 無視 */
      }
    }
  }

  function onpointermove(e: PointerEvent) {
    const p = local(e);
    if (e.pointerId === mouseGrabId) {
      if (grabStart) ongrabmove(normalize(grabStart.mid), normalize(p), 1);
      return;
    }
    tracker.move(e.pointerId, p.x, p.y, e.timeStamp);
  }

  function onpointerup(e: PointerEvent) {
    if (endMouseGrab(e.pointerId)) return;
    const { x, y } = local(e);
    tracker.up(e.pointerId, x, y, e.timeStamp);
  }

  function onpointercancel(e: PointerEvent) {
    if (endMouseGrab(e.pointerId)) return;
    tracker.cancel(e.pointerId, e.timeStamp);
  }

  function endMouseGrab(id: number): boolean {
    if (id !== mouseGrabId) return false;
    mouseGrabId = null;
    grabStart = null;
    ongrabend();
    return true;
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
