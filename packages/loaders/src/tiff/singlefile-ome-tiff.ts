import { fromString } from '../omexml';

import TiffPixelSource from './pixel-source';
import { getOmeTiffIndexer } from './lib/indexers';
import {
  createGeoTiff,
  extractDtypeFromPixels,
  extractPhysicalSizesfromPixels,
  extractAxesFromPixels,
  getShapeForResolutionLevel,
  type OmeTiffDims,
  type OmeTiffSelection
} from './lib/utils';
import { getTiffTileSize } from '../utils';
import type Pool from './lib/Pool';
import type { OmeXml } from '../omexml';

function resolveMetadata(omexml: OmeXml, SubIFDs: number[] | undefined) {
  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return { levels: SubIFDs.length + 1, rootMeta: omexml };
  }
  // Image is legacy format; resolutions are stored as separate images.
  // We do not allow multi-images for legacy format.
  const firstImageMetadata = omexml[0];
  return { levels: omexml.length, rootMeta: [firstImageMetadata] };
}

type OmeTiffImage = {
  data: TiffPixelSource<OmeTiffDims>[];
  metadata: OmeXml[number];
};

export async function loadSingleFileOmeTiff(
  source: string | URL | File,
  options: {
    pool?: Pool;
    headers?: Headers | Record<string, string>;
    offsets?: number[];
  } = {}
) {
  const { offsets, headers, pool } = options;
  const tiff = await createGeoTiff(source, { headers, offsets });
  const firstImage = await tiff.getImage();
  const { rootMeta, levels } = resolveMetadata(
    fromString(firstImage.fileDirectory.ImageDescription),
    firstImage.fileDirectory.SubIFDs
  );

  const images: OmeTiffImage[] = [];
  let imageOffset = 0;

  for (const imgMeta of rootMeta) {
    const pyramidIndexer = getOmeTiffIndexer(tiff, imgMeta, imageOffset);
    const axes = extractAxesFromPixels(imgMeta['Pixels']);
    const dtype = extractDtypeFromPixels(imgMeta['Pixels']);
    const baseImage = await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0);
    const meta = {
      photometricInterpretation:
        firstImage.fileDirectory.PhotometricInterpretation,
      physicalSizes: extractPhysicalSizesfromPixels(imgMeta['Pixels'])
    };

    const data: TiffPixelSource<OmeTiffDims>[] = [];
    for (
      let resolutionLevel = 0;
      resolutionLevel <= levels;
      resolutionLevel++
    ) {
      const pixelSource = new TiffPixelSource(
        (sel: OmeTiffSelection) => pyramidIndexer(sel, resolutionLevel),
        dtype,
        getTiffTileSize(baseImage),
        getShapeForResolutionLevel({ axes, resolutionLevel }),
        axes.labels,
        meta,
        pool
      );
      data.push(pixelSource);
    }

    images.push({ data, metadata: imgMeta });
    imageOffset +=
      imgMeta['Pixels']['SizeT'] *
      imgMeta['Pixels']['SizeZ'] *
      imgMeta['Pixels']['SizeC'];
  }
}
