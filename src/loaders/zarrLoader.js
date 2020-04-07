import { range } from '../layers/VivViewerLayer/utils';
import { guessRgb, normalizeLoaderSelection } from './utils';

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
    const dataRequests = loaderSelections.map(async key => {
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
    const dataRequests = loaderSelections.map(async key => {
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
    const height = source.shape[this.yIndex];
    const width = source.shape[this.xIndex];
    return { height, width };
  }

  getLoaderSelection(loaderSelections) {
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
    const dimNames = this.dimensions.map(d => d.name);
    // eslint-disable-next-line no-restricted-syntax
    for (const [dimName, dimValue] of selectionObj.entries()) {
      const dimIndex = dimNames.indexOf(dimName);

      if (dimIndex < 0) {
        throw Error(
          `Dimension '${dimName}' does not exist on array with dimensions : ${dimNames}`
        );
      }

      let valueIndex;
      const { name, type, values } = this.dimensions[dimIndex];
      if (
        typeof dimValue === 'string' &&
        (type === 'ordinal' || type === 'nominal')
      ) {
        valueIndex = values.indexof(dimValue);
      } else {
        valueIndex = dimValue;
      }

      if (valueIndex < 0) {
        throw Error(`Dimension ${name} does not contain index ${valueIndex}.`);
      }

      loaderSelection[dimIndex] = valueIndex;
    }
    return loaderSelection;
  }
}
