/**
 * <sports-video-player> の登録（Svelte のカスタム要素として定義される）。
 *   <script type="module" src="sports-video-player.js"></script>
 *   <sports-video-player file-picker></sports-video-player>
 */
import SportsVideoPlayer from './SportsVideoPlayer.svelte';

export { SportsVideoPlayer };
export type { GvpEventMap, PlayerErrorCode, RateChangeSource } from './lib/events';
export { DEFAULT_RATES } from './lib/playback-math';
