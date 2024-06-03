import { fromFile } from 'geotiff';
import { test } from 'tape';

import { createOffsetsProxy } from '../src/tiff/lib/proxies';

import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/multi-channel.ome.tif');

test('Inspect tiff proxies.', async t => {
  t.plan(2);
  try {
    let tiff = await fromFile(FIXTURE);
    t.equal(
      tiff['__viv-offsets'],
      undefined,
      'Regular tiff should not have any proxies.'
    );
    tiff = createOffsetsProxy(tiff, []);
    t.equal(tiff['__viv-offsets'], true, 'Should have both proxies.');
  } catch (e) {
    t.fail(e);
  }
});
