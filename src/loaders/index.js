import { openArray } from 'zarr';
// eslint-disable-next-line import/extensions
import { fromUrl, Pool } from 'geotiff';
import ZarrLoader from './zarrLoader';
import TiffPyramidLoader from './tiffPyramidLoader';
import OMETiffLoader from './OMETiffLoader';

import { range } from '../layers/VivViewerLayer/utils';

export async function createZarrLoader({
  url,
  dimensions,
  isPyramid,
  isRgb,
  scale,
  translate
}) {
  let data;
  if (isPyramid) {
    const metadataUrl = `${url}${url.slice(-1) === '/' ? '' : '/'}.zmetadata`;
    const response = await fetch(metadataUrl);
    const { metadata } = await response.json();
    const paths = Object.keys(metadata)
      .filter(metaKey => metaKey.includes('.zarray'))
      .map(arrMetaKeys => arrMetaKeys.slice(0, -7));
    data = Promise.all(paths.map(path => openArray({ store: url, path })));
  } else {
    data = openArray({ store: url });
  }
  return new ZarrLoader({
    data: await data,
    dimensions,
    scale,
    translate,
    isRgb
  });
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
  tiff.firstIFDOffset = 16
  const firstImage = await tiff.getImage(0);
  const pool = new Pool();
  return new OMETiffLoader(tiff, pool, firstImage);
}

export { ZarrLoader, TiffPyramidLoader, OMETiffLoader };
