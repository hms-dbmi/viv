import type { GeoTIFF } from 'geotiff';
import { type OmeXml, fromString } from '../omexml';
import { assert } from '../utils';
import type Pool from './lib/Pool';
import { createOmeImageIndexerFromResolver } from './lib/indexers';
import {
  type OmeTiffDims,
  type OmeTiffSelection,
  createGeoTiff,
  extractAxesFromPixels,
  extractPhysicalSizesfromPixels,
  getShapeForBinaryDownsampleLevel,
  getTiffTileSize,
  parsePixelDataType
} from './lib/utils';
import TiffPixelSource from './pixel-source';

type TiffDataTags = NonNullable<OmeXml[number]['Pixels']['TiffData']>;
type TIffDataItem = TiffDataTags[number];
type OmeTiffImage = {
  data: TiffPixelSource<OmeTiffDims>[];
  metadata: OmeXml[number];
};

function isCompleteTiffDataItem(
  item: TIffDataItem
): item is Required<TIffDataItem> {
  return (
    'FirstC' in item &&
    'FirstT' in item &&
    'FirstZ' in item &&
    'IFD' in item &&
    'UUID' in item
  );
}

function createMultifileImageDataLookup(
  tiffData: OmeXml[number]['Pixels']['TiffData']
) {
  type ImageDataPointer = { ifd: number; filename: string };
  const lookup: Map<string, ImageDataPointer> = new Map();
  function keyFor({ t, c, z }: OmeTiffSelection) {
    return `t${t}.c${c}.z${z}`;
  }
  assert(tiffData, 'No TiffData in OME-XML');
  for (const imageData of tiffData) {
    assert(isCompleteTiffDataItem(imageData), 'Incomplete TiffData item');
    const key = keyFor({
      t: imageData['FirstT'],
      c: imageData['FirstC'],
      z: imageData['FirstZ']
    });
    const imageDataPointer: ImageDataPointer = {
      ifd: imageData['IFD'],
      filename: imageData['UUID']['FileName']
    };
    lookup.set(key, imageDataPointer);
  }
  return {
    getImageDataPointer(selection: OmeTiffSelection): ImageDataPointer {
      const entry = lookup.get(keyFor(selection));
      assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
      return entry;
    }
  };
}

function createMultifileOmeTiffResolver(options: {
  tiffData: OmeXml[number]['Pixels']['TiffData'];
  baseUrl: URL;
  headers: Headers | Record<string, string>;
}) {
  // Mapping of filename -> GeoTIFF
  const tiffs = new Map<string, GeoTIFF>();
  const lookup = createMultifileImageDataLookup(options.tiffData);
  return async (selection: OmeTiffSelection) => {
    const entry = lookup.getImageDataPointer(selection);
    if (!tiffs.has(entry.filename)) {
      const url = new URL(entry.filename, options.baseUrl);
      const tiff = await createGeoTiff(url, options);
      tiffs.set(entry.filename, tiff);
    }
    const tiff = tiffs.get(entry.filename);
    assert(tiff, `No GeoTIFF for ${entry.filename}`);
    return { tiff, ifdIndex: entry.ifd };
  };
}

/**
 * Load a multifile OME-TIFF from a URL
 *
 * Creates pyramidal indexer from the companion OME-XML and
 * determines the number of levels based on the SubIFDs of
 * the first image.
 *
 * Extracts other TiffPixelSource options.
 */
async function getPixelSourceOptionsForImage(
  metadata: OmeXml[number],
  config: {
    baseUrl: URL;
    headers: Headers | Record<string, string>;
  }
) {
  const resolveOmeSelection = createMultifileOmeTiffResolver({
    tiffData: metadata['Pixels']['TiffData'],
    baseUrl: config.baseUrl,
    headers: config.headers
  });
  const { tiff, ifdIndex } = await resolveOmeSelection({ c: 0, t: 0, z: 0 });
  const baseImage = await tiff.getImage(ifdIndex);
  const pyramidIndexer = createOmeImageIndexerFromResolver(
    resolveOmeSelection,
    {
      size: {
        z: metadata['Pixels']['SizeZ'],
        t: metadata['Pixels']['SizeT'],
        c: metadata['Pixels']['SizeC']
      }
    }
  );
  return {
    pyramidIndexer,
    levels: baseImage.fileDirectory.SubIFDs
      ? baseImage.fileDirectory.SubIFDs.length + 1
      : 1,
    tileSize: getTiffTileSize(baseImage),
    axes: extractAxesFromPixels(metadata['Pixels']),
    dtype: parsePixelDataType(metadata['Pixels']['Type']),
    meta: {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        baseImage.fileDirectory.PhotometricInterpretation
    }
  };
}

export async function loadMultifileOmeTiff(
  source: string | File,
  options: {
    pool?: Pool;
    headers?: Headers | Record<string, string>;
  } = {}
) {
  assert(
    !(source instanceof File),
    'File or Blob not supported for multifile OME-TIFF'
  );
  const url = new URL(source);
  const text = await fetch(url).then(res => res.text());
  const rootMeta = fromString(text);
  const images: OmeTiffImage[] = [];

  for (const metadata of rootMeta) {
    const opts = await getPixelSourceOptionsForImage(metadata, {
      baseUrl: url,
      headers: options.headers || {}
    });
    const data = Array.from(
      { length: opts.levels },
      (_, level) =>
        new TiffPixelSource(
          sel => opts.pyramidIndexer(sel, level),
          opts.dtype,
          opts.tileSize,
          getShapeForBinaryDownsampleLevel({ axes: opts.axes, level }),
          opts.axes.labels,
          opts.meta,
          options.pool
        )
    );
    images.push({ data, metadata });
  }
  return images;
}
