/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import { expect } from 'chai';
import { fromFile } from 'geotiff';

import OMETiffLoader from '../../src/loaders/OMETiffLoader';

describe('Test multi-channel input', async () => {
  const tiff = await fromFile('tests/loaders/fixtures/multi-channel.ome.tif');
  const firstImage = await tiff.getImage();
  const { ImageDescription: omexmlString } = firstImage.fileDirectory;
  const loader = new OMETiffLoader(tiff, {}, firstImage, omexmlString);

  it('Properties loader test', () => {
    const { width, height, isPyramid } = loader;
    expect(width).to.equal(439);
    expect(height).to.equal(167);
    expect(isPyramid).to.be.false;
  });
});
