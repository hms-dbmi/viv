import XRLayer from '../XRLayer';
import ArrayBitmapLayer from '../ArrayBitmapLayer';

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
    lensSelection,
    onClick,
    loader
  } = props;
  // Only render in positive coorinate system
  if ([left, bottom, right, top].some(v => v < 0) || !data) {
    return null;
  }
  const Layer =
    loader.isRgb && loader.isInterleaved ? ArrayBitmapLayer : XRLayer;
  const { height, width } = loader.getRasterSize({ z: 0 });
  // Tiles are exactly fitted to have height and width such that their bounds match that of the actual image (not some padded version).
  // Thus the right/bottom given by deck.gl are incorrect since they assume tiles are of uniform sizes, which is not the case for us.
  const bounds = [
    left,
    data.height < loader.tileSize ? height : bottom,
    data.width < loader.tileSize ? width : right,
    top
  ];
  const layer = new Layer(props, {
    id: `tile-sub-layer-${bounds}-${id}`,
    bounds,
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
    tileId: { x, y, z },
    onClick
  });
  return layer;
}
