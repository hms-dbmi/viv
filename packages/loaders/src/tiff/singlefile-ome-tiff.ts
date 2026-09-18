import { fromString } from '../omexml';

import type GeoTIFF from 'geotiff';
import type { DimensionOrder, OmeXml } from '../omexml';
import type { DecodePool } from './lib/Pool';
import { createOmeImageIndexerFromResolver } from './lib/indexers';
import {
  type OmeTiffDims,
  type OmeTiffSelection,
  PHOTOMETRIC_BLACK_IS_ZERO,
  PHOTOMETRIC_RGB,
  type PackedRgbLayout,
  createGeoTiff,
  extractAxesFromPixels,
  extractPhysicalSizesfromPixels,
  getShapeForLevel,
  getTiffTileSize,
  guessImageDataType,
  isPackedRgbTiffImage,
  padTiffSampleTags,
  parsePixelDataType
} from './lib/utils';
import TiffPixelSource from './pixel-source';

type OmeImageIfdShape = {
  Pixels?: { SizeZ?: number; SizeC?: number; SizeT?: number };
};

/**
 * Extra OME `<Image>` entries (copied from a companion IF file) often have no
 * matching TIFF IFDs. `GeoTIFF.getImageCount()` is the number of top-level
 * IFDs (SubIFD pyramid levels are not counted). Keep a prefix of Images whose
 * planes fit that count; always keep the first Image even if its SizeC*Z*T is
 * larger than `imageCount` (packed RGB, or a 1-IFD mask with inflated SizeC).
 */
function rootMetaForAvailableIfds<T extends OmeImageIfdShape>(
  images: T[],
  imageCount: number,
  packedRgb: boolean
): T[] {
  if (images.length <= 1) return images;
  const out: T[] = [];
  let used = 0;
  for (const image of images) {
    const p = image.Pixels;
    const c = packedRgb ? 1 : Math.max(1, p?.SizeC ?? 1);
    const n = Math.max(1, p?.SizeZ ?? 1) * c * Math.max(1, p?.SizeT ?? 1);
    if (out.length > 0 && used + n > imageCount) break;
    out.push(image);
    used += n;
  }
  return out;
}

function resolveMetadata(omexml: OmeXml, SubIFDs: number[] | undefined) {
  const rois = omexml.rois || [];
  const roiRefs = omexml.roiRefs || [];

  // Create a map of ROI IDs to ROI objects for quick lookup
  const roiMap = new Map(rois.map(roi => [roi.ID, roi]));

  // Add ROIs to images based on ROIRefs
  const images = (omexml.images || []).map(image => {
    // Find ROIRefs that reference this image (if any)
    const imageROIRefs = roiRefs.filter(roiRef => {
      // ROIRefs might have an ImageRef or be associated with the image
      // For now, we'll include all ROIRefs since we don't have explicit image association
      return true; // TODO: Add proper image-ROI association logic
    });

    // Get the actual ROI objects referenced by the ROIRefs
    const imageROIs = imageROIRefs
      .map(roiRef => roiMap.get(roiRef.ID))
      .filter(Boolean);

    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });

  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return { levels: SubIFDs.length + 1, rootMeta: images };
  }
  // Image is legacy format; resolutions are stored as separate images.
  // We do not allow multi-images for legacy format.
  const firstImageMetadata = images[0];
  return { levels: images.length, rootMeta: [firstImageMetadata] };
}

/*
 * Returns the relative IFD index given the selection and the size of the image.
 *
 * This is is necessary because the IFD ordering is implicitly defined by the
 * dimension order.
 *
 * @param sel - The desired plane selection.
 * @param size - The size of each (z, t, c) dimension from the OME-XML.
 * @param dimensionOrder - The dimension order of the image from the OME-XML.
 */
function getRelativeOmeIfdIndex(
  { z, t, c }: OmeTiffSelection,
  image: {
    size: OmeTiffSelection;
    dimensionOrder: DimensionOrder;
  }
) {
  const { size, dimensionOrder } = image;
  switch (image.dimensionOrder) {
    case 'XYZCT':
      return z + size.z * c + size.z * size.c * t;
    case 'XYZTC':
      return z + size.z * t + size.z * size.t * c;
    case 'XYCTZ':
      return c + size.c * t + size.c * size.t * z;
    case 'XYCZT':
      return c + size.c * z + size.c * size.z * t;
    case 'XYTCZ':
      return t + size.t * c + size.t * size.c * z;
    case 'XYTZC':
      return t + size.t * z + size.t * size.z * c;
    default:
      throw new Error(`Invalid dimension order: ${dimensionOrder}`);
  }
}

/**
 * Creates an OmeTiffResolver for a single-file OME-TIFF.
 *
 * The tiff always resolves to the same file. The IFD index is calculated
 * based on the selection and.
 */
function createSingleFileOmeTiffPyramidalIndexer(
  tiff: GeoTIFF,
  image: {
    // The offset of the first IFD for this multi-dim image.
    ifdOffset: number;
    // The size of each (z, t, c) dimension from the OME-XML.
    size: { t: number; z: number; c: number };
    // The dimension order of the image from the OME-XML.
    dimensionOrder: DimensionOrder;
  }
) {
  return createOmeImageIndexerFromResolver(sel => {
    const withinImageIndex = getRelativeOmeIfdIndex(sel, image);
    const ifdIndex = withinImageIndex + image.ifdOffset;
    return { tiff, ifdIndex };
  }, image);
}

