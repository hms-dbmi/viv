import XRLayer from '../XRLayer';

export function range(len) {
  return [...Array(len).keys()];
}

export function renderSubLayers(props) {
  const {
    bbox: { left, top, right, bottom },
    y,
    z
  } = props.tile;
  const {
    colorValues,
    sliderValues,
    visible,
    opacity,
    data,
    colormap,
    dtype,
    height,
    tileSize,
    id,
    isBioFormats6Pyramid
  } = props;
  // Only render in positive coorinate system
  if ([left, top, right, bottom].some(v => v < 0)) {
    return null;
  }
  const xrl = new XRLayer({
    id: `XRLayer-${left}-${top}-${right}-${bottom}-${id}`,
    bounds: [
      left,
      // This is a hack for now since bioformats mis-reports their data lower bound data.
      isBioFormats6Pyramid
        ? Math.min(height, (y + 1) * tileSize * 2 ** (-1 * z))
        : bottom,
      right,
      top
    ],
    channelData: data,
    sliderValues,
    colorValues,
    opacity,
    visible,
    dtype,
    colormap
  });
  return xrl;
}
