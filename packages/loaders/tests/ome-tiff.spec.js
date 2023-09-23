import { describe, test, expect } from 'vitest';
import { fromFile } from 'geotiff';
import { load } from '../src/tiff/ome-tiff';
import { loadOmeTiff } from '../src/tiff';

import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/multi-channel.ome.tif');

function loadOmeTiffFixture() {
  return loadOmeTiff(url.pathToFileURL(FIXTURE).href);
}

describe('OME-TIFF', () => {
  function expectPixelSource(data) {
    expect(data.length).toBe(1);
    expect(data[0].labels).toStrictEqual(['t', 'c', 'z', 'y', 'x']);
    expect(data[0].shape).toStrictEqual([1, 3, 1, 167, 439]);
    expect(data[0].meta).toStrictEqual({
      photometricInterpretation: 1,
      physicalSizes: undefined
    });
  }

  test('Creates TiffPixelSource', async () => {
    const tiff = await fromFile(FIXTURE);
    const [{ data }] = await load(tiff);
    expect(data).toMatchInlineSnapshot(`
      [
        TiffPixelSource {
          "_indexer": [Function],
          "dtype": "Int8",
          "labels": [
            "t",
            "c",
            "z",
            "y",
            "x",
          ],
          "meta": {
            "photometricInterpretation": 1,
            "physicalSizes": undefined,
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

  test('Loads from local file', async () => {
    const { data } = await loadOmeTiffFixture();
    expect(data).toMatchInlineSnapshot(`
      [
        TiffPixelSource {
          "_indexer": [Function],
          "dtype": "Int8",
          "labels": [
            "t",
            "c",
            "z",
            "y",
            "x",
          ],
          "meta": {
            "photometricInterpretation": 1,
            "physicalSizes": undefined,
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
    const {
      data: [base]
    } = await loadOmeTiffFixture();
    test.each([0, 1, 2])(`Get raster data for channel %i.`, async c => {
      const selection = { c, z: 0, t: 0 };
      const pixelData = await base.getRaster({ selection });
      expect(pixelData.width).toBe(439);
      expect(pixelData.height).toBe(167);
      expect(pixelData.data.length).toBe(439 * 167);
      expect(pixelData.data).toBeInstanceOf(Int8Array);
    });

    test('Gets raster data for channel 3 (out of bounds).', async () => {
      await expect(() =>
        base.getRaster({ selection: { c: 3, z: 0, t: 0 } })
      ).rejects.toThrowError();
    });
  });

  test('Correct OME-XML.', async () => {
    const { metadata } = await loadOmeTiffFixture();
    expect(metadata).toMatchInlineSnapshot(`
      {
        "AquisitionDate": "",
        "Description": "",
        "ID": "Image:0",
        "Name": "multi-channel.ome.tif",
        "Pixels": {
          "BigEndian": true,
          "Channels": [
            {
              "ID": "Channel:0:0",
              "SamplesPerPixel": 1,
            },
            {
              "ID": "Channel:0:1",
              "SamplesPerPixel": 1,
            },
            {
              "ID": "Channel:0:2",
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
          "Type": "int8",
        },
        "format": [Function],
      }
    `);
    expect(metadata.format()).toMatchInlineSnapshot(`
      {
        "Acquisition Date": "",
        "Channels": 3,
        "Dimensions (XY)": "439 x 167",
        "Pixels Size (XYZ)": "- x - x -",
        "Pixels Type": "int8",
        "Z-sections/Timepoints": "1 x 1",
      }
    `);
  });
});
