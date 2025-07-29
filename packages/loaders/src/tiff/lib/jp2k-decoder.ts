import { BaseDecoder, type TypedArray } from 'geotiff';

// @ts-ignore
// import openJpegFactory from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import openJpegFactory from './jpeg2000/openjpegjs.js';

const openjpegWasm = new URL(
  // '@cornerstonejs/codec-openjpeg/decodewasm',
  './jpeg2000/openjpegjs.wasm',
  import.meta.url
);

export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

//  OPJ_CLRSPC_UNKNOWN = -1,    /**< not supported by the library */
//  OPJ_CLRSPC_UNSPECIFIED = 0, /**< not specified in the codestream */
//  OPJ_CLRSPC_SRGB = 1,        /**< sRGB */
//  OPJ_CLRSPC_GRAY = 2,        /**< grayscale */
//  OPJ_CLRSPC_SYCC = 3,        /**< YUV */
//  OPJ_CLRSPC_EYCC = 4,        /**< e-YCC */
//  OPJ_CLRSPC_CMYK = 5         /**< CMYK */
type ColorSpace = -1 | 0 | 1 | 2 | 3 | 4 | 5;

export interface FrameInfo {
  width: number;
  height: number;
  bitsPerSample: number;
  componentCount: number;
  isSigned: boolean;
}

interface FileDirectory {
  TileWidth?: number;
  TileLength?: number;
  ImageWidth: number;
  ImageLength: number;
  BitsPerSample: number[];
  SampleFormat?: number[];
}

export interface J2KDecoder {
  /**
   * Decodes the encoded HTJ2K bitstream.  The caller must have copied the
   * HTJ2K encoded bitstream into the encoded buffer before calling this
   * method, see getEncodedBuffer() and getEncodedBytes() (latter not exported to js)
   */
  decode: () => void;
  readHeader: () => void;
  calculateSizeAtDecompositionLevel: (level: number) => Size;
  decodeSubResolution: (resolution: number, layer: number) => void;
  getBlockDimensions: () => Size;
  getColorSpace: () => ColorSpace;
  getDecodedBuffer: () => TypedArray;
  getEncodedBuffer: (length: number) => TypedArray;
  getFrameInfo: () => FrameInfo;
  getImageOffset: () => Point;
  getIsReversible: () => boolean;
  getNumDecompositions: () => number;
  getNumLayers: () => number;
  getProgressionOrder: () => number;
  getTileOffset: () => Point;
  getTileSize: () => Size;
}

export interface OpenJpegModule {
  J2KDecoder: {
    new (): J2KDecoder;
  };
}

export default class Jpeg2000Decoder extends BaseDecoder {
  private openjpeg: OpenJpegModule | null = null;
  private fileDirectory: FileDirectory;

  constructor(fileDirectory: FileDirectory) {
    super();
    this.fileDirectory = fileDirectory;
    console.log('fileDirectory', fileDirectory);
  }

  private async getOpenJPEG(): Promise<OpenJpegModule> {
    if (!this.openjpeg) {
      try {
        // biome-ignore lint/suspicious/noExplicitAny: pending better typing
        this.openjpeg = ((await openJpegFactory) as any)({
          locateFile: (file: string) => {
            if (file.endsWith('.wasm')) {
              return openjpegWasm.href;
            }
            return file;
          }
        }) as OpenJpegModule;
      } catch (error) {
        console.warn(
          'WASM version failed, JS version fallback not attempted:',
          error
        );
        throw new Error('Failed to initialize OpenJPEG codec');
      }
    }
    return this.openjpeg;
  }

