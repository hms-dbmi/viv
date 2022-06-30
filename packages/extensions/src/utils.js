import {
  DEFAULT_COLOR_OFF,
  MAX_CHANNELS,
  MAX_COLOR_INTENSITY
} from '@vivjs/constants';

/** @typedef {import('@vivjs/types').Color} Color */

/**
 * @template T
 * @param {T[]} arr
 * @param {T} defaultValue
 * @param {number} padWidth
 *
 * @TODO copied from `@vivjs/layers` to avoid circular deps
 */
export function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

/** @type {Color[]} */
// prettier-ignore
const COLOR_PALETTE = [
  [  0,   0, 255], // blue
  [  0, 255,   0], // green
  [255,   0, 255], // magenta
  [255, 255,   0], // yellow
  [255, 128,   0], // orange
  [  0, 255, 255], // cyan
  [255, 255, 255], // white
  [255,   0,   0], // red
];

/** @param {number} n */
export function getDefaultPalette(n) {
  if (n > COLOR_PALETTE.length) {
    throw new Error('Too many colors');
  }
  return COLOR_PALETTE.slice(0, n);
}

/** @param {{ colors: Color[], channelsVisible: boolean[] }} */
export function padColors({ colors, channelsVisible }) {
  /** @type {Color[]} */
  const newColors = colors.map((color, i) =>
    channelsVisible[i]
      ? color.map(c => c / MAX_COLOR_INTENSITY)
      : DEFAULT_COLOR_OFF
  );
  const padSize = MAX_CHANNELS - newColors.length;
  const paddedColors = padWithDefault(
    newColors,
    /** @type {Color} */ (DEFAULT_COLOR_OFF),
    padSize
  ).reduce((acc, val) => acc.concat(val), []);
  return paddedColors;
}
