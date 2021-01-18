import { fromUrl, fromBlob } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import {
  createPoolProxy,
  createOffsetsProxy,
  checkProxies
} from './lib/proxies';
import Pool from './lib/Pool';

import { load } from './ome-tiff';

interface TiffOptions {
  headers?: object;
  offsets?: number[];
  pool?: boolean;
}

export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions = {}
) {
  const { headers, offsets, pool = true } = opts;

  let tiff: GeoTIFF;

  // Create tiff source
  if (typeof source === 'string') {
    tiff = await fromUrl(source, headers);
  } else {
    tiff = await fromBlob(source);
  }

  if (pool) {
    /*
     * Creates a worker pool to decode tiff tiles. Wraps tiff
     * in a Proxy that injects 'pool' into `tiff.readRasters`.
     */
    tiff = createPoolProxy(tiff, new Pool());
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

  return load(tiff);
}
