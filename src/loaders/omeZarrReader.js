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

// Mostly a javascript implementation of ome-zarr-py
// https://github.com/ome/ome-zarr-py/blob/master/ome_zarr.py

class OMEZarrReader {
    constructor(zarrPath, rootAttrs) {
        this.zarrPath = zarrPath;
        this.rootAttrs = rootAttrs;
        if (!('omero' in rootAttrs)) {
            throw Error('Remote zarr is not ome-zarr format.');
        }
        this.imageData = rootAttrs.omero;
    }

    static async fromUrl(url) {
        const zarrPath = url.endsWith("/") ? url : `${url}/`;
        const rootAttrs = await getJson(zarrPath, '.zattrs');
        return new OMEZarrReader(zarrPath, rootAttrs);
    }

    async loadOMEZarr() {
        let resolutions = ['0']; // TODO: could be first alphanumeric dataset on err
        if ('multiscales' in this.rootAttrs) {
            const { datasets } = this.rootAttrs.multiscales[0];
            resolutions = datasets.map(d => d.path);
        }
        const config = { store: this.zarrPath };
        const promises = resolutions.map(r => openArray({ ...config, path: r }));
        const pyramid = await Promise.all(promises);

        const data = pyramid.length > 1 ? pyramid : pyramid[0];
        const dimensions = ['t', 'c', 'z', 'y', 'x'].map(field => ({ field }));
        return {
            loader: new ZarrLoader({ data, dimensions }),
            metadata: this.imageData
        }
    }
}

export default OMEZarrReader;