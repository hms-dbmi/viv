import { decompress } from 'lzw-tiff-decoder';
import { BaseDecoder } from 'geotiff';

interface FileDirectory {
  TileWidth?: number;
  TileLength?: number;
  ImageWidth: number;
  ImageLength: number;
  BitsPerSample: number[];
}

export default class LZWDecoder extends BaseDecoder {
  maxUncompressedSize: number;

  constructor(fileDirectory: FileDirectory) {
    super();
    const width = fileDirectory.TileWidth || fileDirectory.ImageWidth;
    const height = fileDirectory.TileLength || fileDirectory.ImageLength;
    const nbytes = fileDirectory.BitsPerSample[0] / 8;
    this.maxUncompressedSize = width * height * nbytes;
  }

  async decodeBlock(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const decoded = await decompress(bytes, this.maxUncompressedSize);
    return decoded.buffer;
  }
}
