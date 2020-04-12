import XRLayer from '../XRLayer';

export function range(len) {
  return [...Array(len).keys()];
}

export function renderSubLayers(props) {
  const {
    bbox: { left, top, right, bottom }
  } = props.tile;

  const {
    colorValues,
    sliderValues,
    tileSize,
    visible,
    opacity,
    data,
    colormap,
    dtype,
    id
  } = props;
  // Only render in positive coorinate system
  if ([left, top, right, bottom].some(v => v < 0)) {
    return null;
  }
  const xrl = new XRLayer({
    id: `XRLayer-${left}-${top}-${right}-${bottom}-${id}`,
    bounds: [left, bottom, right, top],
    width: tileSize,
    height: tileSize,
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
