import { addDecoder, fromBlob } from 'geotiff';
import type { Pool } from 'geotiff';

import LZWDecoder from './lib/lzw-decoder';
import {
  type OmeTiffDims,
  type OmeTiffSelection,
  createGeoTiff,
  parseFilename
} from './lib/utils';

import type { OmeXml } from '../omexml';
import { type MultiTiffImage, load as loadMulti } from './multi-tiff';
import { loadMultifileOmeTiff } from './multifile-ome-tiff';
import type TiffPixelSource from './pixel-source';
import { loadSingleFileOmeTiff } from './singlefile-ome-tiff';

addDecoder(5, () => LZWDecoder);

interface TiffOptions {
  headers?: Headers | Record<string, string>;
  offsets?: number[];
  pool?: Pool;
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

type OmeTiffImage = {
  data: TiffPixelSource<OmeTiffDims>[];
  metadata: OmeXml[number];
};

function isSupportedCompanionOmeTiffFile(source: string | File) {
  return typeof source === 'string' && source.endsWith('.companion.ome');
}

/** @ignore */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions & { images: 'all' }
): Promise<OmeTiffImage[]>;
/** @ignore */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions & { images: 'first' }
): Promise<OmeTiffImage>;
/** @ignore */
export async function loadOmeTiff(
  source: string | File,
  opts: TiffOptions
): Promise<OmeTiffImage>;
/** @ignore */
export async function loadOmeTiff(source: string | File): Promise<OmeTiffImage>;
/**
 * Opens an OME-TIFF via URL and returns data source and associated metadata for first or all images in files.
 *
 * @param {(string | File)} source url or File object. If the url is prefixed with file:// will attempt to load with GeoTIFF's 'fromFile',
 * which requires access to Node's fs module.
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
  const load = isSupportedCompanionOmeTiffFile(source)
    ? loadMultifileOmeTiff
    : loadSingleFileOmeTiff;
  const loaders = await load(source, opts);
  return opts.images === 'all' ? loaders : loaders[0];
}

function getImageSelectionName(
  imageName: string,
  imageNumber: number,
  imageSelections: (OmeTiffSelection | undefined)[]
) {
  return imageSelections.length === 1
    ? imageName
    : `${imageName}_${imageNumber.toString()}`;
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
 *  [{ c: 2, t: 0, z: 0 }, undefined, { c: 3, t: 0, z: 0 }], 'https://example.com/channels_2-3.tif'],
 * ]);
 *
 * await data.getRaster({ selection: { c: 0, t: 0, z: 0 } });
 * // { data: Uint16Array[...], width: 500, height: 500 }
 *
 * @param {Array<[OmeTiffSelection | (OmeTiffSelection | undefined)[], (string | File)]>} sources
 * Pairs of `[Selection | (OmeTiffSelection | undefined)[], string | File]` entries indicating the multidimensional selection in the virtual stack in image source (url string, or `File`).
 * If the url is prefixed with file:// will attempt to load with GeoTIFF's 'fromFile', which requires access to Node's fs module.
 * You should only provide (OmeTiffSelection | undefined)[] when loading from stacked tiffs. In this case the array index corresponds to the image index in the stack, and the selection is the
 * selection that image corresponds to. Undefined selections are for images that should not be loaded.
 * @param {Object} opts
 * @param {GeoTIFF.Pool} [opts.pool] - A geotiff.js [Pool](https://geotiffjs.github.io/geotiff.js/module-pool-Pool.html) for decoding image chunks.
 * @param {string} [opts.name='MultiTiff'] - a name for the "virtual" image stack.
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
export async function loadMultiTiff(
  sources: [
    OmeTiffSelection | (OmeTiffSelection | undefined)[],
    string | (File & { path: string })
  ][],
  opts: MultiTiffOptions = {}
) {
  const { pool, headers = {}, name = 'MultiTiff' } = opts;
  const tiffImage: MultiTiffImage[] = [];
  const channelNames = [];

  for (const source of sources) {
    const [s, file] = source;
    const imageSelections = Array.isArray(s) ? s : [s];
    if (typeof file === 'string') {
      // If the file is a string then we're dealing with loading from a URL.
      const parsedFilename = parseFilename(file);
      const extension = parsedFilename.extension?.toLowerCase();
      if (extension === 'tif' || extension === 'tiff') {
        const tiffImageName = parsedFilename.name;
        if (tiffImageName) {
          const curImage = await createGeoTiff(file, {
            headers
          });
          for (let i = 0; i < imageSelections.length; i++) {
            const curSelection = imageSelections[i];

            if (curSelection) {
              const tiff = await curImage.getImage(i);
              tiffImage.push({ selection: curSelection, tiff });
              channelNames[curSelection.c] = getImageSelectionName(
                tiffImageName,
                i,
                imageSelections
              );
            }
          }
        }
      }
    } else {
      // If the file is not a string then we're loading from a File/Blob.
      const { name } = parseFilename(file.path);
      if (name) {
        const curImage = await fromBlob(file);
        for (let i = 0; i < imageSelections.length; i++) {
          const curSelection = imageSelections[i];
          if (curSelection) {
            const tiff = await curImage.getImage(i);
            if (tiff.fileDirectory.SamplesPerPixel > 1) {
              throw new Error(
                `Multiple samples per pixel in tiff not supported as part of a multi-tiff, found ${tiff.fileDirectory.SamplesPerPixel} samples per pixel`
              );
            }
            tiffImage.push({ selection: curSelection, tiff });
            channelNames[curSelection.c] = getImageSelectionName(
              name,
              i,
              imageSelections
            );
          }
        }
      }
    }
  }

  if (tiffImage.length > 0) {
    return loadMulti(name, tiffImage, opts.channelNames || channelNames, pool);
  }

  throw new Error('Unable to load image from provided TiffFolder source.');
}
