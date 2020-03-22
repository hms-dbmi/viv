import XRLayer from '../XRLayer';

export function range(len) {
  return [...Array(len).keys()];
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
    // eslint-disable-next-line react/destructuring-assignment
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
      imageWidth &&
      imageHeight &&
      new XRLayer({
        id: `XRLayer-left${left}-top${top}-right${right}-bottom${bottom}`,
        data: null,
        channelData: data,
        sliderValues,
        colorValues,
        tileSize,
        bounds: [left, bottom, right, top],
        opacity,
        visible,
        dtype,
        colormap
      });
    return xrl;
  }
  return null;
}
