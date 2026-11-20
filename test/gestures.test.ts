/**
 * ジェスチャー判定（pointer-tracker + tap-classifier）を、時刻を操作して確かめる。
 * 設計書 3.8 のテスト観点のうち「単体」のものに対応する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RATES,
  rateIndexFromSwipe,
  skipSeconds,
  skipTarget,
  zoneOf,
  type Direction,
} from '../src/lib/playback-math';
import { PointerTracker } from '../src/lib/pointer-tracker';
import { TapClassifier } from '../src/lib/tap-classifier';

const WIDTH = 1000;

/** プレーヤーの最小モデル：判定部品を player.ts と同じようにつなぐ */
function createHarness(opts: { time?: number; duration?: number; rate?: number } = {}) {
  const state = {
    time: opts.time ?? 60,
    duration: opts.duration ?? 600,
    rateIndex: DEFAULT_RATES.indexOf(opts.rate ?? 1),
    paused: false,
    controlsToggles: 0,
    streakTotal: 0,
    labels: [] as string[],
    skips: 0,
  };
  let swipeStart = 0;
  const rate = () => DEFAULT_RATES[state.rateIndex];
  const skip = (dir: Direction) => {
    const target = skipTarget(state.time, skipSeconds(10, rate()), dir, state.duration);
    const moved = Math.abs(target - state.time);
    state.time = target;
    state.streakTotal += moved;
    state.skips++;
    state.labels.push(`${dir < 0 ? '-' : '+'}${Math.round(state.streakTotal * 10) / 10}`);
  };
  const classifier = new TapClassifier({
    onSingleTap: (zone) => {
      if (zone === 'center') state.paused = !state.paused;
      else state.controlsToggles++;
    },
    onDoubleTap: (zone) => {
      state.streakTotal = 0;
      skip(zone === 'left' ? -1 : 1);
    },
    onStreakTap: (zone) => skip(zone === 'left' ? -1 : 1),
    onStreakEnd: () => (state.streakTotal = 0),
  });
  const tracker = new PointerTracker({
    onPress: (t) => classifier.press(t),
    onTap: (tap) => classifier.tap(zoneOf(tap.x / WIDTH, 0.37, 0.63), tap.downTime, tap.upTime),
    onAbort: () => classifier.abort(),
    onVerticalSwipeStart: () => (swipeStart = state.rateIndex),
    onVerticalSwipeMove: (dy) => (state.rateIndex = rateIndexFromSwipe(swipeStart, dy, 32, DEFAULT_RATES.length)),
  });

  let pid = 1;
  const now = () => performance.now();
  /** 時刻を進める（タイマーも発火する） */
  const wait = (ms: number) => vi.advanceTimersByTime(ms);
  /** x の位置を、押下 holdMs で1回タップする */
  const tap = (x: number, holdMs = 40) => {
    const id = pid++;
    tracker.down(id, x, 300, now());
    wait(holdMs);
    tracker.up(id, x, 300, now());
  };
  const swipe = (x: number, dy: number, steps = 10) => {
    const id = pid++;
    tracker.down(id, x, 300, now());
    for (let i = 1; i <= steps; i++) {
      wait(10);
      tracker.move(id, x, 300 + (dy * i) / steps, now());
    }
    tracker.up(id, x, 300 + dy, now());
  };
  return { state, tracker, classifier, tap, swipe, wait, rate };
}

