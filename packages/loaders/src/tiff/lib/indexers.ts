import { type GeoTIFF, GeoTIFFImage } from 'geotiff';
import type { MultiTiffImage } from '../multi-tiff';
import type { OmeTiffSelection } from './utils';

type ImageFileDirectory = Awaited<ReturnType<GeoTIFF['parseFileDirectoryAt']>>;

export type OmeTiffIndexer = (
  sel: OmeTiffSelection,
  resolutionLevel: number
) => Promise<GeoTIFFImage>;

/**
 * A function that resolves a given selection to a GeoTIFF and IFD index.
 *
 * Ideally we could just return the GeoTIFFImage, but for the legacy
 * bioformats case we need to return the GeoTIFF object and the IFD index.
 */
export type OmeTiffResolver = (
  sel: OmeTiffSelection
) =>
  | { tiff: GeoTIFF; ifdIndex: number }
  | Promise<{ tiff: GeoTIFF; ifdIndex: number }>;

/*
 * An "indexer" for a GeoTIFF-based source is a function that takes a
 * "selection" (e.g. { z, t, c }) and returns a Promise for the GeoTIFFImage
 * object corresponding to that selection.
 *
 * For OME-TIFF images, the "selection" object is the same regardless of
 * the format version. However, modern version of Bioformats have a different
 * memory layout for pyramidal resolutions. Thus, we have different "indexers"
 * depending on which format version is detected.
 */
export function createOmeImageIndexerFromResolver(
  resolveBaseResolutionImageLocation: OmeTiffResolver,
  image: {
    size: { z: number; t: number; c: number };
  }
) {
  const ifdCache: ImageFileDirectory[] = [];
  return async (sel: OmeTiffSelection, pyramidLevel: number) => {
    const { tiff, ifdIndex } = await resolveBaseResolutionImageLocation(sel);
    const baseImage = await tiff.getImage(ifdIndex);

    // It's the highest resolution, no need to look up SubIFDs.
    if (pyramidLevel === 0) {
      return baseImage;
    }

    let index: number;
    if (baseImage.fileDirectory.SubIFDs) {
      index = baseImage.fileDirectory.SubIFDs[pyramidLevel - 1];
    } else {
      // Legacy Bioformats OME-TIFFs don't have SubIFDs, and instead
      // store each resolution level in a separate IFD at the end
      // of the base image.
      const resolutionOffset =
        pyramidLevel * image.size.z * image.size.t * image.size.c;
      index = ifdIndex + resolutionOffset;
    }

    if (!ifdCache[index]) {
      ifdCache[index] = await tiff.parseFileDirectoryAt(index);
    }
    const ifd = ifdCache[index];

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
