import { FetchStore } from 'zarrita';
import { FileStore } from './lib/storage';
import { getRootPrefix } from './lib/utils';

import { load as loadBioformats } from './bioformats-zarr';
import { load as loadOme } from './ome-zarr';

interface ZarrOptions {
  fetchOptions: RequestInit;
}

/**
 * Opens root directory generated via `bioformats2raw`. Uses OME-XML metadata,
 * and assumes that the source url is the root for a single image.
 * This function is the zarr-equivalent to using loadOmeTiff.
 * 
 * Note that outputs from older versions may no longer load correctly
 * https://github.com/hms-dbmi/viv/issues/905
 *
 * @param {string} source url
 * @param {{ fetchOptions: (undefined | RequestInit) }} options
 * @return {Promise<{ data: ZarrPixelSource[], metadata: ImageMeta }>} data source and associated OMEXML metadata.
 */
export async function loadBioformatsZarr(
  source: string | (File & { path: string })[],
  options: Partial<ZarrOptions> = {}
) {
  // https://github.com/hms-dbmi/viv/issues/905
  // previously we had 'METADATA.ome.xml' & 'data.zarr'
  const METADATA = 'OME/METADATA.ome.xml';
  const ZARR_DIR = '';

  if (typeof source === 'string') {
    const url = source.endsWith('/') ? source.slice(0, -1) : source;
    const store = new FetchStore(`${url}/${ZARR_DIR}`, options.fetchOptions);
    const xmlSource = await fetch(`${url}/${METADATA}`, options.fetchOptions);
    if (!xmlSource.ok) {
      throw Error('No OME-XML metadata found for store.');
    }
    return loadBioformats(store, xmlSource);
  }

  /*
   * You can't randomly access files from a directory by path name
   * without the Native File System API, so we need to get objects for _all_
   * the files right away for Zarr. This is unfortunate because we need to iterate
   * over all File objects and create an in-memory index.
   *
   * fMap is simple key-value mapping from 'some/file/path' -> File
   */
  const fMap: Map<string, File> = new Map();

  let xmlFile: File | undefined;
  for (const file of source) {
    if (file.name === METADATA) {
      xmlFile = file;
    } else {
      fMap.set(file.path, file);
    }
  }

  if (!xmlFile) {
    throw Error('No OME-XML metadata found for store.');
  }

  const store = new FileStore(fMap, getRootPrefix(source, ZARR_DIR));
  return loadBioformats(store, xmlFile);
}

/**
 * Opens root of multiscale OME-Zarr via URL.
 *
 * @param {string} source url
 * @param {{ fetchOptions: (undefined | RequestInit) }} options
 * @return {Promise<{ data: ZarrPixelSource[], metadata: RootAttrs }>} data source and associated OME-Zarr metadata.
 */
export async function loadOmeZarr(
  source: string,
  options: Partial<ZarrOptions & { type: 'multiscales' }> = {}
) {
  const store = new FetchStore(source, options.fetchOptions);

  if (options?.type !== 'multiscales') {
    throw Error('Only multiscale OME-Zarr is supported.');
  }

  return loadOme(store);
}
