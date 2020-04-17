/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';

import { fromFile } from 'geotiff';

test('Test multi-channel input', async t => {
  const tiff = await fromFile('../fixtures/multi-channel.ome.tif');
  t.end();
});
