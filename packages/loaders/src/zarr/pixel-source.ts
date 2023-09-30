import type { TypedArray } from 'geotiff';
import { getImageSize, isInterleaved } from '../utils';
import { getIndexer } from './lib/indexer';

import type {
  Labels,
  PixelData,
  PixelSource,
  PixelSourceSelection,
  RasterSelection,
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

interface ZarrSource {
  shape: number[];
  chunks: number[];
  dtype: string;
  getRaw(
    selection: (Slice | null)[],
    // getOptions?: { storageOptions?: any }
  ): Promise<
    | {
        data: TypedArray;
        shape: number[];
      }
    | number
  >;
}

class BoundsCheckError extends Error {}

class ZarrPixelSource<S extends string[]> implements PixelSource<S> {
  private _data: ZarrSource;
  private _indexer: ZarrIndexer<S>;

  constructor(
    data: ZarrSource,
    public labels: Labels<S>,
    public tileSize: number
  ) {
    this._indexer = getIndexer(labels);
    this._data = data;
  }

  get shape() {
    return this._data.shape;
  }

  get dtype() {
    const suffix = this._data.dtype.slice(1) as keyof typeof DTYPE_LOOKUP;
    if (!(suffix in DTYPE_LOOKUP)) {
      throw Error(`Zarr dtype not supported, got ${suffix}.`);
    }
    return DTYPE_LOOKUP[suffix];
  }

  private get _xIndex() {
    const interleave = isInterleaved(this._data.shape);
    return this._data.shape.length - (interleave ? 2 : 1);
  }

  private _chunkIndex<T>(
    selection: PixelSourceSelection<S> | number[],
    { x, y }: { x: T; y: T },
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
    } else if (xStart < 0 || yStart < 0 || xStop > width || yStop > height) {
      throw new BoundsCheckError('Tile slice is out of bounds.');
    }

    return [slice(xStart, xStop), slice(yStart, yStop)];
  }

  private async _getRaw(
    selection: (null | Slice | number)[],
    getOptions?: { storageOptions?: any }
  ) {
    // @ts-expect-error - storageOptions is not supported yet in ZarrJS
    const result = await this._data.getRaw(selection, getOptions);
    if (typeof result !== 'object') {
      throw new Error('Expected object from getRaw');
    }
    return result;
  }

  async getRaster({ selection, signal }: RasterSelection<S> | ZarrRasterSelection) {
    const sel = this._chunkIndex(selection, { x: null, y: null });
    const result = await this._getRaw(sel, { storageOptions: { signal } });
    const { data, shape: [height, width] } = result;
    return { data, width, height } as PixelData;
  }

  async getTile(props: TileSelection<S> | ZarrTileSelection) {
    const { x, y, selection, signal } = props;
    const [xSlice, ySlice] = this._getSlices(x, y);
    const sel = this._chunkIndex(selection, { x: xSlice, y: ySlice });
    const tile = await this._getRaw(sel, { storageOptions: { signal } });
    const { data, shape: [height, width] } = tile;
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
