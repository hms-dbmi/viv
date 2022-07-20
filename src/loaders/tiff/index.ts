import { fromUrl, fromBlob, addDecoder } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import { createOffsetsProxy, checkProxies } from './lib/proxies';
import LZWDecoder from './lib/lzw-decoder';
import Pool from './lib/Pool';
import { parseFilename } from './lib/utils';

import { load as loadOme } from './ome-tiff';
import { load as loadMulti, MultiTiffImage } from './multi-tiff';
import type { TiffSelection } from './types';

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

export type MultiTiffOptions = OmeTiffOptions;

type UnwrapPromise<T> = T extends Promise<infer Inner> ? Inner : T;
type MultiImage = UnwrapPromise<ReturnType<typeof loadOme>>; // get return-type from `load`

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

  const loaders = pool ? await loadOme(tiff, new Pool()) : await loadOme(tiff);
  return images === 'all' ? loaders : loaders[0];
}

const DEFAULT_MULTI_IMAGE_NAME = 'MultiTiff';

/**
 * Opens a folder of multiple tiffs each containing one image (no stacks, timepoints, or pyramids).
 * Loads each tiff as a channel.
 * Expects one of two possible inputs:
 *
 * string - A single URL or a comma separated list of URLs where each URL points to a flat TIFF.
 * In this case the name of the parent path element for the first image will be used as the image name
 * and the file names will be used as the channel names.
 *
 * (File & { path: string })[] - A list of file objects paired with their paths. In this case
 * the parent folder name of the first image will be used as the image name and the file names
 * will be used to as the channel names.
 *
 * @param {string | File[]} source url or files with paths
 * @param {{ fetchOptions: (undefined | RequestInit) }} options
 * @return {Promise<{ data: TiffFolderPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
export async function loadMultiTiff(
  sources: [TiffSelection, string | (File & { path: string })][],
  opts: MultiTiffOptions = {}
) {
  let imageName: string | undefined;
  const { pool = true } = opts;
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
            await fromUrl(file, { cacheSize: Infinity })
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
      ? await loadMulti(imageName, tiffImage, new Pool())
      : await loadMulti(imageName, tiffImage);
    return loader;
  }

  throw new Error('Unable to load image from provided TiffFolder source.');
}
