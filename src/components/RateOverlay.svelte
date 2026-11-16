<!-- 速度変更時に中央へ大きく出す倍率。段階の位置も点で示す -->
<script lang="ts">
  import { formatRate } from '../lib/playback-math';

  interface Props {
    visible: boolean;
    rates: readonly number[];
    index: number;
    minIndex: number;
  }

  let { visible, rates, index, minIndex }: Props = $props();

  const rate = $derived(rates[index] ?? 1);
</script>

<div class="overlay" class:show={visible} class:normal={rate === 1} part="rate-overlay" aria-live="polite">
  <div class="value">{formatRate(rate)}</div>
  <div class="steps">
    {#each rates as r, i (i)}
      <i class:on={i <= index && i >= minIndex} class:unity={r === 1} class:disabled={i < minIndex}></i>
    {/each}
  </div>
</div>

<style>
  .overlay {
    position: absolute;
    left: 50%;
    top: 50%;
    min-width: 132px;
    padding: 14px 20px 12px;
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    text-align: center;
    transform: translate(-50%, -50%) scale(0.92);
    opacity: 0;
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }
  .show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    transition-duration: 0.08s;
  }
  .value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  /* 1倍に戻ったことは色で知らせる（iPhoneのSafariでは振動を使えないため） */
  .normal .value {
    color: #7cf29b;
  }
  .steps {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-top: 16px;
  }
  .steps i {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
  }
  .steps i.unity {
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.55);
  }
  .steps i.on {
    background: #fff;
  }
  .steps i.disabled {
    opacity: 0.25;
  }
</style>
