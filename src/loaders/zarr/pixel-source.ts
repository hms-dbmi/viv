import { BoundsCheckError, slice } from 'zarr';
import { getImageSize, isInterleaved } from '../utils';
import { getIndexer } from './lib/indexer';

import type { ZarrArray } from 'zarr';
import type { RawArray } from 'zarr/types/rawArray';

import type {
  PixelSource,
  Labels,
  RasterSelection,
  PixelSourceSelection,
  PixelData,
  TileSelection
} from '../../types';

const DTYPE_LOOKUP = {
  u1: 'Uint8',
  u2: 'Uint16',
  u4: 'Uint32',
  f4: 'Float32',
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

class ZarrPixelSource<S extends string[]> implements PixelSource<S> {
  private _data: ZarrArray;
  private _indexer: ZarrIndexer<S>;
  private _readChunks: boolean;

  constructor(
    data: ZarrArray,
    public labels: Labels<S>,
    public tileSize: number
  ) {
    this._indexer = getIndexer(labels);
    this._data = data;

    const xChunkSize = data.chunks[this._xIndex];
    const yChunkSize = data.chunks[this._xIndex - 1];
    this._readChunks = tileSize === xChunkSize && tileSize === yChunkSize;
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

  private _getSlices(x: number, y: number) {
    const { height, width } = getImageSize(this);
    return [
      slice(x * this.tileSize, Math.min((x + 1) * this.tileSize, width)),
      slice(y * this.tileSize, Math.min((y + 1) * this.tileSize, height))
    ];
  }

  async getRaster({ selection }: RasterSelection<S> | { selection: number[] }) {
    const sel = this._chunkIndex(selection, null, null);
    const { data, shape } = (await this._data.getRaw(sel)) as RawArray;
    const [height, width] = shape;
    return { data, width, height } as PixelData;
  }

  async getTile(props: TileSelection<S> | ZarrTileSelection) {
    const { x, y, selection, signal } = props;

    let res;
    if (this._readChunks) {
      // Can read chunks directly by key since tile size matches chunk shape
      const sel = this._chunkIndex(selection, x, y);
      res = await this._data.getRawChunk(sel, { storeOptions: { signal } });
    } else {
      // Need to use zarr fancy indexing to get desired tile size.
      const [xSlice, ySlice] = this._getSlices(x, y);
      const sel = this._chunkIndex(selection, xSlice, ySlice);
      res = await this._data.getRaw(sel);
    }

    const {
      data,
      shape: [height, width]
    } = res as RawArray;
    return { data, width, height } as PixelData;
  }

  onTileError(err: Error) {
    if (!(err instanceof BoundsCheckError)) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }
}

export default ZarrPixelSource;
