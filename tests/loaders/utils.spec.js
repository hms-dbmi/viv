import test from 'tape';

import { getChannelStats, joinUrlParts } from '../../src/loaders/utils';

test('getChannelStats: Small', async t => {
  t.plan(6);
  try {
    const loader = {
      isPyramid: false,
      getRaster: async () => {
        return {
          data: [
            [0, 1, 2, 3],
            [0, 2, 0, 2],
            [0, 0, 1, 1]
          ]
        };
      }
    };
    const channelStats = await getChannelStats({ loader });
    const means = channelStats.map(stat => stat.mean);
    const domains = channelStats.map(stat => stat.domain);
    const standardDeviations = channelStats.map(stat => stat.sd);
    const thirdQuartiles = channelStats.map(stat => stat.q3);
    const firstQuartiles = channelStats.map(stat => stat.q1);
    const medians = channelStats.map(stat => stat.median);

    t.deepEqual(means, [1.5, 1, 0.5]);
    t.deepEqual(domains, [
      [0, 3],
      [0, 2],
      [0, 1]
    ]);
    t.deepEqual(standardDeviations, [1.118033988749895, 1, 0.5]);
    t.deepEqual(firstQuartiles, [1, 0, 0]);
    t.deepEqual(thirdQuartiles, [3, 2, 1]);
    t.deepEqual(medians, [2, 2, 1]);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getChannelStatsStats: Large Array', async t => {
  t.plan(6);
  try {
    const loader = {
      isPyramid: false,
      getRaster: async () => {
        return {
          data: [
            [0, 1, 2, 3, 7, 8, 9, 10, 4, 5, 6, 11],
            [0, 1, 5, 6, 7, 2, 9, 10, 3, 4, 8, 11, 12]
          ]
        };
      }
    };
    const channelStats = await getChannelStats({ loader });
    const means = channelStats.map(stat => stat.mean);
    const domains = channelStats.map(stat => stat.domain);
    const standardDeviations = channelStats.map(stat => stat.sd);
    const thirdQuartiles = channelStats.map(stat => stat.q3);
    const firstQuartiles = channelStats.map(stat => stat.q1);
    const medians = channelStats.map(stat => stat.median);

    t.deepEqual(means, [5.5, 6]);
    t.deepEqual(domains, [
      [0, 11],
      [0, 12]
    ]);
    t.deepEqual(standardDeviations, [3.452052529534663, 3.7416573867739413]);
    t.deepEqual(firstQuartiles, [3, 3]);
    t.deepEqual(thirdQuartiles, [9, 9]);
    t.deepEqual(medians, [6, 6]);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('URL join suffixes', t => {
  t.equal(
    joinUrlParts('https://example.com', 'bla'),
    'https://example.com/bla'
  );
  t.equal(
    joinUrlParts('https://example.com/my-store', 'arr.zarr'),
    'https://example.com/my-store/arr.zarr'
  );
  t.equal(
    joinUrlParts('https://example.com/', 'arr.zarr'),
    'https://example.com/arr.zarr'
  );
  t.equal(
    joinUrlParts('https://example.com/', '', 'arr.zarr'),
    'https://example.com/arr.zarr'
  );
  t.end();
});
