import { openArray, HTTPStore } from 'zarr';
import { fromUrl } from 'geotiff';
import Pool from './Pool';
import ZarrLoader from './zarrLoader';
import OMETiffLoader from './OMETiffLoader';
import { getChannelStats, getJson, dimensionsFromOMEXML } from './utils';
import OMEXML from './omeXML';

export async function createZarrLoader({
  url,
  dimensions,
  isPyramid,
  isRgb,
  scale,
  translate
}) {
  // TODO: This is a legacy initialization function. There is an official
  // specification now for multiscale datasets (see below), that doesn't
  // consolidate metadata in this way.
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

export async function createBioformatsZarrLoader({ url }) {
  const baseUrl = url.endsWith('/') ? url : `${url}/`;
  const metaUrl = `${baseUrl}METADATA.ome.xml`;
  const store = new HTTPStore(`${baseUrl}data.zarr/0`); // first image
  const rootAttrs = await getJson(store, '.zattrs');

  let resolutions = ['0'];
  if ('multiscales' in rootAttrs) {
    // Get path to subresolutions if they exist
    const { datasets } = rootAttrs.multiscales[0];
    resolutions = datasets.map(d => d.path);
  }

  const promises = resolutions.map(path => openArray({ store, path }));
  const pyramid = await Promise.all(promises);

  /*
   * TODO: There should be a much better way to do this.
   * If base image is small, we don't need to fetch data for the
   * top levels of the pyramid. For large images, the tile sizes (chunks)
   * will be the same size for x/y. We check the chunksize here for this edge case.
   */
  const { chunks, shape } = pyramid[0];
  const shouldUseBase = chunks[-1] !== chunks[-2];
  const data = pyramid.length > 1 || shouldUseBase ? pyramid : pyramid[0];

  // Get OMEXML string
  const buffer = await fetch(metaUrl).then(res => res.arrayBuffer());
  const omexmlString = new TextDecoder().decode(new Uint8Array(buffer));
  const omexml = new OMEXML(omexmlString);
  const dimensions = dimensionsFromOMEXML(omexml);

  /*
   * Specifying different dimension orders form the METADATA.ome.xml is
   * possible and necessary for creating an OME-Zarr precursor.
   *
   * e.g. `bioformats2raw --file_type=zarr --dimension-order='XYZCT'`
   *
   * This is fragile code, and will only be executed if someone
   * tries to specify different dimension orders.
   */
  const nonXYShape = shape.slice(0, -2); // XY always last dims and don't need to be compared
  const nonXYDims = dimensions.filter(d => d.values); // XY are null
  const allSameSize = nonXYShape.every(
    (s, i) => s === nonXYDims[i].values.length
  );
  if (!allSameSize) {
    // Assume OME-Zarr, dims === XYZCT
    const omeZarrDims = [
      nonXYDims.filter(d => d.field === 'time')[0],
      nonXYDims.filter(d => d.field === 'channel')[0],
      nonXYDims.filter(d => d.field === 'z')[0]
    ];
    // compare sizes of sorted dims
    if (
      !omeZarrDims.every(({ values }, i) => values.length === nonXYShape[i])
    ) {
      throw Error(
        `Dimension order is different from METADATA.ome.xml and isn't OME-Zarr.`
      );
    }
    const newDimensions = [...omeZarrDims, ...dimensions.slice(-2)]; // append YX dims
    return new ZarrLoader({ data, dimensions: newDimensions });
  }

  return new ZarrLoader({ data, dimensions });
}

/**
 * This function wraps creating a ome-tiff loader.
 * @param {Object} args
 * @param {String} args.url URL from which to fetch the tiff.
 * @param {Array} args.offsets List of IFD offsets.
 * @param {Object} args.headers Object containing headers to be passed to all fetch requests.
 */
export async function createOMETiffLoader({ url, offsets = [], headers = {} }) {
  const tiff = await fromUrl(url, headers);
  const firstImage = await tiff.getImage(0);
  const pool = new Pool();
  const omexmlString = firstImage.fileDirectory.ImageDescription;
  return new OMETiffLoader({
    tiff,
    pool,
    firstImage,
    omexmlString,
    offsets
  });
}

export { ZarrLoader, OMETiffLoader, getChannelStats };
