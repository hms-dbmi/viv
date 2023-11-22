import { fromFile, fromUrl, fromBlob } from 'geotiff';
import { getLabels, DTYPE_LOOKUP, prevPowerOf2 } from '../../utils';
import { createOffsetsProxy } from './proxies';
import type { GeoTIFF, GeoTIFFImage } from 'geotiff';
import type { OmeXml, PhysicalUnit, DimensionOrder } from '../../omexml';
import type { MultiTiffImage } from '../multi-tiff';

// TODO: Remove the fancy label stuff
export type OmeTiffDims =
  | ['t', 'c', 'z']
  | ['z', 't', 'c']
  | ['t', 'z', 'c']
  | ['c', 'z', 't']
  | ['z', 'c', 't']
  | ['c', 't', 'z'];

export interface OmeTiffSelection {
  t: number;
  c: number;
  z: number;
}

type PhysicalSize = {
  size: number;
  unit: PhysicalUnit;
};

type PhysicalSizes = {
  x: PhysicalSize;
  y: PhysicalSize;
  z?: PhysicalSize;
};

export function extractPhysicalSizesfromPixels(
  p: OmeXml[number]['Pixels']
): undefined | PhysicalSizes {
  if (
    !p['PhysicalSizeX'] ||
    !p['PhysicalSizeY'] ||
    !p['PhysicalSizeXUnit'] ||
    !p['PhysicalSizeYUnit']
  ) {
    return undefined;
  }
  const physicalSizes: PhysicalSizes = {
    x: { size: p['PhysicalSizeX'], unit: p['PhysicalSizeXUnit'] },
    y: { size: p['PhysicalSizeY'], unit: p['PhysicalSizeYUnit'] }
  };
  if (p['PhysicalSizeZ'] && p['PhysicalSizeZUnit']) {
    physicalSizes.z = {
      size: p['PhysicalSizeZ'],
      unit: p['PhysicalSizeZUnit']
    };
  }
  return physicalSizes;
}

export function extractDtypeFromPixels(p: OmeXml[number]['Pixels']) {
  if (!(p.Type in DTYPE_LOOKUP)) {
    throw Error(`Pixel type ${p.Type} not supported.`);
  }
  return DTYPE_LOOKUP[p.Type as keyof typeof DTYPE_LOOKUP];
}

export function extractAxesFromPixels(d: OmeXml[number]['Pixels']) {
  // e.g. 'XYZCT' -> ['t', 'c', 'z', 'y', 'x']
  const labels = getLabels(d['DimensionOrder']);

  // Compute "shape" of image
  const shape: number[] = Array(labels.length).fill(0);
  shape[labels.indexOf('t')] = d['SizeT'];
  shape[labels.indexOf('c')] = d['SizeC'];
  shape[labels.indexOf('z')] = d['SizeZ'];
  shape[labels.indexOf('y')] = d['SizeY'];
  shape[labels.indexOf('x')] = d['SizeX'];

  // Push extra dimension if data are interleaved.
  if (d['Interleaved']) {
    // @ts-expect-error private, unused dim name for selection
    labels.push('_c');
    shape.push(3);
  }

  return { labels, shape };
}

/**
 * Compute the shape of the image at a given resolution level.
 *
 * Assumes that the image is downsampled by a factor of 2 for each
 * pyramid level.
 */
export function getShapeForResolutionLevel({
  axes,
  resolutionLevel: level
}: {
  axes: { shape: number[]; labels: string[] };
  resolutionLevel: number;
}) {
  const { shape, labels } = axes;
  const out = [...shape];
  out[labels.indexOf('x')] = shape[labels.indexOf('x')] >> level;
  out[labels.indexOf('y')] = shape[labels.indexOf('y')] >> level;
  return out;
}

export function getTiffTileSize(image: GeoTIFFImage) {
  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();
  const size = Math.min(tileWidth, tileHeight);
  // deck.gl requirement for power-of-two tile size.
  return prevPowerOf2(size);
}

// Inspired by/borrowed from https://geotiffjs.github.io/geotiff.js/geotiffimage.js.html#line297
function guessImageDataType(image: GeoTIFFImage) {
  // Assuming these are flat TIFFs, just grab the info for the first image/sample.
  const sampleIndex = 0;
  const format = image.fileDirectory?.SampleFormat?.[sampleIndex] ?? 1;
  const bitsPerSample = image.fileDirectory.BitsPerSample[sampleIndex];
  switch (format) {
    case 1: // unsigned integer data
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP.uint8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP.uint16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP.uint32;
      }
      break;
    case 2: // twos complement signed integer data
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP.int8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP.int16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP.int32;
      }
      break;
    case 3:
      switch (bitsPerSample) {
        case 16:
          // Should be float 16, maybe 32 will work?
          // Or should we raise an error?
          return DTYPE_LOOKUP.float;
        case 32:
          return DTYPE_LOOKUP.float;
        case 64:
          return DTYPE_LOOKUP.double;
        default:
          break;
      }
      break;
    default:
      break;
  }
  throw Error('Unsupported data format/bitsPerSample');
}

function getMultiTiffShapeMap(tiffs: MultiTiffImage[]): {
  [key: string]: number;
} {
  let [c, z, t] = [0, 0, 0];
  for (const tiff of tiffs) {
    c = Math.max(c, tiff.selection.c);
    z = Math.max(z, tiff.selection.z);
    t = Math.max(t, tiff.selection.t);
  }

  const firstTiff = tiffs[0].tiff;
  return {
    x: firstTiff.getWidth(),
    y: firstTiff.getHeight(),
    z: z + 1,
    c: c + 1,
    t: t + 1
  };
}

