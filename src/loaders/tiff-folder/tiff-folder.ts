import type { GeoTIFF, GeoTIFFImage } from 'geotiff';

import TiffFolderPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import { generateMetadata, getTiffMeta } from './lib/utils';
import type Pool from '../tiff/lib/Pool';

export interface TiffFolderSelection {
  t: number;
  c: number;
  z: number;
}

export interface TiffFolderChannel {name: string, tiff: GeoTIFF}

export async function load(imageName: string, channels: TiffFolderChannel[], pool?: Pool) {
    const channelImages: GeoTIFFImage[] = [];
    const channelNames: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const channel of channels){
        // eslint-disable-next-line no-await-in-loop
        channelImages.push(await channel.tiff.getImage(0));
        channelNames.push(channel.name);
    }
    const firstChannel = channelImages[0];
    const {
        PhotometricInterpretation: photometricInterpretation,
    } = firstChannel.fileDirectory;
    // Not sure if we need this or if the order matters for this use case.
    const dimensionOrder = 'XYZCT';
    const tileSize = guessTiffTileSize(firstChannel);
    const meta = { photometricInterpretation };
    const {shape, labels, dtype} = getTiffMeta(dimensionOrder, channelImages);
    const metadata = generateMetadata(imageName, channelNames, channelImages, dimensionOrder, dtype);
    const source = new TiffFolderPixelSource(
        channelImages,
        dtype,
        tileSize,
        shape,
        labels,
        meta,
        pool
    );
    return {
        data: [source],
        metadata,
    };
}
