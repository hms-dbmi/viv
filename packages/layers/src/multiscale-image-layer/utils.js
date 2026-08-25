import { isInterleaved } from '@vivjs/loaders';

import BitmapLayer from '../bitmap-layer';
import XRLayer from '../xr-layer/xr-layer';

export function range(len) {
  return [...Array(len).keys()];
}

export function renderSubLayers(props) {
  const {
    bbox: { left, top },
    index: { x, y, z }
  } = props.tile;
  const { data, id, loader, maxZoom } = props;
  // Only render in positive coorinate system
  if ([left, top].some(v => v < 0) || !data) {
    return null;
  }
  if (data.width === 0 || data.height === 0) {
    return null;
  }
  const base = loader[0];
  // Tiles are exactly fitted to have height and width such that their bounds match that of the actual image (not some padded version).
  // Thus the right/bottom given by deck.gl are incorrect since they assume tiles are of uniform sizes, which is not the case for us.
  // Scaling the tile's own data size up to the base resolution gives the right extent: for a
  // full tile it is deck.gl's bbox, and for a partial one it covers exactly the pixels that
  // level has. Snapping partial tiles to the full image extent instead only holds when every
  // level is an exact halving of its parent; on a floor-halved pyramid (e.g. one built by
  // multiscale-spatial-image / spatialdata, where level k spans size_k * 2**k, up to 2**k - 1
  // px short of the base) it over-scales them by a level-dependent amount, so the image
  // shifts as tiles of different levels are drawn. See #975.
  const scale = 2 ** Math.round(-z);
  const bounds = [
    left,
    top + data.height * scale,
    left + data.width * scale,
    top
  ];
  if (isInterleaved(base.shape)) {
    const { photometricInterpretation = 2 } = base.meta;
    return new BitmapLayer(props, {
      image: data,
      photometricInterpretation,
      // Shared props with XRLayer:
      bounds,
      id: `tile-sub-layer-${bounds}-${id}`,
      tileId: { x, y, z },
      extensions: []
    });
  }
  return new XRLayer(props, {
    channelData: data,
    // Uncomment to help debugging - shades the tile being hovered over.
    // autoHighlight: true,
    // highlightColor: [80, 80, 80, 50],
    // Shared props with BitmapLayer:
    bounds,
    id: `tile-sub-layer-${bounds}-${id}`,
    tileId: { x, y, z },
    // The auto setting is NEAREST at the highest resolution but LINEAR otherwise.
    interpolation: z === maxZoom ? 'nearest' : 'linear'
  });
}
