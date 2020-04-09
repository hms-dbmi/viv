import { isInTileBounds } from './utils';

export default class TiffPyramidLoader {
  constructor(channelPyramids, pool) {
    this.channelPyramids = channelPyramids;
    this.pool = pool;
    this.type = 'tiff';
    // hardcoded for now
    this.isPyramid = true;

    this.numLevels = channelPyramids[0].length;
    const firstFullImage = channelPyramids[0][0].fileDirectory;
    const bitsPerSample = firstFullImage.BitsPerSample;
    let dtype;
    if (bitsPerSample instanceof Uint8Array) {
      dtype = '<u1';
    }
    if (bitsPerSample instanceof Uint16Array) {
      dtype = '<u2';
    }
    if (bitsPerSample instanceof Uint32Array) {
      dtype = '<u4';
    }
    if (bitsPerSample instanceof Float32Array) {
      dtype = '<f4';
    }
    this.dtype = dtype;
    this.tileSize = firstFullImage.TileWidth;
  }

  async getTile({ x, y, z }) {
    /*
     * Geotiff's API wraps indicies while fetch fetching tiles, meaning that if
     * x or y tile coordinates are beyond the width/height of the image,
     * the tiles to the left or top are fetched. This makes sense for the
     * geospatial case (since a globe wraps) but not for our planar images.
     *
     * Here we check if a tile is within bounds before requesting tile data.
     */

    if (!this._tileInBounds({ x, y, z })) return null;

    const tileRequests = this.channelPyramids.map(channelPyramid => {
      const image = channelPyramid[z];
      return this._getChannel({ image, x, y });
    });
    const tiles = await Promise.all(tileRequests);
    return tiles;
  }

  async getRaster({ z }) {
    const width = this.channelPyramids[0][z].getWidth();
    const height = this.channelPyramids[0][z].getHeight();
    const rasterRequests = this.channelPyramids.map(async channelPyramid => {
      const image = channelPyramid[z];
      const raster = await image.readRasters();
      return raster[0];
    });
    const data = await Promise.all(rasterRequests);
    return { data, width, height };
  }

  getRasterSize({ z }) {
    const image = this.channelPyramids[0][z];
    const height = image.getWidth();
    const width = image.getHeight();
    return { width, height };
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

  // eslint-disable-next-line class-methods-use-this
  onTileError(err) {
    // Handle geotiff-specific tile errors
    console.error(err);
  }

  _tileInBounds({ x, y, z }) {
    const firstFullImage = this.channelPyramids[0][0];
    const width = firstFullImage.getWidth();
    const height = firstFullImage.getHeight();
    const { tileSize, numLevels } = this;
    return isInTileBounds({
      x,
      y,
      z,
      width,
      height,
      tileSize,
      numLevels
    });
  }
}
