import type { GeoTIFFImage } from 'geotiff';
import { SIGNAL_ABORTED, getImageSize, isInterleaved } from '../utils';
import type { TypedArray } from '../zarr/lib/utils';

import type {
  Labels,
  PixelData,
  PixelSource,
  PixelSourceMeta,
  PixelSourceSelection,
  RasterSelection,
  SupportedDtype,
  TileSelection
} from '@vivjs/types';
import type { DecodePool } from './lib/Pool';
import {
  convertInterleavedPhotometricToRgb,
  needsPhotometricRgbConversion
} from './lib/photometricRgb';
import { isPackedRgbTiffImage, padTiffSampleTags } from './lib/utils';

type ReadRastersOptions = NonNullable<
  Parameters<GeoTIFFImage['readRasters']>[0]
>;

function sliceInterleavedSample(
  data: TypedArray,
  width: number,
  height: number,
  sample: number
): TypedArray {
  const n = width * height;
  const ArrayType = data.constructor as { new (length: number): TypedArray };
  const out = new ArrayType(n);
  const s = sample | 0;
  for (let i = 0; i < n; i++) {
    out[i] = data[i * 3 + s];
  }
  return out;
}

function packedDecodeKey(
  selection: { t?: number; z?: number } | undefined,
  props?: ReadRastersOptions
): string {
  const t = selection?.t ?? 0;
  const z = selection?.z ?? 0;
  const window = props?.window;
  if (window) return `${t}:${z}:${window.join(',')}`;
  return `${t}:${z}:raster`;
}

const RGB_SAMPLES = [0, 1, 2];

class TiffPixelSource<S extends string[]> implements PixelSource<S> {
  private _indexer: (sel: PixelSourceSelection<S>) => Promise<GeoTIFFImage>;
  /** In-flight packed RGB decodes so c=0,1,2 share one JPEG decode. */
  // ponytail: dropped after this turn; LRU if sequential channel toggles re-decode.
  private _packedDecodes = new Map<string, Promise<PixelData>>();

  constructor(
    indexer: (sel: PixelSourceSelection<S>) => Promise<GeoTIFFImage>,
    public dtype: SupportedDtype,
    public tileSize: number,
    public shape: number[],
    public labels: Labels<S>,
    public meta?: PixelSourceMeta,
    public pool?: DecodePool | false
  ) {
    this._indexer = indexer;
  }

  async getRaster({ selection, signal }: RasterSelection<S>) {
    const image = await this._indexer(selection);
    return this._readRasters(image, { signal }, selection);
  }

  async getTile({ x, y, selection, signal }: TileSelection<S>) {
    const { height, width } = this._getTileExtent(x, y);
    const x0 = x * this.tileSize;
    const y0 = y * this.tileSize;
    const window = [x0, y0, x0 + width, y0 + height];

    const image = await this._indexer(selection);
    return this._readRasters(
      image,
      { window, width, height, signal },
      selection
    );
  }

  private async _readRasters(
    image: GeoTIFFImage,
    props: ReadRastersOptions | undefined,
    selection: PixelSourceSelection<S>
  ) {
    padTiffSampleTags(image.fileDirectory);

    const interleave = isInterleaved(this.shape);
    const signal = props?.signal;

    // Check if already aborted before starting.
    if (signal?.aborted) {
      throw SIGNAL_ABORTED;
    }

    const packedRgb = isPackedRgbTiffImage(image);
    const presentPlanar = packedRgb && !interleave;

    if (presentPlanar) {
      const key = packedDecodeKey(selection, props);
      let pending = this._packedDecodes.get(key);
      if (!pending) {
        pending = this._decodeVisualRgb(image, props, signal);
        this._packedDecodes.set(key, pending);
        pending.then(
          () => {
            queueMicrotask(() => this._packedDecodes.delete(key));
          },
          () => {
            this._packedDecodes.delete(key);
          }
        );
      }
      const rgb = await pending;
      const sample = Math.max(
        0,
        Math.min(2, Number((selection as { c?: number }).c) || 0)
      );
      return {
        data: sliceInterleavedSample(rgb.data, rgb.width, rgb.height, sample),
        width: rgb.width,
        height: rgb.height
      } as PixelData;
    }

    return this._decodeVisualRgb(image, props, signal);
  }

  private async _decodeVisualRgb(
    image: GeoTIFFImage,
    props: ReadRastersOptions | undefined,
    signal: AbortSignal | undefined
  ): Promise<PixelData> {
    const interleave = isInterleaved(this.shape);
    // Don't pass the signal to geotiff: its Promise.all over fetches can
    // reject more than once on abort. Let fetches finish, then check signal.
    const { signal: _signal, ...restProps } = props ?? {};

    const packedRgb = isPackedRgbTiffImage(image);

    let raster: Awaited<ReturnType<GeoTIFFImage['readRasters']>>;
    try {
      if (packedRgb) {
        raster = await image.readRasters({
          ...restProps,
          samples: RGB_SAMPLES,
          interleave: true,
          pool: this.pool
        });
      } else {
        raster = await image.readRasters({
          interleave,
          ...restProps,
          pool: this.pool
        });
      }
    } catch (err) {
      if (signal?.aborted) {
        throw SIGNAL_ABORTED;
      }
      throw err;
    }

    if (signal?.aborted) {
      throw SIGNAL_ABORTED;
    }

    const useInterleaved = packedRgb || interleave;
    let data = (useInterleaved ? raster : raster[0]) as TypedArray;

    const photo = image.fileDirectory.PhotometricInterpretation;
    if (packedRgb && needsPhotometricRgbConversion(photo)) {
      data = convertInterleavedPhotometricToRgb(data, photo) as TypedArray;
    }

    return {
      data,
      width: (raster as TypedArray & { width: number }).width,
      height: (raster as TypedArray & { height: number }).height
    } as PixelData;
  }

  /*
   * Computes tile size given x, y coord.
   */
  private _getTileExtent(x: number, y: number) {
    const { height: zoomLevelHeight, width: zoomLevelWidth } =
      getImageSize(this);
    let height = this.tileSize;
    let width = this.tileSize;
    const maxXTileCoord = Math.floor(zoomLevelWidth / this.tileSize);
    const maxYTileCoord = Math.floor(zoomLevelHeight / this.tileSize);
    if (x === maxXTileCoord) {
      width = zoomLevelWidth % this.tileSize;
    }
    if (y === maxYTileCoord) {
      height = zoomLevelHeight % this.tileSize;
    }
    return { height, width };
  }

  onTileError(err: Error) {
    console.error(err);
  }
}

export default TiffPixelSource;