const LEFT = 150;
const CENTER = 500;
const RIGHT = 850;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('設計書 3.8 テスト観点', () => {
  it('T01 1倍で左をダブルタップ（間隔150ms）→ 10秒戻る、「−10秒」', () => {
    const h = createHarness({ time: 60 });
    h.tap(LEFT);
    h.wait(150);
    h.tap(LEFT);
    expect(h.state.time).toBe(50);
    expect(h.state.labels).toEqual(['-10']);
    h.wait(1000);
    expect(h.state.controlsToggles).toBe(0);
  });

  it('T02 0.25倍で右をダブルタップ → 2.5秒進む', () => {
    const h = createHarness({ time: 60, rate: 0.25 });
    h.tap(RIGHT);
    h.wait(100);
    h.tap(RIGHT);
    expect(h.state.time).toBe(62.5);
  });

  it('T03 2倍で左をダブルタップ → 10秒戻る', () => {
    const h = createHarness({ time: 60, rate: 2 });
    h.tap(LEFT);
    h.wait(100);
    h.tap(LEFT);
    expect(h.state.time).toBe(50);
  });

  it('T04 左を間隔250msで2回タップ → スキップせず、表示が2回切り替わる', () => {
    const h = createHarness();
    h.tap(LEFT);
    h.wait(250);
    h.tap(LEFT);
    h.wait(300);
    expect(h.state.skips).toBe(0);
    expect(h.state.controlsToggles).toBe(2);
  });

  it('T05 中央を1回タップ → 約200ms後に停止、もう1回で再生', () => {
    const h = createHarness();
    h.tap(CENTER);
    h.wait(199);
    expect(h.state.paused).toBe(false);
    h.wait(1);
    expect(h.state.paused).toBe(true);
    h.wait(300);
    h.tap(CENTER);
    h.wait(200);
    expect(h.state.paused).toBe(false);
  });

  it('T06 中央をダブルタップ → 何も起きない', () => {
    const h = createHarness();
    h.tap(CENTER);
    h.wait(120);
    h.tap(CENTER);
    h.wait(1000);
    expect(h.state.paused).toBe(false);
    expect(h.state.skips).toBe(0);
  });

  it('T07 左をダブルタップ後、さらに2回タップ（0.5秒以内）→ 3回分戻り「−30秒」', () => {
    const h = createHarness({ time: 100 });
    h.tap(LEFT);
    h.wait(100);
    h.tap(LEFT);
    h.wait(300);
    h.tap(LEFT);
    h.wait(400);
    h.tap(LEFT);
    expect(h.state.time).toBe(70);
    expect(h.state.labels.at(-1)).toBe('-30');
    h.wait(1000);
    expect(h.state.controlsToggles).toBe(0);
  });

  it('T08 開始3秒の位置で左をダブルタップ → 0秒で止まり「−3秒」', () => {
    const h = createHarness({ time: 3 });
    h.tap(LEFT);
    h.wait(100);
    h.tap(LEFT);
    expect(h.state.time).toBe(0);
    expect(h.state.labels).toEqual(['-3']);
  });

  it('T09 1倍から上に70pxスワイプ → 1.5倍。動かしている間も変わる', () => {
    const h = createHarness();
    const seen = new Set<number>();
    const id = 99;
    h.tracker.down(id, CENTER, 300, performance.now());
    for (let dy = 0; dy >= -70; dy -= 5) {
      h.wait(5);
      h.tracker.move(id, CENTER, 300 + dy, performance.now());
      seen.add(h.rate());
    }
    h.tracker.up(id, CENTER, 230, performance.now());
    expect(h.rate()).toBe(1.5);
    expect(seen).toContain(1.25);
  });

  it('T10 1倍から下に大きくスワイプ → 0.1倍で止まる', () => {
    const h = createHarness();
    h.swipe(CENTER, 1500);
    expect(h.rate()).toBe(0.1);
  });
});

describe('判定の細部', () => {
  it('2回目の指を置いた時点でタイマーを保留する（遅い指離しでも誤判定しない）', () => {
    const h = createHarness({ time: 60 });
    h.tap(LEFT);
    h.wait(150);
    // 2回目は 150ms 時点で置き、250ms 押したまま（合計で200msを超える）
    h.tap(LEFT, 250);
    expect(h.state.time).toBe(50);
    expect(h.state.controlsToggles).toBe(0);
  });

  it('中央の素早いダブルタップは「停止→再生」にならない', () => {
    const h = createHarness();
    h.tap(CENTER);
    h.wait(180);
    h.tap(CENTER, 100);
    h.wait(500);
    expect(h.state.paused).toBe(false);
  });

  it('2回目待ちで別の領域をタップ → 1回目のシングルをすぐ実行', () => {
    const h = createHarness();
    h.tap(LEFT);
    h.wait(50);
    h.tap(CENTER);
    expect(h.state.controlsToggles).toBe(1);
    expect(h.state.paused).toBe(false);
    h.wait(200);
    expect(h.state.paused).toBe(true);
  });

  it('保留中の指がスワイプになった → 保留していたシングルタップをその時点で実行', () => {
    const h = createHarness();
    h.tap(CENTER);
    h.wait(100);
    const id = 50;
    h.tracker.down(id, CENTER, 300, performance.now());
    h.wait(20);
    h.tracker.move(id, CENTER, 280, performance.now());
    expect(h.state.paused).toBe(true);
    h.tracker.up(id, CENTER, 280, performance.now());
    expect(h.state.skips).toBe(0);
  });

  it('保留中の指が長押しになった → 0.3秒でシングルタップを実行', () => {
    const h = createHarness();
    h.tap(LEFT);
    h.wait(100);
    const id = 51;
    h.tracker.down(id, LEFT, 300, performance.now());
    h.wait(299);
    expect(h.state.controlsToggles).toBe(0);
    h.wait(2);
    expect(h.state.controlsToggles).toBe(1);
    h.tracker.up(id, LEFT, 300, performance.now());
    h.wait(1000);
    expect(h.state.controlsToggles).toBe(1);
    expect(h.state.skips).toBe(0);
  });

  it('横スワイプは何もしない', () => {
    const h = createHarness();
    const id = 52;
    h.tracker.down(id, CENTER, 300, performance.now());
    h.wait(20);
    h.tracker.move(id, CENTER + 60, 305, performance.now());
    h.tracker.up(id, CENTER + 60, 305, performance.now());
    h.wait(1000);
    expect(h.state.paused).toBe(false);
    expect(h.state.rateIndex).toBe(DEFAULT_RATES.indexOf(1));
  });

  it('連続中に反対側をタップ → 連続を終え、新たな2回目待ちになる', () => {
    const h = createHarness({ time: 100 });
    h.tap(LEFT);
    h.wait(100);
    h.tap(LEFT);
    h.wait(100);
    h.tap(RIGHT);
    expect(h.state.time).toBe(90);
    h.wait(100);
    h.tap(RIGHT);
    expect(h.state.time).toBe(100);
    expect(h.state.labels.at(-1)).toBe('+10');
  });

  it('2本目の指で操作を破棄し、速度はその時点の値を保つ', () => {
    const h = createHarness();
    const id = 60;
    h.tracker.down(id, CENTER, 300, performance.now());
    h.wait(10);
    h.tracker.move(id, CENTER, 260, performance.now());
    expect(h.rate()).toBe(1.25);
    h.tracker.down(61, CENTER + 100, 300, performance.now());
    h.tracker.move(id, CENTER, 100, performance.now());
    h.tracker.up(id, CENTER, 100, performance.now());
    h.tracker.up(61, CENTER + 100, 300, performance.now());
    expect(h.rate()).toBe(1.25);
    h.wait(1000);
    expect(h.state.paused).toBe(false);
  });

  it('10px以上動いた指はタップにならない', () => {
    const h = createHarness();
    const id = 70;
    h.tracker.down(id, CENTER, 300, performance.now());
    h.wait(20);
    h.tracker.move(id, CENTER + 8, 308, performance.now());
    h.tracker.up(id, CENTER + 8, 308, performance.now());
    h.wait(500);
    expect(h.state.paused).toBe(false);
  });
});

