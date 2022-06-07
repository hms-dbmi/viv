import test from 'tape';
import { fromFile } from 'geotiff';

import { load } from '../../src/loaders/tiff-folder/tiff-folder';

async function loadTiffs() {
    return {imageName: 'tiff-folder',
            channelNames: ['Channel 0','Channel 1', 'Channel 2'],
            tiffs: [
                await fromFile('tests/loaders/fixtures/tiff-folder/Channel_0.tif'),
                await fromFile('tests/loaders/fixtures/tiff-folder/Channel_1.tif'),
                await fromFile('tests/loaders/fixtures/tiff-folder/Channel_2.tif')
            ]
        }
}

test('Creates correct TiffFolderPixelSource for TIFF folder.', async t => {
  t.plan(5);
  try {
    const {imageName, channelNames, tiffs} = await loadTiffs();
    const { data } = await load(imageName, channelNames, tiffs);
    t.equal(data.length, 1, 'image should not be pyramidal.');
    const [base] = data;
    t.deepEqual(
      base.labels,
      ['t', 'c', 'z', 'y', 'x'],
      'should have DimensionOrder "XYZCT".'
    );
    t.deepEqual(
      base.shape,
      [1, 3, 1, 167, 439],
      'shape should match dimensions.'
    );
    t.equal(
      base.meta.photometricInterpretation,
      1,
      'Photometric interpretation is 1.'
    );
    t.equal(base.meta.physicalSizes, undefined, 'No physical sizes.');
  } catch (e) {
    t.fail(e);
  }
});

test('Get raster data for TIFF folder.', async t => {
  t.plan(13);
  try {
    const {imageName, channelNames, tiffs} = await loadTiffs();
    const { data } = await load(imageName, channelNames, tiffs);
    const [base] = data;

    for (let c = 0; c < 3; c += 1) {
      const selection = { c, z: 0, t: 0 };
      const pixelData = await base.getRaster({ selection }); // eslint-disable-line no-await-in-loop
      t.equal(pixelData.width, 439, 'Should have width of 439.');
      t.equal(pixelData.height, 167, 'Should have height of 167.');
      t.equal(pixelData.data.length, 439 * 167, 'Data should be width * height long.');
      t.equal(pixelData.data.constructor.name, 'Uint8Array', 'Data constructor name should be Uint8Array.');
    }

    try {
      await base.getRaster({ selection: { c: 3, z: 0, t: 0 } });
    } catch (e) {
      t.ok(e instanceof Error, 'index should be out of bounds.');
    }
  } catch (e) {
    t.fail(e);
  }
});

test('Correct TIFF folder metadata.', async t => {
  t.plan(10);
  try {
    const {imageName, channelNames, tiffs} = await loadTiffs();
    const { metadata } = await load(imageName, channelNames, tiffs);
    const { Name, Pixels } = metadata;
    t.equal(
      Name,
      'tiff-folder',
      `Name should be 'tiff-folder'.`
    );
    t.equal(Pixels.SizeC, 3, 'Should have three channels.');
    t.equal(Pixels.SizeT, 1, 'Should have one time index.');
    t.equal(Pixels.SizeX, 439, 'Should have SizeX of 429.');
    t.equal(Pixels.SizeY, 167, 'Should have SizeY of 167.');
    t.equal(Pixels.SizeZ, 1, 'Should have one z index.');
    t.equal(Pixels.Type, 'Uint8', 'Should be Uint8 pixel type.');
    t.equal(Pixels.Channels.length, 3, 'Should have 3 channels.');
    t.equal(Pixels.Channels[0].SamplesPerPixel, 1, 'Should have 1 sample per pixel.');
    t.equal(Pixels.Channels[0].Name, 'Channel 0', 'Should have name Channel 0.');
  } catch (e) {
    t.fail(e);
  }
});
