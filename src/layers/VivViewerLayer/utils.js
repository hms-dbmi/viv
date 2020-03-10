import XRLayer from '../XRLayer';

export const MAX_COLOR_INTENSITY = 255;

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

export function renderSubLayers(props) {
  const {
    bbox: { left, top, right, bottom },
    x,
    y,
    z
  } = props.tile;
  const {
    colorValues,
    sliderValues,
    imageWidth,
    imageHeight,
    tileSize,
    minZoom,
    visible,
    opacity,
    data,
    colormap,
    dtype
  } = props;
  if (
    isInTileBounds({
      x,
      y,
      z: -z,
      imageWidth,
      imageHeight,
      tileSize,
      minZoom
    })
  ) {
    const xrl =
      // If image metadata is undefined, do not render this layer.
      props.imageWidth &&
      props.imageHeight &&
      new XRLayer({
        id: `XRLayer-left${left}-top${top}-right${right}-bottom${bottom}`,
        data: null,
        channelData: data,
        // See StaticImageLayer for why this is here.
        sliderValues: colormap ? sliderValues.slice(0, 2) : sliderValues,
        colorValues: colormap ? [] : colorValues,
        tileSize,
        bounds: [left, bottom, right, top],
        opacity,
        visible,
        dtype,
        colormap
      });
    return xrl;
  }
}
