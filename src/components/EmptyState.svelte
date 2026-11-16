<!-- 動画が未選択のときの案内。ファイル選択ボタンだけがタップを受ける -->
<script lang="ts">
  import Icon from './Icon.svelte';

  let { filePicker, onpickfile }: { filePicker: boolean; onpickfile(): void } = $props();
</script>

<div class="empty">
  <div>{filePicker ? '動画を選んでください' : '動画が読み込まれていません'}</div>
  {#if filePicker}
    <button class="pick" type="button" onclick={onpickfile}>
      <span class="icon"><Icon name="folder" /></span>動画ファイルを選択
    </button>
  {/if}
</div>

<style>
  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 16px;
    text-align: center;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.75);
    pointer-events: none;
  }
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-radius: 999px;
    background: #fff;
    color: #000;
    font-size: 15px;
    font-weight: 700;
    pointer-events: auto;
  }
  .icon {
    width: 20px;
    height: 20px;
  }
</style>
