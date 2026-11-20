/**
 * 動画の拡大（ズーム）の計算。状態は「倍率」と「画面の中央に見えている動画上の点」で持つ。
 * 点はプレーヤーの幅・高さに対する割合（0〜1）なので、全画面などで大きさが変わってもずれない。
 */

export interface ZoomState {
  /** 倍率（1 で等倍） */
  scale: number;
  /** 画面の中央に見えている点（0〜1） */
  cx: number;
  cy: number;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
/** キー1回で変える倍率 */
export const ZOOM_KEY_FACTOR = 1.25;
/** キー1回で動かす量（見えている範囲の何割か） */
export const PAN_KEY_RATIO = 0.1;
/** ホイールの量（ピクセル）を倍率の変化に直す係数。マウス1目盛り（100px）で約 0.82倍／1.22倍 */
export const WHEEL_ZOOM_SPEED = 0.002;

export const ZOOM_IDENTITY: ZoomState = { scale: 1, cx: 0.5, cy: 0.5 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 画面の外（黒い余白）が見えないように中央の点を収める */
function fit(scale: number, cx: number, cy: number): ZoomState {
  const s = clamp(scale, ZOOM_MIN, ZOOM_MAX);
  // 等倍に十分近ければ等倍にそろえる（ホイールの誤差で 1.0001 倍のまま残らないように）
  if (s < 1.001) return { ...ZOOM_IDENTITY };
  const half = 0.5 / s;
  return { scale: s, cx: clamp(cx, half, 1 - half), cy: clamp(cy, half, 1 - half) };
}

export const isZoomed = (z: ZoomState) => z.scale > 1;

/**
 * 画面上の点（px, py：0〜1）を動かさずに倍率を factor 倍する。
 * ホイールならマウスの位置、キーなら画面の中央（0.5, 0.5）を渡す。
 */
export function zoomAt(z: ZoomState, factor: number, px = 0.5, py = 0.5): ZoomState {
  return grab(z, { x: px, y: py }, { x: px, y: py }, factor);
}

/**
 * 画面上の点 from に見えていた動画上の点を、to に動かしながら倍率を factor 倍する。
 * 2本指（from・to は2本の中点、factor は指の間隔の比）と、Shift + ドラッグ（factor 1）で使う。
 * 操作の開始時の状態 z と開始位置 from を渡し続けると、途中の誤差がたまらない
 */
export function grab(z: ZoomState, from: { x: number; y: number }, to: { x: number; y: number }, factor = 1): ZoomState {
  // 画面上の点 p に見えている動画上の点は q = c + (p − 0.5) / s
  const qx = z.cx + (from.x - 0.5) / z.scale;
  const qy = z.cy + (from.y - 0.5) / z.scale;
  const s = clamp(z.scale * factor, ZOOM_MIN, ZOOM_MAX);
  return fit(s, qx - (to.x - 0.5) / s, qy - (to.y - 0.5) / s);
}

/** 見えている範囲を動かす。dx, dy は画面の幅・高さに対する割合（右・下が正） */
export function pan(z: ZoomState, dx: number, dy: number): ZoomState {
  return fit(z.scale, z.cx + dx / z.scale, z.cy + dy / z.scale);
}

/** ホイールの量（ピクセル）から倍率の変化を出す。上に回す（負）と拡大 */
export const wheelZoomFactor = (deltaPx: number) => Math.exp(-deltaPx * WHEEL_ZOOM_SPEED);

/** video 要素に当てる CSS transform（transform-origin は中央） */
export function zoomTransform(z: ZoomState): string {
  if (!isZoomed(z)) return 'none';
  const tx = (0.5 - z.cx) * z.scale * 100;
  const ty = (0.5 - z.cy) * z.scale * 100;
  return `translate(${tx}%, ${ty}%) scale(${z.scale})`;
}
