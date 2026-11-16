<!-- シークバー。ドラッグ中は指の位置を表示し、離すまで動画の位置を追従させる -->
<script lang="ts">
  import { clamp, formatTime } from '../lib/playback-math';

  interface Props {
    currentTime: number;
    duration: number;
    bufferedEnd: number;
    /** ドラッグ中か（親が自動で隠すのを止めるために読む） */
    seeking?: boolean;
    onseek(time: number): void;
  }

  let { currentTime, duration, bufferedEnd, seeking = $bindable(false), onseek }: Props = $props();

  let el: HTMLDivElement;
  let pointerId: number | null = null;
  let dragTime = $state(0);

  const shownTime = $derived(seeking ? dragTime : currentTime);
  const ratio = $derived(duration > 0 ? clamp(shownTime / duration, 0, 1) : 0);
  const bufferRatio = $derived(duration > 0 ? clamp(bufferedEnd / duration, 0, 1) : 0);

  function seekAt(clientX: number) {
    const rect = el.getBoundingClientRect();
    const r = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
    dragTime = r * duration;
    onseek(dragTime);
  }

  function onpointerdown(e: PointerEvent) {
    if (duration <= 0 || pointerId != null) return;
    e.preventDefault();
    pointerId = e.pointerId;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* 無視 */
    }
    seeking = true;
    seekAt(e.clientX);
  }

  function onpointermove(e: PointerEvent) {
    if (e.pointerId === pointerId) seekAt(e.clientX);
  }

  function end(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    seeking = false;
  }

  // ←・→・Home・End などのキー操作は、プレーヤー全体のキーボードショートカットで受ける
</script>

<div
  class="seek"
  class:active={seeking}
  bind:this={el}
  role="slider"
  tabindex="0"
  aria-label="再生位置"
  aria-valuemin={0}
  aria-valuemax={Math.round(duration)}
  aria-valuenow={Math.round(shownTime)}
  aria-valuetext="{formatTime(shownTime)} / {formatTime(duration)}"
  {onpointerdown}
  {onpointermove}
  onpointerup={end}
  onpointercancel={end}
  onlostpointercapture={end}
>
  <div class="track">
    <div class="buffer" style:transform="scaleX({bufferRatio})"></div>
    <div class="progress" style:transform="scaleX({ratio})"></div>
  </div>
  <div class="thumb" style:left="{ratio * 100}%"></div>
  {#if seeking}
    <div class="tooltip" style:left="{ratio * 100}%">{formatTime(shownTime)}</div>
  {/if}
</div>

<style>
  .seek {
    position: relative;
    flex: none;
    height: 18px;
    margin: 0 8px;
    cursor: pointer;
    touch-action: none;
  }
  .seek:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
    border-radius: 4px;
  }
  .track {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 3px;
    margin-top: -1.5px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.3);
    overflow: hidden;
    transition:
      height 0.1s ease,
      margin 0.1s ease;
  }
  .active .track {
    height: 5px;
    margin-top: -2.5px;
  }
  .buffer,
  .progress {
    position: absolute;
    inset: 0;
    transform-origin: 0 50%;
  }
  .buffer {
    background: rgba(255, 255, 255, 0.45);
  }
  .progress {
    background: var(--svp-accent);
  }
  .thumb {
    position: absolute;
    top: 50%;
    width: 13px;
    height: 13px;
    margin: -6.5px 0 0 -6.5px;
    border-radius: 50%;
    background: var(--svp-accent);
    transform: scale(0.85);
    transition: transform 0.1s ease;
  }
  .active .thumb {
    transform: scale(1.25);
  }
  .tooltip {
    position: absolute;
    bottom: 22px;
    transform: translateX(-50%);
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.75);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
</style>
