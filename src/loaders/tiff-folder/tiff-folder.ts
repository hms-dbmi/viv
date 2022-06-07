import type { GeoTIFF } from 'geotiff';

import TiffFolderPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import { generateMetadata, getTiffMeta } from './lib/utils';
import type Pool from '../tiff/lib/Pool';

export interface TiffFolderSelection {
  t: number;
  c: number;
  z: number;
}

// TODO: Replace separate channelNames and tiffs arrays with object array containing name and tiff.
export async function load(imageName: string, channelNames: string[], tiffs: GeoTIFF[], pool?: Pool) {
    const images = []
    // eslint-disable-next-line no-restricted-syntax
    for (const tiff of tiffs){
        // eslint-disable-next-line no-await-in-loop
        images.push(await tiff.getImage(0))
    }
    const firstImage = images[0];
    const {
        PhotometricInterpretation: photometricInterpretation,
    } = firstImage.fileDirectory;
    // Not sure if we need this or if the order matters for this use case.
    const dimensionOrder = 'XYZCT'
    const tileSize = guessTiffTileSize(firstImage);
    const meta = { photometricInterpretation };
    const {shape, labels, dtype} = getTiffMeta(dimensionOrder, images)
    const metadata = generateMetadata(imageName, channelNames, dimensionOrder, dtype, images)
    const source = new TiffFolderPixelSource(
        images,
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
