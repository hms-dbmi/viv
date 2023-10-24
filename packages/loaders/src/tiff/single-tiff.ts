import type { GeoTIFFImage } from 'geotiff';

import TiffPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import {
  getSingleTiffMetadata,
  getSingleTiffMeta,
  OmeTiffSelection
} from './lib/utils';
import type Pool from './lib/Pool';
import { getMultiTiffIndexer } from './lib/indexers';

export interface MultiTiffImage {
  selection: OmeTiffSelection;
  tiff: GeoTIFFImage;
}

async function assertCompleteStack(
  images: MultiTiffImage[],
  indexer: (sel: OmeTiffSelection) => Promise<GeoTIFFImage>
) {
  for (let t = 0; t <= Math.max(...images.map(i => i.selection.t)); t += 1) {
    for (let c = 0; c <= Math.max(...images.map(i => i.selection.c)); c += 1) {
      for (
        let z = 0;
        z <= Math.max(...images.map(i => i.selection.z));
        z += 1
      ) {
        await indexer({ t, c, z }); // should throw error is missing dimension
      }
    }
  }
}

export async function load(
  imageName: string,
  image: GeoTIFFImage,
  channelNames: string[],
  pool?: Pool
) {
  const { PhotometricInterpretation: photometricInterpretation } =
    image.fileDirectory;
  // Not sure if we need this or if the order matters for this use case.
  const dimensionOrder = 'XYZCT';
  const tileSize = guessTiffTileSize(image);
  const meta = { photometricInterpretation };
  const indexer = async () => image;
  const { shape, labels, dtype } = getSingleTiffMeta(dimensionOrder, image);
  const metadata = getSingleTiffMetadata(
    imageName,
    image,
    channelNames,
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
