import * as zarr from 'zarrita';
import { getImageSize, isInterleaved } from '../utils';
import { getIndexer } from './lib/indexer';
import type { ZarrArray } from './lib/utils';

import type {
  Labels,
  PixelData,
  PixelSource,
  PixelSourceSelection,
  RasterSelection,
  SupportedDtype,
  TileSelection
} from '@vivjs/types';

const DTYPE_LOOKUP = {
  u1: 'Uint8',
  u2: 'Uint16',
  u4: 'Uint32',
  f4: 'Float32',
  f8: 'Float64',
  i1: 'Int8',
  i2: 'Int16',
  i4: 'Int32'
} as const;

type ZarrIndexer<S extends string[]> = (
  sel: { [K in S[number]]: number } | number[]
) => number[];

interface ZarrTileSelection {
  x: number;
  y: number;
  selection: number[];
  signal?: AbortSignal;
}

interface ZarrRasterSelection {
  selection: number[];
  signal?: AbortSignal;
}

interface Slice {
  start: number;
  stop: number;
  step: number;
  _slice: true;
}

function slice(start: number, stop: number): Slice {
  return { start, stop, step: 1, _slice: true };
}

//type ZarrSource = Pick<ZarrArray, 'shape' | 'chunks' | 'dtype'>

class BoundsCheckError extends Error {}

class ZarrPixelSource<S extends string[]> implements PixelSource<S> {
  private _data: ZarrArray;
  private _indexer: ZarrIndexer<S>;

  constructor(
    data: ZarrArray,
    public labels: Labels<S>,
    public tileSize: number
  ) {
    this._indexer = getIndexer(labels);
    this._data = data;
  }

  get shape() {
    return this._data.shape;
  }

  get dtype(): SupportedDtype {
    const normalized = this._data.dtype.toLowerCase();
    // If it's a two-character code (like 'f8', 'u1'), look it up in the mapping
    if (normalized.length === 2 && normalized in DTYPE_LOOKUP) {
      return DTYPE_LOOKUP[normalized as keyof typeof DTYPE_LOOKUP];
    }
    // Otherwise, assume it's already in the correct format (e.g., 'float64', 'float32', 'uint8')
    // This handles newer zarr formats that use full names.
    // Normalize to capitalized form to match SupportedDtype (e.g., 'Float64', 'Uint8')
    return (normalized.charAt(0).toUpperCase() +
      normalized.slice(1)) as SupportedDtype;
  }

  private get _xIndex() {
    const interleave = isInterleaved(this._data.shape);
    return this._data.shape.length - (interleave ? 2 : 1);
  }

  private _chunkIndex<T>(
    selection: PixelSourceSelection<S> | number[],
    { x, y }: { x: T; y: T }
  ) {
    const sel: (number | T)[] = this._indexer(selection);
    sel[this._xIndex] = x;
    sel[this._xIndex - 1] = y;
    return sel;
  }

  /**
   * Converts x, y tile indices to zarr dimension Slices within image bounds.
   */
  private _getSlices(x: number, y: number): [Slice, Slice] {
    const { height, width } = getImageSize(this);
    const [xStart, xStop] = [
      x * this.tileSize,
      Math.min((x + 1) * this.tileSize, width)
    ];
    const [yStart, yStop] = [
      y * this.tileSize,
      Math.min((y + 1) * this.tileSize, height)
    ];
    // Deck.gl can sometimes request edge tiles that don't exist. We throw
    // a BoundsCheckError which is picked up in `ZarrPixelSource.onTileError`
    // and ignored by deck.gl.
    if (xStart === xStop || yStart === yStop) {
      throw new BoundsCheckError('Tile slice is zero-sized.');
    }
    if (xStart < 0 || yStart < 0 || xStop > width || yStop > height) {
      throw new BoundsCheckError('Tile slice is out of bounds.');
    }

    return [slice(xStart, xStop), slice(yStart, yStop)];
  }

  private async _getRaw(
    selection: (null | Slice | number)[],
    // biome-ignore lint/suspicious/noExplicitAny: any is used to pass through storeOptions
    getOptions?: { storeOptions?: any }
  ) {
    // Convert selection format for zarrita
    const zarrSelection = selection.map(s => {
      if (s === null) return null;
      if (typeof s === 'number') return s;
      if ('_slice' in s && s._slice) {
        // Convert our internal Slice to zarrita slice
        return zarr.slice(s.start, s.stop, s.step);
      }
      return s;
    });

    // Pass abort signal if provided
    const signal = getOptions?.storeOptions?.signal;
    const result = await zarr.get(this._data, zarrSelection, signal);

    if (typeof result !== 'object') {
      throw new Error('Expected object from zarr.get');
    }
    return result;
  }

  async getRaster({
    selection,
    signal
  }: RasterSelection<S> | ZarrRasterSelection) {
    const sel = this._chunkIndex(selection, { x: null, y: null });
    const result = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = result;
    return { data, width, height } as PixelData;
  }

  async getTile(props: TileSelection<S> | ZarrTileSelection) {
    const { x, y, selection, signal } = props;
    const [xSlice, ySlice] = this._getSlices(x, y);
    const sel = this._chunkIndex(selection, { x: xSlice, y: ySlice });
    const tile = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = tile;
    return { data, height, width } as PixelData;
  }

  onTileError(err: Error) {
    if (!(err instanceof BoundsCheckError)) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }
}

export default ZarrPixelSource;