// If a channel has multiple z or t slices with different samples per pixel
// this function will just use the samples per pixel from a random slice.
function getChannelSamplesPerPixel(
  tiffs: MultiTiffImage[],
  numChannels: number
): number[] {
  const channelSamplesPerPixel = Array(numChannels).fill(0);
  for (const tiff of tiffs) {
    const curChannel = tiff.selection.c;
    const curSamplesPerPixel = tiff.tiff.getSamplesPerPixel();
    const existingSamplesPerPixel = channelSamplesPerPixel[curChannel];
    if (
      existingSamplesPerPixel &&
      existingSamplesPerPixel != curSamplesPerPixel
    ) {
      throw Error('Channel samples per pixel mismatch');
    }
    channelSamplesPerPixel[curChannel] = curSamplesPerPixel;
  }
  return channelSamplesPerPixel;
}

export function getMultiTiffMeta(
  dimensionOrder: DimensionOrder,
  tiffs: MultiTiffImage[]
) {
  const firstTiff = tiffs[0].tiff;
  const shapeMap = getMultiTiffShapeMap(tiffs);
  const shape = [];
  for (const dim of dimensionOrder.toLowerCase()) {
    shape.unshift(shapeMap[dim]);
  }

  const labels = getLabels(dimensionOrder);
  const dtype = guessImageDataType(firstTiff);
  return { shape, labels, dtype };
}

function getMultiTiffPixelMedatata(
  imageNumber: number,
  dimensionOrder: DimensionOrder,
  shapeMap: { [key: string]: number },
  dType: string,
  tiffs: MultiTiffImage[],
  channelNames: string[],
  channelSamplesPerPixel: number[]
) {
  const channelMetadata = [];
  for (let i = 0; i < shapeMap.c; i += 1) {
    channelMetadata.push({
      ID: `Channel:${imageNumber}:${i}`,
      Name: channelNames[i],
      SamplesPerPixel: channelSamplesPerPixel[i]
    });
  }
  return {
    BigEndian: !tiffs[0].tiff.littleEndian,
    DimensionOrder: dimensionOrder,
    ID: `Pixels:${imageNumber}`,
    SizeC: shapeMap.c,
    SizeT: shapeMap.t,
    SizeX: shapeMap.x,
    SizeY: shapeMap.y,
    SizeZ: shapeMap.z,
    Type: dType,
    Channels: channelMetadata
  };
}

export function getMultiTiffMetadata(
  imageName: string,
  tiffImages: MultiTiffImage[],
  channelNames: string[],
  dimensionOrder: DimensionOrder,
  dType: string
) {
  const imageNumber = 0;
  const id = `Image:${imageNumber}`;
  const date = '';
  const description = '';
  const shapeMap = getMultiTiffShapeMap(tiffImages);
  const channelSamplesPerPixel = getChannelSamplesPerPixel(
    tiffImages,
    shapeMap.c
  );

  if (channelNames.length !== shapeMap.c)
    throw Error(
      'Wrong number of channel names for number of channels provided'
    );

  const pixels = getMultiTiffPixelMedatata(
    imageNumber,
    dimensionOrder,
    shapeMap,
    dType,
    tiffImages,
    channelNames,
    channelSamplesPerPixel
  );

  const format = () => {
    return {
      'Acquisition Date': date,
      'Dimensions (XY)': `${shapeMap.x} x ${shapeMap.y}`,
      PixelsType: dType,
      'Z-sections/Timepoints': `${shapeMap.z} x ${shapeMap.t}`,
      Channels: shapeMap.c
    };
  };
  return {
    ID: id,
    Name: imageName,
    AcquisitionDate: date,
    Description: description,
    Pixels: pixels,
    format
  };
}

export function parseFilename(path: string) {
  const parsedFilename: { name?: string; extension?: string } = {};
  const filename = path.split('/').pop();
  const splitFilename = filename?.split('.');
  if (splitFilename) {
    parsedFilename.name = splitFilename.slice(0, -1).join('.');
    [, parsedFilename.extension] = splitFilename;
  }
  return parsedFilename;
}

/**
 * Creates a GeoTIFF object from a URL, File, or Blob.
 *
 * @param source - URL, File, or Blob
 * @param options
 * @param options.headers - HTTP headers to use when fetching a URL
 */
function createGeoTiffObject(
  source: string | URL | File,
  { headers }: { headers?: Headers | Record<string, string> }
): Promise<GeoTIFF> {
  if (source instanceof Blob) {
    return fromBlob(source);
  }
  const url = typeof source === 'string' ? new URL(source) : source;
  if (url.protocol === 'file:') {
    return fromFile(url.pathname);
  }
  // https://github.com/ilan-gold/geotiff.js/tree/viv#abortcontroller-support
  // https://www.npmjs.com/package/lru-cache#options
  // Cache size needs to be infinite due to consistency issues.
  return fromUrl(url.href, { headers, cacheSize: Infinity });
}

/**
 * Creates a GeoTIFF object from a URL, File, or Blob.
 *
 * If `offsets` are provided, a proxy is returned that
 * intercepts calls to `tiff.getImage` and injects the
 * pre-computed offsets. This is a performance enhancement.
 *
 * @param source - URL, File, or Blob
 * @param options
 * @param options.headers - HTTP headers to use when fetching a URL
 */
export async function createGeoTiff(
  source: string | URL | File,
  options: {
    headers?: Headers | Record<string, string>;
    offsets?: number[];
  } = {}
): Promise<GeoTIFF> {
  const tiff = await createGeoTiffObject(source, options);
  /*
   * Performance enhancement. If offsets are provided, we
   * create a proxy that intercepts calls to `tiff.getImage`
   * and injects the pre-computed offsets.
   */
  return options.offsets ? createOffsetsProxy(tiff, options.offsets) : tiff;
}
