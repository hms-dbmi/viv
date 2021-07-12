import { test } from 'tape';
import { fromFile } from 'geotiff';

import { createOffsetsProxy } from '../../src/loaders/tiff/lib/proxies';

test('Inspect tiff proxies.', async t => {
  t.plan(2);
  try {
    let tiff = await fromFile('tests/loaders/fixtures/multi-channel.ome.tif');
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
