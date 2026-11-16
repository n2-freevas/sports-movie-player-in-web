<!--
  4. 操作パネル層（YouTube風UI）
  - 上部バー：ファイル名、ファイル選択ボタン
  - 中央：再生／停止ボタン（左右にスキップボタンは置かない）
  - 下部バー：シークバー、経過時間／総時間、操作方法、速度、全画面ボタン
  表示中はボタンと下部バーだけがタップを受け、それ以外はジェスチャー層へ通す。
-->
<script lang="ts">
  import { formatRate, formatTime } from '../lib/playback-math';
  import type { PlayerController } from '../lib/player-controller.svelte';
  import Icon from './Icon.svelte';
  import SeekBar from './SeekBar.svelte';
  import SpeedMenu from './SpeedMenu.svelte';

  interface Props {
    player: PlayerController;
    visible: boolean;
    filePicker: boolean;
    fullscreen: boolean;
    menuOpen?: boolean;
    seeking?: boolean;
    onpickfile(): void;
    onselectrate(index: number): void;
    ontogglefullscreen(): void;
    /** 操作方法を開く */
    onhelp(): void;
    /** パネル上で何か操作した（自動で隠すタイマーをやり直す） */
    onactivity(): void;
  }

  let {
    player,
    visible,
    filePicker,
    fullscreen,
    menuOpen = $bindable(false),
    seeking = $bindable(false),
    onpickfile,
    onselectrate,
    ontogglefullscreen,
    onhelp,
    onactivity,
  }: Props = $props();

  const hasVideo = $derived(player.source != null);

  // 隠れたらメニューも閉じる
  $effect(() => {
    if (!visible) menuOpen = false;
  });

  // 下部バーではブラウザのスクロール・拡大を起こさない（passive: false が必要）。
  // ただしボタン上のタッチは止めない。touchstart を止めると click が発生せず、ボタンが押せなくなる
  function noTouchScroll(node: HTMLElement) {
    const prevent = (e: TouchEvent) => {
      if (!(e.target as Element | null)?.closest?.('button')) e.preventDefault();
    };
    node.addEventListener('touchstart', prevent, { passive: false });
    return () => node.removeEventListener('touchstart', prevent);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (操作の有無を見るだけ。操作自体は中のボタンが受ける) -->
<div class="controls" class:visible onpointerdown={onactivity}>
  <div class="scrim top"></div>
  <div class="scrim bottom"></div>

  <div class="top-bar">
    <div class="title" part="title">{player.name}</div>
    {#if filePicker}
      <button class="icon-btn" type="button" aria-label="動画ファイルを選択" title="動画ファイルを選択" onclick={onpickfile}>
        <Icon name="folder" />
      </button>
    {/if}
  </div>

  {#if hasVideo}
    <button
      class="center-play"
      type="button"
      aria-label={player.paused ? '再生' : '一時停止'}
      onclick={() => player.togglePlay()}
    >
      <Icon name={player.paused ? 'play' : 'pause'} />
    </button>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions (ブラウザ既定の動作を止めるだけ) -->
  <div
    class="bottom-bar"
    part="bottom-bar"
    {@attach noTouchScroll}
    onpointerdown={(e) => {
      if (!(e.target as HTMLElement).closest('button')) e.preventDefault();
    }}
  >
    <SeekBar
      currentTime={player.currentTime}
      duration={player.duration}
      bufferedEnd={player.bufferedEnd}
      bind:seeking
      onseek={(t) => player.seek(t)}
    />
    <div class="row">
      <div class="time">
        {formatTime(player.currentTime)}<span class="sep">/</span>{formatTime(player.duration)}
      </div>
      <div class="spacer"></div>
      <button class="icon-btn" type="button" aria-label="操作方法" title="操作方法" onclick={onhelp}>
        <Icon name="help" />
      </button>
      <button
        class="speed-btn"
        class:changed={player.rate !== 1}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="再生速度 {formatRate(player.rate)}"
        onclick={() => (menuOpen = !menuOpen)}
      >
        {formatRate(player.rate)}
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label={fullscreen ? '全画面を終了' : '全画面'}
        onclick={ontogglefullscreen}
      >
        <Icon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} />
      </button>
    </div>
  </div>

  {#if menuOpen}
    <SpeedMenu
      rates={player.rates}
      index={player.rateIndex}
      minIndex={player.minRateIndex}
      onselect={(i) => {
        onselectrate(i);
        menuOpen = false;
      }}
      onclose={() => (menuOpen = false)}
    />
  {/if}
</div>

<style>
  .controls {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--svp-fade) ease;
  }
  .visible {
    opacity: 1;
  }
  /* 表示中はボタンと下部バーだけがタップを受ける */
  .visible button,
  .visible .bottom-bar {
    pointer-events: auto;
  }

  .scrim {
    position: absolute;
    left: 0;
    right: 0;
  }
  .scrim.top {
    top: 0;
    height: calc(96px + env(safe-area-inset-top, 0px));
    background: linear-gradient(rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0));
  }
  .scrim.bottom {
    bottom: 0;
    height: calc(120px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.72));
  }

  .top-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(8px + env(safe-area-inset-top, 0px)) calc(8px + env(safe-area-inset-right, 0px)) 8px
      calc(14px + env(safe-area-inset-left, 0px));
  }
  .title {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    line-height: 40px;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .icon-btn {
    flex: none;
    width: 40px;
    height: 40px;
    padding: 9px;
    border-radius: 50%;
  }

  .center-play {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 56px;
    height: 56px;
    margin: -28px 0 0 -28px;
    padding: 15px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
  }

  .bottom-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--svp-bar-height) + env(safe-area-inset-bottom, 0px));
    padding: 0 calc(6px + env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px)
      calc(6px + env(safe-area-inset-left, 0px));
    display: flex;
    flex-direction: column;
    touch-action: none;
  }
  .row {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 0;
  }
  .time {
    padding-left: 8px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .sep {
    margin: 0 3px;
    opacity: 0.7;
  }
  .spacer {
    flex: 1;
  }
  .speed-btn {
    height: 32px;
    min-width: 52px;
    padding: 0 10px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .speed-btn.changed {
    background: rgba(255, 255, 255, 0.18);
  }

  @media (hover: hover) {
    .icon-btn:hover,
    .speed-btn:hover {
      background: rgba(255, 255, 255, 0.14);
    }
    .center-play:hover {
      background: rgba(0, 0, 0, 0.6);
    }
  }
</style>
