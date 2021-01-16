import { fromUrl, fromBlob } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import { createPoolProxy, createOffsetsProxy, checkProxies } from './lib/proxies';
import Pool from './lib/Pool';
import { load } from './ome-tiff';

interface TiffOptions {
  pool?: boolean;
  headers?: object;
  offsets?: number[];
}

export async function loadOmeTiff(source: string | File, options: TiffOptions = {}) {
  let tiff: GeoTIFF;

  // Create tiff source
  if (typeof source === 'string') {
    tiff = await fromUrl(source, options.headers);
  } else {
    tiff = await fromBlob(source);
  }

  if (options.pool) {
    /*
     * Creates a worker pool to decode tiff tiles. Wraps tiff
     * in a Proxy that injects 'pool' into `tiff.readRasters`.
     */
    tiff = createPoolProxy(tiff, new Pool());
  }

  if (options.offsets) {
    /*
     * Performance enhancement. If offsets are provided, we
     * create a proxy that intercepts calls to `tiff.getImage`
     * and injects the pre-computed offsets.
     */
    tiff = createOffsetsProxy(tiff, options.offsets);
  }

  /*
  * Inspect tiff source for our performance enhancing proxies.
  * Prints warnings to console if `offsets` or `pool` are missing.
  */
  checkProxies(tiff);

  return load(tiff);
}
