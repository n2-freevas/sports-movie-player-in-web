/**
 * カスタム要素に読み書きできるプロパティ（rate、currentTime など）を足す。
 * Svelte のカスタム要素はコンポーネントが export した関数をメソッドとして公開するので、
 * それを使ってゲッター・セッターを定義する（設計書 3.5）。
 */
export interface PlayerSnapshot {
  rate: number;
  currentTime: number;
  duration: number;
  paused: boolean;
  video: HTMLVideoElement | undefined;
}

/** コンポーネントが export するメソッド（接続前は undefined） */
interface ExportedMethods {
  getSnapshot?: () => PlayerSnapshot;
  setRate?: (rate: number) => void;
  setCurrentTime?: (time: number) => void;
}

type Constructor = new (...args: any[]) => HTMLElement;

export function extendElement<T extends Constructor>(Base: T) {
  return class SportsVideoPlayerElement extends Base {
    #self(): ExportedMethods {
      return this as unknown as ExportedMethods;
    }

    /** 再生速度。段階にない値は一番近い段階に合わせる */
    get rate(): number {
      return this.#self().getSnapshot?.().rate ?? 1;
    }
    set rate(value: number) {
      this.#self().setRate?.(Number(value));
    }

    /** 再生位置（秒） */
    get currentTime(): number {
      return this.#self().getSnapshot?.().currentTime ?? 0;
    }
    set currentTime(value: number) {
      this.#self().setCurrentTime?.(Number(value));
    }

    /** 総時間（読み込み前は NaN） */
    get duration(): number {
      return this.#self().getSnapshot?.().duration ?? NaN;
    }

    /** 停止中かどうか */
    get paused(): boolean {
      return this.#self().getSnapshot?.().paused ?? true;
    }

    /** 内部の <video> 要素（高度な用途向け） */
    get videoElement(): HTMLVideoElement | undefined {
      return this.#self().getSnapshot?.().video;
    }
  };
}
