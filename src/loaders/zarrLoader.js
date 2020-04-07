import { guessRgb } from './utils';

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
    this._dimLookup = dimensions.map(({ name }, i) => ({ [name]: i }));
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

  async getTile({ x, y, z, loaderSelections }) {
    const source = this._getSource(z);
    const selections = loaderSelections || this._defaultSelection;
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

  async getRaster({ z, loaderSelections }) {
    const source = this._getSource(z);
    const selections = loaderSelections || this._defaultSelection;
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
    const source = this._getSource(z);
    const height = source.shape[this._yIndex];
    const width = source.shape[this._xIndex];
    return { height, width };
  }

  formatSelections(loaderSelections) {
    const selections = Array.isArray(loaderSelections)
      ? loaderSelections
      : [loaderSelections];

    const normedSelections = selections.map(this._normalizeSelection);
    return normedSelections;
  }

  _getSource(z) {
    return typeof z === 'number' && this.isPyramid ? this._data[z] : this._data;
  }

  _normalizeSelection(selectionObj) {
    const loaderSelection = Array(this.dimensions.length).fill(0);
    Object.entries(selectionObj).forEach(([dimName, dimValue]) => {
      // Get index of named dimension in zarr array
      const dimIndex = this._dimLookup[dimName];
      if (dimIndex === undefined) {
        throw Error(
          `Dimension '${dimName}' does not exist on array with dimensions :
          ${Object.keys(this._dimLookup)}`
        );
      }
      // Get position of index along dimension axis
      let valueIndex;
      const { name, type, values } = this.dimensions[dimIndex];
      if (typeof dimValue === 'number') {
        // Assign index directly, regardless of dimension type
        valueIndex = dimValue;
      } else if (type === 'ordinal' || type === 'nominal') {
        // Lookup index if categorical dimension type.
        // This is slower if dimension is large; setting directly is preferred.
        valueIndex = values.indexOf(dimValue);
      } else {
        // Cannot use string value for dimension that is 'quantitative' or 'temporal', must set directly.
        throw Error(
          `The value '${dimValue}' is invalid for dimension of type ${type}`
        );
      }

      if (valueIndex < 0 || valueIndex > this.base.shape[dimIndex]) {
        // Ensure desired index is within the bounds of the dimension
        throw Error(`Dimension ${name} does not contain index ${valueIndex}.`);
      }

      loaderSelection[dimIndex] = valueIndex;
    });
    return loaderSelection;
  }
}
