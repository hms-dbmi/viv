import { PHOTOMETRIC_YCBCR } from './utils';

/**
 * True when interleaved visual samples are not yet RGB and must be converted
 * before consumers that assume R,G,B (BitmapLayer with meta=RGB, analysis, etc.).
 * Extend here for CMYK / CIELab if those packed paths land.
 */
export function needsPhotometricRgbConversion(
  photometricInterpretation?: number
): boolean {
  return photometricInterpretation === PHOTOMETRIC_YCBCR;
}

/**
 * Convert interleaved photometric samples to RGB. Matches geotiff.js
 * `fromYCbCr` and Viv BitmapLayer (Cb/Cr centered at 128 on 0–255).
 */
export function convertInterleavedPhotometricToRgb(
  data: ArrayLike<number>,
  photometricInterpretation?: number
): Uint8Array {
  if (photometricInterpretation === PHOTOMETRIC_YCBCR) {
    return interleavedYCbCrToRgb(data);
  }
  if (ArrayBuffer.isView(data) && data instanceof Uint8Array) {
    return data;
  }
  return Uint8Array.from(data as ArrayLike<number>);
}

function interleavedYCbCrToRgb(data: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const y = data[i];
    const cb = data[i + 1];
    const cr = data[i + 2];
    out[i] = clampRgb8(y + 1.402 * (cr - 128));
    out[i + 1] = clampRgb8(
      y - 0.34414 * (cb - 128) - 0.71414 * (cr - 128)
    );
    out[i + 2] = clampRgb8(y + 1.772 * (cb - 128));
  }
  return out;
}

function clampRgb8(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
