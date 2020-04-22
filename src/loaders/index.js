import { openArray } from 'zarr';
// eslint-disable-next-line import/extensions
import { fromUrl, getDecoder } from 'geotiff';
import Pool from './Pool';
import ZarrLoader from './zarrLoader';
import OMETiffLoader from './OMETiffLoader';

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

export async function createOMETiffLoader({ url, noThreads, offsets }) {
  const tiff = await fromUrl(url);
  const firstImage = await tiff.getImage(0);
  const poolOrDecoder = noThreads
    ? getDecoder(firstImage.fileDirectory)
    : new Pool();
  const omexmlString = firstImage.fileDirectory.ImageDescription;
  return new OMETiffLoader({
    tiff,
    poolOrDecoder,
    firstImage,
    omexmlString,
    offsets
  });
}

export { ZarrLoader, OMETiffLoader };
