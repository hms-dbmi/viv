import { fromUrl, fromBlob, addDecoder } from 'geotiff';
import type { GeoTIFF, Pool } from 'geotiff';

import { createOffsetsProxy, checkProxies } from './lib/proxies';
import LZWDecoder from './lib/lzw-decoder';
import { parseFilename, OmeTiffSelection } from './lib/utils';

import { load as loadOme } from './ome-tiff';
import { load as loadMulti, MultiTiffImage } from './multi-tiff';

addDecoder(5, () => LZWDecoder);

interface TiffOptions {
  headers?: Headers | Record<string, string>;
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
  channelNames?: string[];
  headers?: Headers | Record<string, string>;
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

function getImageSelectionName(
  imageName: string,
  imageNumber: number,
  imageSelections: [number, OmeTiffSelection][]
) {
  return imageSelections.length === 1
    ? imageName
    : imageName + `_${imageNumber.toString()}`;
}

/**
 * Opens multiple tiffs as a multidimensional "stack" of 2D planes.
 * Also supports loading multiple slickes of a stack from a stacked tiff.
 * Returns the data source and OME-TIFF-like metadata.
 *
 * @example
 * const { data, metadata } = await loadMultiTiff([
 *  [{ c: 0, t: 0, z: 0 }, 'https://example.com/channel_0.tif'],
 *  [{ c: 1, t: 0, z: 0 }, 'https://example.com/channel_1.tif'],
 *  [[[0, { c: 2, t: 0, z: 0 }], [1, { c: 3, t: 0, z: 0 }]], 'https://example.com/channels_2-3.tif'],
 * ]);
 *
 * await data.getRaster({ selection: { c: 0, t: 0, z: 0 } });
 * // { data: Uint16Array[...], width: 500, height: 500 }
 *
 * @param {Array<[OmeTiffSelection | [number, OmeTiffSelection][], (string | File)]>} sources
 * Pairs of `[Selection | [number, Selection][], string | File]` entries indicating the multidimensional selection in the virtual stack in image source (url string, or `File`).
 * You should only provide [number, Selection][] when loading from stacked tiffs. In this case the number corresponds to the image index in the stack, and the selection is the
 * selection that image corresponds to.
 * @param {Object} opts
 * @param {GeoTIFF.Pool} [opts.pool] - A geotiff.js [Pool](https://geotiffjs.github.io/geotiff.js/module-pool-Pool.html) for decoding image chunks.
 * @param {string} [opts.name='MultiTiff'] - a name for the "virtual" image stack.
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
export async function loadMultiTiff(
  sources: [
    OmeTiffSelection | [number, OmeTiffSelection][],
    string | (File & { path: string })
  ][],
  opts: MultiTiffOptions = {}
) {
  const { pool, headers = {}, name = 'MultiTiff' } = opts;
  const tiffImage: MultiTiffImage[] = [];
  const channelNames = [];

  for (const source of sources) {
    const [s, file] = source;
    const imageSelections: [number, OmeTiffSelection][] = Array.isArray(s)
      ? s
      : [[0, s]];
    if (typeof file === 'string') {
      // If the file is a string then we're dealing with loading from a URL.
      const parsedFilename = parseFilename(file);
      const extension = parsedFilename.extension?.toLowerCase();
      if (extension === 'tif' || extension === 'tiff') {
        const tiffImageName = parsedFilename.name;
        if (tiffImageName) {
          for (const imageSelection of imageSelections) {
            const [imageNumber, selection] = imageSelection;
            const tiff = await (
              await fromUrl(file, { headers, cacheSize: Infinity })
            ).getImage(imageNumber);
            tiffImage.push({ selection, tiff });
            channelNames[selection.c] = getImageSelectionName(
              tiffImageName,
              imageNumber,
              imageSelections
            );
          }
        }
      }
    } else {
      // If the file is not a string then we're loading from a File/Blob.
      const { name } = parseFilename(file.path);
      if (name) {
        for (const imageSelection of imageSelections) {
          const [imageNumber, selection] = imageSelection;
          const tiff = await (await fromBlob(file)).getImage(imageNumber);
          tiffImage.push({ selection, tiff });
          channelNames[selection.c] = getImageSelectionName(
            name,
            imageNumber,
            imageSelections
          );
        }
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(channelNames);
  // eslint-disable-next-line no-console
  console.log(opts.channelNames);

  if (tiffImage.length > 0) {
    return loadMulti(name, tiffImage, opts.channelNames || channelNames, pool);
  }

  throw new Error('Unable to load image from provided TiffFolder source.');
}
