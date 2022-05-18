import { GeoTIFFImage, GeoTIFF } from 'geotiff';
import type { OmeTiffSelection } from '../ome-tiff';
import type { OMEXML } from '../../omexml';

export type OmeTiffIndexer = (
  sel: OmeTiffSelection,
  z: number
) => Promise<GeoTIFFImage>;

/*
 * An "indexer" for a GeoTIFF-based source is a function that takes a
 * "selection" (e.g. { z, t, c }) and returns a Promise for the GeoTIFFImage
 * object corresponding to that selection.
 *
 * For OME-TIFF images, the "selection" object is the same regardless of
 * the format version. However, modern version of Bioformats have a different
 * memory layout for pyramidal resolutions. Thus, we have two different "indexers"
 * depending on which format version is detected.
 *
 * TODO: We currently only support indexing the first image in the OME-TIFF with
 * our indexers. There can be multiple images in an OME-TIFF, so supporting these
 * images will require extending these indexers or creating new methods.
 */

/*
 * Returns an indexer for legacy Bioformats images. This assumes that
 * downsampled resolutions are stored sequentially in the OME-TIFF.
 */
export function getOmeLegacyIndexer(
  tiff: GeoTIFF,
  rootMeta: OMEXML
): OmeTiffIndexer {
  const { SizeT, SizeC, SizeZ } = rootMeta[0].Pixels;
  const ifdIndexer = getOmeIFDIndexer(rootMeta, 0);

  return (sel: OmeTiffSelection, pyramidLevel: number) => {
    // Get IFD index at base pyramid level
    const index = ifdIndexer(sel);
    // Get index of first image at pyramidal level
    const pyramidIndex = pyramidLevel * SizeZ * SizeT * SizeC;
    // Return image at IFD index for pyramidal level
    return tiff.getImage(index + pyramidIndex);
  };
}

/*
 * Returns an indexer for modern Bioforamts images that store multiscale
 * resolutions using SubIFDs.
 *
 * The ifdIndexer returns the 'index' to the base resolution for a
 * particular 'selection'. The SubIFDs to the downsampled resolutions
 * of the 'selection' are stored within the `baseImage.fileDirectory`.
 * We use the SubIFDs to get the IFD for the corresponding sub-resolution.
 *
 * NOTE: This function create a custom IFD cache rather than mutating
 * `GeoTIFF.ifdRequests` with a random offset. The IFDs are cached in
 * an ES6 Map that maps a string key that identifies the selection uniquely
 * to the corresponding IFD.
 */
export function getOmeSubIFDIndexer(
  tiff: GeoTIFF,
  rootMeta: OMEXML,
  image: number = 0
): OmeTiffIndexer {
  const ifdIndexer = getOmeIFDIndexer(rootMeta, image);
  const ifdCache: Map<
    string,
    ReturnType<GeoTIFF['parseFileDirectoryAt']>
  > = new Map();

  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const index = ifdIndexer(sel);
    const baseImage = await tiff.getImage(index);

    // It's the highest resolution, no need to look up SubIFDs.
    if (pyramidLevel === 0) {
      return baseImage;
    }

    const { SubIFDs } = baseImage.fileDirectory;
    if (!SubIFDs) {
      throw Error('Indexing Error: OME-TIFF is missing SubIFDs.');
    }

    // Get IFD for the selection at the pyramidal level
    const key = `${sel.t}-${sel.c}-${sel.z}-${pyramidLevel}`;
    if (!ifdCache.has(key)) {
      // Only create a new request if we don't have the key.
      const subIfdOffset = SubIFDs[pyramidLevel - 1];
      ifdCache.set(key, tiff.parseFileDirectoryAt(subIfdOffset));
    }
    const ifd = await ifdCache.get(key)!;

    // Create a new image object manually from IFD
    return new GeoTIFFImage(
      ifd.fileDirectory,
      ifd.geoKeyDirectory,
      baseImage.dataView,
      tiff.littleEndian,
      tiff.cache,
      tiff.source
    );
  };
}

/*
 * Returns a function that computes the image index based on the dimension
 * order and dimension sizes.
 */
function getOmeIFDIndexer(
  rootMeta: OMEXML,
  image: number = 0
): (sel: OmeTiffSelection) => number {
  const { SizeC, SizeZ, SizeT, DimensionOrder } = rootMeta[image].Pixels;
  // For multi-image OME-TIFF files, we need to offset by the full dimensions
  // of the previous images dimensions i.e Z * C * T of image - 1 + that of image - 2 etc.
  let imageOffset = 0;
  if (image > 0) {
    for (let i = 0; i < image; i += 1) {
      const { SizeC: prevSizeC, SizeZ: prevSizeZ, SizeT: prevSizeT } = rootMeta[
        i
      ].Pixels;
      imageOffset += prevSizeC * prevSizeZ * prevSizeT;
    }
  }
  switch (DimensionOrder) {
    case 'XYZCT': {
      return ({ t, c, z }) => imageOffset + t * SizeZ * SizeC + c * SizeZ + z;
    }
    case 'XYZTC': {
      return ({ t, c, z }) => imageOffset + c * SizeZ * SizeT + t * SizeZ + z;
    }
    case 'XYCTZ': {
      return ({ t, c, z }) => imageOffset + z * SizeC * SizeT + t * SizeC + c;
    }
    case 'XYCZT': {
      return ({ t, c, z }) => imageOffset + t * SizeC * SizeZ + z * SizeC + c;
    }
    case 'XYTCZ': {
      return ({ t, c, z }) => imageOffset + z * SizeT * SizeC + c * SizeT + t;
    }
    case 'XYTZC': {
      return ({ t, c, z }) => imageOffset + c * SizeT * SizeZ + z * SizeT + t;
    }
    default: {
      throw new Error(`Invalid OME-XML DimensionOrder, got ${DimensionOrder}.`);
    }
  }
}
