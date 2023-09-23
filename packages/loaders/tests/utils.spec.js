import { test, expect } from 'vitest';

import { intToRgba, getChannelStats, isInterleaved } from '../src/utils';

test.each([
  [
    [0, 0, 0, 0],
    {
      mean: 0,
      domain: [0, 0],
      sd: 0,
      q1: 0,
      q3: 0,
      median: 0
    }
  ],
  [
    [0, 1, 2, 3],
    {
      mean: 1.5,
      domain: [0, 3],
      sd: 1.118033988749895,
      q1: 1,
      q3: 3,
      median: 2
    }
  ],
  [
    [0, 2, 0, 2],
    {
      mean: 1,
      domain: [0, 2],
      sd: 1,
      q1: 0,
      q3: 2,
      median: 2
    }
  ],
  [
    [0, 0, 1, 1],
    {
      mean: 0.5,
      domain: [0, 1],
      sd: 0.5,
      q1: 0,
      q3: 1,
      median: 1
    }
  ],
  [
    [0, 1, 2, 3, 7, 8, 9, 10, 4, 5, 6, 11],
    {
      mean: 5.5,
      domain: [0, 11],
      sd: 3.452052529534663,
      q1: 3,
      q3: 9,
      median: 6
    }
  ],
  [
    [0, 1, 5, 6, 7, 2, 9, 10, 3, 4, 8, 11, 12],
    {
      mean: 6,
      domain: [0, 12],
      sd: 3.7416573867739413,
      q1: 3,
      q3: 9,
      median: 6
    }
  ]
])('getChannelStats(%j)', (data, expected) => {
  const { contrastLimits, ...stats } = getChannelStats(data);
  expect(stats).toEqual(expected);
});

test.each([
  [0, [0, 0, 0, 0]],
  [100100, [0, 1, 135, 4]]
])(`intToRgba(%i)`, (input, expected) => {
  expect(intToRgba(input)).toStrictEqual(expected);
});

test.each([
  [[1, 2, 400, 400, 4], true],
  [[1, 2, 400, 400, 3], true],
  [[1, 2, 400, 400], false],
  [[1, 3, 4, 4000000], false]
])(`isInterleaved(%j)`, (input, expected) => {
  expect(isInterleaved(input)).toStrictEqual(expected);
});
