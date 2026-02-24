import { describe, expect, test } from 'vitest';
import { MAX_CHANNELS } from '@vivjs/constants';
import { getDefaultPalette, padColors, padColorsForUBO } from '../src/utils';

describe('getDefaultPalette', () => {
  test('returns the requested number of colors', () => {
    const palette = getDefaultPalette(3);
    expect(palette).toHaveLength(3);
    for (const color of palette) {
      expect(color).toHaveLength(3);
    }
  });

  test('returns different colors', () => {
    const palette = getDefaultPalette(4);
    const asStrings = palette.map(c => c.join(','));
    expect(new Set(asStrings).size).toBe(4);
  });

  test('throws when requesting more colors than available', () => {
    expect(() => getDefaultPalette(100)).toThrow('Too many colors');
  });

  test('returns empty array for 0', () => {
    expect(getDefaultPalette(0)).toEqual([]);
  });
});

describe('padColorsForUBO', () => {
  test('returns normalized vec3 arrays (divided by 255)', () => {
    const result = padColorsForUBO({
      colors: [[255, 0, 0]],
      channelsVisible: [true]
    });
    expect(result[0]).toEqual([1, 0, 0]);
  });

  test('sets invisible channels to [0, 0, 0]', () => {
    const result = padColorsForUBO({
      colors: [
        [255, 0, 0],
        [0, 255, 0]
      ],
      channelsVisible: [true, false]
    });
    expect(result[0]).toEqual([1, 0, 0]);
    expect(result[1]).toEqual([0, 0, 0]);
  });

  test('pads to MAX_CHANNELS with default [0,0,0]', () => {
    const result = padColorsForUBO({
      colors: [[255, 255, 255]],
      channelsVisible: [true]
    });
    expect(result).toHaveLength(MAX_CHANNELS);
    for (let i = 1; i < MAX_CHANNELS; i++) {
      expect(result[i]).toEqual([0, 0, 0]);
    }
  });

  test('returns array of arrays (not flattened)', () => {
    const result = padColorsForUBO({
      colors: [
        [255, 0, 0],
        [0, 255, 0]
      ],
      channelsVisible: [true, true]
    });
    expect(Array.isArray(result[0])).toBe(true);
    expect(result[0]).toHaveLength(3);
  });

  test('differs from padColors which returns a flat array', () => {
    const args = {
      colors: [
        [255, 0, 0],
        [0, 255, 0]
      ],
      channelsVisible: [true, true]
    };
    const uboResult = padColorsForUBO(args);
    const flatResult = padColors(args);

    expect(Array.isArray(uboResult[0])).toBe(true);
    expect(typeof flatResult[0]).toBe('number');
    expect(flatResult).toHaveLength(MAX_CHANNELS * 3);
    expect(uboResult).toHaveLength(MAX_CHANNELS);
  });
});
