import XRLayer from '../XRLayer';

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
    bbox: { left, top, right, bottom }
  } = props.tile;
  const { colorValues, sliderValues, tileSize, data } = props;
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
      bounds: [left, bottom, right, top]
    });
  return xrl;
}
