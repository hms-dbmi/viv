import type { GeoTIFFImage } from 'geotiff';

import TiffPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import { getMultiTiffMetadata, getMultiTiffMeta } from './lib/utils';
import type Pool from './lib/Pool';
import { getMultiTiffIndexer } from './lib/indexers';
import type { TiffSelection } from './types';

export interface MultiTiffImage {
  name: string;
  selection: TiffSelection;
  tiff: GeoTIFFImage;
}

export async function load(
  imageName: string,
  images: MultiTiffImage[],
  pool?: Pool
) {
  const firstImage = images[0].tiff;
  const {
    PhotometricInterpretation: photometricInterpretation
  } = firstImage.fileDirectory;
  // Not sure if we need this or if the order matters for this use case.
  const dimensionOrder = 'XYZCT';
  const tileSize = guessTiffTileSize(firstImage);
  const meta = { photometricInterpretation };
  const indexer = getMultiTiffIndexer(images);
  const { shape, labels, dtype } = getMultiTiffMeta(dimensionOrder, images);
  const metadata = getMultiTiffMetadata(
    imageName,
    images,
    dimensionOrder,
    dtype
  );
  const source = new TiffPixelSource(
    indexer,
    dtype,
    tileSize,
    shape,
    labels,
    meta,
    pool
  );
  return {
    data: [source],
    metadata
  };
}
