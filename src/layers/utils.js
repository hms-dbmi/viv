export const MAX_COLOR_INTENSITY = 255;

export const DEFAULT_COLOR_OFF = [0, 0, 0];

export const MAX_SLIDERS_AND_CHANNELS = 6;

const MAX_SLIDER_VALUE = 65535;

export function range(len) {
  return [...Array(len).keys()];
}

export function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

export function overrideChannelProps(props) {
  const { sliderValues, colorValues, channelIsOn, maxSliderValue } = props;
  const lengths = [sliderValues.length, colorValues.length];
  if (lengths.every(l => l !== lengths[0])) {
    throw Error('Inconsistent number of slider values and colors provided');
  }

  const colors = colorValues.map((color, i) =>
    channelIsOn[i] ? color.map(c => c / MAX_COLOR_INTENSITY) : DEFAULT_COLOR_OFF
  );

  const sliders = sliderValues.map((slider, i) =>
    channelIsOn[i] ? slider : [maxSliderValue, maxSliderValue]
  );

  // Need to pad sliders and colors with default values (required by shader)
  const padSize = MAX_SLIDERS_AND_CHANNELS - colors.length;
  if (padSize < 0) {
    throw Error(`${lengths} channels passed in, but only 6 are allowed.`);
  }

  const paddedColorValues = padWithDefault(colors, DEFAULT_COLOR_OFF, padSize);
  const paddedSliderValues = padWithDefault(
    sliders,
    [maxSliderValue || MAX_SLIDER_VALUE, maxSliderValue || MAX_SLIDER_VALUE],
    padSize
  );
  const overrideValuesProps = {
    ...props,
    sliderValues: paddedSliderValues.flat(), // flatten for use on shaders
    colorValues: paddedColorValues.flat()
  };
  return overrideValuesProps;
}
