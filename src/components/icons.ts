/** 操作パネル用のSVGアイコン（配布物を1ファイルにするためコード内に埋め込む） */
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  play: svg('<path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/>'),
  pause: svg('<path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>'),
  folder: svg(
    '<path fill="currentColor" d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z"/>',
  ),
  fullscreen: svg(
    '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  ),
  exitFullscreen: svg(
    '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  ),
  /** スキップ表示の矢印 */
  arrowLeft: svg('<path fill="currentColor" d="M16 5.14v13.72a1 1 0 0 1-1.5.86l-11-6.86a1 1 0 0 1 0-1.72l11-6.86a1 1 0 0 1 1.5.86Z"/>'),
  arrowRight: svg('<path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/>'),
  /** 操作方法（○に？） */
  help: svg(
    '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.3-2.6 3.9"/><circle cx="12" cy="17.2" r="1.25" fill="currentColor"/>',
  ),
  close: svg('<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>'),
  check: svg('<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/>'),
};

export type IconName = keyof typeof icons;
