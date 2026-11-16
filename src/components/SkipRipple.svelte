<!-- スキップ時の波紋と秒数（「−2.5秒」）。左右どちらかの端に半円で出す -->
<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    side: 'left' | 'right';
    visible: boolean;
    label: string;
    /** 波紋の中心（反応表示層の左上からのpx） */
    at: { x: number; y: number } | null;
    /** 値が変わるたびに波紋のアニメーションをやり直す */
    seq: number;
  }

  let { side, visible, label, at, seq }: Props = $props();

  let el = $state<HTMLDivElement>();
  const wave = $derived.by(() => {
    if (!el || !at) return { x: 0, y: 0, center: true };
    return { x: at.x - el.offsetLeft, y: at.y - el.offsetTop, center: false };
  });
  const arrow = $derived(side === 'left' ? 'arrowLeft' : 'arrowRight');
</script>

<div class="ripple {side}" class:show={visible} part="ripple" bind:this={el}>
  {#key seq}
    <div
      class="wave"
      class:animate={seq > 0}
      style:left={wave.center ? '50%' : `${wave.x}px`}
      style:top={wave.center ? '50%' : `${wave.y}px`}
    ></div>
  {/key}
  <div class="label">
    <div class="arrows">
      <span><Icon name={arrow} /></span><span><Icon name={arrow} /></span><span><Icon name={arrow} /></span>
    </div>
    <span>{label}</span>
  </div>
</div>

<style>
  .ripple {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 42%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .ripple::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.14);
  }
  .left {
    left: 0;
    border-radius: 0 50% 50% 0 / 0 50% 50% 0;
  }
  .right {
    right: 0;
    border-radius: 50% 0 0 50% / 50% 0 0 50%;
  }
  .show {
    opacity: 1;
    transition-duration: 0.08s;
  }

  .wave {
    position: absolute;
    width: 120px;
    height: 120px;
    margin: -60px 0 0 -60px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.28);
    opacity: 0;
  }
  .wave.animate {
    animation: wave 0.55s ease-out;
  }
  @keyframes wave {
    from {
      transform: scale(0.2);
      opacity: 1;
    }
    to {
      transform: scale(3.2);
      opacity: 0;
    }
  }

  .label {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }
  .arrows {
    display: flex;
    height: 18px;
  }
  .arrows span {
    width: 18px;
    height: 18px;
    opacity: 0.25;
    animation: arrow 0.9s infinite;
  }
  /* 進む向きに光が流れるように遅延をずらす */
  .right .arrows span:nth-child(2),
  .left .arrows span:nth-child(2) {
    animation-delay: 0.15s;
  }
  .right .arrows span:nth-child(3),
  .left .arrows span:nth-child(1) {
    animation-delay: 0.3s;
  }
  @keyframes arrow {
    0%,
    100% {
      opacity: 0.25;
    }
    40% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .wave.animate,
    .arrows span {
      animation: none;
    }
  }
</style>
