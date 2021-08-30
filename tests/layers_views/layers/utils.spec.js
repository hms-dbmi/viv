/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { range } from '../../../src/layers/MultiscaleImageLayer/utils';
import { padWithDefault, padColorsAndWindows } from '../../../src/layers/utils';

test('range test', t => {
  const expected = [0, 1, 2];
  t.deepEqual(range(3), expected, 'Create list for range(3)');
  t.deepEqual(range(0), [], 'Empty list for range(0)');
  t.end();
});

test('padWithDefault test', t => {
  const expected = [3, 4, 5, 2, 2];
  t.deepEqual(
    padWithDefault([3, 4, 5], 2, 2),
    expected,
    "Pad with two's to five places."
  );
  t.end();
});

test('padColorsAndWindows test', t => {
  const expectedNoDomain = {
    paddedWindows: [0, 5, 0, 5, 255, 255, 255, 255, 255, 255, 255, 255],
    paddedColors: [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  const expectedChannelOff = {
    paddedWindows: [
      0,
      5,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255,
      255
    ],
    paddedColors: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  const expectedDomain = {
    paddedWindows: [
      0,
      5,
      0,
      5,
      1000,
      1000,
      1000,
      1000,
      1000,
      1000,
      1000,
      1000
    ],
    paddedColors: [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  const expected16Bit = {
    paddedWindows: [
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
    ],
    paddedColors: [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };

  t.deepEqual(
    padColorsAndWindows({
      windows: [
        [0, 5],
        [0, 5]
      ],
      colors: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      active: [true, true],
      dtype: 'Uint8'
    }),
    expectedNoDomain,
    'Pads with no domain provided'
  );
  t.deepEqual(
    padColorsAndWindows({
      windows: [
        [0, 5],
        [0, 5]
      ],
      colors: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      active: [true, false],
      dtype: 'Uint8'
    }),
    expectedChannelOff,
    'Pads with one channel turned off'
  );
  t.deepEqual(
    padColorsAndWindows({
      windows: [
        [0, 5],
        [0, 5]
      ],
      colors: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      active: [true, true],
      domain: [0, 1000],
      dtype: 'Uint8'
    }),
    expectedDomain,
    'Pads with provided domain value'
  );
  t.deepEqual(
    padColorsAndWindows({
      windows: [
        [0, 5],
        [0, 5]
      ],
      colors: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      active: [true, true],
      dtype: 'Uint16'
    }),
    expected16Bit,
    'Pads with high bit depth'
  );
  t.end();
});
