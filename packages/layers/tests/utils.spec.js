import test from 'tape-catch';
import { range } from '../src/multiscale-image-layer/utils';
import { padWithDefault, padContrastLimits } from '../src/utils';
import { createTestContext } from '@luma.gl/test-utils';
import GL from '@luma.gl/constants';
import { FEATURES } from '@luma.gl/webgl';

import { getRenderingAttrs } from '../src/xr-layer/utils';
import { DTYPE_VALUES } from '../../constants';
import { hasFeature } from '@luma.gl/webgl';

const dtypes = Object.keys(DTYPE_VALUES);
const interpolations = [GL.NEAREST, GL.LINEAR];

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

test('getRenderingAttrs WebGL1', t => {
  t.plan(dtypes.length * interpolations * 6);
  try {
    const gl = createTestContext({ webgl1: true, webgl2: false });
    interpolations.forEach(interpolation => {
      dtypes.forEach(dtype => {
        const attrs = getRenderingAttrs(dtype, gl, interpolation);
        t.deepEqual(
          attrs.cast(new Uint16Array([1, 2, 3])),
          new Float32Array([1, 2, 3]),
          `always cast ${dtype} to Float32`
        );
        t.equal(
          attrs.sampler,
          'sampler2D',
          `always return sampler2D as sampler`
        );
        t.equal(attrs.type, GL.FLOAT, `always return FLOAT as dtype`);
        t.equal(
          attrs.dataFormat,
          GL.LUMINANCE,
          `always return LUMINANCE as dataFormat`
        );
        t.equal(
          attrs.format,
          GL.LUMINANCE,
          `always return LUMINANCE as format`
        );
        t.equal(
          attrs.filter,
          hasFeature(gl, FEATURES.TEXTURE_FILTER_LINEAR_FLOAT)
            ? interpolation
            : GL.NEAREST,
          `use interpolation ${interpolation} if gl context supports LINEAR - otherwise return NEAREST`
        );
      });
    });
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

test('getRenderingAttrs WebGL2', t => {
  t.plan(dtypes.length * interpolations.length * 2);
  try {
    const gl = createTestContext({ webgl2: true, webgl1: false });
    interpolations.forEach(interpolation => {
      dtypes.forEach(dtype => {
        const attrs = getRenderingAttrs(dtype, gl, interpolation);
        if (interpolation == GL.LINEAR || dtype == 'Float64') {
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
