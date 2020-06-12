import {
  MAX_COLOR_INTENSITY,
  DEFAULT_COLOR_OFF,
  MAX_SLIDERS_AND_CHANNELS,
  DTYPE_VALUES
} from '../constants';

export function range(len) {
  return [...Array(len).keys()];
}

export function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

export function padColorsAndSliders({
  sliderValues,
  colorValues,
  channelIsOn,
  domain,
  dtype
}) {
  const lengths = [sliderValues.length, colorValues.length];
  if (lengths.every(l => l !== lengths[0])) {
    throw Error('Inconsistent number of slider values and colors provided');
  }

  const colors = colorValues.map((color, i) =>
    channelIsOn[i] ? color.map(c => c / MAX_COLOR_INTENSITY) : DEFAULT_COLOR_OFF
  );
  const maxSliderValue = (domain && domain[1]) || DTYPE_VALUES[dtype].max;
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
    [maxSliderValue, maxSliderValue],
    padSize
  );
  const paddedColorsAndSliders = {
    paddedSliderValues: paddedSliderValues.reduce(
      (acc, val) => acc.concat(val),
      []
    ), // flatten for use on shaders
    paddedColorValues: paddedColorValues.reduce(
      (acc, val) => acc.concat(val),
      []
    )
  };

  return paddedColorsAndSliders;
}

export function to32BitFloat(data) {
  const data32bit = data.map(arr => {
    return new Float32Array(arr);
  });
  return data32bit;
}
