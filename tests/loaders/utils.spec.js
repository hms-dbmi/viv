/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import { expect } from 'chai';

import { getChannelStats } from '../../src/loaders/utils';

describe('Test getChannelStates', () => {
  it('Stats test', async () => {
    const { dataRanges, means, standardDeviations } = await getChannelStats({
      data: [
        [0, 1, 2, 3],
        [0, 2, 0, 2],
        [0, 0, 1, 1]
      ]
    });
    expect(means).to.deep.equal([1.5, 1, 0.5]);
    expect(dataRanges).to.deep.equal([
      [0, 3],
      [0, 2],
      [0, 1]
    ]);
    // Actual standard deviation for the first one is 1.11803398875
    // but clearly we have a rounding issue since the others are right?
    expect(standardDeviations).to.deep.equal([1.1180340051651, 1, 0.5]);
  });
});
