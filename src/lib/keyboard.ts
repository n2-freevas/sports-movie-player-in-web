/**
 * キーボードショートカット（YouTube と同じキー割り当て）。
 * キーを「何をするか」に変換するだけの純粋関数で、実際の操作はコンポーネントが行う。
 */
import type { Direction } from './playback-math';

/** 1コマの秒数。動画のフレームレートは取得できないため、YouTube と同じく 30fps とみなす */
export const FRAME_SECONDS = 1 / 30;

/** 矢印キーのスキップ秒数（J・L の何倍か）。YouTube の 5秒／10秒 に合わせる */
export const ARROW_SKIP_SCALE = 0.5;

export type KeyAction =
  | { type: 'togglePlay' }
  /** scale：基準スキップ秒数に掛ける倍率（J・L は 1、矢印は 0.5） */
  | { type: 'skip'; direction: Direction; scale: number }
  | { type: 'seekRatio'; ratio: number }
  | { type: 'frame'; direction: Direction }
  | { type: 'rate'; step: Direction }
  | { type: 'help' };

export type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'>;

/** キーを操作に変換する。ショートカットでなければ null */
export function keyAction(e: KeyInput): KeyAction | null {
  // ブラウザやOSのショートカット（Cmd+L など）と、日本語入力の変換中は横取りしない
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return null;

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  switch (key) {
    case ' ':
    case 'k':
      return { type: 'togglePlay' };
    case 'j':
      return { type: 'skip', direction: -1, scale: 1 };
    case 'l':
      return { type: 'skip', direction: 1, scale: 1 };
    case 'ArrowLeft':
      return { type: 'skip', direction: -1, scale: ARROW_SKIP_SCALE };
    case 'ArrowRight':
      return { type: 'skip', direction: 1, scale: ARROW_SKIP_SCALE };
    case 'Home':
      return { type: 'seekRatio', ratio: 0 };
    case 'End':
      return { type: 'seekRatio', ratio: 1 };
    case ',':
      return { type: 'frame', direction: -1 };
    case '.':
      return { type: 'frame', direction: 1 };
    case '<':
      return { type: 'rate', step: -1 };
    case '>':
      return { type: 'rate', step: 1 };
    case '?':
      return { type: 'help' };
  }
  // 0〜9：動画の 0%〜90% の位置へ
  if (/^[0-9]$/.test(key)) return { type: 'seekRatio', ratio: Number(key) / 10 };
  return null;
}
