const MAX_SLIDER_VALUE = 65535;
const MAX_COLOR_INTENSITY = 255;

export const DEFAULT_SLIDER_OFF = [MAX_SLIDER_VALUE, MAX_SLIDER_VALUE];
export const DEFAULT_COLOR_OFF = [0, 0, 0];

export function range(len) {
  return [...Array(len).keys()];
}

export function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

export function setOrderedValues(
  orderedChannelNames,
  colors,
  sliders,
  channelsOn
) {
  const orderedSliderValues = [];
  const orderedColorValues = [];
  orderedChannelNames.forEach(channel => {
    const channelIsOn = channelsOn[channel];
    const colorValue = channelIsOn
      ? colors[channel].map(ch => ch / MAX_COLOR_INTENSITY) // normalise to (0,1)
      : DEFAULT_COLOR_OFF;
    const sliderValue = channelIsOn ? sliders[channel] : DEFAULT_SLIDER_OFF;

    orderedColorValues.push(colorValue);
    orderedSliderValues.push(sliderValue);
  });
  return { orderedSliderValues, orderedColorValues };
}
