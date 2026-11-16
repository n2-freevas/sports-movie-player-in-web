<script lang="ts">
  import { icons, type IconName } from './icons';

  let { name }: { name: IconName } = $props();
</script>

<span class="icon" aria-hidden="true">{@html icons[name]}</span>

<style>
  .icon {
    display: block;
    width: 100%;
    height: 100%;
  }
  .icon :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