  async decodeBlock(compressedImageFrame: ArrayBuffer) {
    // this is more-or-less a copy of the code in conerstone3D's decodeJPEG2000.ts
    // (or it was originally, now various changes to make it do what we need)
    try {
      const openjpeg = await this.getOpenJPEG();
      const decoder = new openjpeg.J2KDecoder();
      const buffer = new Uint8Array(compressedImageFrame);
      const encodedBufferInWASM = decoder.getEncodedBuffer(buffer.length);
      encodedBufferInWASM.set(buffer);
      decoder.decode();
      // get information about the decoded image
      const frameInfo = decoder.getFrameInfo();
      // we could probably look at the frameInfo to see if the decode method worked properly
      // it won't throw an error otherwise...
      if (frameInfo.width === 0 || frameInfo.height === 0) {
        throw new Error('Failed to decode JPEG2000 image');
      }
      // get the decoded pixels
      const decodedBufferInWASM = decoder.getDecodedBuffer();
      // const imageFrame = new Uint8Array(decodedBufferInWASM.length);
      // imageFrame.set(decodedBufferInWASM);
      const pixelData = getPixelData(
        frameInfo,
        decodedBufferInWASM,
        this.fileDirectory
      );

      return pixelData;
    } catch (error) {
      console.error('JPEG2000 decoding failed:', error);

      // If the error is related to invalid field types, provide a more helpful message
      if (
        error instanceof RangeError &&
        error.message.includes('Invalid field type')
      ) {
        throw new Error(
          `TIFF file appears to be corrupted with invalid field type. This may be due to file corruption or an unsupported TIFF variant. Original error: ${error.message}`
        );
      }

      throw error;
    }
  }
}
function getPixelData(
  frameInfo: FrameInfo,
  decodedBuffer: TypedArray,
  fileDirectory?: FileDirectory
) {
  // Debug what the TIFF metadata says vs what the WASM module says
  // console.log('JPEG2000 data type debug:', {
  //   frameInfo,
  //   fileDirectory: fileDirectory ? {
  //     BitsPerSample: fileDirectory.BitsPerSample,
  //     SampleFormat: fileDirectory.SampleFormat,
  //     ImageWidth: fileDirectory.ImageWidth,
  //     ImageLength: fileDirectory.ImageLength
  //   } : null,
  //   decodedBufferLength: decodedBuffer.length,
  //   decodedBufferByteLength: decodedBuffer.byteLength,
  //   decodedBufferByteOffset: decodedBuffer.byteOffset,
  //   firstFewValues: Array.from(decodedBuffer.slice(0, 10))
  // });

  // Use TIFF metadata to determine if data is signed
  const isSigned = fileDirectory?.SampleFormat?.[0] === 2 || frameInfo.isSigned;

  let pixelData: TypedArray;
  if (frameInfo.bitsPerSample > 8) {
    // For 16-bit data, create the appropriate TypedArray directly
    // The WASM module should return data in the correct byte order for the platform
    if (isSigned) {
      pixelData = new Int16Array(
        decodedBuffer.buffer,
        decodedBuffer.byteOffset,
        decodedBuffer.byteLength / 2
      );
    } else {
      pixelData = new Uint16Array(
        decodedBuffer.buffer,
        decodedBuffer.byteOffset,
        decodedBuffer.byteLength / 2
      );
    }
  } else {
    pixelData = isSigned
      ? new Int8Array(
          decodedBuffer.buffer,
          decodedBuffer.byteOffset,
          decodedBuffer.byteLength
        )
      : new Uint8Array(
          decodedBuffer.buffer,
          decodedBuffer.byteOffset,
          decodedBuffer.byteLength
        );
  }

  // Return a buffer containing only the pixel data
  return pixelData.buffer.slice(
    pixelData.byteOffset,
    pixelData.byteOffset + pixelData.byteLength
  );
}

// Register the decoder with geotiff
// JPEG2000 compression code in TIFF
// const JPEG2000_COMPRESSION = 34712; // this is what we observe `getDecoder` using internally (slightly sidetracked by another image having 8)
// try {
//   addDecoder(JPEG2000_COMPRESSION, () => {
//     return Promise.resolve(Jpeg2000Decoder);
//   });
// } catch (error) {
//   console.error("Failed to register JPEG2000 decoder:", error);
// }
