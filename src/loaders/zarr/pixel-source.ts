import { BoundsCheckError } from 'zarr';
import { isInterleaved } from '../utils';
import { getIndexer } from './lib/indexer';

import type { HTTPStore } from './lib/storage';
import type { ZarrArray } from 'zarr';
import type { RawArray } from 'zarr/dist/types/rawArray';
import type { AsyncStore } from 'zarr/dist/types/storage/types';

import type {
  PixelSource,
  Labels,
  RasterSelection,
  PixelSourceSelection,
  LayerData,
  TileSelection
} from '../../types';

const DTYPE_LOOKUP = {
  u1: 'Uint8',
  u2: 'Uint16',
  u4: 'Uint32',
  f4: 'Float32'
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

class ZarrPixelSource<S extends string[]> implements PixelSource<S> {
  private _data: ZarrArray;
  private _indexer: ZarrIndexer<S>;

  constructor(data: ZarrArray, public labels: Labels<S>) {
    this._indexer = getIndexer(labels);
    this._data = data;
  }

  get tileSize() {
    return this._data.chunks[this._xIndex];
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
    x: T,
    y: T
  ) {
    const sel: (number | T)[] = this._indexer(selection);
    sel[this._xIndex] = x;
    sel[this._xIndex - 1] = y;
    return sel;
  }

  async getRaster({ selection }: RasterSelection<S> | { selection: number[] }) {
    const sel = this._chunkIndex(selection, null, null);
    const { data, shape } = (await this._data.getRaw(sel)) as RawArray;
    const [height, width] = shape;
    return { data, width, height } as LayerData;
  }

  async getTile(props: TileSelection<S> | ZarrTileSelection) {
    const { x, y, selection, signal } = props;
    const sel = this._chunkIndex(selection, x, y);

    const store = this._data.store as HTTPStore | AsyncStore<ArrayBuffer>;

    // Injects `signal` prior to zarr.js calling `store.getItem`
    if (signal && '__vivAddSignal' in store) {
      store.__vivAddSignal(signal);
    }

    const { data, shape } = (await this._data.getRawChunk(sel)) as RawArray;

    // Clear signal from HTTPStore
    if ('__vivClearSignal' in store) {
      store.__vivClearSignal();
    }

    const [height, width] = shape;
    return { data, width, height } as LayerData;
  }

  onTileError(err: Error) {
    if (!(err instanceof BoundsCheckError)) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }
}

export default ZarrPixelSource;
