import { test } from 'tape';
import { fromFile } from 'geotiff';
import { getDecoder } from 'geotiff/src/compression';

import {
  createPoolProxy,
  createOffsetsProxy
} from '../../src/loaders/tiff/lib/proxies';

/*
 * rollup-plugin-web-worker-loader relies on `atob` which isn't in Node.
 * This is a shim for "Pool" for testing the proxies.
 */
const pool = {
  async decode(fileDirectory, buffer) {
    const decoder = getDecoder(fileDirectory);
    const result = await decoder.decode(fileDirectory, buffer);
    return result;
  }
};

test('Inspect tiff proxies.', async t => {
  t.plan(6);
  try {
    let tiff = await fromFile('tests/loaders/fixtures/multi-channel.ome.tif');
    t.equal(
      tiff['__viv-decoder-pool'],
      undefined,
      'Regular tiff should not have any proxies.'
    );
    t.equal(
      tiff['__viv-offsets'],
      undefined,
      'Regular tiff should not have any proxies.'
    );

    tiff = createPoolProxy(tiff, pool);
    t.equal(tiff['__viv-decoder-pool'], true, 'Should have pool proxy.');
    t.equal(tiff['__viv-offsets'], undefined, 'Should not have offsets proxy.');

    tiff = createOffsetsProxy(tiff, []);
    t.equal(tiff['__viv-decoder-pool'], true, 'Should have pool proxy.');
    t.equal(tiff['__viv-offsets'], true, 'Should have both proxies.');
  } catch (e) {
    t.fail(e);
  }
});
