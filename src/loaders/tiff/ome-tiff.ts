import type { GeoTIFF } from 'geotiff';
import { fromString } from '../omexml';

import TiffPixelSource from './pixel-source';
import { getLegacyIndexer, getSubIFDIndexer, OmeTiffIndexer } from './lib/indexers';
import { getPixelSourceMeta } from './lib/utils';

export type OmeTiffSelection = { t: number; c: number; z: number };

export async function load(tiff: GeoTIFF) {
  // Get first image from tiff and inspect OME-XML metadata
  const firstImage = await tiff.getImage(0);
  const {
    ImageDescription,
    SubIFDs,
    PhotometricInterpretation: photometricInterpretation
  } = firstImage.fileDirectory;
  const omexml = fromString(ImageDescription);

  /*
   * Image pyramids are stored differently between versions of Bioformats.
   * Thus we need a different indexer depending on which format we have.
   */
  let levels;
  let pyramidIndexer: OmeTiffIndexer;

  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    levels = SubIFDs.length;
    pyramidIndexer = getSubIFDIndexer(tiff, omexml);
  } else {
    // Image is legacy format; resolutions are stored as separate images.
    levels = omexml.length;
    pyramidIndexer = getLegacyIndexer(tiff, omexml);
  }

  // TODO: The OmeTIFF loader only works for the _first_ image in the metadata.
  const imgMeta = omexml[0];
  const { labels, getShape, physicalSizes, dtype } = getPixelSourceMeta(
    imgMeta
  );
  const tileSize = firstImage.getTileWidth();
  const meta = { photometricInterpretation, physicalSizes };

  const data = Array.from({ length: levels }).map((_, i) => {
    const shape = getShape(i);
    const indexer = (sel: OmeTiffSelection) => pyramidIndexer(sel, i);
    const source = new TiffPixelSource(
      indexer,
      dtype,
      tileSize,
      shape,
      labels,
      meta
    );
    return source;
  });

  return {
    data,
    metadata: imgMeta
  };
}
