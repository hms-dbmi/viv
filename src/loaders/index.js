import { openArray } from 'zarr';
// eslint-disable-next-line import/extensions
import { fromUrl, Pool, fromFile } from 'geotiff';
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
    const maxLevel = await tiff.getImageCount();
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
  const firstImage = await tiff.getImage(0);
  const res = await fetch(url.replace(/ome.tif(f?)/gi, 'json'));
  const offsets = await res.json();
  console.log(url.replace(/ome.tif(f?)/gi, 'json'));
  const pool = new Pool();
  const omexmlString = firstImage.fileDirectory.ImageDescription;
  return new OMETiffLoader(
    tiff,
    pool,
    firstImage,
    omexmlString,
    offsets.offsetValues
  );
}

export { ZarrLoader, TiffPyramidLoader, OMETiffLoader };
