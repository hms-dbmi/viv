/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import { expect } from 'chai';

import { fromFile } from 'geotiff';

import OMETiffLoader from '../../src/loaders/OMETiffLoader';

describe('Test multi-channel input', () => {
  it('Properties tiff test', async () => {
    const tiff = await fromFile('tests/loaders/fixtures/multi-channel.ome.tif');
    const firstImage = await tiff.getImage();
    const { ImageDescription: omexmlString } = firstImage.fileDirectory;
    const loader = new OMETiffLoader({
      tiff,
      pool: { decode: () => new Promise([]) },
      firstImage,
      omexmlString,
      offsets: [8, 2712, 4394]
    });
    const { width, height, isPyramid, offsets } = loader;
    expect(width).to.equal(439);
    expect(height).to.equal(167);
    expect(isPyramid).to.be.false;
    expect(offsets).to.deep.equal([8, 2712, 4394]);
  });

  it('Tiff selection test', async () => {
    const tiff = await fromFile('tests/loaders/fixtures/multi-channel.ome.tif');
    const firstImage = await tiff.getImage();
    const { ImageDescription: omexmlString } = firstImage.fileDirectory;
    const loader = new OMETiffLoader({
      tiff,
      pool: { decode: () => new Promise([]) },
      firstImage,
      omexmlString,
      offsets: [8, 2712, 4394]
    });
    const selection = loader._getIFDIndex({ channel: 1 });

    expect(selection).to.deep.equal(1);
  });
});
