/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import { expect } from 'chai';

import { zeros, NestedArray } from 'zarr';
import ZarrLoader from '../../src/loaders/zarrLoader';

describe('Test zarr non-rgb image loader', () => {
  it('Properties test', async () => {
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
    expect(dtype).to.equal('<i4');
    expect(numLevels).to.equal(1);
    expect(tileSize).to.equal(100);
  });

  it('getTile tests', async () => {
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
    const { tileSize } = loader;
    let res = await loader.getTile({
      x: 0,
      y: 0,
      loaderSelection: [{ channel: 0 }]
    });
    expect(res.data[0][10]).to.equal(42);
    expect(res.data[0].length).to.equal(tileSize * tileSize);

    res = await loader.getTile({
      x: 0,
      y: 0,
      loaderSelection: [{ channel: 1 }]
    });
    expect(res.data[0].subarray(0, 100)).to.deep.equal(
      NestedArray.arange(100).flatten()
    );
  });
});

describe('Test zarr pyramid', () => {
  it('Pyramid tiles have correct dimensions', async () => {
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

    const config = { x: 0, y: 0, loaderSelection: [{ channel: 0 }] };
    const loader = new ZarrLoader({ data: [z0, z1, z2], dimensions });
    const { data: baseTiles } = await loader.getTile({ ...config, z: 0 });
    const { data: level1Tiles } = await loader.getTile({ ...config, z: 1 });
    const { data: level2Tiles } = await loader.getTile({ ...config, z: 2 });

    expect([
      baseTiles.length,
      level1Tiles.length,
      level2Tiles.length
    ]).to.deep.equal([1, 1, 1]);

    expect([
      baseTiles[0].length,
      level1Tiles[0].length,
      level2Tiles[0].length
    ]).to.deep.equal([100, 100, 100]);
  });
});