describe('2本指', () => {
  const setup = () => {
    const log: string[] = [];
    const h = createHarness();
    const tracker = new PointerTracker({
      onPress: (t) => h.classifier.press(t),
      onTap: (tap) => h.classifier.tap(zoneOf(tap.x / WIDTH, 0.37, 0.63), tap.downTime, tap.upTime),
      onAbort: () => h.classifier.abort(),
      onVerticalSwipeStart: () => log.push('swipe'),
      onMultiStart: (a, b) => log.push(`start ${a.x},${a.y} ${b.x},${b.y}`),
      onMultiMove: (a, b) => log.push(`move ${a.x},${a.y} ${b.x},${b.y}`),
      onMultiEnd: () => log.push('end'),
    });
    return { h, tracker, log };
  };

  it('2本目を置くと、1本目の今の位置と合わせて2本指の操作を始める', () => {
    const { h, tracker, log } = setup();
    tracker.down(1, 400, 300, performance.now());
    tracker.move(1, 405, 300, performance.now());
    expect(tracker.down(2, 600, 300, performance.now())).toBe(true);
    tracker.move(2, 700, 300, performance.now());
    tracker.move(1, 300, 310, performance.now());
    tracker.up(2, 700, 300, performance.now());
    expect(log).toEqual(['start 405,300 600,300', 'move 405,300 700,300', 'move 300,310 700,300', 'end']);
    // ピンチはタップにならない
    h.wait(1000);
    expect(h.state.paused).toBe(false);
    expect(h.state.controlsToggles).toBe(0);
  });

  it('片方を離した後、残った指では速度を変えない。もう1本置けばやり直す', () => {
    const { tracker, log } = setup();
    tracker.down(1, 400, 300, performance.now());
    tracker.down(2, 600, 300, performance.now());
    tracker.up(1, 400, 300, performance.now());
    tracker.move(2, 600, 100, performance.now());
    expect(log).toEqual(['start 400,300 600,300', 'end']);
    tracker.down(3, 500, 300, performance.now());
    expect(log.at(-1)).toBe('start 600,100 500,300');
  });

  it('3本目は無視して、最初の2本で続ける', () => {
    const { tracker, log } = setup();
    tracker.down(1, 400, 300, performance.now());
    tracker.down(2, 600, 300, performance.now());
    expect(tracker.down(3, 500, 100, performance.now())).toBe(false);
    tracker.move(3, 500, 50, performance.now());
    tracker.up(3, 500, 50, performance.now());
    expect(log).toEqual(['start 400,300 600,300']);
    tracker.cancel(2, performance.now());
    expect(log.at(-1)).toBe('end');
  });
});
