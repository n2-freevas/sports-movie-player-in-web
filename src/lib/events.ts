/** 公開イベント（設計書 3.5）。CustomEvent として親要素へ伝わり、Shadow DOM の外でも受け取れる */
import type { Direction } from './playback-math';

export type RateChangeSource = 'swipe' | 'menu' | 'keyboard' | 'api';
export type PlayerErrorCode = 'unsupported' | 'decode' | 'network' | 'aborted' | 'play' | 'unknown';

export interface SvpEventMap {
  'svp-load': { name: string; duration: number };
  'svp-skip': { direction: Direction; seconds: number; rate: number; total: number };
  'svp-ratechange': { rate: number; source: RateChangeSource };
  'svp-playstate': { paused: boolean };
  'svp-error': { code: PlayerErrorCode; message: string };
}

export type Emit = <K extends keyof SvpEventMap>(type: K, detail: SvpEventMap[K]) => void;

/** 要素からイベントを発生させる関数を作る */
export function createEmitter(target: EventTarget): Emit {
  return (type, detail) => {
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  };
}

export const ERROR_MESSAGES: Record<PlayerErrorCode, string> = {
  unsupported: 'この形式の動画には対応していません。MP4・MOV（H.264／HEVC）の動画を選んでください。',
  decode: '動画をデコードできませんでした。ファイルが壊れているか、非対応の形式です。',
  network: '動画の読み込み中にエラーが発生しました。',
  aborted: '動画の読み込みが中断されました。',
  play: '再生を開始できませんでした。もう一度タップしてください。',
  unknown: '動画を再生できませんでした。',
};

export function mediaErrorCode(error: MediaError | null): PlayerErrorCode {
  switch (error?.code) {
    case 1:
      return 'aborted';
    case 2:
      return 'network';
    case 3:
      return 'decode';
    case 4:
      return 'unsupported';
    default:
      return 'unknown';
  }
}

declare global {
  interface HTMLElementEventMap {
    'svp-load': CustomEvent<SvpEventMap['svp-load']>;
    'svp-skip': CustomEvent<SvpEventMap['svp-skip']>;
    'svp-ratechange': CustomEvent<SvpEventMap['svp-ratechange']>;
    'svp-playstate': CustomEvent<SvpEventMap['svp-playstate']>;
    'svp-error': CustomEvent<SvpEventMap['svp-error']>;
  }
}
