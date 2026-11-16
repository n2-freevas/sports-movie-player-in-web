import { describe, expect, it } from 'vitest';
import { ARROW_SKIP_SCALE, keyAction, type KeyInput } from '../src/lib/keyboard';

const press = (key: string, mods: Partial<KeyInput> = {}) =>
  keyAction({ key, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, ...mods });

describe('keyAction（YouTube と同じキー割り当て）', () => {
  it('Space・K で再生・停止', () => {
    expect(press(' ')).toEqual({ type: 'togglePlay' });
    expect(press('k')).toEqual({ type: 'togglePlay' });
    expect(press('K')).toEqual({ type: 'togglePlay' });
  });
  it('J・L で基準秒数の戻し・送り', () => {
    expect(press('j')).toEqual({ type: 'skip', direction: -1, scale: 1 });
    expect(press('l')).toEqual({ type: 'skip', direction: 1, scale: 1 });
  });
  it('←・→ で半分の秒数（基準10秒なら5秒）', () => {
    expect(press('ArrowLeft')).toEqual({ type: 'skip', direction: -1, scale: ARROW_SKIP_SCALE });
    expect(press('ArrowRight')).toEqual({ type: 'skip', direction: 1, scale: ARROW_SKIP_SCALE });
    expect(10 * ARROW_SKIP_SCALE).toBe(5);
  });
  it(', . でコマ送り', () => {
    expect(press(',')).toEqual({ type: 'frame', direction: -1 });
    expect(press('.')).toEqual({ type: 'frame', direction: 1 });
  });
  it('< > で速度を1段階変える', () => {
    expect(press('<')).toEqual({ type: 'rate', step: -1 });
    expect(press('>')).toEqual({ type: 'rate', step: 1 });
  });
  it('Home・End・0〜9 で位置を指定', () => {
    expect(press('Home')).toEqual({ type: 'seekRatio', ratio: 0 });
    expect(press('End')).toEqual({ type: 'seekRatio', ratio: 1 });
    expect(press('0')).toEqual({ type: 'seekRatio', ratio: 0 });
    expect(press('7')).toEqual({ type: 'seekRatio', ratio: 0.7 });
  });
  it('? で操作方法', () => expect(press('?')).toEqual({ type: 'help' }));
  it('Ctrl・Cmd・Alt 付きと日本語入力の変換中は横取りしない', () => {
    expect(press('l', { metaKey: true })).toBeNull();
    expect(press('k', { ctrlKey: true })).toBeNull();
    expect(press('ArrowLeft', { altKey: true })).toBeNull();
    expect(press(' ', { isComposing: true })).toBeNull();
  });
  it('割り当てのないキーは null', () => {
    expect(press('f')).toBeNull();
    expect(press('Enter')).toBeNull();
    expect(press('ArrowUp')).toBeNull();
  });
});
