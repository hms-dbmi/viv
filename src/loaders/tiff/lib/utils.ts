import type { GeoTIFFImage } from 'geotiff';
import { getDims, getLabels, DTYPE_LOOKUP } from '../../utils';
import type { OMEXML, UnitsLength, DimensionOrder } from '../../omexml';

export function getOmePixelSourceMeta({ Pixels }: OMEXML[0]) {
  // e.g. 'XYZCT' -> ['t', 'c', 'z', 'y', 'x']
  const labels = getLabels(Pixels.DimensionOrder);

  // Compute "shape" of image
  const dims = getDims(labels);
  const shape: number[] = Array(labels.length).fill(0);
  shape[dims('t')] = Pixels.SizeT;
  shape[dims('c')] = Pixels.SizeC;
  shape[dims('z')] = Pixels.SizeZ;

  // Push extra dimension if data are interleaved.
  if (Pixels.Interleaved) {
    // @ts-ignore
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

  if (!(Pixels.Type in DTYPE_LOOKUP)) {
    throw Error(`Pixel type ${Pixels.Type} not supported.`);
  }

  const dtype = DTYPE_LOOKUP[Pixels.Type as keyof typeof DTYPE_LOOKUP];
  if (Pixels.PhysicalSizeX && Pixels.PhysicalSizeY) {
    const physicalSizes: {
      [k: string]: { size: number; unit: UnitsLength };
    } = {
      x: {
        size: Pixels.PhysicalSizeX,
        unit: Pixels.PhysicalSizeXUnit
      },
      y: {
        size: Pixels.PhysicalSizeY,
        unit: Pixels.PhysicalSizeYUnit
      }
    };
    if (Pixels.PhysicalSizeZ) {
      physicalSizes.z = {
        size: Pixels.PhysicalSizeZ,
        unit: Pixels.PhysicalSizeZUnit
      };
    }
    return { labels, getShape, physicalSizes, dtype };
  }

  return { labels, getShape, dtype };
}

// Inspired by/borrowed from https://geotiffjs.github.io/geotiff.js/geotiffimage.js.html#line297
function guessImageDataType(image: GeoTIFFImage) {
  // Assuming these are flat TIFFs, just grab the info for the first image/sample.
  const sampleIndex = 0;
  const format = image.fileDirectory.SampleFormat
    ? image.fileDirectory.SampleFormat[sampleIndex]
    : 1;
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

export function getMultiTiffMeta(
  dimensionOrder: DimensionOrder,
  tiffs: GeoTIFFImage[]
) {
  const firstImage = tiffs[0];
  // Currently only supports flat tiffs, so set timepoints and z layers to 1.
  const shape = [
    1,
    tiffs.length,
    1,
    firstImage.getHeight(),
    firstImage.getWidth()
  ];
  // Not sure if the order of this is important for the flat folder use case
  const labels = getLabels(dimensionOrder);
  const dtype = guessImageDataType(firstImage);
  return { shape, labels, dtype };
}

function generateMultiTiffPixelMedatata(
  imageNumber: number,
  dimensionOrder: DimensionOrder,
  width: number,
  height: number,
  z: number,
  t: number,
  dType: string,
  channelNames: string[],
  images: GeoTIFFImage[]
) {
  const channels = [];
  for (let i = 0; i < channelNames.length; i += 1) {
    channels.push({
      ID: `Channel:${imageNumber}:${i}`,
      Name: channelNames[i],
      SamplesPerPixel: images[i].getSamplesPerPixel()
    });
  }
  return {
    BigEndian: !images[0].littleEndian,
    DimensionOrder: dimensionOrder,
    ID: `Pixels:${imageNumber}`,
    SizeC: images.length,
    SizeT: t,
    SizeX: width,
    SizeY: height,
    SizeZ: z,
    Type: dType,
    Channels: channels
  };
}

export function generateMultiTiffMetadata(
  imageName: string,
  channelNames: string[],
  channelImages: GeoTIFFImage[],
  dimensionOrder: DimensionOrder,
  dType: string
) {
  const firstChannel = channelImages[0];
  const imageNumber = 0;
  const id = `Image:${imageNumber}`;
  const date = '';
  const description = '';
  const width = firstChannel.getWidth();
  const height = firstChannel.getHeight();
  const zSections = 1;
  const timepoints = 1;

  const pixels = generateMultiTiffPixelMedatata(
    imageNumber,
    dimensionOrder,
    width,
    height,
    zSections,
    timepoints,
    dType,
    channelNames,
    channelImages
  );

  const format = () => {
    return {
      'Acquisition Date': date,
      'Dimensions (XY)': `${width} x ${height}`,
      PixelsType: dType,
      'Z-sections/Timepoints': `${zSections} x ${timepoints}`,
      Channels: channelImages.length
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

// Taken from https://gist.github.com/Jezternz/c8e9fafc2c114e079829974e3764db75
export function csvStringToArray(input: string) {
  const re = /(,|\r?\n|\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^,\r\n]*))/gi;
  const result: string[][] = [[]];
  let matches;
  while ((matches = re.exec(input))) {
    if (matches[1].length && matches[1] !== ',') result.push([]);
    result[result.length - 1].push(
      matches[2] !== undefined ? matches[2].replace(/""/g, '"') : matches[3]
    );
  }
  return result;
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
