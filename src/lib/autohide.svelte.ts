/**
 * 操作パネルの表示状態。再生中に一定時間操作がなければ隠す（設計書 2.5）。
 */
export class AutoHide {
  visible = $state(true);
  #timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param delayMs 隠すまでの時間（0以下なら自動で隠さない）
   * @param canHide 今隠してよいか（再生中で、メニューやシーク操作中でない）
   */
  constructor(
    private readonly delayMs: () => number,
    private readonly canHide: () => boolean,
  ) {}

  show(): void {
    this.visible = true;
    this.restart();
  }

  hide(): void {
    this.visible = false;
    this.cancel();
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  /** 操作があった：隠すまでのタイマーをやり直す */
  restart(): void {
    this.cancel();
    const ms = this.delayMs();
    if (!this.visible || ms <= 0 || !this.canHide()) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (this.canHide()) this.visible = false;
    }, ms);
  }

  cancel(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
