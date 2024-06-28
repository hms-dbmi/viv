import { createTestContext } from '@luma.gl/test-utils';
import test from 'tape-catch';
import { range } from '../src/multiscale-image-layer/utils';
import {
  padContrastLimits,
  padWithDefault,
  sizeToMeters,
  snapValue
} from '../src/utils';

import { DTYPE_VALUES } from '../../constants';
import { getRenderingAttrs } from '../src/xr-layer/utils';

const dtypes = Object.keys(DTYPE_VALUES);
const interpolations = ['nearest', 'linear'];

test('range test', t => {
  t.plan(2);
  try {
    const expected = [0, 1, 2];
    t.deepEqual(range(3), expected, 'Create list for range(3)');
    t.deepEqual(range(0), [], 'Empty list for range(0)');
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

test('padWithDefault test', t => {
  t.plan(1);
  try {
    const expected = [3, 4, 5, 2, 2];
    t.deepEqual(
      padWithDefault([3, 4, 5], 2, 2),
      expected,
      "Pad with two's to five places."
    );
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

test('padContrastLimits test', t => {
  t.plan(2);
  try {
    const expectedChannelOff = [
      0, 5, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
    ];

    const expected16Bit = [
      0,
      5,
      0,
      5,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1,
      2 ** 16 - 1
    ];
    t.deepEqual(
      padContrastLimits({
        contrastLimits: [
          [0, 5],
          [0, 5]
        ],
        channelsVisible: [true, false],
        dtype: 'Uint8'
      }),
      expectedChannelOff,
      'Pads with one channel turned off'
    );
    t.deepEqual(
      padContrastLimits({
        contrastLimits: [
          [0, 5],
          [0, 5]
        ],
        channelsVisible: [true, true],
        dtype: 'Uint16'
      }),
      expected16Bit,
      'Pads with high bit depth'
    );
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

test('getRenderingAttrs WebGL2', t => {
  t.plan(dtypes.length * interpolations.length * 2);
  try {
    const device = createTestContext({ webgl2: true, webgl1: false }); //not really used ATM
    interpolations.forEach(interpolation => {
      dtypes.forEach(dtype => {
        const attrs = getRenderingAttrs(dtype, device, interpolation);
        if (interpolation === 'linear' || dtype === 'Float64') {
          t.deepEqual(
            attrs.cast(new Uint16Array([1, 2, 3])),
            new Float32Array([1, 2, 3]),
            'always cast to Float32 for LINEAR or Float64'
          );
        } else {
          t.deepEqual(
            attrs.cast(new Uint16Array([1, 2, 3])),
            new Uint16Array([1, 2, 3]),
            `identity cast function for ${dtype} or non-LINEAR interpolation`
          );
        }
        t.equal(
          attrs.filter,
          interpolation,
          `always use interpolation ${interpolation}`
        );
      });
    });
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

test('sizeToMeters test', t => {
  t.plan(5);
  t.equal(
    sizeToMeters(5, 'km'),
    5000,
    'Size in meters when unit is kilometers'
  );
  t.equal(
    sizeToMeters(10, 'm'),
    10,
    'Size in meters when unit is already meters'
  );
  t.equal(
    sizeToMeters(10, 'cm'),
    0.1,
    'Size in meters when unit is centimeters'
  );
  // These have floating point errors, so we check that
  // they are within 1e-10 of the expected value.
  t.ok(
    sizeToMeters(10, 'µm') - 1e-5 < 1e-10,
    'Size in meters when micrometers with Greek letter'
  );
  t.ok(
    sizeToMeters(10, 'um') - 1e-5 < 1e-10,
    'Size in meters when micrometers with regular u character'
  );
  t.end();
});

test('snapValue test', t => {
  t.plan(4);
  t.deepEqual(
    snapValue(1.234),
    [2, 2, ''],
    'Snapping value inside extent of targets'
  );
  t.deepEqual(
    snapValue(0.0234),
    [0.025, 25, 'm'],
    'Snapping value below minimum target'
  );
  t.deepEqual(
    snapValue(2345.0),
    [3000, 3, 'k'],
    'Snapping value above maximum target'
  );
  t.deepEqual(
    snapValue(999.0),
    [1000, 1, 'k'],
    'Snapping value between 500 and 1000'
  );
  t.end();
});
