import { fromFile } from 'geotiff';
import { expect, test } from 'vitest';
import { loadMultiTiff } from '../src/tiff';
import { load } from '../src/tiff/multi-tiff';

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

function testPixelSource(expect, data) {
  expect(data.length).toBe(1);
  const [base] = data;
  expect(base.labels).toEqual(['t', 'c', 'z', 'y', 'x']);
  expect(base.shape).toEqual([1, 3, 1, 167, 439]);
  expect(base.meta.photometricInterpretation).toBe(1);
  expect(base.meta.physicalSizes).toBeUndefined();
}

test('Creates correct TiffPixelSource for MultiTIFF.', async () => {
  expect.assertions(5);
  const { imageName, tiffs, channelNames } = await loadImage();
  const { data } = await load(imageName, tiffs, channelNames);
  testPixelSource(expect, data);
});

test('Is able to load MultiTIFF from local file.', async () => {
  expect.assertions(5);
  const { data } = await loadMultiTiff([
    [{ c: 0, t: 0, z: 0 }, CHANNEL_0_LOCAL_FIXTURE],
    [{ c: 1, t: 0, z: 0 }, CHANNEL_1_LOCAL_FIXTURE],
    [{ c: 2, t: 0, z: 0 }, CHANNEL_2_LOCAL_FIXTURE]
  ]);
  testPixelSource(expect, data);
});

test('Get raster data for MultiTIFF.', async () => {
  const { imageName, tiffs, channelNames } = await loadImage();
  const { data } = await load(imageName, tiffs, channelNames);
  const [base] = data;
  for (let c = 0; c < 3; c += 1) {
    const selection = { c, z: 0, t: 0 };
    const pixelData = await base.getRaster({ selection });
    expect(pixelData.width).toBe(439);
    expect(pixelData.height).toBe(167);
    expect(pixelData.data.length).toBe(439 * 167);
    expect(pixelData.data.constructor.name).toBe('Uint8Array');
  }
  await expect(
    base.getRaster({ selection: { c: 3, z: 0, t: 0 } })
  ).rejects.toThrow();
});

test('Correct MultiTIFF metadata.', async () => {
  const { imageName, tiffs, channelNames } = await loadImage();
  const { metadata } = await load(imageName, tiffs, channelNames);
  const { Name, Pixels } = metadata;
  expect(Name).toBe('tiff-folder');
  expect(Pixels.SizeC).toBe(3);
  expect(Pixels.SizeT).toBe(1);
  expect(Pixels.SizeX).toBe(439);
  expect(Pixels.SizeY).toBe(167);
  expect(Pixels.SizeZ).toBe(1);
  expect(Pixels.Type).toBe('Uint8');
  expect(Pixels.Channels.length).toBe(3);
  expect(Pixels.Channels[0].SamplesPerPixel).toBe(1);
  expect(Pixels.Channels[0].Name).toBe('Channel 0');
});

test('Check for comlete stack.', async () => {
  const imageName = 'tiff-folder';
  const tiffs = [
    {
      name: 'Channel 1',
      selection: { c: 1, t: 0, z: 0 },
      tiff: await (await fromFile(CHANNEL_1_FIXTURE)).getImage(0)
    }
  ];
  await expect(load(imageName, tiffs)).rejects.toThrow();
});
