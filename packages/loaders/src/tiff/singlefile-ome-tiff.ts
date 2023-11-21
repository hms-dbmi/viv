import type { GeoTIFF } from 'geotiff';
import { fromString } from '../omexml';

import TiffPixelSource from './pixel-source';
import { getOmeLegacyIndexer, getOmeSubIFDIndexer } from './lib/indexers';
import {
  createGeoTiff,
  getOmePixelSourceMeta,
  type OmeTiffSelection
} from './lib/utils';
import { guessTiffTileSize } from '../utils';
import type Pool from './lib/Pool';
import type { OmeTiffIndexer } from './lib/indexers';
import type { OmeXml } from '../omexml';

function getIndexer(
  tiff: GeoTIFF,
  omexml: OmeXml,
  SubIFDs: number[] | undefined,
  image: number
) {
  /*
   * Image pyramids are stored differently between versions of Bioformats.
   * Thus we need a different indexer depending on which format we have.
   */
  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return getOmeSubIFDIndexer(tiff, omexml, image);
  }
  // Image is legacy format; resolutions are stored as separate images.
  return getOmeLegacyIndexer(tiff, omexml);
}

function resolveMetadata(
  omexml: OmeXml,
  SubIFDs: number[] | undefined,
) {
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
  const tiff = await createGeoTiff(source, {
    headers: options.headers,
    offsets: options.offsets
  });
  const firstImage = await tiff.getImage();
  const fd = firstImage.fileDirectory;
  const omexml = fromString(fd.ImageDescription);
  const { levels, rootMeta } = resolveMetadata(omexml, fd.SubIFDs);
  return rootMeta.map((imgMeta, image) => {
    const pyramidIndexer = getIndexer(tiff, omexml, fd.SubIFDs, image);
    const { labels, getShape, physicalSizes, dtype } = getOmePixelSourceMeta(imgMeta);
    return {
      data: Array
        .from({ length: levels })
        .map((_, resolution) => {
          const indexer = (sel: OmeTiffSelection) => pyramidIndexer(sel, resolution);
          const tilesize = guessTiffTileSize(firstImage);
          const shape = getShape(resolution);
          const meta = {
            photometricInterpretation: fd.PhotometricInterpretation,
            physicalSizes
          };
          return new TiffPixelSource(
            indexer,
            dtype,
            tilesize,
            shape,
            labels,
            meta,
            options.pool
          );
        }),
      metadata: imgMeta
    };
  });
}
