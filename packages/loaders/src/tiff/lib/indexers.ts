/* eslint-disable no-use-before-define */
import { GeoTIFFImage, GeoTIFF } from 'geotiff';
import type { OmeTiffSelection } from './utils';
import type { OmeXml } from '../../omexml';
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
  imageMeta: OmeXml[number],
  imageIfdOffset = 0
) {
  const ifds: ImageFileDirectory[] = [];
  const { SizeT, SizeC, SizeZ } = imageMeta.Pixels;

  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const baseIndex = getRelativeSelectionIfd(sel, imageMeta) + imageIfdOffset;
    const baseImage = await tiff.getImage(baseIndex);

    // It's the highest resolution, no need to look up SubIFDs.
    if (pyramidLevel === 0) {
      return baseImage;
    }

    let index: number;
    if (!baseImage.fileDirectory.SubIFDs) {
      index = baseIndex + pyramidLevel * SizeZ * SizeT * SizeC;
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
function getRelativeSelectionIfd(
  sel: OmeTiffSelection,
  imageMeta: OmeXml[number]
): number {
  const { t, c, z } = sel;
  const { SizeC, SizeZ, SizeT, DimensionOrder } = imageMeta['Pixels'];
  switch (DimensionOrder) {
    case 'XYZCT':
      return t * SizeZ * SizeC + c * SizeZ + z;
    case 'XYZTC':
      return c * SizeZ * SizeT + t * SizeZ + z;
    case 'XYCTZ':
      return z * SizeC * SizeT + t * SizeC + c;
    case 'XYCZT':
      return t * SizeC * SizeZ + z * SizeC + c;
    case 'XYTCZ':
      return z * SizeT * SizeC + c * SizeT + t;
    case 'XYTZC':
      return c * SizeT * SizeZ + z * SizeT + t;
    default: {
      throw new Error(`Invalid OME-XML DimensionOrder, got ${DimensionOrder}.`);
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
