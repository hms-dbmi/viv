import { describe, test, expect } from 'vitest';
import { FileSystemStore } from './common';
import { load } from '../src/zarr/bioformats-zarr';

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/bioformats-zarr');
const store = new FileSystemStore(`${FIXTURE}/data.zarr`);
const meta = fs.readFileSync(`${FIXTURE}/METADATA.ome.xml`, {
  encoding: 'utf-8'
});

test('Creates correct ZarrPixelSource.', async () => {
  const { data } = await load(store, meta);
  expect(data.length).toBe(2);
  expect(data[0].labels).toStrictEqual(['t', 'c', 'z', 'y', 'x']);
  expect(data[0].shape).toStrictEqual([1, 3, 1, 167, 439]);
  expect(data[0].meta).toBeUndefined();
});

describe('Get raster data.', async () => {
  const { data } = await load(store, meta);
  const [base] = data;

  test.each([0, 1, 2])(`Get raster data for channel %i.`, async c => {
    const selection = { c, z: 0, t: 0 };
    const pixelData = await base.getRaster({ selection });
    expect(pixelData.width).toBe(439);
    expect(pixelData.height).toBe(167);
    expect(pixelData.data.length).toBe(439 * 167);
    expect(pixelData.data).toBeInstanceOf(Int8Array);
  });

  test(`Get raster data for channel 3 (out of bounds).`, async () => {
    await expect(
      async () => await base.getRaster({ selection: { c: 3, z: 0, t: 0 } })
    ).rejects.toThrowError();
  });
});

test('Correct OME-XML.', async () => {
  const { metadata } = await load(store, meta);
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
        "Interleaved": false,
        "SignificantBits": 8,
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
});
