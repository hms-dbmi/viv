/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import { expect } from 'chai';

import { getChannelStats } from '../../src/loaders/utils';

describe('Test getChannelStats', () => {
  it('Stats test', async () => {
    const {
      dataRanges,
      means,
      standardDeviations,
      medians
    } = await getChannelStats({
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
    expect(standardDeviations).to.deep.equal([1.118033988749895, 1, 0.5]);
    expect(medians).to.deep.equal([2, 2, 1]);
  });
});
