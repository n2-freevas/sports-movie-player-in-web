import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RATES,
  formatRate,
  formatSkipLabel,
  formatTime,
  nearestRateIndex,
  parseRates,
  parseRatio,
  rateIndexFromSwipe,
  skipSeconds,
  skipTarget,
  zoneOf,
} from '../src/lib/playback-math';

describe('skipSeconds（設計書 2.4 の表）', () => {
  const expected = [1, 2.5, 5, 7.5, 10, 10, 10, 10, 10];
  DEFAULT_RATES.forEach((rate, i) => {
    it(`${rate}倍 → ${expected[i]}秒`, () => {
      expect(skipSeconds(10, rate)).toBeCloseTo(expected[i]);
    });
  });
});

describe('skipTarget', () => {
  it('先頭で止まる（T08）', () => expect(skipTarget(3, 10, -1, 100)).toBe(0));
  it('末尾で止まる', () => expect(skipTarget(95, 10, 1, 100)).toBe(100));
  it('通常の送り', () => expect(skipTarget(20, 2.5, 1, 100)).toBe(22.5));
});

describe('rateIndexFromSwipe', () => {
  const n = DEFAULT_RATES.length;
  const one = DEFAULT_RATES.indexOf(1);
  it('1倍から上に70px → 1.5倍（T09）', () => {
    expect(DEFAULT_RATES[rateIndexFromSwipe(one, -70, 32, n)]).toBe(1.5);
  });
  it('31pxでは変わらない', () => expect(rateIndexFromSwipe(one, -31, 32, n)).toBe(one));
  it('下に大きく → 0.1倍で止まる（T10）', () => {
    expect(DEFAULT_RATES[rateIndexFromSwipe(one, 2000, 32, n)]).toBe(0.1);
  });
  it('上に大きく → 2倍で止まる', () => {
    expect(DEFAULT_RATES[rateIndexFromSwipe(one, -2000, 32, n)]).toBe(2);
  });
  it('下限の段階を指定できる', () => expect(rateIndexFromSwipe(one, 2000, 32, n, 1)).toBe(1));
});

describe('表示用の整形', () => {
  it('秒数は小数1桁・末尾0なし', () => {
    expect(formatSkipLabel(-1, 2.5)).toBe('−2.5秒');
    expect(formatSkipLabel(1, 10)).toBe('+10秒');
    expect(formatSkipLabel(-1, 30.000001)).toBe('−30秒');
    expect(formatSkipLabel(-1, 3)).toBe('−3秒');
  });
  it('倍率', () => {
    expect(formatRate(0.25)).toBe('0.25x');
    expect(formatRate(1)).toBe('1x');
  });
  it('時間', () => {
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3723)).toBe('1:02:03');
    expect(formatTime(NaN)).toBe('0:00');
  });
});

describe('属性の解釈', () => {
  it('nearestRateIndex', () => {
    expect(DEFAULT_RATES[nearestRateIndex(DEFAULT_RATES, 1.4)]).toBe(1.5);
    expect(DEFAULT_RATES[nearestRateIndex(DEFAULT_RATES, 5)]).toBe(2);
  });
  it('parseRates', () => {
    expect(parseRates('2, 0.5 1')).toEqual([0.5, 1, 2]);
    expect(parseRates('abc')).toBeNull();
  });
  it('parseRatio', () => {
    expect(parseRatio('37')).toBeCloseTo(0.37);
    expect(parseRatio('37%')).toBeCloseTo(0.37);
    expect(parseRatio('0.4')).toBeCloseTo(0.4);
    expect(parseRatio('x')).toBeNull();
  });
});

describe('zoneOf（設計書 2.2）', () => {
  it('境界', () => {
    expect(zoneOf(0, 0.37, 0.63)).toBe('left');
    expect(zoneOf(0.35, 0.37, 0.63)).toBe('left');
    expect(zoneOf(0.37, 0.37, 0.63)).toBe('center');
    expect(zoneOf(0.63, 0.37, 0.63)).toBe('center');
    expect(zoneOf(0.6301, 0.37, 0.63)).toBe('right');
    expect(zoneOf(1, 0.37, 0.63)).toBe('right');
  });
});
