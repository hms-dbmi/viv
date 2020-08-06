/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { range } from '../../../src/layers/MultiscaleImageLayer/utils';
import { padWithDefault, padColorsAndSliders } from '../../../src/layers/utils';
import { isInTileBounds } from '../../../src/loaders/utils';

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

test('padColorsAndSliders test', t => {
  const expectedNoDomain = {
    paddedSliderValues: [0, 5, 0, 5, 255, 255, 255, 255, 255, 255, 255, 255],
    paddedColorValues: [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  const expectedChannelOff = {
    paddedSliderValues: [
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
    paddedColorValues: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  const expectedDomain = {
    paddedSliderValues: [
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
    paddedColorValues: [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  const expected16Bit = {
    paddedSliderValues: [
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
    paddedColorValues: [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };

  t.deepEqual(
    padColorsAndSliders({
      sliderValues: [
        [0, 5],
        [0, 5]
      ],
      colorValues: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      channelIsOn: [true, true],
      dtype: '<u1'
    }),
    expectedNoDomain,
    'Pads with no domain provided'
  );
  t.deepEqual(
    padColorsAndSliders({
      sliderValues: [
        [0, 5],
        [0, 5]
      ],
      colorValues: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      channelIsOn: [true, false],
      dtype: '<u1'
    }),
    expectedChannelOff,
    'Pads with one channel turned off'
  );
  t.deepEqual(
    padColorsAndSliders({
      sliderValues: [
        [0, 5],
        [0, 5]
      ],
      colorValues: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      channelIsOn: [true, true],
      domain: [0, 1000],
      dtype: '<u1'
    }),
    expectedDomain,
    'Pads with provided domain value'
  );
  t.deepEqual(
    padColorsAndSliders({
      sliderValues: [
        [0, 5],
        [0, 5]
      ],
      colorValues: [
        [255, 0, 0],
        [255, 255, 0]
      ],
      channelIsOn: [true, true],
      dtype: '<u2'
    }),
    expected16Bit,
    'Pads with high bit depth'
  );
  t.end();
});

test('isInTileBounds test', t => {
  t.ok(
    isInTileBounds({
      x: 0,
      y: 0,
      z: 0,
      width: 10,
      height: 10,
      tileSize: 2,
      numLevels: 5
    }),
    'Tile indices are in bounds given image dimensions'
  );
  t.notOk(
    isInTileBounds({
      x: 0,
      y: 0,
      z: 6,
      width: 10,
      height: 10,
      tileSize: 2,
      numLevels: 5
    }),
    'Tile indices are out of bounds because zoom level is less than minZoom'
  );
  t.notOk(
    isInTileBounds({
      x: 5,
      y: 5,
      z: 0,
      width: 10,
      height: 10,
      tileSize: 2,
      numLevels: 5
    }),
    'Tile indices are out of bounds because tile indices are too big for image dimensions.'
  );
  t.end();
});
