import type { GeoTIFFImage } from 'geotiff';
import type { DimensionOrder } from '../../omexml';
import { DTYPE_LOOKUP, getLabels } from '../../utils';

// Inspired by/borrowed from https://geotiffjs.github.io/geotiff.js/geotiffimage.js.html#line297
function guessDataType(image: GeoTIFFImage) {
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

export function getTiffMeta(
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
  const dtype = guessDataType(firstImage);
  return { shape, labels, dtype };
}

function generatePixelMedatata(
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

export function generateMetadata(
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

  const pixels = generatePixelMedatata(
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

export function getParsedFilename(path: string) {
  const parsedFilename: { filename?: string; extension?: string } = {};
  const filename = path.split('/').pop();
  const splitFilename = filename?.split('.');
  if (splitFilename) {
    parsedFilename.filename = splitFilename.slice(0, -1).join('.');
    [, parsedFilename.extension] = splitFilename;
  }
  return parsedFilename;
}
