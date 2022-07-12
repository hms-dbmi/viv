import type { GeoTIFF, GeoTIFFImage } from 'geotiff';

import TiffPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import { generateMultiTiffMetadata, getMultiTiffMeta } from './lib/utils';
import type Pool from './lib/Pool';
import { getMultiTiffIndexer } from './lib/indexers';

export interface MultiTiffChannel {
  name: string;
  tiff: GeoTIFF;
}

export async function load(
  imageName: string,
  channels: MultiTiffChannel[],
  pool?: Pool
) {
  const channelImages: GeoTIFFImage[] = [];
  const channelNames: string[] = [];
  for (const channel of channels) {
    channelImages.push(await channel.tiff.getImage(0));
    channelNames.push(channel.name);
  }
  const firstChannel = channelImages[0];
  const {
    PhotometricInterpretation: photometricInterpretation
  } = firstChannel.fileDirectory;
  // Not sure if we need this or if the order matters for this use case.
  const dimensionOrder = 'XYZCT';
  const tileSize = guessTiffTileSize(firstChannel);
  const meta = { photometricInterpretation };
  const indexer = getMultiTiffIndexer(channelImages);
  const { shape, labels, dtype } = getMultiTiffMeta(
    dimensionOrder,
    channelImages
  );
  const metadata = generateMultiTiffMetadata(
    imageName,
    channelNames,
    channelImages,
    dimensionOrder,
    dtype
  );
  const source = new TiffPixelSource(
    // @ts-ignore
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
