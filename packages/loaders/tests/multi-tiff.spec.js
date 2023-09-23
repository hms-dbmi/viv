import { describe, test, expect } from 'vitest';
import { fromFile } from 'geotiff';
import { load } from '../src/tiff/multi-tiff';
import { loadMultiTiff } from '../src/tiff';

import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const fixtures = path.resolve(__dirname, './fixtures/multi-tiff');
const CHANNEL_0_FIXTURE = path.resolve(fixtures, 'Channel_0.tif');
const CHANNEL_1_FIXTURE = path.resolve(fixtures, 'Channel_1.tif');
const CHANNEL_2_FIXTURE = path.resolve(fixtures, 'Channel_2.tif');

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

describe('MultiTIFF', () => {
  function expectPixelSource(data) {
    expect(data.length).toBe(1);
    expect(data[0].labels).toStrictEqual(['t', 'c', 'z', 'y', 'x']);
    expect(data[0].shape).toStrictEqual([1, 3, 1, 167, 439]);
    expect(data[0].meta).toStrictEqual({ photometricInterpretation: 1 });
  }

  test('Creates TiffPixelSource', async () => {
    const { imageName, tiffs, channelNames } = await loadImage();
    const { data } = await load(imageName, tiffs, channelNames);
    expect(data).toMatchInlineSnapshot(`
      [
        TiffPixelSource {
          "_indexer": [Function],
          "dtype": "Uint8",
          "labels": [
            "t",
            "c",
            "z",
            "y",
            "x",
          ],
          "meta": {
            "photometricInterpretation": 1,
          },
          "pool": undefined,
          "shape": [
            1,
            3,
            1,
            167,
            439,
          ],
          "tileSize": 128,
        },
      ]
    `);
    expectPixelSource(data);
  });

  test('Loads from local files', async () => {
    const { data } = await loadMultiTiff([
      [{ c: 0, t: 0, z: 0 }, url.pathToFileURL(CHANNEL_0_FIXTURE).href],
      [{ c: 1, t: 0, z: 0 }, url.pathToFileURL(CHANNEL_1_FIXTURE).href],
      [{ c: 2, t: 0, z: 0 }, url.pathToFileURL(CHANNEL_2_FIXTURE).href]
    ]);
    expect(data).toMatchInlineSnapshot(`
      [
        TiffPixelSource {
          "_indexer": [Function],
          "dtype": "Uint8",
          "labels": [
            "t",
            "c",
            "z",
            "y",
            "x",
          ],
          "meta": {
            "photometricInterpretation": 1,
          },
          "pool": undefined,
          "shape": [
            1,
            3,
            1,
            167,
            439,
          ],
          "tileSize": 128,
        },
      ]
    `);
    expectPixelSource(data);
  });

  describe('Gets raster data', async () => {
    const { imageName, tiffs, channelNames } = await loadImage();
    const {
      data: [base]
    } = await load(imageName, tiffs, channelNames);

    test.each([0, 1, 2])(`Get raster data for channel %i.`, async c => {
      const selection = { c, z: 0, t: 0 };
      const pixelData = await base.getRaster({ selection });
      expect(pixelData.width).toBe(439);
      expect(pixelData.height).toBe(167);
      expect(pixelData.data.length).toBe(439 * 167);
      expect(pixelData.data).toBeInstanceOf(Uint8Array);
    });

    test('Gets raster data for channel 3 (out of bounds).', async () => {
      await expect(() =>
        base.getRaster({ selection: { c: 3, z: 0, t: 0 } })
      ).rejects.toThrowError();
    });
  });

  test('Correct metadata.', async () => {
    const { imageName, tiffs, channelNames } = await loadImage();
    const { metadata } = await load(imageName, tiffs, channelNames);
    expect(metadata).toMatchInlineSnapshot(`
      {
        "AcquisitionDate": "",
        "Description": "",
        "ID": "Image:0",
        "Name": "tiff-folder",
        "Pixels": {
          "BigEndian": true,
          "Channels": [
            {
              "ID": "Channel:0:0",
              "Name": "Channel 0",
              "SamplesPerPixel": 1,
            },
            {
              "ID": "Channel:0:1",
              "Name": "Channel 1",
              "SamplesPerPixel": 1,
            },
            {
              "ID": "Channel:0:2",
              "Name": "Channel 2",
              "SamplesPerPixel": 1,
            },
          ],
          "DimensionOrder": "XYZCT",
          "ID": "Pixels:0",
          "SizeC": 3,
          "SizeT": 1,
          "SizeX": 439,
          "SizeY": 167,
          "SizeZ": 1,
          "Type": "Uint8",
        },
        "format": [Function],
      }
    `);
    expect(metadata.format()).toMatchInlineSnapshot(`
      {
        "Acquisition Date": "",
        "Channels": 3,
        "Dimensions (XY)": "439 x 167",
        "PixelsType": "Uint8",
        "Z-sections/Timepoints": "1 x 1",
      }
    `);
  });

  test('Checks for complete stack.', async () => {
    const { imageName, tiffs, channelNames } = await loadImage();
    await expect(async () => {
      await load(imageName, [tiffs[1]], [channelNames[1]]);
    }).rejects.toThrowError();
  });
});
