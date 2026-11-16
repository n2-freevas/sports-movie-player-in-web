/**
 * 動画の状態と操作（読み込み・再生・スキップ・速度）をまとめたクラス。
 * 画面からは切り離してあり、コンポーネントは状態を表示してメソッドを呼ぶだけにする。
 */
import { ERROR_MESSAGES, mediaErrorCode, type Emit, type PlayerErrorCode, type RateChangeSource } from './events';
import {
  DEFAULT_RATES,
  clamp,
  nearestRateIndex,
  skipSeconds,
  skipTarget,
  type Direction,
} from './playback-math';

export class PlayerController {
  /** <video> 要素（コンポーネントの bind:this で設定される） */
  video: HTMLVideoElement | undefined = $state();

  // ── 再生の状態 ──
  paused = $state(true);
  currentTime = $state(0);
  duration = $state(0);
  bufferedEnd = $state(0);
  /** 読み込み中または読み込み済みの動画URL。null なら動画なし */
  source: string | null = $state(null);
  name = $state('');
  error: PlayerErrorCode | null = $state(null);
  loaded = $state(false);

  // ── 速度 ──
  rates: number[] = $state([...DEFAULT_RATES]);
  rateIndex = $state(nearestRateIndex(DEFAULT_RATES, 1));
  /** ブラウザが受け付けた最小の段階（Safariが0.1倍を受け付けない場合に上がる） */
  minRateIndex = $state(0);

  rate = $derived(this.rates[this.rateIndex] ?? 1);
  errorMessage = $derived(this.error ? ERROR_MESSAGES[this.error] : '');

  #objectUrl: string | null = null;
  #pending: { resolve(): void; reject(err: unknown): void } | null = null;

  constructor(private readonly emit: Emit) {}

  /** 総時間が確定しているか（確定前のスキップは無視する） */
  get hasMetadata(): boolean {
    return this.loaded && this.source != null && this.duration > 0;
  }

  // ───────────── 読み込み ─────────────

  /** 端末内の動画ファイルを読み込む。前の動画の参照は解放する */
  loadFile(file: File): Promise<void> {
    this.release();
    this.#objectUrl = URL.createObjectURL(file);
    return this.#load(this.#objectUrl, file.name);
  }

