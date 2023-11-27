import { fromString } from '../omexml';

import TiffPixelSource from './pixel-source';
import {
  extendResolverWithBaseIndexer,
  getRelativeIfdIndexer
} from './lib/indexers';
import {
  createGeoTiff,
  parsePixelDataType,
  extractPhysicalSizesfromPixels,
  extractAxesFromPixels,
  getShapeForBinaryDownsampleLevel,
  getTiffTileSize,
  type OmeTiffDims,
  type OmeTiffSelection
} from './lib/utils';
import type Pool from './lib/Pool';
import type { DimensionOrder, OmeXml } from '../omexml';
import type GeoTIFF from 'geotiff';

function resolveMetadata(omexml: OmeXml, SubIFDs: number[] | undefined) {
  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return { levels: SubIFDs.length + 1, rootMeta: omexml };
  }
  // Image is legacy format; resolutions are stored as separate images.
  // We do not allow multi-images for legacy format.
  const firstImageMetadata = omexml[0];
  return { levels: omexml.length, rootMeta: [firstImageMetadata] };
}

function createSingleFileResolver(
  tiff: GeoTIFF,
  options: {
    size: { t: number; z: number; c: number };
    dimensionOrder: DimensionOrder;
    imageIfdOffset: number;
  }
) {
  const { size, dimensionOrder, imageIfdOffset } = options;
  const getRelativeIfdIndex = getRelativeIfdIndexer(size, dimensionOrder);
  return (sel: OmeTiffSelection) => {
    return { tiff, ifdIndex: getRelativeIfdIndex(sel) + imageIfdOffset };
  };
}

type OmeTiffImage = {
  data: TiffPixelSource<OmeTiffDims>[];
  metadata: OmeXml[number];
};

export async function loadSingleFileOmeTiff(
  source: string | URL | File,
  options: {
    pool?: Pool;
    headers?: Headers | Record<string, string>;
    offsets?: number[];
  } = {}
) {
  const { offsets, headers, pool } = options;
  const tiff = await createGeoTiff(source, { headers, offsets });
  const firstImage = await tiff.getImage();
  const { rootMeta, levels } = resolveMetadata(
    fromString(firstImage.fileDirectory.ImageDescription),
    firstImage.fileDirectory.SubIFDs
  );

  const images: OmeTiffImage[] = [];
  let imageIfdOffset = 0;

  for (const metadata of rootMeta) {
    const size = {
      z: metadata['Pixels']['SizeZ'],
      c: metadata['Pixels']['SizeC'],
      t: metadata['Pixels']['SizeT']
    };
    const axes = extractAxesFromPixels(metadata['Pixels']);
    const resolveOmeTiffSelection = createSingleFileResolver(tiff, {
      size,
      imageIfdOffset,
      dimensionOrder: metadata['Pixels']['DimensionOrder']
    });
    const pyramidIndexer = extendResolverWithBaseIndexer(
      resolveOmeTiffSelection
    );
    const dtype = parsePixelDataType(metadata['Pixels']['Type']);
    const tileSize = getTiffTileSize(
      await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0)
    );
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        firstImage.fileDirectory.PhotometricInterpretation
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
          pool
        )
    );
    images.push({ data, metadata });
    imageIfdOffset += size.t * size.z * size.c;
  }
  return images;
}
