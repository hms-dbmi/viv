/* eslint-disable */
import type { GeoTIFF, GeoTIFFImage } from 'geotiff';
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

function createMultifileImageDataLookup(omexml: OmeXml[number]) {
  type ImageDataPointer = { ifd: number; filename: string };
  const lookup: Map<string, ImageDataPointer> = new Map();

  function keyFor({ t, c, z }: OmeTiffSelection) {
    return `t${t}.c${c}.z${z}`;
  }

  assert(omexml['Pixels']['TiffData'], 'No TiffData in OME-XML');
  for (const imageData of omexml['Pixels']['TiffData']) {
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

interface TiffResolver {
  resolve(identifier: string | URL): Promise<GeoTIFF>;
}

function createMultifileOmeTiffIndexer(
  imgMeta: OmeXml[number],
  tiffResolver: TiffResolver
) {
  const lookup = createMultifileImageDataLookup(imgMeta);
  return async (selection: OmeTiffSelection): Promise<GeoTIFFImage> => {
    const entry = lookup.getImageDataPointer(selection);
    const tiff = await tiffResolver.resolve(entry.filename);
    const image = await tiff.getImage(entry.ifd);
    return image;
  };
}

function multifileTiffResolver(options: {
  baseUrl: URL;
  headers?: Headers | Record<string, string>;
}): TiffResolver {
  // Mapping of filename -> GeoTIFF
  const tiffs = new Map<string, GeoTIFF>();
  return {
    async resolve(identifier: string) {
      if (!tiffs.has(identifier)) {
        const url = new URL(identifier, options.baseUrl);
        const tiff = await createGeoTiff(url, options);
        tiffs.set(identifier, tiff);
      }
      return tiffs.get(identifier)!;
    }
  };
}

export async function loadMultifileOmeTiff(
  source: string | File,
  options: {
    pool?: Pool;
    headers?: Headers | Record<string, string>;
  }
) {
  assert(
    !(source instanceof File),
    'File or Blob not supported for multifile OME-TIFF'
  );
  const url = new URL(source);
  const text = await fetch(url).then(res => res.text());
  const rootMeta = fromString(text);
  // Share resources between images
  const resolver = multifileTiffResolver({ baseUrl: url });
  const images: OmeTiffImage[] = [];
  for (const metadata of rootMeta) {
    const indexer = createMultifileOmeTiffIndexer(metadata, resolver);
    const axes = extractAxesFromPixels(metadata['Pixels']);
    const dtype = parsePixelDataType(metadata['Pixels']['Type']);
    const baseImage = await indexer({ c: 0, t: 0, z: 0 });
    const tileSize = getTiffTileSize(baseImage);
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        baseImage.fileDirectory.PhotometricInterpretation
    };
    const data = Array.from(
      { length: 1 },
      (_, level) =>
        new TiffPixelSource(
          indexer,
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
