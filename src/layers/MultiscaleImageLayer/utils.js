import XRLayer from '../XRLayer';

export function range(len) {
  return [...Array(len).keys()];
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
    channelIsOn,
    visible,
    opacity,
    data,
    colormap,
    dtype,
    id,
    onHover,
    pickable,
    unprojectLensBounds,
    isLensOn,
    lensSelection
  } = props;
  // Only render in positive coorinate system
  if ([left, bottom, right, top].some(v => v < 0)) {
    return null;
  }
  const xrl = new XRLayer({
    id: `XRLayer-${left}-${bottom}-${right}-${top}-${id}`,
    bounds: [left, bottom, right, top],
    channelData: data,
    pickable,
    // Uncomment to help debugging - shades the tile being hovered over.
    // autoHighlight: true,
    // highlightColor: [80, 80, 80, 50],
    data: null,
    sliderValues,
    colorValues,
    channelIsOn,
    opacity,
    visible,
    dtype,
    colormap,
    onHover,
    unprojectLensBounds,
    isLensOn,
    lensSelection,
    tileId: { x, y, z }
  });
  return xrl;
}
