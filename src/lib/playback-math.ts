/**
 * スキップ秒数と速度段階の計算（画面に依存しない純粋関数）。
 * 設計書 3.4 の計算式に対応する。
 */

export const DEFAULT_RATES: readonly number[] = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export type Direction = -1 | 1;

/** スキップ秒数 Δ = S × min(r, 1) */
export function skipSeconds(baseSeconds: number, rate: number): number {
  return baseSeconds * Math.min(rate, 1);
}

/** 移動後の再生位置 t' = min(max(t ± Δ, 0), d) */
export function skipTarget(current: number, delta: number, direction: Direction, duration: number): number {
  return Math.min(Math.max(current + direction * delta, 0), duration);
}

/** 縦スワイプ中の速度段階 i = min(max(i0 − trunc(Δy / p), lo), n − 1) */
export function rateIndexFromSwipe(
  startIndex: number,
  deltaY: number,
  stepPx: number,
  count: number,
  minIndex = 0,
): number {
  const steps = Math.trunc(deltaY / stepPx);
  return clamp(startIndex - steps, minIndex, count - 1);
}

/** 段階にない速度を一番近い段階に合わせる */
export function nearestRateIndex(rates: readonly number[], rate: number): number {
  let best = 0;
  let bestDiff = Infinity;
  rates.forEach((r, i) => {
    const diff = Math.abs(r - rate);
    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  });
  return best;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 秒数表示：小数点以下1桁、末尾の0は省く（2.5、10） */
export function formatSeconds(seconds: number): string {
  const rounded = Math.round(Math.abs(seconds) * 10) / 10;
  return String(rounded);
}

/** スキップ表示：「−2.5秒」「+10秒」 */
export function formatSkipLabel(direction: Direction, seconds: number): string {
  return `${direction < 0 ? '−' : '+'}${formatSeconds(seconds)}秒`;
}

/** 速度表示：「0.25x」「1x」 */
export function formatRate(rate: number): string {
  return `${Math.round(rate * 100) / 100}x`;
}

/** 経過時間表示：「1:05」「1:02:03」 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** rates 属性（"0.5, 1, 2"）を解釈する。不正なら null */
export function parseRates(value: string | null): number[] | null {
  if (!value) return null;
  const rates = value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (rates.length === 0) return null;
  return [...new Set(rates)].sort((a, b) => a - b);
}

/** 割合の属性（"37"、"37%"、"0.37"）を 0〜1 の値にする。不正なら null */
export function parseRatio(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  const ratio = value.includes('%') || n > 1 ? n / 100 : n;
  return ratio >= 0 && ratio <= 1 ? ratio : null;
}

export type Zone = 'left' | 'center' | 'right';

/** 横位置の割合から領域を求める（左：0〜37%未満、中央：37〜63%以下、右：63%超） */
export function zoneOf(ratio: number, zoneLeft: number, zoneRight: number): Zone {
  if (ratio < zoneLeft) return 'left';
  if (ratio > zoneRight) return 'right';
  return 'center';
}
