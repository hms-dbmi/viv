import test from 'tape-catch';
import { range } from '../src/multiscale-image-layer/utils';
import { padWithDefault, padContrastLimits } from '../src/utils';

test('range test', t => {
  const expected = [0, 1, 2];
  t.deepEqual(range(3), expected, 'Create list for range(3)');
  t.deepEqual(range(0), [], 'Empty list for range(0)');
  t.end();
});

test('padWithDefault test', t => {
  const expected = [3, 4, 5, 2, 2];
  t.deepEqual(
    padWithDefault([3, 4, 5], 2, 2),
    expected,
    "Pad with two's to five places."
  );
  t.end();
});

test('padContrastLimits test', t => {
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
  t.end();
});
