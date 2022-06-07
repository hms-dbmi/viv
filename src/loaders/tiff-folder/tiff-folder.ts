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

export async function load(folderName: string, tiffs: {name: string, image: GeoTIFF}[], pool?: Pool) {
    const images: GeoTIFFImage[] = []
    const names: string[] = []
    // eslint-disable-next-line no-restricted-syntax
    for (const tiff of tiffs){
        // eslint-disable-next-line no-await-in-loop
        images.push(await tiff.image.getImage(0))
        names.push(tiff.name)
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
    const metadata = generateMetadata(folderName, names, images, dimensionOrder, dtype)
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
