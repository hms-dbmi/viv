import { fromUrl, fromBlob } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import { createOffsetsProxy, checkProxies } from './lib/proxies';
import Pool from './lib/Pool';

import { load } from './ome-tiff';

interface TiffOptions {
  headers?: object;
  offsets?: number[];
  pool?: boolean;
}

/**
 * Opens an OME-TIFF via URL and returns data source and associated metadata for first image.
 *
 * @param {(string | File)} source url or File object.
 * @param {{ headers: (undefined | Headers), offsets: (undefined | number[]), pool: (undefined | boolean ) }} opts
 * Options for initializing a tiff pixel source. Headers are passed to each underlying fetch request. Offests are
 * a performance enhancment to index the remote tiff source using pre-computed byte-offsets. Pool indicates whether a
 * multi-threaded pool of image decoders should be used to decode tiles (default = true).
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>} data source and associated OME-Zarr metadata.
 */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions = {}
) {
  const { headers, offsets, pool = true } = opts;

  let tiff: GeoTIFF;

  // Create tiff source
  if (typeof source === 'string') {
    // https://github.com/ilan-gold/geotiff.js/tree/viv#abortcontroller-support
    // https://www.npmjs.com/package/lru-cache#options
    // Cache size needs to be infinite due to consistency issues.
    tiff = await fromUrl(source, { ...headers, cacheSize: Infinity });
  } else {
    tiff = await fromBlob(source);
  }

  if (offsets) {
    /*
     * Performance enhancement. If offsets are provided, we
     * create a proxy that intercepts calls to `tiff.getImage`
     * and injects the pre-computed offsets.
     */
    tiff = createOffsetsProxy(tiff, offsets);
  }

  /*
   * Inspect tiff source for our performance enhancing proxies.
   * Prints warnings to console if `offsets` or `pool` are missing.
   */
  checkProxies(tiff);

  return pool ? load(tiff, new Pool()) : load(tiff);
}
