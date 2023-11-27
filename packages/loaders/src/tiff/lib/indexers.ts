/* eslint-disable no-use-before-define */
import { GeoTIFFImage, GeoTIFF } from 'geotiff';
import type { OmeTiffSelection } from './utils';
import type { DimensionOrder } from '../../omexml';
import type { MultiTiffImage } from '../multi-tiff';

export type OmeTiffIndexer = (
  sel: OmeTiffSelection,
  resolutionLevel: number
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
export function getOmeTiffIndexer(
  tiff: GeoTIFF,
  options: {
    size: { t: number; z: number; c: number };
    dimensionOrder: DimensionOrder;
    imageIfdOffset: number;
  }
) {
  const { size, dimensionOrder, imageIfdOffset } = options;
  const ifds: ImageFileDirectory[] = [];
  const getRelativeIfdIndex = getRelativeIfdIndexer(size, dimensionOrder);

  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const baseIndex = getRelativeIfdIndex(sel) + imageIfdOffset;
    const baseImage = await tiff.getImage(baseIndex);

    // It's the highest resolution, no need to look up SubIFDs.
    if (pyramidLevel === 0) {
      return baseImage;
    }

    let index: number;
    if (!baseImage.fileDirectory.SubIFDs) {
      index = baseIndex + pyramidLevel * size.z * size.t * size.c;
    } else {
      index = baseImage.fileDirectory.SubIFDs[pyramidLevel - 1];
    }

    if (!ifds[index]) {
      ifds[index] = await tiff.parseFileDirectoryAt(index);
    }

    const ifd = ifds[index];

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

type ImageFileDirectory = Awaited<ReturnType<GeoTIFF['parseFileDirectoryAt']>>;

/*
 * Returns a function that computes the image index based on the dimension
 * order and dimension sizes.
 */
function getRelativeIfdIndexer(
  size: { z: number; t: number; c: number },
  dimensionOrder: DimensionOrder
): (sel: OmeTiffSelection) => number {
  switch (dimensionOrder) {
    case 'XYZCT':
      return ({ t, c, z }) => t * size.z * size.c + c * size.z + z;
    case 'XYZTC':
      return ({ t, c, z }) => c * size.z * size.t + t * size.z + z;
    case 'XYCTZ':
      return ({ t, c, z }) => z * size.c * size.t + t * size.c + c;
    case 'XYCZT':
      return ({ t, c, z }) => t * size.c * size.z + z * size.c + c;
    case 'XYTCZ':
      return ({ t, c, z }) => z * size.t * size.c + c * size.t + t;
    case 'XYTZC':
      return ({ t, c, z }) => c * size.t * size.z + z * size.t + t;
    default: {
      throw new Error(`Invalid OME-XML DimensionOrder, got ${dimensionOrder}.`);
    }
  }
}

export function getMultiTiffIndexer(tiffs: MultiTiffImage[]) {
  function selectionToKey({ c = 0, t = 0, z = 0 }: OmeTiffSelection): string {
    return `${c}-${t}-${z}`;
  }
  const lookup = new Map(
    tiffs.map(({ selection, tiff }) => [selectionToKey(selection), tiff])
  );
  return async (sel: OmeTiffSelection) => {
    const key = selectionToKey(sel);
    const img = lookup.get(key);
    if (!img) throw new Error(`No image available for selection ${key}`);
    return img;
  };
}
