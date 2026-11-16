/**
 * 段階1：指の動きの分類（設計書 3.2）。
 * 指を1本置いてから離すまでを「タップ」「縦スワイプ」「横スワイプ」「長押し」に分ける。
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
}

export type TrackerState = 'idle' | 'pressed' | 'vswipe' | 'hswipe' | 'longpress';

export class PointerTracker {
  state: TrackerState = 'idle';
  private options: PointerTrackerOptions;
  private activeId: number | null = null;
  private readonly downIds = new Set<number>();
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
    this.downIds.add(id);
    if (hadPointers) {
      // 2本目の指：その操作は破棄して待機へ
      this.abort(time);
      return false;
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
    if (id !== this.activeId) return;
    this.abort(time);
  }

  /** 進行中の操作を破棄して待機へ。速度はその時点の値を保つ */
  abort(time: number): void {
    const state = this.state;
    this.reset();
    if (state === 'pressed') this.callbacks.onAbort?.(time);
    if (state === 'vswipe') this.callbacks.onVerticalSwipeEnd?.();
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
  }

  private clearLongPress(): void {
    if (this.longPressTimer != null) {
      this.scheduler.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
