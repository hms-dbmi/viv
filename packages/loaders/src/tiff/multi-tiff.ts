import type { GeoTIFFImage } from 'geotiff';

import TiffPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import {
  getMultiTiffMetadata,
  getMultiTiffMeta,
  OmeTiffSelection
} from './lib/utils';
import type Pool from './lib/Pool';
import { getMultiTiffIndexer } from './lib/indexers';

export interface MultiTiffImage {
  name: string;
  selection: OmeTiffSelection;
  tiff: GeoTIFFImage;
}

function assertSameResolution(images: MultiTiffImage[]) {
  const width = images[0].tiff.getWidth();
  const height = images[0].tiff.getHeight();
  for (const image of images) {
    if (image.tiff.getWidth() !== width || image.tiff.getHeight() !== height) {
      throw new Error(`All images must have the same width and height`);
    }
  }
}

async function assertCompleteStack<T>(
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
  images: MultiTiffImage[],
  pool?: Pool
) {
  // Before doing any work make sure all of the images have the same resolution
  assertSameResolution(images);

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

  // Make sure all of the images make a complete stack.
  await assertCompleteStack(images, indexer);

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
