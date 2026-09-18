import { BaseDecoder } from 'geotiff';
import { decompress } from 'lzw-tiff-decoder';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class LZWDecoder extends BaseDecoder {
  constructor(fileDirectory) {
    super();
    __publicField(this, "maxUncompressedSize");
    const width = fileDirectory.TileWidth || fileDirectory.ImageWidth;
    const height = fileDirectory.TileLength || fileDirectory.ImageLength;
    const nbytes = fileDirectory.BitsPerSample[0] / 8;
    this.maxUncompressedSize = width * height * nbytes;
  }
  async decodeBlock(buffer) {
    const bytes = new Uint8Array(buffer);
    const decoded = await decompress(bytes, this.maxUncompressedSize);
    return decoded.buffer;
  }
}

export { LZWDecoder as L };
