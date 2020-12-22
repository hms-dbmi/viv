import { BoundsCheckError } from 'zarr';

import { guessRgb, byteSwapInplace } from './utils';
import { DTYPE_VALUES } from '../constants';
import HTTPStore from './httpStore';

/**
 * This class serves as a wrapper for fetching zarr data from a file server.
 * */
export default class ZarrLoader {
  constructor({
    data,
    dimensions,
    isRgb,
    scale = 1,
    translate = { x: 0, y: 0 }
  }) {
    let base;
    if (Array.isArray(data)) {
      [base] = data;
      this.numLevels = data.length;
    } else {
      base = data;
      this.numLevels = 1;
    }
    this.type = 'zarr';
    this.scale = scale;
    this.translate = translate;
    this.isRgb = isRgb || guessRgb(base.shape);
    this.dimensions = dimensions;

    this._data = data;
    this._dimIndices = new Map();
    dimensions.forEach(({ field }, i) => this._dimIndices.set(field, i));

    const { dtype, chunks } = base;
    /* TODO: Use better dtype convention in DTYPE_LOOKUP.
     * https://github.com/hms-dbmi/viv/issues/203
     *
     * This convension should probably _not_ describe endianness,
     * since endianness is resolved when decoding the source arrayBuffers
     * into TypedArrays. The dtype of the zarr array describes the dtype of the
     * source but this is different from how the bytes end up being represented in
     * memory client-side.
     */
    this.dtype = `<${dtype.slice(1)}`;
    this.tileSize = chunks[this._dimIndices.get('x')];
  }

  get isPyramid() {
    return Array.isArray(this._data);
  }

  get base() {
    return this.isPyramid ? this._data[0] : this._data;
  }

  /**
   * Returns image tiles at tile-position (x, y) at pyramidal level z.
   * @param {number} args
   * @param {number} args.x positive integer
   * @param {number} args.y positive integer
   * @param {number} args.z positive integer (0 === highest zoom level)
   * @param {Array} args.loaderSelection Array of valid dimension selections
   * @param {Array} args.signal AbortSignal object
   * @returns {Object} data: TypedArray[], width: number (tileSize), height: number (tileSize)
   */
  async getTile({ x, y, z, loaderSelection = [], signal }) {
    const { TypedArray } = DTYPE_VALUES[this.dtype];
    const source = this._getSource(z);
    const [xIndex, yIndex] = ['x', 'y'].map(k => this._dimIndices.get(k));

    const dataRequests = loaderSelection.map(async sel => {
      const chunkKey = this._serializeSelection(sel);
      chunkKey[yIndex] = y;
      chunkKey[xIndex] = x;

      const key = source.keyPrefix + chunkKey.join('.');
      let buffer;
      try {
        buffer = await source.store.getItem(key, { signal });
      } catch (err) {
        if (err.name !== 'AbortError') {
          throw err;
        }
        return null;
      }
      let bytes = new Uint8Array(buffer);
      if (source.compressor) {
        bytes = await source.compressor.decode(bytes);
      }
      const data = new TypedArray(bytes.buffer);
      if (source.dtype[0] === '>') {
        // big endian
        byteSwapInplace(data);
      }
      return data;
    });
    const data = await Promise.all(dataRequests);
    if (source.store instanceof HTTPStore && signal?.aborted) return null;
    const width = source.chunks[xIndex];
    const height = source.chunks[yIndex];
    return { data, width, height };
  }

  /**
   * Returns full image panes (at level z if pyramid)
   * @param {number} args
   * @param {number} args.z positive integer (0 === highest zoom level)
   * @param {Array} args.loaderSelection, Array of valid dimension selections
   * @returns {Object} data: TypedArray[], width: number, height: number
   */
  async getRaster({ z, loaderSelection = [] }) {
    const source = this._getSource(z);
    const [xIndex, yIndex] = ['x', 'y'].map(k => this._dimIndices.get(k));

    const dataRequests = loaderSelection.map(async sel => {
      const chunkKey = this._serializeSelection(sel);
      chunkKey[yIndex] = null;
      chunkKey[xIndex] = null;
      if (this.isRgb) {
        chunkKey[chunkKey.length - 1] = null;
      }
      const { data } = await source.getRaw(chunkKey);
      return data;
    });

    const data = await Promise.all(dataRequests);
    const { shape } = source;
    const width = shape[xIndex];
    const height = shape[yIndex];
    return { data, width, height };
  }

  /**
   * Handles `onTileError` within deck.gl
   * @param {Error} err Error thrown in tile layer
   */
  // eslint-disable-next-line class-methods-use-this
  onTileError(err) {
    if (!(err instanceof BoundsCheckError)) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }

  /**
   * Returns image width and height (at pyramid level z) without fetching data
   * @param {Object} args
   * @param {number} args.z positive integer (0 === highest zoom level)
   * @returns {Object} width: number, height: number
   */
  getRasterSize({ z }) {
    const { shape } = this._getSource(z);
    const [height, width] = ['y', 'x'].map(k => shape[this._dimIndices.get(k)]);
    return { height, width };
  }

  /**
   * Get the metadata associated with a Zarr image layer, in a human-readable format.
   * @returns {Object} Metadata keys mapped to values.
   */
  // eslint-disable-next-line class-methods-use-this
  getMetadata() {
    return {};
  }

  _getSource(z) {
    return typeof z === 'number' && this.isPyramid ? this._data[z] : this._data;
  }

  /**
   * Returns valid zarr.js selection for ZarrArray.getRaw or ZarrArray.getRawChunk
   * @param {Object} selection valid dimension selection
   * @returns {Array} Array of indicies
   *
   * Valid dimension selections include:
   *   - Direct zarr.js selection: [1, 0, 0, 0]
   *   - Named selection object: { channel: 0, time: 2 } or { channel: "DAPI", time: 2 }
   */
  _serializeSelection(selection) {
    // Just return copy if array-like zarr.js selection
    if (Array.isArray(selection)) return [...selection];

    const serialized = Array(this.dimensions.length).fill(0);
    Object.entries(selection).forEach(([dimName, value]) => {
      if (!this._dimIndices.has(dimName)) {
        throw Error(
          `Dimension "${dimName}" does not exist on loader.
           Must be one of "${this.dimensions.map(d => d.field)}."`
        );
      }
      const dimIndex = this._dimIndices.get(dimName);
      switch (typeof value) {
        case 'number': {
          // ex. { channel: 0 }
          serialized[dimIndex] = value;
          break;
        }
        case 'string': {
          const { values, type } = this.dimensions[dimIndex];
          if (type === 'nominal' || type === 'ordinal') {
            // ex. { channel: 'DAPI' }
            serialized[dimIndex] = values.indexOf(value);
            break;
          } else {
            // { z: 'DAPI' }
            throw Error(
              `Cannot use selection "${value}" for dimension "${dimName}" with type "${type}".`
            );
          }
        }
        default: {
          throw Error(
            `Named selection must be a string or number. Got ${value} for ${dimName}.`
          );
        }
      }
    });
    return serialized;
  }
}
