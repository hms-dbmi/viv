import { padWithDefault } from '../layers/utils.js'
import { DEFAULT_COLOR_OFF, MAX_CHANNELS, MAX_COLOR_INTENSITY } from '../constants';

export function padColors({
  colors,
  channelsVisible,
  dtype
}) {
  const newColors = colors.map((color, i) =>
    channelsVisible[i]
      ? color.map(c => c / MAX_COLOR_INTENSITY)
      : DEFAULT_COLOR_OFF
  );
  const padSize = MAX_CHANNELS - newColors.length;
  const paddedColors = padWithDefault(newColors, DEFAULT_COLOR_OFF, padSize).reduce((acc, val) => acc.concat(val), []);
  return paddedColors;
}
