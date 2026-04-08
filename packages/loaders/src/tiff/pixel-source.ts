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
import type Pool from './lib/Pool';

type ReadRastersOptions = NonNullable<
  Parameters<GeoTIFFImage['readRasters']>[0]
>;

class TiffPixelSource<S extends string[]> implements PixelSource<S> {
  private _indexer: (sel: PixelSourceSelection<S>) => Promise<GeoTIFFImage>;

  constructor(
    indexer: (sel: PixelSourceSelection<S>) => Promise<GeoTIFFImage>,
    public dtype: SupportedDtype,
    public tileSize: number,
    public shape: number[],
    public labels: Labels<S>,
    public meta?: PixelSourceMeta,
    public pool?: Pool
  ) {
    this._indexer = indexer;
  }

  async getRaster({ selection, signal }: RasterSelection<S>) {
    const image = await this._indexer(selection);
    return this._readRasters(image, { signal });
  }

  async getTile({ x, y, selection, signal }: TileSelection<S>) {
    const { height, width } = this._getTileExtent(x, y);
    const x0 = x * this.tileSize;
    const y0 = y * this.tileSize;
    const window = [x0, y0, x0 + width, y0 + height];

    const image = await this._indexer(selection);
    return this._readRasters(image, { window, width, height, signal });
  }

  private async _readRasters(image: GeoTIFFImage, props?: ReadRastersOptions) {
    const interleave = isInterleaved(this.shape);
    const signal = props?.signal;

    // Check if already aborted before starting.
    if (signal?.aborted) {
      throw SIGNAL_ABORTED;
    }

    // Don't pass the signal directly to geotiff. Its internal Promise.all
    // over parallel fetch requests means an aborted signal causes multiple
    // rejections, only the first of which is caught — the rest become
    // unhandled AbortErrors. Instead, let the fetches complete and check
    // the signal afterward.
    const { signal: _signal, ...restProps } = props ?? {};

    let raster: Awaited<ReturnType<GeoTIFFImage['readRasters']>>;
    try {
      raster = await image.readRasters({
        interleave,
        ...restProps,
        pool: this.pool
      });
    } catch (err) {
      // If the signal was aborted while fetching (e.g. page navigation),
      // treat any resulting error as an abort.
      if (signal?.aborted) {
        throw SIGNAL_ABORTED;
      }
      throw err;
    }

    if (signal?.aborted) {
      throw SIGNAL_ABORTED;
    }

    /*
     * geotiff.js returns objects with different structure
     * depending on `interleave`. It's weird, but this seems to work.
     */
    const data = (interleave ? raster : raster[0]) as TypedArray;
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
