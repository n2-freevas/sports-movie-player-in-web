<!--
  操作方法のオーバーレイ。下部バーの「？」ボタンで開く（開くときに動画は停止する）。
  領域の幅やスキップ秒数は属性の設定値をそのまま表示する。
-->
<script lang="ts">
  import { formatSeconds } from '../lib/playback-math';
  import Icon from './Icon.svelte';

  interface Props {
    /** 左領域の右端・右領域の左端（0〜1） */
    zoneLeft: number;
    zoneRight: number;
    /** 基準スキップ秒数 */
    skipSeconds: number;
    onclose(): void;
  }

  let { zoneLeft, zoneRight, skipSeconds, onclose }: Props = $props();

  const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;
  const sec = $derived(formatSeconds(skipSeconds));
  const slowExample = $derived(formatSeconds(skipSeconds * 0.5));

  // 開いたら閉じるボタンにフォーカスし、Esc で閉じる
  function dialog(node: HTMLElement) {
    node.querySelector<HTMLButtonElement>('.close')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onclose();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (背景のタップで閉じる。キーボードは Esc と閉じるボタンで操作できる) -->
<div
  class="backdrop"
  onclick={(e) => {
    if (e.target === e.currentTarget) onclose();
  }}
>
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="gvp-help-title" {@attach dialog}>
    <div class="header">
      <h2 id="gvp-help-title">操作方法</h2>
      <button class="close" type="button" aria-label="閉じる" onclick={onclose}><Icon name="close" /></button>
    </div>

    <div class="zones" aria-label="画面の領域">
      <div class="zone side" style:flex-basis={percent(zoneLeft)}>
        <span class="zone-name">左</span>
        <span class="zone-action">2回タップ</span>
        <span class="zone-result">−{sec}秒</span>
      </div>
      <div class="zone center" style:flex-basis={percent(zoneRight - zoneLeft)}>
        <span class="zone-name">中央</span>
        <span class="zone-action">タップ</span>
        <span class="zone-result">再生・停止</span>
      </div>
      <div class="zone side" style:flex-basis={percent(1 - zoneRight)}>
        <span class="zone-name">右</span>
        <span class="zone-action">2回タップ</span>
        <span class="zone-result">+{sec}秒</span>
      </div>
    </div>

    <dl class="list">
      <dt>左・右を2回タップ</dt>
      <dd>{sec}秒戻る・進む。続けてタップすると、さらに{sec}秒ずつ動く</dd>
      <dt>中央をタップ</dt>
      <dd>再生・停止</dd>
      <dt>左・右をタップ</dt>
      <dd>操作パネルの表示・非表示</dd>
      <dt>上下にスワイプ</dt>
      <dd>再生速度を変える（上で速く、下で遅く）</dd>
    </dl>
    <p class="note">等倍より遅いときは、スキップする秒数も短くなります（0.5倍なら{slowExample}秒）。</p>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(12px + env(safe-area-inset-top, 0px)) calc(12px + env(safe-area-inset-right, 0px))
      calc(12px + env(safe-area-inset-bottom, 0px)) calc(12px + env(safe-area-inset-left, 0px));
    background: rgba(0, 0, 0, 0.6);
    pointer-events: auto;
    touch-action: pan-y;
    animation: fade 0.2s ease;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .panel {
    width: min(100%, 460px);
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 14px 16px 16px;
    border-radius: 14px;
    background: rgba(24, 24, 24, 0.96);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
    font-size: 13px;
    line-height: 1.55;
    user-select: text;
    -webkit-user-select: text;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .close {
    width: 32px;
    height: 32px;
    padding: 7px;
    margin-right: -6px;
    border-radius: 50%;
  }

  /* 画面の3領域を、実際の幅の比率で示す */
  .zones {
    display: flex;
    gap: 3px;
    height: 76px;
    margin-bottom: 12px;
  }
  .zone {
    flex-grow: 0;
    flex-shrink: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    border-radius: 8px;
    text-align: center;
    white-space: nowrap;
  }
  .side {
    background: rgba(255, 255, 255, 0.14);
  }
  .center {
    background: rgba(255, 255, 255, 0.07);
  }
  .zone-name {
    font-size: 11px;
    opacity: 0.7;
  }
  .zone-action {
    font-size: 11px;
  }
  .zone-result {
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 12px;
    margin: 0;
  }
  dt {
    font-weight: 700;
    white-space: nowrap;
  }
  dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
  }
  .note {
    margin: 10px 0 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
  }

  @media (max-width: 380px) {
    .list {
      grid-template-columns: 1fr;
      gap: 0;
    }
    dd {
      margin-bottom: 6px;
    }
  }

  @media (hover: hover) {
    .close:hover {
      background: rgba(255, 255, 255, 0.14);
    }
  }
</style>
