import { GeoTIFFImage } from 'geotiff';
import type { GeoTIFF, ImageFileDirectory } from 'geotiff';
import type { OMEXML } from '../../omexml';
import type { OmeTiffSelection } from '../ome-tiff';

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
export function getLegacyIndexer(tiff: GeoTIFF, rootMeta: OMEXML) {
  const imgMeta = rootMeta[0];
  const ifdIndexer = getIFDIndexer(imgMeta);

  return (sel: OmeTiffSelection, pyramidLevel: number) => {
    const imgOffset = ifdIndexer(sel);
    const { SizeT, SizeC, SizeZ } = imgMeta.Pixels;
    const pyramidOffset = pyramidLevel * SizeZ * SizeT * SizeC;
    return tiff.getImage(imgOffset + pyramidOffset);
  };
}

export function getSubIFDIndexer(tiff: GeoTIFF, rootMeta: OMEXML) {
  const imgMeta = rootMeta[0];
  const ifdIndexer = getIFDIndexer(imgMeta);

  /*
   * Here we create a custom IFD cache, rather than mutating tiff.ifdRequests
   * with random offsets. The IFDs are cached in an ES6 Map that maps a unique
   * key (e.g. `${z}-${t}-${c}-${pyramidlevel}`) to the corresponding IFD.
   */
  const ifdCache: Map<string, ImageFileDirectory> = new Map();

  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const offset = ifdIndexer(sel);

    // It's the highest resolution, no need to look up SubIFDs.
    const baseImage = await tiff.getImage(offset);
    if (pyramidLevel === 0) return baseImage;

    // Lookup SubIFDs from the base image, and return offset to selection.
    const { SubIFDs } = baseImage.fileDirectory;
    if (!SubIFDs) {
      throw Error('Indexing Error: OME-TIFF is missing SubIFDs.');
    }

    const key = `${sel.t}-${sel.z}-${sel.c}-${pyramidLevel}`;
    let ifd = ifdCache.get(key);
    if (!ifd) {
      // Only create a new request if we don't have the key.
      ifd = await tiff.parseFileDirectoryAt(SubIFDs[pyramidLevel - 1]);
      ifdCache.set(key, ifd);
    }

    // Create a new image object manually from IFD
    // https://github.com/geotiffjs/geotiff.js/blob/8ef472f41b51d18074aece2300b6a8ad91a21ae1/src/geotiff.js#L447-L453
    return new GeoTIFFImage(
      ifd.fileDirectory,
      ifd.geoKeyDirectory,
      tiff.dataView,
      tiff.littleEndian,
      tiff.cache,
      tiff.source
    );
  };
}