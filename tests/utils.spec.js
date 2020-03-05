/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { range, padWithDefault } from '../src/layers/utils';
import { isInTileBounds } from '../src/layers/VivViewerLayer/utils';

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

test('isInTileBounds test', t => {
  t.ok(
    isInTileBounds({
      x: 0,
      y: 0,
      z: 0,
      imageWidth: 10,
      imageHeight: 10,
      tileSize: 2,
      minZoom: -5
    }),
    'Tile indices are in bounds given image dimensions'
  );
  t.notOk(
    isInTileBounds({
      x: 0,
      y: 0,
      z: 6,
      imageWidth: 10,
      imageHeight: 10,
      tileSize: 2,
      minZoom: -5
    }),
    'Tile indices are out of bounds because zoom level is less than minZoom'
  );
  t.notOk(
    isInTileBounds({
      x: 5,
      y: 5,
      z: 0,
      imageWidth: 10,
      imageHeight: 10,
      tileSize: 2,
      minZoom: -5
    }),
    'Tile indices are out of bounds because tile indices are too big for image dimensions.'
  );
  t.end();
});
