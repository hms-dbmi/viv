import { openArray } from 'zarr';
// eslint-disable-next-line import/extensions
import { fromUrl, Pool } from 'geotiff/dist/geotiff.bundle.min.js';

import ZarrLoader from './zarrLoader';
import TiffPyramidLoader from './tiffPyramidLoader';
import OMETiffLoader from './OMETiffLoader';

import { range } from '../layers/VivViewerLayer/utils';

export async function createZarrPyramid({
  rootZarrUrl,
  minZoom,
  dimensions,
  isRgb = false,
  scale = 1
}) {
  // Not necessary but this is something we should be parsing from metadata
  const maxLevel = -minZoom;
  if (maxLevel > 0) {
    const zarrStores = range(maxLevel).map(i => {
      const config = {
        store: `${rootZarrUrl}/${String(i).padStart(2, '0')}`
      };
      return openArray(config);
    });
    const connections = await Promise.all(zarrStores);
    return new ZarrLoader(connections, isRgb, scale, dimensions);
  }
  const connection = await openArray({
    store: rootZarrUrl
  });
  const loader = new ZarrLoader(connection, isRgb, scale, dimensions);
  return loader;
}

export async function createTiffPyramid({ channelUrls }) {
  // Open and resolve all connections asynchronously
  const tiffConnections = channelUrls.map(async url => {
    const tiff = await fromUrl(url);
    // Get the first image and check its size.
    const pyramid = await tiff.parseFileDirectories();
    const maxLevel = pyramid.length;
    const pyramidLevels = range(maxLevel).map(i => tiff.getImage(i));
    const resolvedConnections = await Promise.all(pyramidLevels);
    return resolvedConnections;
  });
  const pool = new Pool();
  const resolvedTiffConnections = await Promise.all(tiffConnections);
  return new TiffPyramidLoader(resolvedTiffConnections, pool);
}

export async function createOMETiffLoader({ url }) {
  const tiff = await fromUrl(url);
  tiff.fileDirectories = await tiff.parseFileDirectories();
  const pool = new Pool();
  return new OMETiffLoader(tiff, pool);
}

export { ZarrLoader, TiffPyramidLoader, OMETiffLoader };
