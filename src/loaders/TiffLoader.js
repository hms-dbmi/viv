import { isInTileBounds } from './utils';

/**
 * This class serves as a wrapper for fetching tiff data from a file server.
 * @param {Object} args
 * @param {Object} args.tiff geotiffjs tiff object.
 * @param {Object} args.pool Pool that implements a `decode` function.
 * @param {Object} args.firstImage First image (geotiff Image object) in the tiff (containing base-resolution data).
 * @param {Object} args.dimensions Dimensions for the loader.
 * @param {Object} args.metadata The metadata object
 * @param {Array} args.offsets The offsets of each IFD in the tiff.
 * @param {Boolean} args.isRgb Whether or not this tiff represents an rgb image.
 * @param {Boolean} args.isInterleaved Whether or not this tiff represents an interleaved image.
 * @param {String} args.dtype The dtype of the image like <u2 or <f4.
 * @param {Object} args.physicalSizes An object like { x: { value, unit }, y: { value, unit } } where the first keys,
 * x and y for example, are from the `dimensions and the value is the length and the unit is the units for the value
 * to be interpreted in, like mm for millimeters.
 * */
export default class TiffLoader {
  constructor({
    tiff,
    pool,
    firstImage,
    dimensions,
    offsets,
    metadata,
    isRgb,
    isInterleaved,
    dtype,
    physicalSizes
  }) {
    this.physicalSizes = physicalSizes;
    this.type = 'ome-tiff';
    // get first image's description, which contains OMEXML
    this.metadata = metadata;
    this.dimensions = dimensions;
    this.dtype = dtype;
    this.isRgb = isRgb;
    this.isInterleaved = isInterleaved;
    this.photometricInterpretation =
      firstImage.fileDirectory.PhotometricInterpretation;
    this.tileSize = firstImage.getTileWidth();
    const { SubIFDs } = firstImage.fileDirectory;
    this.numLevels = SubIFDs?.length
      ? SubIFDs.length + 1
      : this.metadata.getNumberOfImages();
    this.isPyramid = this.numLevels > 1;
    this._offsets = offsets || [];
    this._pool = pool;
    this._tiff = tiff;
  }

  /**
   * Returns a tiff image object for a given loader selection + pyramid level.
   * This is implemented by all classes that inherit from the tiff loader.
   * @param {Object} loaderSelection A lodaer selection
   * @param {number} z Pyramidal resolution level (default is implemented by loader, should be 0 unless noted otherwise).
   * @returns {Object} Tiff Image object containing parsed IFD.
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars,no-empty-function
  async getImages(loaderSelection, z) {}

  /**
   * Handles `onTileError` within deck.gl
   * @param {Error} err Error thrown in tile layer
   */
  // eslint-disable-next-line class-methods-use-this
  onTileError(err) {
    console.error(err);
  }

  /**
   * Returns image width and height (at pyramid level z) without fetching data.
   * This information is inferrable from the provided metadata.
   * It is NOT the actual pixel-size but rather the image size
   * without any padding.
   * This needs to be implemented by all classes inheriting this loader.
   * @param {Object} args
   * @param {number} args.z positive integer (0 === highest zoom level)
   * @returns {Object} width: number, height: number
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars,no-empty-function
  getRasterSize({ z }) {}

  /**
   * Get the metadata associated with an OMETiff image layer, in a human-readable format.
   * This needs to be implemented by all classes inheriting this loader.
   * @returns {Object} Metadata keys mapped to values.
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars,no-empty-function
  getMetadata() {}

  /**
   * Returns image tiles at tile-position (x, y) at pyramidal level z.
   * @param {Object} args
   * @param {number} args.x positive integer
   * @param {number} args.y positive integer
   * @param {number} args.z positive integer (0 === highest zoom level)
   * @param {Array} args.loaderSelection, Array of number Arrays specifying channel selections
   * @param {AbortSignal} args.signal
   * @returns {Object} data: TypedArray[], width: number (tileSize), height: number (tileSize).
   * Default is `{data: [], width: tileSize, height: tileSize}`.
   */
  async getTile({ x, y, z, loaderSelection = [], signal }) {
    if (!this._tileInBounds({ x, y, z })) {
      return null;
    }
    const images = await this.getImages(loaderSelection, z);
    const tileRequests = images.map(async image => {
      return this._getChannelTile({ image, x, y, z, signal });
    });
    const data = await Promise.all(tileRequests);
    const { height, width } = this._getTileExtent({
      x,
      y,
      z
    });
    if (signal?.aborted) return null;
    return {
      data,
      height,
      width
    };
  }

