import type { GeoTIFF } from 'geotiff';
import type { OmeTiffSelection } from '../ome-tiff';
import type { OMEXML } from '../../omexml';
import { getDims } from '../../zarr/lib/utils';

function getIFDIndexer(imgMeta: OMEXML[0]): (sel: OmeTiffSelection) => number {
  const { SizeC, SizeZ, SizeT, DimensionOrder } = imgMeta.Pixels;
  switch (DimensionOrder) {
    case 'XYZCT': {
      return ({ t, c, z }) => t * SizeZ * SizeC + c * SizeZ + z;
    }
    case 'XYZTC': {
      return ({ t, c, z }) => c * SizeZ * SizeT + t * SizeZ + z;
    }
    case 'XYCTZ': {
      return ({ t, c, z }) => z * SizeC * SizeT + t * SizeC + c;
    }
    case 'XYCZT': {
      return ({ t, c, z }) => t * SizeC * SizeZ + z * SizeC + c;
    }
    case 'XYTCZ': {
      return ({ t, c, z }) => z * SizeT * SizeC + c * SizeT + t;
    }
    case 'XYTZC': {
      return ({ t, c, z }) => c * SizeT * SizeZ + z * SizeT + t;
    }
    default: {
      throw new Error(
        `Invalid DimensionOrder in OME-XML, got ${JSON.stringify(
          DimensionOrder
        )}.`
      );
    }
  }
}

// TODO: Indexers assume first image in metadata. Need to compute offsets differently
// for other images in the OME-XML.
export function getLegacyIndexer(rootMeta: OMEXML) {
  const imgMeta = rootMeta[0];
  const ifdIndexer = getIFDIndexer(imgMeta);

  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const imgOffset = ifdIndexer(sel);
    const { SizeT, SizeC, SizeZ } = imgMeta.Pixels;
    const pyramidOffset = pyramidLevel * SizeZ * SizeT * SizeC;
    return imgOffset + pyramidOffset;
  };
}

export function getSubIFDIndexer(tiff: GeoTIFF, rootMeta: OMEXML) {
  const imgMeta = rootMeta[0];
  const ifdIndexer = getIFDIndexer(imgMeta);

  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const offset = ifdIndexer(sel);

    // It's the highest resolution, no need to look up SubIFDs.
    if (pyramidLevel === 0) return offset;

    // Lookup SubIFDs from the base image, and return offset to selection.
    const baseImage = await tiff.getImage(offset);
    const { SubIFDs } = baseImage.fileDirectory;
    if (!SubIFDs) {
      throw Error('Indexing Error: OME-TIFF is missing SubIFDs.');
    }
    return SubIFDs[pyramidLevel - 1];
  };
}

export function getPixelSourceMeta({ Pixels }: OMEXML[0]) {
  // e.g. 'XYZCT' -> ['t', 'c', 'z', 'y', 'x']
  const labels = Pixels.DimensionOrder.toLowerCase().split('').reverse();

  // Compute "shape" of image
  const dims = getDims(labels);
  const shape: number[] = Array(labels.length).fill(0);
  shape[dims('t')] = Pixels.SizeT;
  shape[dims('c')] = Pixels.SizeC;
  shape[dims('z')] = Pixels.SizeZ;

  // Push extra dimension if data are interleaved.
  if (Pixels.Interleaved) {
    labels.push('_c');
    shape.push(3);
  }

  // Creates a new shape for different level of pyramid.
  // Assumes factor-of-two downsampling.
  const getShape = (level: number) => {
    const s = [...shape];
    s[dims('x')] = Pixels.SizeX >> level;
    s[dims('y')] = Pixels.SizeY >> level;
    return s;
  };

  return { labels, getShape };
}
