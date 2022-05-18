import { fromUrl, fromBlob, addDecoder } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import { createOffsetsProxy, checkProxies } from './lib/proxies';
import LZWDecoder from './lib/lzw-decoder';
import Pool from './lib/Pool';

import { load } from './ome-tiff';

addDecoder(5, () => LZWDecoder);

interface TiffOptions {
  headers?: object;
  offsets?: number[];
  pool?: boolean;
  images?: 'first' | 'all';
}

interface OmeTiffOptions extends TiffOptions {
  images?: 'first' | 'all';
}

type UnwrapPromise<T> = T extends Promise<infer Inner> ? Inner : T;
type MultiImage = UnwrapPromise<ReturnType<typeof load>>; // get return-type from `load`

/** @ignore */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions & { images: 'all' }
): Promise<MultiImage>;
/** @ignore */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions & { images: 'first' }
): Promise<MultiImage[0]>;
/** @ignore */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions
): Promise<MultiImage[0]>;
/** @ignore */
export async function loadOmeTiff(
  source: string | File
): Promise<MultiImage[0]>;
/**
 * Opens an OME-TIFF via URL and returns data source and associated metadata for first or all images in files.
 *
 * @param {(string | File)} source url or File object.
 * @param {Object} opts
 * @param {Headers=} opts.header - Headers passed to each underlying fetch request.
 * @param {Array<number>=} opts.offsets - [Indexed-Tiff](https://github.com/hms-dbmi/generate-tiff-offsets) IFD offsets.
 * @param {pool} [opts.bool=true] - Whether to use a multi-threaded pool of image decoders.
 * @param {images} [opts.images='first'] - Whether to return 'all' or only the 'first' image in the OME-TIFF.
 * Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>[] is returned.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }> | Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>[]} data source and associated OME-Zarr metadata.
 */
export async function loadOmeTiff(
  source: string | File,
  opts: OmeTiffOptions = {}
) {
  const { headers, offsets, pool = true, images = 'first' } = opts;

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

  const loaders = pool ? await load(tiff, new Pool()) : await load(tiff);
  return images === 'all' ? loaders : loaders[0];
}
