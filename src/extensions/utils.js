import { padWithDefault } from '../layers/utils';
import {
  DEFAULT_COLOR_OFF,
  MAX_CHANNELS,
  MAX_COLOR_INTENSITY
} from '../constants';

// prettier-ignore
const COLOR_PALLETE = [
  [  0,   0, 255], // blue
  [  0, 255,   0], // green
  [255,   0, 255], // magenta
  [255, 255,   0], // yellow
  [255, 128,   0], // orange
  [  0, 255, 255], // cyan
  [255, 255, 255], // white
  [255,   0,   0], // red
];
export const getDefaultPalette = n => COLOR_PALLETE.filter((i, j) => j < n);
export function padColors({ colors, channelsVisible }) {
  const newColors = colors.map((color, i) =>
    channelsVisible[i]
      ? color.map(c => c / MAX_COLOR_INTENSITY)
      : DEFAULT_COLOR_OFF
  );
  const padSize = MAX_CHANNELS - newColors.length;
  const paddedColors = padWithDefault(
    newColors,
    DEFAULT_COLOR_OFF,
    padSize
  ).reduce((acc, val) => acc.concat(val), []);
  return paddedColors;
}
