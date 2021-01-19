import { HTTPStore, FileStore } from './lib/storage';
import { getRootPrefix } from './lib/utils';

import { load as loadBioformats } from './bioformats-zarr';
import { load as loadOme } from './ome-zarr';

interface ZarrOptions {
  fetchOptions?: RequestInit;
}

export async function loadBioformatsZarr(
  source: string | (File & { path: string })[],
  options: ZarrOptions = {}
) {
  const { fetchOptions } = options;

  const METADATA = 'METADATA.ome.xml';
  const ZARR_DIR = 'data.zarr';

  if (typeof source === 'string') {
    const url = source.endsWith('/') ? source.slice(0, -1) : source;
    const store = new HTTPStore(url + '/' + ZARR_DIR, fetchOptions);
    const xmlSource = await fetch(url + '/' + METADATA, fetchOptions);
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

export async function loadOmeZarr(
  source: string,
  options: ZarrOptions & { type?: 'multiscales' }
) {
  const store = new HTTPStore(source, options.fetchOptions);

  if (options?.type !== 'multiscales') {
    throw Error('Only multiscale OME-Zarr is supported.');
  }

  return loadOme(store);
}