  /**
   * Returns full image panes (at level z if pyramid)
   * @param {Object} args
   * @param {number} args.z positive integer (0 === highest zoom level)
   * @param {Array} args.loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number, height: number
   * Default is `{data: [], width, height}`.
   */
  async getRaster({ z, loaderSelection }) {
    const { _pool, isInterleaved } = this;
    const images = await this.getImages(loaderSelection, z);
    const data = await Promise.all(
      images.map(async image => {
        const raster = await image.readRasters({
          _pool,
          interleave: isInterleaved
        });
        return isInterleaved ? raster : raster[0];
      })
    );
    // Get first selection * SizeZ * SizeT * SizeC + loaderSelection[0] size as proxy for image size.
    if (!loaderSelection || loaderSelection.length === 0) {
      return { data: [], ...this.getRasterSize({ z }) };
    }
    const [image] = images;
    const width = image.getWidth();
    const height = image.getHeight();
    return {
      data,
      width,
      height
    };
  }

  /**
   * Get a channel's tile.
   * @param {Object} args {x, y, z} to check.
   * @param {number} args.x
   * @param {number} args.y
   * @param {number} args.z
   * @param {Object} args.image geotiff.js image object.
   * @param {AbortSignal} args.signal
   */
  async _getChannelTile({ image, x, y, z, signal }) {
    const { tileSize, _pool, isInterleaved: interleave } = this;
    const { height, width } = this._getTileExtent({
      x,
      y,
      z
    });
    // Passing in the height and width explicitly prevents resampling that geotiff does without such parameters.
    const rasters = await image.readRasters({
      window: [
        x * tileSize,
        y * tileSize,
        x * tileSize + width,
        y * tileSize + height
      ],
      _pool,
      signal,
      width,
      height,
      interleave
    });
    const data = interleave ? rasters : rasters[0];
    if (signal?.aborted) return null;
    return data;
  }

  /**
   * Check for whether or not the tile is in bounds
   * @param {Object} tile {x, y, z} to check.
   * @param {number} tile.x
   * @param {number} tile.y
   * @param {number} tile.z
   */
  _tileInBounds({ x, y, z }) {
    const { tileSize, numLevels } = this;
    const { width, height } = this.getRasterSize({ z: 0 });
    return isInTileBounds({
      x,
      y,
      z,
      width,
      height,
      tileSize,
      numLevels
    });
  }

  /**
   * Wrapper for calling parseFileDirectoryAt from geotiff.js when there is an `offsets` array.
   * @param {number} index Which IFD to parse.
   */
  _parseIFD(index) {
    const { _tiff, _offsets } = this;
    if (_offsets.length > 0) {
      _tiff.ifdRequests[index] = _tiff.parseFileDirectoryAt(_offsets[index]);
    }
  }

  /**
   * For a given resolution level, z, the expected tile size on the boundary
   * of the image should be exactly enough to fit the image bounds at the resolution level.
   * This function returns that size or the parametrized tileSize from TIFF file.
   * @param {tileData: TypedArray[]} data The array to be filled in.
   * @param {Object} tile { x, y, z }
   * @returns {TypedArray} TypedArray
   */
  _getTileExtent({ x, y, z }) {
    const { tileSize } = this;
    let height = tileSize;
    let width = tileSize;
    const {
      height: zoomLevelHeight,
      width: zoomLevelWidth
    } = this.getRasterSize({ z });
    const maxXTileCoord = Math.floor(zoomLevelWidth / tileSize);
    const maxYTileCoord = Math.floor(zoomLevelHeight / tileSize);
    if (x === maxXTileCoord) {
      width = zoomLevelWidth % tileSize;
    }
    if (y === maxYTileCoord) {
      height = zoomLevelHeight % tileSize;
    }
    return { height, width };
  }
}
