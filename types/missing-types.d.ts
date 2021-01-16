
declare module 'geotiff' {

  function fromUrl(url: string, headers?: object): Promise<GeoTIFF>;
  function fromBlob(blob: Blob): Promise<GeoTIFF>;

  class GeoTIFF {
    getImage(index: number): Promise<GeoTIFFImage>;
    parseFileDirectoryAt(offset: number): Promise<ImageFileDirectory>;
    readRasters(options?: RasterOptions): Promise<SupportedTypedArray>;
    ifdRequests: { [key: number]: Promise<ImageFileDirectory> };
  }

  interface Pool {
    decode(fileDirectory: FileDirectory, buffer: ArrayBuffer): Promise<ArrayBuffer>;
  }

  interface RasterOptions {
    window?: number[];
    bbox?: number[];
    samples?: number[];
    interleave?: boolean;
    pool?: Pool;
    width?: number;
    height?: number;
    resampleMethod?: string;
    enableAlpha?: boolean;
  }
  
  type RasterData = [SupportedTypedArray] & { width: number, height: number };
  interface GeoTIFFImage {
    fileDirectory: FileDirectory;
    getBoundingBox(): number[];
    getFileDirectory(): FileDirectory;
    getBytesPerPixel(): number;
    getHeight(): number;
    getSamplesPerPixel(): number;
    getTileHeight(): number;
    getTileWidth(): number;
    getWidth(): number;
    readRasters(options?: RasterOptions): Promise<RasterData>;
  }


  interface FileDirectory {
    ImageDescription: string;
    SubIFDs?: number[]
  }

  interface ImageFileDirectory {
    fileDirectory: FileDirectory;
  }

}

// Imported in src/loaders/tiff/Pool/decoder.worker.js
declare module 'geotiff/src/compression' {
  import type { FileDirectory } from 'geotiff';

  interface Decoder {
    decode(fileDirectory: FileDirectory, buffer: ArrayBuffer): Promise<ArrayBuffer>;
  }
  export function getDecoder(fileDirectory: FileDirectory): Decoder;
}


declare module 'quickselect' {
  function quickselect<T>(arr: ArrayLike<T>, k?: number, left?: number, right?: number, compareFn?: (a: T, b: T) => void) {}
  export default quickselect;
}