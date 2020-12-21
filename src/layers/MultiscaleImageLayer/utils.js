import XRLayer from '../XRLayer';
import BitmapLayer from '../BitmapLayer';

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
    loader,
    modelMatrix
  } = props;
  // Only render in positive coorinate system
  if ([left, bottom, right, top].some(v => v < 0) || !data) {
    return null;
  }
  const { height, width } = loader.getRasterSize({ z: 0 });
  // Tiles are exactly fitted to have height and width such that their bounds match that of the actual image (not some padded version).
  // Thus the right/bottom given by deck.gl are incorrect since they assume tiles are of uniform sizes, which is not the case for us.
  const bounds = [
    left,
    data.height < loader.tileSize ? height : bottom,
    data.width < loader.tileSize ? width : right,
    top
  ];
  const { isRgb, isInterleaved, photometricInterpretation } = loader;
  if (isRgb && isInterleaved) {
    return new BitmapLayer(props, {
      image: data,
      photometricInterpretation,
      // Shared props with XRLayer:
      bounds,
      id: `tile-sub-layer-${bounds}-${id}`,
      tileId: { x, y, z },
      onHover,
      pickable,
      onClick,
      modelMatrix,
      opacity,
      visible
    });
  }
  return new XRLayer(props, {
    channelData: data,
    // Uncomment to help debugging - shades the tile being hovered over.
    // autoHighlight: true,
    // highlightColor: [80, 80, 80, 50],
    data: null,
    sliderValues,
    colorValues,
    channelIsOn,
    dtype,
    colormap,
    unprojectLensBounds,
    isLensOn,
    lensSelection,
    // Shared props with BitmapLayer:
    bounds,
    id: `tile-sub-layer-${bounds}-${id}`,
    tileId: { x, y, z },
    onHover,
    pickable,
    onClick,
    modelMatrix,
    opacity,
    visible
  });
}
