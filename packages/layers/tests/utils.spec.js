import { describe, test, expect } from 'vitest';
import { range } from '../src/multiscale-image-layer/utils';
import {
  padContrastLimits,
  padWithDefault,
  sizeToMeters,
  snapValue
} from '../src/utils';

import { DTYPE_VALUES } from '../../constants';
import { getRenderingAttrs } from '../src/xr-layer/utils';

const dtypes = Object.keys(DTYPE_VALUES);
const interpolations = ['nearest', 'linear'];

describe('utils', () => {
  test('range test', () => {
    const expected = [0, 1, 2];
    expect(range(3)).toEqual(expected);
    expect(range(0)).toEqual([]);
  });

  test('padWithDefault test', () => {
    const expected = [3, 4, 5, 2, 2];
    expect(padWithDefault([3, 4, 5], 2, 2)).toEqual(expected);
  });

  test('padContrastLimits test', () => {
    const expectedChannelOff = [
      0, 5, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
    ];
    const expected16Bit = [
      0,
      5,
      0,
      5,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1
    ];
    expect(
      padContrastLimits({
        contrastLimits: [
          [0, 5],
          [0, 5]
        ],
        channelsVisible: [true, false],
        dtype: 'Uint8'
      })
    ).toEqual(expectedChannelOff);
    expect(
      padContrastLimits({
        contrastLimits: [
          [0, 5],
          [0, 5]
        ],
        channelsVisible: [true, true],
        dtype: 'Uint16'
      })
    ).toEqual(expected16Bit);
  });

  test('getRenderingAttrs WebGL2', () => {
    for (const interpolation of interpolations) {
      for (const dtype of dtypes) {
        const attrs = getRenderingAttrs(dtype, interpolation);
        if (interpolation === 'linear' || dtype === 'Float64') {
          expect(attrs.cast(new Uint16Array([1, 2, 3]))).toEqual(new Float32Array([1, 2, 3]));
        } else {
          expect(attrs.cast(new Uint16Array([1, 2, 3]))).toEqual(new Uint16Array([1, 2, 3]));
        }
        expect(attrs.filter).toBe(interpolation);
      }
    }
  });

  test('sizeToMeters test', () => {
    expect(sizeToMeters(5, 'km')).toBe(5000);
    expect(sizeToMeters(10, 'm')).toBe(10);
    expect(sizeToMeters(10, 'cm')).toBe(0.1);
    // These have floating point errors, so we check that
    // they are within 1e-10 of the expected value.
    expect(Math.abs(sizeToMeters(10, 'µm') - 1e-5)).toBeLessThan(1e-10);
    expect(Math.abs(sizeToMeters(10, 'um') - 1e-5)).toBeLessThan(1e-10);
  });

  test('snapValue test', () => {
    expect(snapValue(1.234)).toEqual([2, 2, '']);
    expect(snapValue(0.0234)).toEqual([0.025, 25, 'm']);
    expect(snapValue(2345.0)).toEqual([3000, 3, 'k']);
    expect(snapValue(999.0)).toEqual([1000, 1, 'k']);
  });
});
