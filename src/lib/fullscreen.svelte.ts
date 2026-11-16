/**
 * 全画面表示（設計書 3.6）。
 * Fullscreen API が使える環境（PC、iPad）ではそれを使い、
 * 使えない環境（iPhone）では画面いっぱいに広げる疑似全画面にする。
 */
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

export class FullscreenController {
  /** 疑似全画面中か */
  pseudo = $state(false);
  /** ネイティブ全画面中か */
  native = $state(false);
  active = $derived(this.pseudo || this.native);

  #savedOverflow: string | null = null;

  constructor(private readonly host: HTMLElement) {}

  /** document のイベントを購読する。戻り値で解除する（$effect から呼ぶ） */
  listen(): () => void {
    const sync = () => {
      const d = document as WebkitDocument;
      this.native = (document.fullscreenElement ?? d.webkitFullscreenElement ?? null) === this.host;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.pseudo) this.#setPseudo(false);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      document.removeEventListener('keydown', onKey);
      this.#setPseudo(false);
    };
  }

  toggle(): void {
    if (this.active) this.exit();
    else this.enter();
  }

  enter(): void {
    const el = this.host as WebkitElement;
    const d = document as WebkitDocument;
    if (document.fullscreenEnabled && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => this.#setPseudo(true));
      return;
    }
    if (d.webkitFullscreenEnabled && typeof el.webkitRequestFullscreen === 'function') {
      try {
        el.webkitRequestFullscreen();
        return;
      } catch {
        /* 疑似全画面へ */
      }
    }
    this.#setPseudo(true);
  }

  exit(): void {
    if (this.pseudo) {
      this.#setPseudo(false);
      return;
    }
    if (this.native) {
      const d = document as WebkitDocument;
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
    }
  }

  #setPseudo(on: boolean): void {
    if (this.pseudo === on) return;
    this.pseudo = on;
    // 疑似全画面中は背後のページをスクロールさせない
    const html = document.documentElement;
    if (on) {
      this.#savedOverflow = html.style.overflow;
      html.style.overflow = 'hidden';
    } else {
      html.style.overflow = this.#savedOverflow ?? '';
      this.#savedOverflow = null;
    }
  }
}
