import { expect, test } from 'vitest';
import { load } from '../src/zarr/bioformats-zarr';
import { FileSystemStore } from './common';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/bioformats-zarr');
const store = new FileSystemStore(`${FIXTURE}/data.zarr`);
const meta = fs.readFileSync(`${FIXTURE}/METADATA.ome.xml`, {
  encoding: 'utf-8'
});

test('Creates correct ZarrPixelSource.', async () => {
  const { data } = await load(store, meta);
  expect(data.length).toBe(2);
  const [base] = data;
  expect(base.labels).toEqual(['t', 'c', 'z', 'y', 'x']);
  expect(base.shape).toEqual([1, 3, 1, 167, 439]);
  expect(base.meta).toBeUndefined();
});

test.skip('Get raster data.', async () => {
  const { data } = await load(store, meta);
  const [base] = data;
  for (let c = 0; c < 3; c += 1) {
    const selection = { c, z: 0, t: 0 };
    const pixelData = await base.getRaster({ selection });
    expect(pixelData.width).toBe(439);
    expect(pixelData.height).toBe(167);
    expect(pixelData.data.length).toBe(439 * 167);
    expect(pixelData.data.constructor.name).toBe('Int8Array');
  }
  await expect(
    base.getRaster({ selection: { c: 3, z: 0, t: 0 } })
  ).rejects.toThrow();
});

test('Correct OME-XML.', async () => {
  const { metadata } = await load(store, meta);
  const { Name, Pixels } = metadata;
  expect(Name).toBe('multi-channel.ome.tif');
  expect(Pixels.SizeC).toBe(3);
  expect(Pixels.SizeT).toBe(1);
  expect(Pixels.SizeX).toBe(439);
  expect(Pixels.SizeY).toBe(167);
  expect(Pixels.SizeZ).toBe(1);
  expect(Pixels.Type).toBe('int8');
  expect(Pixels.Channels.length).toBe(3);
  expect(Pixels.Channels[0].SamplesPerPixel).toBe(1);
});
