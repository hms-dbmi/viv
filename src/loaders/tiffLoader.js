import OMEXML from './omeXML';
import { range } from '../layers/VivViewerLayer/utils';
import { MAX_SLIDERS_AND_CHANNELS } from '../layers/constants';

export default class TiffLoader {
  constructor(tiff, pool) {
    this.pool = pool;
    this.tiff = tiff;
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      allowBooleanAttributes: true
    };
    // get first image's description, which contains OMEXML
    const { ImageDescription } = tiff.fileDirectories[0][0];
    this.OMEXML = new OMEXML(ImageDescription);
    this.minZoom = -1 * this.OMEXML.getNumberOfImages();
    this.SizeC = this.OMEXML.SizeC;
    this.channelNames = this.OMEXML.getChannelNames();
    this.DimensionOrder = this.OMEXML.DimensionOrder;
    this.imageWidth = this.OMEXML.SizeX;
    this.imageHeight = this.OMEXML.SizeY;
    // this is spatial z, not to be confused with pyramidal z below in getTile
    this.SizeZ = this.OMEXML.SizeZ;
    this.SizeT = this.OMEXML.SizeT;
    this.chunkIndex = [];
    this.isPyramid = !!this.minZoom;
    const type = this.OMEXML.Type;
    // this.tileSize = firstImage.getTileWidth();
    if (type == 'uint8') {
      this.dtype = '<u1';
    }
    if (type == 'uint16') {
      this.dtype = '<u2';
    }
    if (type == 'uint32') {
      this.dtype = '<u4';
    }
    if (type == 'float32') {
      this.dtype = '<f4';
    }
  }

  get vivMetadata() {
    // Get other properties for viewer
    const { minZoom, imageWidth, imageHeight, tileSize, dtype } = this;
    return {
      minZoom,
      imageWidth,
      imageHeight,
      tileSize,
      dtype
    };
  }

  // z and t are both numbers while c should be a channel name
  addIndex({ z, c, t }) {
    if (this.chunkIndex.length < MAX_SLIDERS_AND_CHANNELS) {
      this.chunkIndex.push({ z, c, t });
    } else {
      throw new Error(
        `Index is at full capacity and cannot accept ${{ z, c, t }}`
      );
    }
  }

  // z and t are both numbers while c should be a channel name
  removeIndex({ z, c, t }) {
    const index = this.chunkIndex.indexOf({ z, c, t });
    if (index > -1) {
      this.chunkIndex.splice(this.chunkIndex.indexOf({ z, c, t }), 1);
    } else {
      throw new Error(`${{ z, c, t }} is not in index`);
    }
  }

  _getIFDIndex({ z, c, t }) {
    const cIndex = this.channelNames.indexOf(c);
    switch (this.DimensionOrder) {
      case 'XYZCT': {
        return t * this.SizeZ * this.SizeC + cIndex * this.SizeZ + z;
      }
      case 'XYZTC': {
        return cIndex * this.SizeZ * this.SizeT + t * this.SizeZ + z;
      }
      case 'XYCTZ': {
        return z * this.SizeC * this.SizeT + t * this.SizeC + cIndex;
      }
      case 'XYCZT': {
        return t * this.SizeC * this.SizeZ + z * this.SizeC + cIndex;
      }
      case 'XYTCZ': {
        return z * this.SizeT * this.SizeC + cIndex * this.SizeT + t;
      }
      case 'XYTZC': {
        return cIndex * this.SizeT * this.SizeZ + z * this.SizeT + t;
      }
    }
  }

  async getTile({ x, y, z }) {
    const tileRequests = this.chunkIndex.map(async index => {
      const imageIndex = this._getIFDIndex(index);
      const image = await this.tiff.getImage(imageIndex);
      return this._getChannel({ image, x, y });
    });
    const tiles = await Promise.all(tileRequests);
    return tiles;
  }

  async getRaster() {
    // hardcoded
    const rasters = await Promise.all(
      this.chunkIndex.map(async index => {
        const imageIndex = this._getIFDIndex(index);
        const image = await this.tiff.getImage(imageIndex);
        const raster = await image.readRasters();
        return raster[0];
      })
    );
    return rasters;
  }

  async _getChannel({ image, x, y }) {
    const tile = await image.getTileOrStrip(x, y, 0, this.pool);
    const is8Bits = image.fileDirectory.BitsPerSample[0] === 8;
    const is16Bits = image.fileDirectory.BitsPerSample[0] === 16;
    const is32Bits = image.fileDirectory.BitsPerSample[0] === 32;
    const data =
      (is8Bits && new Uint8Array(tile.data)) ||
      (is16Bits && new Uint16Array(tile.data)) ||
      (is32Bits && new Uint32Array(tile.data));
    return data;
  }
}