  /** URLから読み込む（src 属性。今回は動作を保証しない） */
  loadUrl(url: string): Promise<void> {
    this.release();
    const name = decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || url);
    return this.#load(url, name);
  }

  #load(url: string, name: string): Promise<void> {
    const video = this.video;
    if (!video) return Promise.reject(new Error('video element is not ready'));
    this.source = url;
    this.name = name;
    this.error = null;
    return new Promise<void>((resolve, reject) => {
      this.#pending = { resolve, reject };
      video.src = url;
      video.load();
      // load() で既定値に戻るので速度を設定し直す
      this.#applyRate('api', false);
    });
  }

  /** 古い動画の参照を解放する（NFR-06） */
  release(): void {
    this.#pending?.reject(new DOMException('別の動画の読み込みで中断されました', 'AbortError'));
    this.#pending = null;
    const video = this.video;
    if (this.source != null && video) {
      this.source = null; // 先に外し、src を外したときの error イベントを無視させる
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    this.source = null;
    if (this.#objectUrl) {
      URL.revokeObjectURL(this.#objectUrl);
      this.#objectUrl = null;
    }
    this.name = '';
    this.loaded = false;
    this.paused = true;
    this.currentTime = 0;
    this.duration = 0;
    this.bufferedEnd = 0;
  }

  // ───────────── <video> のイベント ─────────────

  onLoadedMetadata(): void {
    const v = this.video;
    if (!v || this.source == null) return;
    this.loaded = true;
    this.duration = Number.isFinite(v.duration) ? v.duration : 0;
    this.currentTime = v.currentTime;
    this.#applyRate('api', false);
    this.#pending?.resolve();
    this.#pending = null;
    this.emit('gvp-load', { name: this.name, duration: this.duration });
  }

  onDurationChange(): void {
    const d = this.video?.duration;
    if (this.source != null && d != null && Number.isFinite(d)) this.duration = d;
  }

  onTimeUpdate(): void {
    if (this.video) this.currentTime = this.video.currentTime;
  }

  onProgress(): void {
    const v = this.video;
    if (!v) return;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime + 0.5) end = Math.max(end, v.buffered.end(i));
    }
    this.bufferedEnd = end;
  }

  onPlayStateChange(): void {
    const paused = this.video?.paused ?? true;
    this.paused = paused;
    if (!paused) this.error = null;
    this.emit('gvp-playstate', { paused });
  }

  onError(): void {
    if (this.source == null) return; // 解放時（src を外したとき）のエラーは無視
    const code = mediaErrorCode(this.video?.error ?? null);
    this.reportError(code);
    this.#pending?.reject(new Error(ERROR_MESSAGES[code]));
    this.#pending = null;
  }

  reportError(code: PlayerErrorCode): void {
    this.error = code;
    this.emit('gvp-error', { code, message: ERROR_MESSAGES[code] });
  }

  // ───────────── 再生 ─────────────

  play(): void {
    if (this.source == null || !this.video) return;
    this.video.play()?.catch((err: unknown) => {
      if ((err as { name?: string })?.name === 'AbortError') return; // 直後の pause() などで中断された
      this.reportError('play');
    });
  }

  pause(): void {
    this.video?.pause();
  }

  togglePlay(): void {
    if (!this.video || this.video.paused || this.video.ended) this.play();
    else this.pause();
  }

  seek(time: number): void {
    if (!this.hasMetadata || !this.video || !Number.isFinite(time)) return;
    const t = clamp(time, 0, this.duration);
    this.video.currentTime = t;
    this.currentTime = t;
  }

  /**
   * 速度に応じた秒数だけ動かす（設計書 3.4）。
   * @returns 実際に動いた秒数。総時間が未確定なら null
   */
  skipBy(direction: Direction, baseSeconds: number): number | null {
    if (!this.hasMetadata || !this.video) return null;
    const current = this.video.currentTime;
    const target = skipTarget(current, skipSeconds(baseSeconds, this.rate), direction, this.duration);
    this.video.currentTime = target;
    this.currentTime = target;
    return Math.abs(target - current);
  }

  // ───────────── 速度 ─────────────

  setRates(rates: number[]): void {
    const current = this.rate;
    this.rates = rates;
    this.minRateIndex = 0;
    this.rateIndex = nearestRateIndex(rates, current);
    this.#applyRate('api', false);
  }

  setRateIndex(index: number, source: RateChangeSource): void {
    const prev = this.rateIndex;
    this.rateIndex = clamp(Math.round(index), this.minRateIndex, this.rates.length - 1);
    this.#applyRate(source, prev !== this.rateIndex);
  }

  /** 段階にない値は一番近い段階に合わせる */
  setRate(rate: number, source: RateChangeSource): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    this.setRateIndex(nearestRateIndex(this.rates, rate), source);
  }

  /** 速度を video に設定する。受け付けられなければ1段階上げて再試行する */
  #applyRate(source: RateChangeSource, changed: boolean): void {
    const before = this.rateIndex;
    while (!this.#trySetRate(this.rates[this.rateIndex]) && this.rates[this.rateIndex] < 1) {
      if (this.rateIndex >= this.rates.length - 1) break;
      this.minRateIndex = this.rateIndex + 1;
      this.rateIndex = this.minRateIndex;
    }
    if (changed || before !== this.rateIndex) this.emit('gvp-ratechange', { rate: this.rate, source });
  }

  #trySetRate(rate: number): boolean {
    const v = this.video as
      | (HTMLVideoElement & { webkitPreservesPitch?: boolean })
      | undefined;
    if (!v) return true;
    try {
      v.defaultPlaybackRate = rate;
      v.playbackRate = rate;
      // 音の高さは変えない
      v.preservesPitch = true;
      v.webkitPreservesPitch = true;
    } catch {
      return false;
    }
    return Math.abs(v.playbackRate - rate) < 1e-3;
  }
}
