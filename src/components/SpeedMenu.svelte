<!-- 速度一覧。外側（背景）をタップすると閉じる -->
<script lang="ts">
  import { formatRate } from '../lib/playback-math';
  import Icon from './Icon.svelte';

  interface Props {
    rates: readonly number[];
    index: number;
    minIndex: number;
    onselect(index: number): void;
    onclose(): void;
  }

  let { rates, index, minIndex, onselect, onclose }: Props = $props();

  // 速い順に上から並べる
  const items = $derived(rates.map((rate, i) => ({ rate, i })).reverse());
</script>

<div
  class="backdrop"
  role="presentation"
  onpointerdown={(e) => {
    e.preventDefault();
    onclose();
  }}
></div>
<div class="menu" role="menu" aria-label="再生速度">
  <div class="title">再生速度</div>
  {#each items as { rate, i } (i)}
    <button
      class="item"
      type="button"
      role="menuitemradio"
      aria-checked={i === index}
      disabled={i < minIndex}
      onclick={() => onselect(i)}
    >
      <span class="mark"><Icon name="check" /></span>
      {rate === 1 ? '1x（標準）' : formatRate(rate)}
    </button>
  {/each}
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }
  .menu {
    position: absolute;
    right: calc(10px + env(safe-area-inset-right, 0px));
    bottom: calc(var(--svp-bar-height) + 4px + env(safe-area-inset-bottom, 0px));
    max-height: calc(100% - var(--svp-bar-height) - 16px);
    min-width: 140px;
    padding: 6px 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: 12px;
    background: rgba(28, 28, 28, 0.94);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
    touch-action: pan-y;
  }
  .title {
    padding: 6px 16px 8px;
    font-size: 12px;
    opacity: 0.7;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 16px;
    font-size: 15px;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .item:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .mark {
    width: 18px;
    height: 18px;
    visibility: hidden;
  }
  .item[aria-checked='true'] .mark {
    visibility: visible;
  }
  @media (hover: hover) {
    .item:not(:disabled):hover {
      background: rgba(255, 255, 255, 0.14);
    }
  }
</style>
