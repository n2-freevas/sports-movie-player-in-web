import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // <sports-video-player> をカスタム要素として出力し、全コンポーネントのCSSをShadow DOMに入れる
    customElement: true,
  },
};
