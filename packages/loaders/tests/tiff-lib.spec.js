import { describe, test, expect } from 'vitest';
import { fromFile } from 'geotiff';

import { createOffsetsProxy } from '../src/tiff/lib/proxies';

import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/multi-channel.ome.tif');

describe('Offset proxy', async () => {
  let tag = '__viv-offsets';

  test('no proxy tag', async () => {
    let tiff = await fromFile(FIXTURE);
    expect(tiff[tag]).toBeUndefined();
  });

  test('adds tag to object', async () => {
    let tiff = await fromFile(FIXTURE);
    tiff = createOffsetsProxy(tiff, []);
    expect(tiff[tag]).toBe(true);
  });
});
