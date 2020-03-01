import { openArray } from 'zarr';
// eslint-disable-next-line import/extensions
import { fromUrl } from 'geotiff/dist/geotiff.bundle.min.js';

import ZarrLoader from './zarrLoader';
import TiffPyramidLoader from './tiffPyramidLoader';
import { range } from '../layers/microscopy-viewer-layer/utils';

async function createZarrPyramid({
  rootZarrUrl,
  minZoom,
  isRgb,
  scale,
  dimNames
}) {
  // Known issue with how zarr.js does string concatenation for urls
  // The prefix gets chunked off for some reason and must be repeating in the config.
  // https://github.com/gzuidhof/zarr.js/issues/36
  const prefix = rootZarrUrl.split('/').slice(-1)[0];

  // Not necessary but this is something we should be parsing from metadata
  const maxLevel = -minZoom;

  const zarrStores = range(maxLevel).map(i => {
    const config = {
      store: rootZarrUrl,
      path: `${prefix}/${String(i).padStart(2, '0')}`,
      mode: 'r'
    };
    return openArray(config);
  });
  const connections = await Promise.all(zarrStores);
  return new ZarrLoader(connections, isRgb, scale, dimNames);
}

async function createTiffPyramid({ channelNames, channelUrls, pool }) {
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
  const resolvedTiffConnections = await Promise.all(tiffConnections);
  return new TiffPyramidLoader(resolvedTiffConnections, channelNames, pool);
}

// eslint-disable-next-line consistent-return
export async function initPyramidLoader(
  type,
  { sourceChannels, minZoom, isRgb, scale, dimNames, pool }
) {
  let loader;
  if (type === 'zarr') {
    const rootZarrUrl = Object.values(sourceChannels)[0];
    loader = await createZarrPyramid({
      rootZarrUrl,
      minZoom,
      isRgb,
      scale,
      dimNames
    });
  } else if (type === 'tiff') {
    const channelNames = Object.keys(sourceChannels);
    const channelUrls = Object.values(sourceChannels);
    loader = await createTiffPyramid({ channelNames, channelUrls, pool });
  }
  return loader;
}
