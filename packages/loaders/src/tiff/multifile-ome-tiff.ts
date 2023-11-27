/* eslint-disable */
import type { GeoTIFF } from 'geotiff';
import {
  createGeoTiff,
  parsePixelDataType,
  extractPhysicalSizesfromPixels as extractPhysicalSizesfromPixels,
  getTiffTileSize,
  type OmeTiffSelection,
  extractAxesFromPixels,
  type OmeTiffDims,
  getShapeForBinaryDownsampleLevel
} from './lib/utils';
import { fromString, type OmeXml } from '../omexml';
import TiffPixelSource from './pixel-source';
import { assert } from '../utils';
import type Pool from './lib/Pool';
import { extendResolverWithBaseIndexer } from './lib/indexers';

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

function createMultifileOmeTiffResolver(
  meta: OmeXml[number]['Pixels']['TiffData'],
  options: {
    baseUrl: URL;
    headers: Headers | Record<string, string>;
  }
) {
  // Mapping of filename -> GeoTIFF
  const tiffs = new Map<string, GeoTIFF>();
  const lookup = createMultifileImageDataLookup(meta);
  return async (selection: OmeTiffSelection) => {
    const entry = lookup.getImageDataPointer(selection);
    if (!tiffs.has(entry.filename)) {
      const url = new URL(entry.filename, options.baseUrl);
      const tiff = await createGeoTiff(url, options);
      tiffs.set(entry.filename, tiff);
    }
    const tiff = tiffs.get(entry.filename)!;
    return { tiff, ifdIndex: entry.ifd };
  };
}

async function buildIndexer(
  resolveOmeTiffSelection: ReturnType<typeof createMultifileOmeTiffResolver>
) {
  const { tiff, ifdIndex } = await resolveOmeTiffSelection({
    c: 0,
    t: 0,
    z: 0
  });
  const baseImage = await tiff.getImage(ifdIndex);
  if (!baseImage.fileDirectory.SubIFDs) {
    const pyramidIndexer = async (sel: OmeTiffSelection, level: number) => {
      const { tiff, ifdIndex } = await resolveOmeTiffSelection(sel);
      return tiff.getImage(ifdIndex + level);
    };
    return { pyramidIndexer, levels: 1 };
  }
  return {
    pyramidIndexer: extendResolverWithBaseIndexer(resolveOmeTiffSelection),
    levels: (baseImage.fileDirectory.SubIFDs.length + 1) as number
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
    const resolveOmeTiffSelection = createMultifileOmeTiffResolver(
      metadata['Pixels']['TiffData'],
      {
        baseUrl: url,
        headers: options.headers ?? {}
      }
    );
    const { pyramidIndexer, levels } = await buildIndexer(
      resolveOmeTiffSelection
    );
    const baseImage = await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0);
    const axes = extractAxesFromPixels(metadata['Pixels']);
    const dtype = parsePixelDataType(metadata['Pixels']['Type']);
    const tileSize = getTiffTileSize(baseImage);
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        baseImage.fileDirectory.PhotometricInterpretation
    };
    const data = Array.from(
      { length: levels },
      (_, level) =>
        new TiffPixelSource(
          sel => pyramidIndexer(sel, level),
          dtype,
          tileSize,
          getShapeForBinaryDownsampleLevel({ axes, level }),
          axes.labels,
          meta,
          options.pool
        )
    );
    images.push({ data, metadata });
  }
  return images;
}
