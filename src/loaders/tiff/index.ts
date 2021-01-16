import { fromUrl, fromBlob } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import { addProxies } from './lib/proxies';
import { load } from './ome-tiff';

interface TiffOptions {
  pool?: boolean;
  headers?: object;
  offsets?: number[];
}

export async function loadOmeTiff(source: string | File, options: TiffOptions) {
  let tiff: GeoTIFF;

  // Create tiff source
  if (typeof source === 'string') {
    tiff = await fromUrl(source, options.headers);
  } else {
    tiff = await fromBlob(source);
  }

  // Optionally wrap tiff with performance-enhancing proxies.
  tiff = addProxies(tiff, options.pool ?? true, options.offsets);

  return load(tiff);
}