/**
 * Collapse OME SizeC=3 sample metadata into a single interleaved RGB channel
 * when TIFF tags indicate packed RGB (one IFD, spp=3, photometric RGB/YCbCr).
 */
function collapsePackedRgbPixelsMetadata(
  metadata: OmeXml[number],
  vivDtype: string
) {
  const pixels = metadata.Pixels;
  const firstChannel = pixels.Channels?.[0] ?? {};
  return {
    ...metadata,
    Pixels: {
      ...pixels,
      SizeC: 1,
      Interleaved: true,
      Type: vivDtype,
      Channels: [
        {
          ...firstChannel,
          SamplesPerPixel: 3
        }
      ]
    }
  };
}

const PLANAR_RGB_CHANNEL_NAMES = ['R', 'G', 'B'] as const;

/**
 * Present packed RGB as three ordinary SizeC planes (SPP=1, not interleaved).
 * TIFF still has one IFD; TiffPixelSource slices sample c after one decode.
 */
function presentPackedRgbAsPlanarChannels(
  metadata: OmeXml[number],
  vivDtype: string
) {
  const pixels = metadata.Pixels;
  const src = pixels.Channels ?? [];
  const channels =
    src.length >= 3
      ? src.slice(0, 3).map((ch: { SamplesPerPixel?: number }) => ({
          ...ch,
          SamplesPerPixel: 1
        }))
      : PLANAR_RGB_CHANNEL_NAMES.map((name, i) => ({
          ...(src[0] ?? {}),
          ID: `Channel:0:${i}`,
          Name: name,
          SamplesPerPixel: 1
        }));
  return {
    ...metadata,
    Pixels: {
      ...pixels,
      SizeC: 3,
      Interleaved: false,
      Type: vivDtype,
      Channels: channels
    }
  };
}

type OmeTiffImage = {
  data: TiffPixelSource<OmeTiffDims>[];
  metadata: OmeXml[number];
};

export async function loadSingleFileOmeTiff(
  source: string | URL | File,
  options: {
    pool?: DecodePool | false;
    headers?: Headers | Record<string, string>;
    offsets?: number[];
    source?: GeoTIFF;
    packedRgb?: PackedRgbLayout;
  } = {}
) {
  const {
    offsets,
    headers,
    pool,
    source: prebuiltSource,
    packedRgb: packedRgbLayout = 'interleaved'
  } = options;
  const tiff = await createGeoTiff(source, {
    headers,
    offsets,
    source: prebuiltSource
  });
  const firstImage = await tiff.getImage();
  padTiffSampleTags(firstImage.fileDirectory);
  const packedRgb = isPackedRgbTiffImage(firstImage);

  const { rootMeta, levels } = resolveMetadata(
    fromString(firstImage.fileDirectory.ImageDescription),
    firstImage.fileDirectory.SubIFDs
  );
  const imageCount = await tiff.getImageCount();
  const usableMeta = rootMetaForAvailableIfds(rootMeta, imageCount, packedRgb);

  const images: OmeTiffImage[] = [];
  let imageIfdOffset = 0;

  for (const rawMetadata of usableMeta) {
    const vivDtype = packedRgb
      ? guessImageDataType(firstImage)
      : parsePixelDataType(rawMetadata['Pixels']['Type']);
    const presentPlanar = packedRgb && packedRgbLayout === 'planar';
    const metadata = packedRgb
      ? presentPlanar
        ? presentPackedRgbAsPlanarChannels(rawMetadata, vivDtype)
        : collapsePackedRgbPixelsMetadata(rawMetadata, vivDtype)
      : rawMetadata;

    // Packed RGB: SizeC is samples, not IFDs — always one IFD per z,t.
    const imageSize = {
      z: metadata['Pixels']['SizeZ'],
      c: packedRgb ? 1 : metadata['Pixels']['SizeC'],
      t: metadata['Pixels']['SizeT']
    };
    const axes = extractAxesFromPixels(metadata['Pixels']);
    const pyramidIndexer = createSingleFileOmeTiffPyramidalIndexer(tiff, {
      size: imageSize,
      ifdOffset: imageIfdOffset,
      dimensionOrder: metadata['Pixels']['DimensionOrder']
    });
    const tileSize = getTiffTileSize(
      await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0)
    );
    const sourcePhoto = firstImage.fileDirectory.PhotometricInterpretation;
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      sourcePhotometricInterpretation: sourcePhoto,
      photometricInterpretation: packedRgb
        ? presentPlanar
          ? PHOTOMETRIC_BLACK_IS_ZERO
          : PHOTOMETRIC_RGB
        : sourcePhoto
    };
    const data = await Promise.all(
      Array.from({ length: levels }, async (_, level) => {
        const levelImage = await pyramidIndexer({ t: 0, c: 0, z: 0 }, level);
        return new TiffPixelSource(
          sel =>
            pyramidIndexer(
              {
                t: sel.t ?? 0,
                c: packedRgb ? 0 : (sel.c ?? 0),
                z: sel.z ?? 0
              },
              level
            ),
          vivDtype,
          tileSize,
          getShapeForLevel({
            axes,
            width: levelImage.getWidth(),
            height: levelImage.getHeight()
          }),
          axes.labels,
          meta,
          pool
        );
      })
    );
    images.push({ data: data as TiffPixelSource<OmeTiffDims>[], metadata });
    imageIfdOffset += imageSize.t * imageSize.z * imageSize.c;
  }
  return images;
}
