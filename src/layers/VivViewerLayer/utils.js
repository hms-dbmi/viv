import XRLayer from '../XRLayer';

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

export function isInTileBounds({
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

/**
 * cutOffImageBounds cuts of the bounding box of an image at any resolution
 * to the full resolution cooridnates to prevent stretching/shrinking.
 * The return value is an object of the new bounds.
 */
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
    data
  } = props;
  const cutOffBounds = cutOffImageBounds({
    left,
    bottom,
    right,
    top,
    imageHeight,
    imageWidth
  });
  const xrl =
    // If image metadata is undefined, do not render this layer.
    props.imageWidth &&
    props.imageHeight &&
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
      ]
    });
  return xrl;
}
