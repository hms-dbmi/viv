import { fromUrl, fromBlob, addDecoder } from 'geotiff';
import type { GeoTIFF, Pool } from 'geotiff';

import { createOffsetsProxy, checkProxies } from './lib/proxies';
import LZWDecoder from './lib/lzw-decoder';
import { parseFilename, OmeTiffSelection } from './lib/utils';

import { load as loadOme } from './ome-tiff';
import { load as loadMulti, MultiTiffImage } from './multi-tiff';

addDecoder(5, () => LZWDecoder);

interface TiffOptions {
  headers?: Headers | Record<string, string>,
  offsets?: number[];
  pool?: Pool;
  images?: 'first' | 'all';
}

interface OmeTiffOptions extends TiffOptions {
  images?: 'first' | 'all';
}

interface MultiTiffOptions {
  pool?: Pool;
  name?: string;
  headers?: Headers | Record<string, string>,
}

type MultiImage = Awaited<ReturnType<typeof loadOme>>; // get return-type from `load`

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
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @param {Array<number>=} opts.offsets - [Indexed-Tiff](https://github.com/hms-dbmi/generate-tiff-offsets) IFD offsets.
 * @param {GeoTIFF.Pool} [opts.pool] - A geotiff.js [Pool](https://geotiffjs.github.io/geotiff.js/module-pool-Pool.html) for decoding image chunks.
 * @param {("first" | "all")} [opts.images='first'] - Whether to return 'all' or only the 'first' image in the OME-TIFF.
 * Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>[] is returned.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }> | Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>[]} data source and associated OME-Zarr metadata.
 */
export async function loadOmeTiff(
  source: string | File,
  opts: OmeTiffOptions = {}
) {
  const { headers = {}, offsets, pool, images = 'first' } = opts;

  let tiff: GeoTIFF;

  // Create tiff source
  if (typeof source === 'string') {
    // https://github.com/ilan-gold/geotiff.js/tree/viv#abortcontroller-support
    // https://www.npmjs.com/package/lru-cache#options
    // Cache size needs to be infinite due to consistency issues.
    tiff = await fromUrl(source, { headers, cacheSize: Infinity });
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

  const loaders = await loadOme(tiff, pool);
  return images === 'all' ? loaders : loaders[0];
}

const DEFAULT_MULTI_IMAGE_NAME = 'MultiTiff';

/**
 * Opens multiple tiffs as a multidimensional "stack" of 2D planes. Returns the data source and OME-TIFF-like metadata.
 *
 *
 * @example
 * const { data, metadata } = await loadMultiTiff([
 *  [{ c: 0, t: 0, z: 0 }, 'https://example.com/channel_0.tif'],
 *  [{ c: 1, t: 0, z: 0 }, 'https://example.com/channel_1.tif'],
 *  [{ c: 2, t: 0, z: 0 }, 'https://example.com/channel_1.tif'],
 * ]);
 *
 * await data.getRaster({ selection: { c: 0, t: 0, z: 0 } });
 * // { data: Uint16Array[...], width: 500, height: 500 }
 *
 * @param {Array<[OmeTiffSelection, (string | File)]>} sources pairs of `[Selection, string | File]` entries indicating the multidimensional selection in the virtual stack in image source (url string, or `File`).
 * @param {Object} opts
 * @param {GeoTIFF.Pool} [opts.pool] - A geotiff.js [Pool](https://geotiffjs.github.io/geotiff.js/module-pool-Pool.html) for decoding image chunks.
 * @param {string} [opts.name] - a name for the "virtual" image stack. If none is provided a name is inferred from the source paths or defaults to "MultiTiff".
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
export async function loadMultiTiff(
  sources: [OmeTiffSelection, string | (File & { path: string })][],
  opts: MultiTiffOptions = {}
) {
  let imageName: string | undefined;
  const { pool, headers = {} } = opts;
  const tiffImage: MultiTiffImage[] = [];

  const firstSource = sources[0];
  if (firstSource) {
    const [, firstSourceFile] = firstSource;
    if (typeof firstSourceFile === 'string') {
      const splitPath = firstSourceFile.split('/');
      // We only want to get the image name from the path if the TIFF is in a folder.
      // If the TIFF url is == 2, then the first part is http and the second part is the filename.
      if (splitPath.length > 2) imageName = splitPath[-2];
    } else {
      // Try to get the imageName from the file path path
      imageName = firstSourceFile.path.split('/')[-2];
    }
    // If the image name still hasn't been set, set it to a default.
    if (!imageName) imageName = DEFAULT_MULTI_IMAGE_NAME;
  }

  for (const source of sources) {
    const [selection, file] = source;
    if (typeof file === 'string') {
      const parsedFilename = parseFilename(file);
      const extension = parsedFilename.extension?.toLowerCase();
      if (extension === 'tif' || extension === 'tiff') {
        const tiffImageName = parsedFilename.name;
        if (tiffImageName) {
          const tiff = await (
            await fromUrl(file, { headers, cacheSize: Infinity })
          ).getImage(0);
          tiffImage.push({ name: tiffImageName, selection, tiff });
        }
      }
    } else {
      const { name } = parseFilename(file.path);
      if (name) {
        const tiff = await (await fromBlob(file)).getImage(0);
        tiffImage.push({ name, selection, tiff });
      }
    }
  }

  if (tiffImage.length > 0) {
    if (!imageName) imageName = DEFAULT_MULTI_IMAGE_NAME;
    const loader = pool
      ? await loadMulti(imageName, tiffImage, pool)
      : await loadMulti(imageName, tiffImage);
    return loader;
  }

  throw new Error('Unable to load image from provided TiffFolder source.');
}
