import test from 'tape';
import { fromFile } from 'geotiff';

import OMETiffLoader from '../../src/loaders/OMETiffLoader';
import OMEXML from '../../src/loaders/omeXML';
import { dimensionsFromOMEXML } from '../../src/loaders/utils';

test('OME-TIFF Selection', async t => {
  t.plan(2);
  try {
    const tiff = await fromFile('tests/loaders/fixtures/multi-channel.ome.tif');
    const firstImage = await tiff.getImage();
    const { ImageDescription: omexmlString } = firstImage.fileDirectory;
    const metadata = new OMEXML(omexmlString);
    const dimensions = dimensionsFromOMEXML(metadata);
    const physicalSizes = {
      x: {
        value: metadata.PhysicalSizeX,
        unit: metadata.PhysicalSizeXUnit
      },
      y: {
        value: metadata.PhysicalSizeY,
        unit: metadata.PhysicalSizeYUnit
      }
    };
    const loader = new OMETiffLoader({
      tiff,
      pool: { decode: () => new Promise([]) },
      firstImage,
      metadata,
      offsets: [8, 2712, 4394],
      dimensions,
      physicalSizes,
      dtype: '<u1'
    });
    const selection = loader._getIFDIndex({ channel: 1 });

    t.deepEqual(selection, 1);

    const [image] = await loader.getImages([{ channel: 0 }]);
    // First image has the omexml string, in theory.
    t.equal(image.fileDirectory.ImageDescription, omexmlString);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
