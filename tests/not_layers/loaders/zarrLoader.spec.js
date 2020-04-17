/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';

import { zeros, NestedArray } from 'zarr';
import { ZarrLoader } from '../../../src/loaders';

test('Test zarr non-rgb image loader', async t => {
  const z = await zeros([2, 500, 250], {
    chunks: [1, 100, 100],
    dtype: '<i4'
  });
  await z.set([0, null, null], 42);
  await z.set([1, 0, null], NestedArray.arange(250));
  await z.set([0, null, 2], 1);
  const dimensions = [
    { field: 'channel', type: 'nominal', values: ['a', 'b'] },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ];
  const loader = new ZarrLoader({ data: z, dimensions });
  const { dtype, numLevels, tileSize } = loader;
  t.equal(dtype, '<i4', 'Correct dtype');
  t.equal(numLevels, 1, 'Correct number of levels');
  t.equal(tileSize, 100, 'Correct tile size');

  let res = await loader.getTile({ x: 0, y: 0 });
  t.equal(res.data[0][10], 42, 'Fetch first tile and make sure correct value.');
  t.equal(
    res.data[0].length,
    tileSize * tileSize,
    'Ensure correct tile sizes.'
  );

  res = await loader.getTile({ x: 0, y: 0, loaderSelection: [[1, 0, 0]] });
  t.deepEqual(
    res.data[0].subarray(0, 100),
    NestedArray.arange(100).flatten(),
    'Set new channel index and fetch new single tile'
  );
  t.end();
});

test('Test zarr pyramid', async t => {
  const z0 = await zeros([4, 100, 150], {
    chunks: [1, 10, 10],
    dtype: '<i4'
  });
  await z0.set(null, 0);

  const z1 = await zeros([4, 50, 75], {
    chunks: [1, 10, 10],
    dtype: '<i4'
  });
  await z1.set(null, 1);

  const z2 = await zeros([4, 25, 38], {
    chunks: [1, 10, 10],
    dtype: '<i4'
  });
  await z2.set(null, 2);

  const dimensions = [
    { field: 'channel', type: 'ordinal', values: ['r', 'g', 'b', 'a'] },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ];

  const loader = new ZarrLoader({ data: [z0, z1, z2], dimensions });
  const { data: baseTiles } = await loader.getTile({ x: 0, y: 0, z: 0 });
  const { data: level1Tiles } = await loader.getTile({ x: 0, y: 0, z: 1 });
  const { data: level2Tiles } = await loader.getTile({ x: 0, y: 0, z: 2 });

  t.deepEqual(
    [baseTiles.length, level1Tiles.length, level2Tiles.length],
    [1, 1, 1],
    'Ensure number of channels returned at each level are the same.'
  );
  t.deepEqual(
    [baseTiles[0].length, level1Tiles[0].length, level2Tiles[0].length],
    [100, 100, 100],
    'Ensure ensure same tile sizes.'
  );
  t.end();
});
