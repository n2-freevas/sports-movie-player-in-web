import { describe, expect, it } from 'vitest';
import { grab, pan, wheelZoomFactor, ZOOM_IDENTITY, ZOOM_MAX, zoomAt, zoomTransform } from '../src/lib/zoom';

describe('zoom', () => {
  it('中央で拡大すると中央のまま', () => {
    expect(zoomAt(ZOOM_IDENTITY, 2)).toEqual({ scale: 2, cx: 0.5, cy: 0.5 });
  });
  it('指定した画面上の点は拡大しても動かない', () => {
    const z = zoomAt(ZOOM_IDENTITY, 2, 0.75, 0.5);
    // 画面の 0.75 に見えている動画上の点は 0.75 のまま
    expect(z.cx + (0.75 - 0.5) / z.scale).toBeCloseTo(0.75);
  });
  it('端の外は見せない', () => {
    const z = zoomAt(ZOOM_IDENTITY, 2, 1, 0);
    expect(z).toEqual({ scale: 2, cx: 0.75, cy: 0.25 });
    expect(pan(z, 1, -1)).toEqual(z);
  });
  it('倍率は 1〜上限に収め、等倍では位置も戻す', () => {
    expect(zoomAt(ZOOM_IDENTITY, 100).scale).toBe(ZOOM_MAX);
    const z = zoomAt(ZOOM_IDENTITY, 2, 1, 1);
    expect(zoomAt(z, 0.1)).toEqual(ZOOM_IDENTITY);
    expect(zoomAt(z, 1 / 1.9999)).toEqual(ZOOM_IDENTITY);
  });
  it('移動は見えている範囲に対する割合', () => {
    const z = pan(zoomAt(ZOOM_IDENTITY, 2), 0.1, 0);
    expect(z.cx).toBeCloseTo(0.55);
  });
  it('等倍では移動しない', () => expect(pan(ZOOM_IDENTITY, 0.5, 0.5)).toEqual(ZOOM_IDENTITY));
  it('ホイールは上（負）で拡大', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
  });
  it('transform', () => {
    expect(zoomTransform(ZOOM_IDENTITY)).toBe('none');
    expect(zoomTransform({ scale: 2, cx: 0.75, cy: 0.5 })).toBe('translate(-50%, 0%) scale(2)');
  });
  it('つかんで動かす：開始時に中点に見えていた点が、今の中点にくる', () => {
    const z0 = zoomAt(ZOOM_IDENTITY, 2);
    // 中央でつかんで右に 0.1 動かす → 見える範囲は左へ
    expect(grab(z0, { x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }).cx).toBeCloseTo(0.45);
    // ピンチで2倍：開始時の中点の下の点が、今の中点に
    const z = grab(ZOOM_IDENTITY, { x: 0.4, y: 0.5 }, { x: 0.45, y: 0.5 }, 2);
    expect(z.scale).toBe(2);
    expect(z.cx + (0.45 - 0.5) / z.scale).toBeCloseTo(0.4);
  });
});
