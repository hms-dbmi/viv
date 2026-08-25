import { getImageSize, isInterleaved } from '@vivjs/loaders';

import BitmapLayer from '../bitmap-layer';
import XRLayer from '../xr-layer/xr-layer';

export function range(len) {
  return [...Array(len).keys()];
}

/**
 * Deck.gl TileLayer zooms for each pyramid level, derived from width ratios.
 * Dyadic (2x) pyramids yield [0, -1, -2, ...]; 4x pyramids yield [0, -2, -4, ...].
 */
export function getPyramidZoomLevels(loader) {
  if (!Array.isArray(loader) || loader.length === 0) {
    return [0];
  }
  const { width: baseWidth } = getImageSize(loader[0]);
  return loader.map(level => {
    const { width } = getImageSize(level);
    // Avoid -0 from -Math.round(log2(1)).
    return 0 - Math.round(Math.log2(baseWidth / width));
  });
}

/**
 * Finest available level zoom that is not finer than `z` (deck.gl tile z).
 */
export function snapToAvailableZoom(z, levelZooms) {
  const target = Math.round(z);
  for (const lz of levelZooms) {
    if (lz <= target) {
      return lz;
    }
  }
  return levelZooms[levelZooms.length - 1];
}

/** Linear scale from base resolution to `loader[levelIndex]`. */
export function getLevelScale(loader, levelIndex) {
  const { width: baseWidth } = getImageSize(loader[0]);
  const { width } = getImageSize(loader[levelIndex]);
  return baseWidth / width;
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
  //
  // Non-dyadic pyramids (e.g. Bio-Formats 4x SubIFDs): MultiscaleImageLayer snaps deck.gl's
  // intermediate zooms to a native level and remaps x/y. Bounds must use that native zoom
  // so overlapping requests for the same native tile share one placement.
  let scale = 2 ** Math.round(-z);
  let boundLeft = left;
  let boundTop = top;
  if (Array.isArray(loader) && loader.length > 1 && base.labels) {
    const levelZooms = getPyramidZoomLevels(loader);
    const zNat = snapToAvailableZoom(z, levelZooms);
    scale = 2 ** Math.round(-zNat);
    const factor = 2 ** (Math.round(z) - zNat);
    if (factor !== 1) {
      const xNat = Math.floor(x / factor);
      const yNat = Math.floor(y / factor);
      const { tileSize } = base;
      boundLeft = xNat * tileSize * scale;
      boundTop = yNat * tileSize * scale;
    }
  }
  const bounds = [
    boundLeft,
    boundTop + data.height * scale,
    boundLeft + data.width * scale,
    boundTop
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
