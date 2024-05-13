import test from 'tape';
import { fromFile } from 'geotiff';
import { load } from '../src/tiff/multi-tiff';
import { loadMultiTiff } from '../src/tiff';

import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const CHANNEL_0_FIXTURE = path.resolve(
  __dirname,
  './fixtures/multi-tiff/Channel_0.tif'
);
const CHANNEL_1_FIXTURE = path.resolve(
  __dirname,
  './fixtures/multi-tiff/Channel_1.tif'
);
const CHANNEL_2_FIXTURE = path.resolve(
  __dirname,
  './fixtures/multi-tiff/Channel_2.tif'
);
const CHANNEL_0_LOCAL_FIXTURE = `file://${CHANNEL_0_FIXTURE}`;
const CHANNEL_1_LOCAL_FIXTURE = `file://${CHANNEL_1_FIXTURE}`;
const CHANNEL_2_LOCAL_FIXTURE = `file://${CHANNEL_2_FIXTURE}`;

async function loadImage() {
  return {
    imageName: 'tiff-folder',
    tiffs: [
      {
        selection: { c: 0, t: 0, z: 0 },
        tiff: await (await fromFile(CHANNEL_0_FIXTURE)).getImage(0)
      },
      {
        selection: { c: 1, t: 0, z: 0 },
        tiff: await (await fromFile(CHANNEL_1_FIXTURE)).getImage(0)
      },
      {
        selection: { c: 2, t: 0, z: 0 },
        tiff: await (await fromFile(CHANNEL_2_FIXTURE)).getImage(0)
      }
    ],
    channelNames: ['Channel 0', 'Channel 1', 'Channel 2']
  };
}

function testPixelSource(t, data) {
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
}

test('Creates correct TiffPixelSource for MultiTIFF.', async t => {
  t.plan(5);
  try {
    const { imageName, tiffs, channelNames } = await loadImage();
    const { data } = await load(imageName, tiffs, channelNames);
    testPixelSource(t, data);
  } catch (e) {
    t.fail(e);
  }
});

test('Is able to load MultiTIFF from local file.', async t => {
  t.plan(5);
  try {
    const { data } = await loadMultiTiff([
      [{ c: 0, t: 0, z: 0 }, CHANNEL_0_LOCAL_FIXTURE],
      [{ c: 1, t: 0, z: 0 }, CHANNEL_1_LOCAL_FIXTURE],
      [{ c: 2, t: 0, z: 0 }, CHANNEL_2_LOCAL_FIXTURE]
    ]);
    testPixelSource(t, data);
  } catch (e) {
    t.fail(e);
  }
});

test('Get raster data for MultiTIFF.', async t => {
  t.plan(13);
  try {
    const { imageName, tiffs, channelNames } = await loadImage();
    const { data } = await load(imageName, tiffs, channelNames);
    const [base] = data;

    for (let c = 0; c < 3; c += 1) {
      const selection = { c, z: 0, t: 0 };
      const pixelData = await base.getRaster({ selection });
      t.equal(pixelData.width, 439, 'Should have width of 439.');
      t.equal(pixelData.height, 167, 'Should have height of 167.');
      t.equal(
        pixelData.data.length,
        439 * 167,
        'Data should be width * height long.'
      );
      t.equal(
        pixelData.data.constructor.name,
        'Uint8Array',
        'Data constructor name should be Uint8Array.'
      );
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

test('Correct MultiTIFF metadata.', async t => {
  t.plan(10);
  try {
    const { imageName, tiffs, channelNames } = await loadImage();
    const { metadata } = await load(imageName, tiffs, channelNames);
    const { Name, Pixels } = metadata;
    t.equal(Name, 'tiff-folder', `Name should be 'tiff-folder'.`);
    t.equal(Pixels.SizeC, 3, 'Should have three channels.');
    t.equal(Pixels.SizeT, 1, 'Should have one time index.');
    t.equal(Pixels.SizeX, 439, 'Should have SizeX of 429.');
    t.equal(Pixels.SizeY, 167, 'Should have SizeY of 167.');
    t.equal(Pixels.SizeZ, 1, 'Should have one z index.');
    t.equal(Pixels.Type, 'Uint8', 'Should be Uint8 pixel type.');
    t.equal(Pixels.Channels.length, 3, 'Should have 3 channels.');
    t.equal(
      Pixels.Channels[0].SamplesPerPixel,
      1,
      'Should have 1 sample per pixel.'
    );
    t.equal(
      Pixels.Channels[0].Name,
      'Channel 0',
      'Should have name Channel 0.'
    );
  } catch (e) {
    t.fail(e);
  }
});

test('Check for comlete stack.', async t => {
  t.plan(1);
  try {
    const imageName = 'tiff-folder';
    const tiffs = [
      {
        name: 'Channel 1',
        selection: { c: 1, t: 0, z: 0 },
        tiff: await (await fromFile(CHANNEL_1_FIXTURE)).getImage(0)
      }
    ];
    try {
      await load(imageName, tiffs);
    } catch (e) {
      t.ok(e instanceof Error, 'stack should be incomplete.');
    }
  } catch (e) {
    t.fail(e);
  }
});
