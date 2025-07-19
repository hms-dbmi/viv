import { test, expect } from 'vitest';

import { getChannelStats, intToRgba, isInterleaved } from '../src/utils';

test('getChannelStats: All zeros', () => {
  const data = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  const channelStats = data.map(arr => getChannelStats(arr));
  const means = channelStats.map(stat => stat.mean);
  const domains = channelStats.map(stat => stat.domain);
  const standardDeviations = channelStats.map(stat => stat.sd);
  const thirdQuartiles = channelStats.map(stat => stat.q3);
  const firstQuartiles = channelStats.map(stat => stat.q1);
  const medians = channelStats.map(stat => stat.median);
  const contrastLimits = channelStats.map(stat => stat.contrastLimits);
  expect(means).toEqual([0, 0, 0]);
  expect(domains).toEqual([
    [0, 0],
    [0, 0],
    [0, 0]
  ]);
  expect(contrastLimits).toEqual([
    [0, 0],
    [0, 0],
    [0, 0]
  ]);
  expect(standardDeviations).toEqual([0, 0, 0]);
  expect(firstQuartiles).toEqual([0, 0, 0]);
  expect(thirdQuartiles).toEqual([0, 0, 0]);
  expect(medians).toEqual([0, 0, 0]);
});

test('getChannelStats: Small', () => {
  const data = [
    [0, 1, 2, 3],
    [0, 2, 0, 2],
    [0, 0, 1, 1]
  ];
  const channelStats = data.map(arr => getChannelStats(arr));
  const means = channelStats.map(stat => stat.mean);
  const domains = channelStats.map(stat => stat.domain);
  const standardDeviations = channelStats.map(stat => stat.sd);
  const thirdQuartiles = channelStats.map(stat => stat.q3);
  const firstQuartiles = channelStats.map(stat => stat.q1);
  const medians = channelStats.map(stat => stat.median);
  expect(means).toEqual([1.5, 1, 0.5]);
  expect(domains).toEqual([
    [0, 3],
    [0, 2],
    [0, 1]
  ]);
  expect(standardDeviations).toEqual([1.118033988749895, 1, 0.5]);
  expect(firstQuartiles).toEqual([1, 0, 0]);
  expect(thirdQuartiles).toEqual([3, 2, 1]);
  expect(medians).toEqual([2, 2, 1]);
});

test('getChannelStats: Large Array', () => {
  const data = [
    [0, 1, 2, 3, 7, 8, 9, 10, 4, 5, 6, 11],
    [0, 1, 5, 6, 7, 2, 9, 10, 3, 4, 8, 11, 12]
  ];
  const channelStats = data.map(arr => getChannelStats(arr));

  const means = channelStats.map(stat => stat.mean);
  const domains = channelStats.map(stat => stat.domain);
  const standardDeviations = channelStats.map(stat => stat.sd);
  const thirdQuartiles = channelStats.map(stat => stat.q3);
  const firstQuartiles = channelStats.map(stat => stat.q1);
  const medians = channelStats.map(stat => stat.median);

  expect(means).toEqual([5.5, 6]);
  expect(domains).toEqual([
    [0, 11],
    [0, 12]
  ]);
  expect(standardDeviations).toEqual([3.452052529534663, 3.7416573867739413]);
  expect(firstQuartiles).toEqual([3, 3]);
  expect(thirdQuartiles).toEqual([9, 9]);
  expect(medians).toEqual([6, 6]);
});

test('Convert int to RGBA color', () => {
  expect(intToRgba(0)).toEqual([0, 0, 0, 0]);
  expect(intToRgba(100100)).toEqual([0, 1, 135, 4]);
});

test('isInterleaved', () => {
  expect(isInterleaved([1, 2, 400, 400, 4])).toBeTruthy();
  expect(isInterleaved([1, 2, 400, 400, 3])).toBeTruthy();
  expect(isInterleaved([1, 2, 400, 400])).toBeFalsy();
  expect(isInterleaved([1, 3, 4, 4000000])).toBeFalsy();
});
