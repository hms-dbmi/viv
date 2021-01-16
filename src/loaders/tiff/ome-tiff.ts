import type { GeoTIFF } from 'geotiff';
import { fromString } from '../omexml';

import {
  getLegacyIndexer,
  getSubIFDIndexer,
  getPixelSourceMeta
} from './lib/utils';
import TiffPixelSource from './pixel-source';

import { checkProxies } from './lib/proxies';

export type OmeTiffSelection = { t: number; c: number; z: number };

export async function load(tiff: GeoTIFF) {
  // Inspect tiff source for our performance enhancing proxies.
  checkProxies(tiff);

  // Get first image from tiff and inspect OME-XML metadata
  const firstImage = await tiff.getImage(0);
  const { ImageDescription, SubIFDs } = firstImage.fileDirectory;
  const omexml = fromString(ImageDescription);

  /*
   * Image pyramids are stored differently between versions of Bioformats.
   * Thus we need a different indexer (function that returns the offset to an
   * image based on a 'selection' and pyramid level) depending on which
   * format we have.
   */
  let levels;
  let pyramidIndexer: (sel: OmeTiffSelection, level: number) => Promise<number>;

  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    levels = SubIFDs.length;
    pyramidIndexer = getSubIFDIndexer(tiff, omexml);
  } else {
    // Image is legacy format; resolutions are stored as separate images.
    levels = omexml.length;
    pyramidIndexer = getLegacyIndexer(omexml);
  }

  // TODO: The OmeTIFF loader only works for the _first_ image in the metadata.
  const imgMeta = omexml[0];
  const { labels, getShape } = getPixelSourceMeta(imgMeta);
  const tileSize = firstImage.getTileWidth();

  const data = Array.from({ length: levels }).map((_, i) => {
    const shape = getShape(i);
    const indexer = (sel: OmeTiffSelection) => pyramidIndexer(sel, i);
    return new TiffPixelSource(tiff, indexer, tileSize, shape, labels);
  });

  return {
    data,
    metadata: imgMeta
  };
}
