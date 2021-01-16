import type { GeoTIFFImage } from 'geotiff';

class TiffPixelSource<S> implements PixelSource<S> {
  private _indexer: (sel: S) => Promise<GeoTIFFImage>;

  constructor(
    indexer: (sel: S) => Promise<GeoTIFFImage>,
    public tileSize: number,
    public shape: number[],
    public labels: string[]
  ) {
    this._indexer = indexer;
  }

  async getRaster({ selection }: RasterSelection<S>) {
    const image = await this._indexer(selection);
    const data = await image.readRasters();
    return {
      data: data[0],
      width: data.width,
      height: data.height
    };
  }

  async getTile({ x, y, selection }: TileSelection<S>) {
    const { height, width } = this._getTileExtent(x, y);
    const x0 = x * this.tileSize;
    const y0 = y * this.tileSize;
    const window = [x0, y0, x0 + width, y0 + height];

    const image = await this._indexer(selection);
    const data = await image.readRasters({ window, width, height });

    return {
      data: data[0],
      width: data.width,
      height: data.height
    };
  }

  /*
   * Computes tile size given x, y coord.
   */
  private _getTileExtent(x: number, y: number) {
    const [h, w] = this.shape.slice(-2);
    let height = this.tileSize;
    let width = this.tileSize;
    const maxXTileCoord = Math.floor(w / this.tileSize);
    const maxYTileCoord = Math.floor(h / this.tileSize);
    if (x === maxXTileCoord) {
      width = w % this.tileSize;
    }
    if (y === maxYTileCoord) {
      height = h % this.tileSize;
    }
    return { height, width };
  }
}

export default TiffPixelSource;
