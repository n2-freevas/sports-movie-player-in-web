import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // `npm run dev` でデモページ（/demo/）を配信する
  root: here,
  plugins: [svelte()],
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: resolve(here, 'src/index.ts'),
      name: 'SportsVideoPlayer',
      formats: ['es', 'iife'],
      fileName: (format) =>
        format === 'es' ? 'sports-video-player.js' : 'sports-video-player.iife.js',
    },
  },
  test: {
    root: here,
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
