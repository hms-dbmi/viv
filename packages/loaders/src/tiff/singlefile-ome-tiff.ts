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

export async function loadSingleFileOmeTiff(
  source: string | URL | File,
  options: {
    pool?: Pool;
    headers?: Headers | Record<string, string>;
  } = {}
) {
  const tiff = await createGeoTiff(source, options);
  const firstImage = await tiff.getImage(0);
  const {
    ImageDescription,
    SubIFDs,
    PhotometricInterpretation: photometricInterpretation
  } = firstImage.fileDirectory;
  const omexml = fromString(ImageDescription);
  let rootMeta = omexml;
  let levels: number;
  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    levels = SubIFDs.length + 1;
  } else {
    // Image is legacy format; resolutions are stored as separate images.
    // We do not allow multi-images for legacy format.
    levels = omexml.length;
    rootMeta = [omexml[0]];
  }
  const getSource = (
    resolution: number,
    pyramidIndexer: OmeTiffIndexer,
    imgMeta: OmeXml[number]
  ) => {
    const { labels, getShape, physicalSizes, dtype } =
      getOmePixelSourceMeta(imgMeta);
    const tileSize = guessTiffTileSize(firstImage);
    const meta = { photometricInterpretation, physicalSizes };
    const shape = getShape(resolution);
    const indexer = (sel: OmeTiffSelection) => pyramidIndexer(sel, resolution);
    const source = new TiffPixelSource(
      indexer,
      dtype,
      tileSize,
      shape,
      labels,
      meta,
      options.pool
    );
    return source;
  };
  return rootMeta.map((imgMeta, image) => {
    const pyramidIndexer = getIndexer(tiff, omexml, SubIFDs, image);
    const data = Array.from({ length: levels }).map((_, resolution) =>
      getSource(resolution, pyramidIndexer, imgMeta)
    );

    return {
      data,
      metadata: imgMeta
    };
  });
}
