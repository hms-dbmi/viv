import { range } from '../layers/VivViewerLayer/utils';

export default class ZarrLoader {
  constructor(data, isRgb, scale, dimensions) {
    let base;
    if (Array.isArray(data)) {
      this.isPyramid = true;
      this.numLevels = data.length;
      [base] = data;
    } else {
      this.isPyramid = false;
      this.numLevels = 1;
      base = data;
    }
    const { dtype } = base;
    this.dtype = dtype;
    this._data = data;
    this.scale = scale;
    this.chunkIndex = Array(base.shape.length).fill(0);
    if (isRgb) {
      this.channelIndex = base.shape.length - 1;
      this.xIndex = base.shape.length - 2;
      this.yIndex = base.shape.length - 3;
    } else {
      this.xIndex = base.shape.length - 1;
      this.yIndex = base.shape.length - 2;
      this.channelIndex = base.shape.length - 3;
    }
    this.channelChunkSize = base.chunks[this.channelIndex];
    this.dimensions = dimensions;
    this.dimNames = Object.keys(dimensions);
    this.tileSize = base.chunks[this.xIndex];
    this.type = 'zarr';
  }

  get _base() {
    return this.isPyramid ? this._data[0] : this._data;
  }

  setChunkIndex(dimName, index) {
    const chunkIndex = [...this.chunkIndex];
    if (typeof dimName === 'string') {
      // Just change index across one axis
      const i = this.dimNames.indexOf(dimName);
      chunkIndex[i] = index;
    } else if (dimName.length !== index.length) {
      throw Error(
        `Dimension names and indicies must be same length when set together`
      );
    } else {
      for (let i = 0; i < dimName.length; i += 1) {
        const dimIndex = this.dimNames.indexOf(dimName[i]);
        chunkIndex[dimIndex] = index[i];
      }
    }
    this.chunkIndex = chunkIndex;
  }

  async getTile({ x, y, z }) {
    const source = this.isPyramid ? this._data[z] : this._data;

    const chunkKey = [...this.chunkIndex];
    chunkKey[this.xIndex] = x;
    chunkKey[this.yIndex] = y;

    if (this.isRgb) {
      // Return one interleaved TypedArray
      const imageTile = await source.getRawChunk(chunkKey);
      return imageTile.data;
    }

    const { data } = await source.getRawChunk(chunkKey);
    // Return Array of TypedArrays
    if (this.channelChunkSize > 1) {
      return this._decodeChannels(data);
    }
    return [data];
  }

  async getRaster({ z }) {
    const source = this.isPyramid ? this._data[z] : this._data;
    const height = source.shape[this.yIndex];
    const width = source.shape[this.xIndex];
    const selection = [...this.chunkIndex];
    selection[this.xIndex] = null;
    selection[this.yIndex] = null;
    if (this.isPyramid) {
      selection[this.channelIndex] = null;
    }
    const { data } = await source.getRaw(selection);
    if (this.channelChunkSize > 1) {
      return { data: this._decodeChannels(data), width, height };
    }
    return { data: [data], width, height };
  }

  // eslint-disable-next-line class-methods-use-this
  onTileError(err) {
    // Handle zarr-specific tile Errors
    // Will check with `err instanceof BoundCheckError` when merged
    // https://github.com/gzuidhof/zarr.js/issues/47
    if (!err.message.includes('RangeError')) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }

  getRasterSize({ z }) {
    const source = z ? this._data[z] : this._base;
    const imageHeight = source.shape[this.yIndex];
    const imageWidth = source.shape[this.xIndex];
    return { imageHeight, imageWidth };
  }

  // eslint-disable-next-line class-methods-use-this
  onTileError(err) {
    // Handle zarr-specific tile Errors
    // Will check with `err instanceof BoundCheckError` when merged
    // https://github.com/gzuidhof/zarr.js/issues/47
    if (!err.message.includes('RangeError')) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }

  _decodeChannels(chunkData) {
    // Used for multichannel images where channels are in same chunk.
    // Separates single TypedArray into multiple channel views.
    const offset = chunkData.length / this.channelChunkSize;
    const tileData = range(this.channelChunkSize).map(i =>
      chunkData.subarray(offset * i, offset * i + offset)
    );
    return tileData;
  }
}
