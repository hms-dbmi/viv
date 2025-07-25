import { fromFile } from 'geotiff';
import { expect, test } from 'vitest';

import { createOffsetsProxy } from '../src/tiff/lib/proxies';

import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/multi-channel.ome.tif');

test('Inspect tiff proxies.', async () => {
  let tiff = await fromFile(FIXTURE);
  expect(tiff['__viv-offsets']).toBeUndefined();
  tiff = createOffsetsProxy(tiff, []);
  expect(tiff['__viv-offsets']).toBe(true);
});
