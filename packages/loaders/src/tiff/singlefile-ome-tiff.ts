import { fromString } from '../omexml';

import type GeoTIFF from 'geotiff';
import type { DimensionOrder, OmeXmlParsed } from '../omexml';
import type Pool from './lib/Pool';
import { createOmeImageIndexerFromResolver } from './lib/indexers';
import {
  type OmeTiffDims,
  type OmeTiffSelection,
  createGeoTiff,
  extractAxesFromPixels,
  extractPhysicalSizesfromPixels,
  getShapeForBinaryDownsampleLevel,
  getTiffTileSize,
  parsePixelDataType
} from './lib/utils';
import TiffPixelSource from './pixel-source';

function resolveMetadata(omexml: OmeXmlParsed, SubIFDs: number[] | undefined) {
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

    const { ROIRef: _omitROIRef, ...imageWithoutRefs } = image as any;
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

type OmeTiffImage = {
  data: TiffPixelSource<OmeTiffDims>[];
  metadata: any;
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
  let imageIfdOffset = 0;

  for (const metadata of rootMeta) {
    const imageSize = {
      z: metadata['Pixels']['SizeZ'],
      c: metadata['Pixels']['SizeC'],
      t: metadata['Pixels']['SizeT']
    };
    const axes = extractAxesFromPixels(metadata['Pixels']);
    const pyramidIndexer = createSingleFileOmeTiffPyramidalIndexer(tiff, {
      size: imageSize,
      ifdOffset: imageIfdOffset,
      dimensionOrder: metadata['Pixels']['DimensionOrder']
    });
    const dtype = parsePixelDataType(metadata['Pixels']['Type']);
    const tileSize = getTiffTileSize(
      await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0)
    );
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        firstImage.fileDirectory.PhotometricInterpretation
    };
    const data = Array.from(
      { length: levels },
      (_, level) =>
        new TiffPixelSource(
          sel => pyramidIndexer(sel, level),
          dtype,
          tileSize,
          getShapeForBinaryDownsampleLevel({ axes, level }),
          axes.labels,
          meta,
          pool
        )
    );
    images.push({ data, metadata });
    imageIfdOffset += imageSize.t * imageSize.z * imageSize.c;
  }
  return images;
}
