import type { GeoTIFF } from 'geotiff';
import { fromString } from '../omexml';

import TiffPixelSource from './pixel-source';
import { getOmeLegacyIndexer, getOmeSubIFDIndexer } from './lib/indexers';
import {
  createGeoTiff,
  extractDtypeFromPixels,
  extractPhysicalSizesfromPixels,
  extractShapeAndLabelsFromPixels,
  getShapeForResolutionLevel,
  type OmeTiffSelection
} from './lib/utils';
import { guessTiffTileSize } from '../utils';
import type Pool from './lib/Pool';
import type { OmeXml } from '../omexml';

function getIndexer(
  tiff: GeoTIFF,
  omexml: OmeXml,
  hasSubIFDs: boolean,
  image: number
) {
  /*
   * Image pyramids are stored differently between versions of Bioformats.
   * Thus we need a different indexer depending on which format we have.
   */
  if (hasSubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return getOmeSubIFDIndexer(tiff, omexml, image);
  }
  // Image is legacy format; resolutions are stored as separate images.
  return getOmeLegacyIndexer(tiff, omexml);
}

function resolveMetadata(omexml: OmeXml, SubIFDs: number[] | undefined) {
  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return { levels: SubIFDs.length + 1, rootMeta: omexml };
  }
  // Image is legacy format; resolutions are stored as separate images.
  // We do not allow multi-images for legacy format.
  return { levels: omexml.length, rootMeta: [omexml[0]] };
}

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
  const omexml = fromString(firstImage.fileDirectory.ImageDescription);
  const { levels, rootMeta } = resolveMetadata(
    omexml,
    firstImage.fileDirectory.SubIFDs
  );
  const hasSubIFDs = !!firstImage.fileDirectory.SubIFDs;
  return rootMeta.map((imgMeta, imageIdx) => {
    const pyramidIndexer = getIndexer(tiff, omexml, hasSubIFDs, imageIdx);
    const { baseShape, labels } = extractShapeAndLabelsFromPixels(
      imgMeta['Pixels']
    );
    const physicalSizes = extractPhysicalSizesfromPixels(imgMeta['Pixels']);
    const dtype = extractDtypeFromPixels(imgMeta['Pixels']);
    return {
      data: Array.from({ length: levels }).map((_, resolutionLevel) => {
        const meta = {
          photometricInterpretation:
            firstImage.fileDirectory.PhotometricInterpretation,
          ...(physicalSizes ? { physicalSizes } : {})
        };
        return new TiffPixelSource(
          (sel: OmeTiffSelection) => pyramidIndexer(sel, resolutionLevel),
          dtype,
          guessTiffTileSize(firstImage),
          getShapeForResolutionLevel({
            baseShape,
            labels,
            resolutionLevel
          }),
          labels,
          meta,
          pool
        );
      }),
      metadata: imgMeta
    };
  });
}
