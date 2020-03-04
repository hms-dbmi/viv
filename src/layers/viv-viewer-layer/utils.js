import { XRLayer } from '../xr-layer';

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

export function inTileBounds({
  x,
  y,
  z,
  imageWidth,
  imageHeight,
  tileSize,
  minZoom
}) {
  const xInBounds = x < Math.ceil(imageWidth / (tileSize * 2 ** z)) && x >= 0;
  const yInBounds = y < Math.ceil(imageHeight / (tileSize * 2 ** z)) && y >= 0;
  const zInBounds = z >= 0 && z < -minZoom;
  return xInBounds && yInBounds && zInBounds;
}

export function cutOffImageBounds({
  left,
  bottom,
  right,
  top,
  imageWidth,
  imageHeight
}) {
  return {
    left: Math.max(0, left),
    bottom: Math.max(0, Math.min(imageHeight, bottom)),
    right: Math.max(0, Math.min(imageWidth, right)),
    top: Math.max(0, top)
  };
}

export function renderSubLayers(props) {
  const {
    bbox: { left, top, right, bottom }
  } = props.tile;
  const {
    imageHeight,
    imageWidth,
    colorValues,
    sliderValues,
    tileSize,
    data,
    tile,
    useZarr
  } = props.imageWidth
    ? props
    : props[Object.getOwnPropertySymbols(props)[0]].props;
  // Tests do not pass without this - I do not know how the object changes.
  const cutOffBounds = cutOffImageBounds({
    left,
    bottom,
    right,
    top,
    imageHeight,
    imageWidth
  });
  const xrl =
    data &&
    new XRLayer({
      id: `XRLayer-left${left}-top${top}-right${right}-bottom${bottom}`,
      data: null,
      channelData: data,
      sliderValues,
      colorValues,
      tileSize,
      bounds: [
        cutOffBounds.left,
        cutOffBounds.bottom,
        cutOffBounds.right,
        cutOffBounds.top
      ],
      visible: true
    });
  return xrl;
}
