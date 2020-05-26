import { openArray } from 'zarr';
import ZarrLoader from './zarrLoader';

async function getJson(path, key) {
  const res = await fetch(`${path}${key}`);
  if (res.status === 404) {
    throw Error(`Key '${key}' does not exist on zarr store.`);
  }
  const json = await res.json();
  return json;
}

/**
 * This class attempts to be a javascript implementation of ome-zarr-py
 * https://github.com/ome/ome-zarr-py/blob/master/ome_zarr.py
 * @param {String} zarrPath url to root zarr store
 * @param {Object} rootAttrs metadata for zarr array
 * */
class OMEZarrReader {
  constructor(zarrPath, rootAttrs) {
    this.zarrPath = zarrPath;
    this.rootAttrs = rootAttrs;
    if (!('omero' in rootAttrs)) {
      throw Error('Remote zarr is not ome-zarr format.');
    }
    this.imageData = rootAttrs.omero;
  }

  /**
   * Returns OMEZarrReader instance.
   * @param {String} url root zarr store
   * @returns {OMEZarrReader} OME reader for zarr store
   */
  static async fromUrl(url) {
    const zarrPath = url.endsWith('/') ? url : `${url}/`;
    const rootAttrs = await getJson(zarrPath, '.zattrs');
    return new OMEZarrReader(zarrPath, rootAttrs);
  }

  /**
   * Returns ZarrLoader as well as omero image metadata object.
   * @returns {Object} { loader: ZarrLoader, metadata: Object }
   */
  async loadOMEZarr() {
    let resolutions = ['0']; // TODO: could be first alphanumeric dataset on err
    if ('multiscales' in this.rootAttrs) {
      const { datasets } = this.rootAttrs.multiscales[0];
      resolutions = datasets.map(d => d.path);
    }
    const promises = resolutions.map(r =>
      openArray({ store: this.zarrPath, path: r })
    );
    const pyramid = await Promise.all(promises);
    const data = pyramid.length > 1 ? pyramid : pyramid[0];
    const dimensions = ['t', 'c', 'z', 'y', 'x'].map(field => ({ field }));
    return {
      loader: new ZarrLoader({ data, dimensions }),
      metadata: this.imageData
    };
  }
}

export default OMEZarrReader;
