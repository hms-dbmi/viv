import { describe, expect, it } from 'vitest';

import {
  convertInterleavedPhotometricToRgb,
  needsPhotometricRgbConversion
} from '../src/tiff/lib/photometricRgb';
import { PHOTOMETRIC_RGB, PHOTOMETRIC_YCBCR } from '../src/tiff/lib/utils';

describe('photometricRgb', () => {
  it('needs conversion only for YCbCr', () => {
    expect(needsPhotometricRgbConversion(PHOTOMETRIC_YCBCR)).toBe(true);
    expect(needsPhotometricRgbConversion(PHOTOMETRIC_RGB)).toBe(false);
    expect(needsPhotometricRgbConversion(1)).toBe(false);
    expect(needsPhotometricRgbConversion(undefined)).toBe(false);
  });

  it('converts neutral YCbCr (Y=128, Cb=128, Cr=128) near gray RGB', () => {
    const ycbcr = new Uint8Array([128, 128, 128]);
    const rgb = convertInterleavedPhotometricToRgb(ycbcr, PHOTOMETRIC_YCBCR);
    expect(rgb[0]).toBe(128);
    expect(rgb[1]).toBe(128);
    expect(rgb[2]).toBe(128);
  });

  it('leaves RGB photometric data unchanged', () => {
    const src = new Uint8Array([10, 20, 30]);
    const out = convertInterleavedPhotometricToRgb(src, PHOTOMETRIC_RGB);
    expect(out).toBe(src);
  });
});
