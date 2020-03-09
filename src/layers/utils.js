export const MAX_COLOR_INTENSITY = 255;

export const DEFAULT_COLOR_OFF = [0, 0, 0];

export const MAX_SLIDERS_AND_CHANNELS = 6;

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

  const isInt8 = dtype === '<u1';
  const isInt16 = dtype === '<u2';
  const isInt32 = dtype === '<u4';
  const isFloat32 = dtype === '<f4';
  const maxSliderValue =
    (domain && domain[1]) ||
    (isInt8 && 2 ** 8 - 1) ||
    (isInt16 && 2 ** 16 - 1) ||
    (isInt32 && 2 ** 32 - 1) ||
    (isFloat32 && 2 ** 31 - 1);
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
