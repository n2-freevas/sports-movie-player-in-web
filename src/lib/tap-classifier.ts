/**
 * 段階2：タップの分類（設計書 3.2）。
 * タップを「シングル」「ダブル」「連続」に分ける。
 *
 * 200ms は「1回目を離した時刻」から「2回目の指を置いた時刻」までで測る。
 * 2回目の指を置いた時点でタイマーを保留し、離したときにタップかどうかを確定する。
 * その指がスワイプや長押しだった場合は、保留していたシングルタップをその時点で実行する。
 */
import type { Zone } from './playback-math';
import { defaultScheduler, type Scheduler } from './scheduler';

export interface TapClassifierOptions {
  /** ダブルタップの猶予（ms） */
  doubleTapMs: number;
  /** 連続タップの猶予（ms） */
  streakMs: number;
}

export interface TapClassifierCallbacks {
  onSingleTap?(zone: Zone): void;
  /** 左右のダブルタップ（中央のダブルタップは何もしないので呼ばれない） */
  onDoubleTap?(zone: Exclude<Zone, 'center'>): void;
  /** ダブルタップ後の連続タップ（1回ごと） */
  onStreakTap?(zone: Exclude<Zone, 'center'>): void;
  /** 連続の終了 */
  onStreakEnd?(): void;
}

type State =
  | { kind: 'none' }
  | { kind: 'waiting'; zone: Zone; releaseTime: number; held: boolean }
  | { kind: 'streak'; zone: Exclude<Zone, 'center'>; releaseTime: number; held: boolean };

export class TapClassifier {
  options: TapClassifierOptions;
  private state: State = { kind: 'none' };
  private timer: unknown = null;

  constructor(
    private readonly callbacks: TapClassifierCallbacks,
    options: Partial<TapClassifierOptions> = {},
    private readonly scheduler: Scheduler = defaultScheduler,
  ) {
    this.options = { doubleTapMs: 200, streakMs: 500, ...options };
  }

  get stateKind(): State['kind'] {
    return this.state.kind;
  }

  /** 指を置いた（タップかどうかは未確定） */
  press(time: number): void {
    const s = this.state;
    if (s.kind === 'waiting') {
      if (time - s.releaseTime <= this.options.doubleTapMs) {
        this.clearTimer();
        s.held = true;
      } else {
        // タイマーの発火が遅れていた：時刻で判定してシングルタップ扱い
        this.fireSingle();
      }
    } else if (s.kind === 'streak') {
      if (time - s.releaseTime <= this.options.streakMs) {
        this.clearTimer();
        s.held = true;
      } else {
        this.endStreak();
      }
    }
  }

  /** タップが確定した */
  tap(zone: Zone, downTime: number, upTime: number): void {
    const s = this.state;

    if (s.kind === 'waiting') {
      const inTime = s.held || downTime - s.releaseTime <= this.options.doubleTapMs;
      this.clearTimer();
      if (inTime && s.zone === zone) {
        if (zone === 'center') {
          // 中央のダブルタップは何もしない（Q4）
          this.state = { kind: 'none' };
          return;
        }
        this.state = { kind: 'streak', zone, releaseTime: upTime, held: false };
        this.startTimer(this.options.streakMs, () => this.endStreak());
        this.callbacks.onDoubleTap?.(zone);
        return;
      }
      // 別の領域（または時間切れ）：1回目のシングルタップをすぐ実行
      this.fireSingle();
      this.beginWaiting(zone, upTime);
      return;
    }

    if (s.kind === 'streak') {
      const inTime = s.held || downTime - s.releaseTime <= this.options.streakMs;
      this.clearTimer();
      if (inTime && s.zone === zone) {
        s.releaseTime = upTime;
        s.held = false;
        this.startTimer(this.options.streakMs, () => this.endStreak());
        this.callbacks.onStreakTap?.(zone);
        return;
      }
      this.endStreak();
      this.beginWaiting(zone, upTime);
      return;
    }

    this.beginWaiting(zone, upTime);
  }

  /** 押した指がタップではなかった（スワイプ・長押し・キャンセル） */
  abort(): void {
    const s = this.state;
    if (s.kind === 'waiting' && s.held) {
      this.fireSingle();
    } else if (s.kind === 'streak' && s.held) {
      this.endStreak();
    }
  }

  /** 状態をすべて捨てる（動画の読み込み直し・要素の削除時） */
  reset(): void {
    this.clearTimer();
    this.state = { kind: 'none' };
  }

  private beginWaiting(zone: Zone, releaseTime: number): void {
    this.state = { kind: 'waiting', zone, releaseTime, held: false };
    this.startTimer(this.options.doubleTapMs, () => this.fireSingle());
  }

  private fireSingle(): void {
    const s = this.state;
    this.clearTimer();
    this.state = { kind: 'none' };
    if (s.kind === 'waiting') this.callbacks.onSingleTap?.(s.zone);
  }

  private endStreak(): void {
    const wasStreak = this.state.kind === 'streak';
    this.clearTimer();
    this.state = { kind: 'none' };
    if (wasStreak) this.callbacks.onStreakEnd?.();
  }

  private startTimer(ms: number, fn: () => void): void {
    this.clearTimer();
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      fn();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer != null) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
