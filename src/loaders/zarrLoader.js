import { guessRgb } from './utils';

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
    this._defaultSelection = [Array(dimensions.legnth).fill(0)];

    this._data = data;
    if (this.isRgb) {
      this._xIndex = base.shape.length - 2;
      this._yIndex = base.shape.length - 3;
    } else {
      this._xIndex = base.shape.length - 1;
      this._yIndex = base.shape.length - 2;
    }

    const { dtype, chunks } = base;
    this.dtype = dtype;
    this.tileSize = chunks[this._xIndex];
  }

  get isPyramid() {
    return Array.isArray(this._data);
  }

  get base() {
    return this.isPyramid ? this._data[0] : this._data;
  }

  /**
   * Returns image tiles at tile-position (x, y) at pyramidal level z.
   * @param {number} x positive integer
   * @param {number} y positive integer
   * @param {number} z positive integer (0 === highest zoom level)
   * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number (tileSize), height: number (tileSize)
   */
  async getTile({ x, y, z, loaderSelection }) {
    const source = this._getSource(z);
    const selections = loaderSelection || this._defaultSelection;
    const dataRequests = selections.map(async key => {
      const chunkKey = [...key];
      chunkKey[this._yIndex] = y;
      chunkKey[this._xIndex] = x;
      const { data } = await source.getRawChunk(chunkKey);
      return data;
    });
    const data = await Promise.all(dataRequests);
    return { data, width: this.tileSize, height: this.tileSize };
  }

  /**
   * Returns full image panes (at level z if pyramid)
   * @param {number} z positive integer (0 === highest zoom level)
   * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number, height: number
   */
  async getRaster({ z, loaderSelection }) {
    const source = this._getSource(z);
    const selections = loaderSelection || this._defaultSelection;
    const dataRequests = selections.map(async key => {
      const chunkKey = [...key];
      chunkKey[this._yIndex] = null;
      chunkKey[this._xIndex] = null;
      if (this.isRgb) chunkKey[chunkKey.length - 1] = null;
      const { data } = await source.getRaw(chunkKey);
      return data;
    });
    const data = await Promise.all(dataRequests);
    const { shape } = source;
    const width = shape[this._xIndex];
    const height = shape[this._yIndex];
    return { data, width, height };
  }

  /**
   * Handles `onTileError` within deck.gl
   * @param {Error} err Error thrown in tile layer
   */
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

  /**
   * Returns image width and height (at pyramid level z) without fetching data
   * @param {number} z positive integer (0 === highest zoom level)
   * @returns {Object} width: number, height: number
   */
  getRasterSize({ z }) {
    const source = this._getSource(z);
    const height = source.shape[this._yIndex];
    const width = source.shape[this._xIndex];
    return { height, width };
  }

  /**
   * Converts Array of loader selection objects into zarr-specific selection
   *
   * Ex.
   *  const loaderSelectionObj = [
   *     { time: 1, channel: 'a' },
   *     { time: 1, channel: 'b' }
   *  ];
   *  const serialized = loader.serializeSelection(loaderSelectionObj);
   *  console.log(serialized);
   *  // [[1, 0, 0, 0], [1, 1, 0, 0]]
   *
   * @param {Array || Object} loaderSelectionObjs Human-interpretable array of desired selection objects
   * @returns {Array} number[][], zarr-specific selections to be passed to to viv as loaderSelections
   */
  serializeSelection(loaderSelectionObjs) {
    // Wrap selection in array if only one is provided
    const selectionObjs = Array.isArray(loaderSelectionObjs)
      ? loaderSelectionObjs
      : [loaderSelectionObjs];

    const serialized = selectionObjs.map(obj => this._serialize(obj));
    return serialized;
  }

  _getSource(z) {
    return typeof z === 'number' && this.isPyramid ? this._data[z] : this._data;
  }

  _serialize(selectionObj) {
    const serializedSelection = Array(this.dimensions.length).fill(0);
    const dimFields = this.dimensions.map(d => d.field);
    Object.entries(selectionObj).forEach(([key, val]) => {
      // Get index of named dimension in zarr array
      const dimIndex = dimFields.indexOf(key);
      if (dimIndex === undefined) {
        throw Error(
          `Dimension '${key}' does not exist on array with dimensions :
          ${dimFields}`
        );
      }
      // Get position of index along dimension axis
      let valueIndex;
      const { field, type, values } = this.dimensions[dimIndex];
      if (typeof val === 'number') {
        // Assign index directly, regardless of dimension type
        valueIndex = val;
      } else if (type === 'ordinal' || type === 'nominal') {
        // Lookup index if categorical dimension type.
        // This is slower if dimension is large; setting directly is preferred.
        valueIndex = values.indexOf(val);
      } else {
        // Cannot use string value for dimension that is 'quantitative' or 'temporal', must set directly.
        throw Error(
          `The value '${val}' is invalid for dimension of type ${type}`
        );
      }

      if (valueIndex < 0 || valueIndex > this.base.shape[dimIndex]) {
        // Ensure desired index is within the bounds of the dimension
        throw Error(`Dimension ${field} does not contain index ${valueIndex}.`);
      }

      serializedSelection[dimIndex] = valueIndex;
    });
    return serializedSelection;
  }
}
