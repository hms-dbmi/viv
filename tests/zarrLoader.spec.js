/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';

import { zeros, NestedArray } from 'zarr';
import { ZarrLoader } from '../src/loaders';

test('Test zarr non-rgb image loader', async t => {
  const z = await zeros([2, 500, 250], {
    chunks: [1, 100, 100],
    dtype: '<i4'
  });
  await z.set([0, null, null], 42);
  await z.set([1, 0, null], NestedArray.arange(250));
  await z.set([0, null, 2], 1);

  const isRgb = false;
  const scale = 1;
  const dimensions = {
    channel: ['red', 'blue'],
    y: null,
    x: null
  };
  const loader = new ZarrLoader(z, isRgb, scale, dimensions);
  // eslint-disable-next-line prefer-destructuring
  const vivMetadata = loader.vivMetadata;
  t.deepEqual(
    Object.keys(vivMetadata).sort(),
    ['dtype', 'imageHeight', 'imageWidth', 'minZoom', 'scale', 'tileSize'],
    'Ensure viv-specific keys are returned by object.'
  );

  let [tile] = await loader.getTile({ x: 0, y: 0 });
  t.equal(tile[10], 42, 'Fetch first tile and make sure correct value.');
  t.equal(
    tile.length,
    vivMetadata.tileSize * vivMetadata.tileSize,
    'Ensure correct tile sizes.'
  );

  loader.setChunkIndex('channel', 1);
  [tile] = await loader.getTile({ x: 0, y: 0 });
  t.deepEqual(
    tile.subarray(0, 100),
    NestedArray.arange(100).flatten(),
    'Set new channel index and fetch new single tile'
  );
  t.end();
});

test('Test zarr image multichannel', async t => {
  const z = await zeros([4, 500, 250], {
    chunks: [4, 20, 20],
    dtype: '<i4'
  });
  await z.set([1, null, null], 1);
  await z.set([2, null, null], 2);
  await z.set([3, null, null], 3);

  const isRgb = false;
  const scale = 1;
  const dimensions = {
    channel: ['red', 'blue', 'yellow', 'green'],
    y: null,
    x: null
  };

  const loader = new ZarrLoader(z, isRgb, scale, dimensions);
  const [red, blue, yellow, green] = await loader.getTile({ x: 0, y: 0 });
  t.deepEqual(
    red,
    new Uint32Array(400).fill(0),
    'Correct channel decoding "red"'
  );
  t.deepEqual(
    blue,
    new Uint32Array(400).fill(1),
    'Correct channel decoding "blue"'
  );
  t.deepEqual(
    yellow,
    new Uint32Array(400).fill(2),
    'Correct channel decoding "yellow"'
  );
  t.deepEqual(
    green,
    new Uint32Array(400).fill(3),
    'Correct channel decoding "green"'
  );
  t.end();
});

test('Test zarr pyramid', async t => {
  const z0 = await zeros([4, 100, 150], {
    chunks: [4, 10, 10],
    dtype: '<i4'
  });
  await z0.set(null, 0);

  const z1 = await zeros([4, 50, 75], {
    chunks: [4, 10, 10],
    dtype: '<i4'
  });
  await z1.set(null, 1);

  const z2 = await zeros([4, 25, 38], {
    chunks: [4, 10, 10],
    dtype: '<i4'
  });
  await z2.set(null, 2);

  const isRgb = false;
  const scale = 1;
  const dimensions = {
    channel: ['red', 'blue', 'yellow', 'green'],
    y: null,
    x: null
  };

  const loader = new ZarrLoader([z0, z1, z2], isRgb, scale, dimensions);
  const baseTiles = await loader.getTile({ x: 0, y: 0, z: 0 });
  const level1Tiles = await loader.getTile({ x: 0, y: 0, z: 1 });
  const level2Tiles = await loader.getTile({ x: 0, y: 0, z: 2 });
  t.deepEqual(
    [baseTiles.length, level1Tiles.length, level2Tiles.length],
    [4, 4, 4],
    'Ensure number of channels returned at each level are the same.'
  );
  t.deepEqual(
    [baseTiles[0].length, level1Tiles[0].length, level2Tiles[0].length],
    [100, 100, 100],
    'Ensure ensure same tile sizes.'
  );
  t.end();
});
