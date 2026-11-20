/**
 * 段階1：指の動きの分類（設計書 3.2）。
 * 指を1本置いてから離すまでを「タップ」「縦スワイプ」「横スワイプ」「長押し」に分ける。
 * 指が2本になったら1本指の操作は破棄し、2本の位置を「2本指」として伝える（ピンチ拡大・パン用）。
 * DOM には依存せず、座標と時刻（event.timeStamp）だけで判定する。
 */
import { defaultScheduler, type Scheduler } from './scheduler';

export interface PointerTrackerOptions {
  /** タップとみなす最大の指の移動（px） */
  tapMaxMovePx: number;
  /** タップとみなす最大の押下時間（ms） */
  tapMaxMs: number;
  /** スワイプとみなす移動量（px） */
  swipeThresholdPx: number;
  /** 縦スワイプとみなす縦横比 */
  verticalRatio: number;
}

export const DEFAULT_TRACKER_OPTIONS: PointerTrackerOptions = {
  tapMaxMovePx: 10,
  tapMaxMs: 300,
  swipeThresholdPx: 12,
  verticalRatio: 1.5,
};

export interface TapInfo {
  /** 指を置いた位置 */
  x: number;
  y: number;
  downTime: number;
  upTime: number;
}

export interface PointerTrackerCallbacks {
  /** 最初の指を置いた（タップ分類のタイマー保留用） */
  onPress?(time: number): void;
  /** タップが確定した */
  onTap?(tap: TapInfo): void;
  /** 押した指がタップではなくなった（スワイプ・長押し・2本目の指・キャンセル） */
  onAbort?(time: number): void;
  onVerticalSwipeStart?(): void;
  /** deltaY：開始位置からの縦の移動（下向きが正） */
  onVerticalSwipeMove?(deltaY: number): void;
  onVerticalSwipeEnd?(): void;
  /** 2本指になった。a・b は2本の位置 */
  onMultiStart?(a: Point, b: Point): void;
  onMultiMove?(a: Point, b: Point): void;
  /** 2本のどちらかを離した（キャンセルを含む） */
  onMultiEnd?(): void;
}

export interface Point {
  x: number;
  y: number;
}

export type TrackerState = 'idle' | 'pressed' | 'vswipe' | 'hswipe' | 'longpress' | 'multi';

export class PointerTracker {
  state: TrackerState = 'idle';
  private options: PointerTrackerOptions;
  private activeId: number | null = null;
  /** 置いている指と、その最新の位置 */
  private readonly downIds = new Map<number, Point>();
  /** 2本指のときの2本 */
  private multiIds: [number, number] | null = null;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private maxDistance = 0;
  private longPressTimer: unknown = null;

  constructor(
    private readonly callbacks: PointerTrackerCallbacks,
    options: Partial<PointerTrackerOptions> = {},
    private readonly scheduler: Scheduler = defaultScheduler,
  ) {
    this.options = { ...DEFAULT_TRACKER_OPTIONS, ...options };
  }

  /** pointerdown。追跡を始めた場合は true（呼び出し側で setPointerCapture する） */
  down(id: number, x: number, y: number, time: number): boolean {
    const hadPointers = this.downIds.size > 0;
    this.downIds.set(id, { x, y });
    if (hadPointers) {
      // 3本目以降は無視（2本指の操作を続ける）
      if (this.state === 'multi') return false;
      // 2本目の指：1本指の操作は破棄して、2本指の操作を始める
      this.abort(time);
      if (this.downIds.size !== 2) return false;
      const [first] = [...this.downIds.keys()].filter((k) => k !== id);
      this.state = 'multi';
      this.multiIds = [first, id];
      this.callbacks.onMultiStart?.(this.downIds.get(first)!, { x, y });
      return true;
    }
    this.state = 'pressed';
    this.activeId = id;
    this.startX = x;
    this.startY = y;
    this.startTime = time;
    this.maxDistance = 0;
    this.callbacks.onPress?.(time);
    this.longPressTimer = this.scheduler.setTimeout(() => {
      this.longPressTimer = null;
      if (this.state === 'pressed') {
        this.state = 'longpress';
        this.callbacks.onAbort?.(this.startTime + this.options.tapMaxMs);
      }
    }, this.options.tapMaxMs);
    return true;
  }

  move(id: number, x: number, y: number, time: number): void {
    if (!this.downIds.has(id)) return;
    this.downIds.set(id, { x, y });
    if (this.state === 'multi') {
      const [a, b] = this.multiIds!;
      if (id === a || id === b) this.callbacks.onMultiMove?.(this.downIds.get(a)!, this.downIds.get(b)!);
      return;
    }
    if (id !== this.activeId) return;
    const dx = x - this.startX;
    const dy = y - this.startY;
    this.maxDistance = Math.max(this.maxDistance, Math.hypot(dx, dy));
    const { swipeThresholdPx, verticalRatio } = this.options;

    if (this.state === 'pressed') {
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ay >= swipeThresholdPx && ay >= ax * verticalRatio) {
        this.clearLongPress();
        this.state = 'vswipe';
        this.callbacks.onAbort?.(time);
        this.callbacks.onVerticalSwipeStart?.();
        this.callbacks.onVerticalSwipeMove?.(dy);
      } else if (ax >= swipeThresholdPx) {
        this.clearLongPress();
        this.state = 'hswipe';
        this.callbacks.onAbort?.(time);
      }
    } else if (this.state === 'vswipe') {
      this.callbacks.onVerticalSwipeMove?.(dy);
    }
  }

  up(id: number, _x: number, _y: number, time: number): void {
    this.downIds.delete(id);
    if (this.endMulti(id)) return;
    if (id !== this.activeId) return;
    const state = this.state;
    this.reset();

    if (state === 'pressed') {
      const isTap =
        time - this.startTime <= this.options.tapMaxMs && this.maxDistance < this.options.tapMaxMovePx;
      if (isTap) {
        this.callbacks.onTap?.({ x: this.startX, y: this.startY, downTime: this.startTime, upTime: time });
      } else {
        this.callbacks.onAbort?.(time);
      }
    } else if (state === 'vswipe') {
      this.callbacks.onVerticalSwipeEnd?.();
    }
  }

  /** pointercancel */
  cancel(id: number, time: number): void {
    this.downIds.delete(id);
    if (this.endMulti(id)) return;
    if (id !== this.activeId) return;
    this.abort(time);
  }

  /** 進行中の操作を破棄して待機へ。速度はその時点の値を保つ */
  abort(time: number): void {
    const state = this.state;
    this.reset();
    if (state === 'pressed') this.callbacks.onAbort?.(time);
    if (state === 'vswipe') this.callbacks.onVerticalSwipeEnd?.();
    if (state === 'multi') this.callbacks.onMultiEnd?.();
  }

  /**
   * 2本指の片方を離したら2本指の操作を終える。残った指は、すべて離すまで何もしない
   * （ピンチの後に残った指で速度が変わらないように）。もう1本置けば2本指の操作をやり直す
   */
  private endMulti(id: number): boolean {
    if (this.state !== 'multi' || !this.multiIds!.includes(id)) return false;
    this.reset();
    this.callbacks.onMultiEnd?.();
    return true;
  }

  /** 要素の削除時など：指の記録もすべて消す */
  dispose(): void {
    this.reset();
    this.downIds.clear();
  }

  private reset(): void {
    this.clearLongPress();
    this.state = 'idle';
    this.activeId = null;
    this.multiIds = null;
  }

  private clearLongPress(): void {
    if (this.longPressTimer != null) {
      this.scheduler.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
