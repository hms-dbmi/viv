import XRLayer from '../XRLayer';
import { isBioformatsNoPadHeightVersion } from '../../loaders/utils';

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
    loader,
    onHover,
    pickable
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
      loader && isBioformatsNoPadHeightVersion(loader.software)
        ? Math.min(height, (y + 1) * tileSize * 2 ** (-1 * z))
        : bottom,
      right,
      top
    ],
    channelData: data,
    pickable,
    // Uncomment to help debugging - shades the tile being hovered over.
    // autoHighlight: true,
    // highlightColor: [80, 80, 80, 50],
    data: null,
    sliderValues,
    colorValues,
    opacity,
    visible,
    dtype,
    colormap,
    onHover
  });
  return xrl;
}
