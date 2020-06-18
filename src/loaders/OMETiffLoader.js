import OMEXML from './omeXML';
import { isInTileBounds, byteSwapInplace, padTileWithZeros } from './utils';
import { DTYPE_VALUES } from '../constants';
import { range } from '../layers/utils';

const DTYPE_LOOKUP = {
  uint8: '<u1',
  uint16: '<u2',
  uint32: '<u4',
  float32: '<f4'
};

/**
 * This class serves as a wrapper for fetching tiff data from a file server.
 * @param {Object} args
 * @param {Object} args.tiff geotiffjs tiff object.
 * @param {Object} args.pool Pool that implements a `decode` function.
 * @param {Object} args.firstImage First image (geotiff Image object) in the tiff (containing base-resolution data).
 * @param {String} args.omexmlString Raw OMEXML as a string.
 * @param {Array} args.offsets The offsets of each IFD in the tiff.
 * */
export default class OMETiffLoader {
  constructor({ tiff, pool, firstImage, omexmlString, offsets }) {
    this.pool = pool;
    this.tiff = tiff;
    this.type = 'ome-tiff';
    // get first image's description, which contains OMEXML
    this.omexml = new OMEXML(omexmlString);
    this.physicalSizes = {
      x: {
        value: this.omexml.PhysicalSizeX,
        unit: this.omexml.PhysicalSizeXUnit
      },
      y: {
        value: this.omexml.PhysicalSizeY,
        unit: this.omexml.PhysicalSizeYUnit
      }
    };
    this.software = firstImage.fileDirectory.Software;
    this.offsets = offsets || [];
    this.channelNames = this.omexml.getChannelNames();
    this.width = this.omexml.SizeX;
    this.height = this.omexml.SizeY;
    this.tileSize = firstImage.getTileWidth();
    const { SubIFDs } = firstImage.fileDirectory;
    this.numLevels = this.omexml.getNumberOfImages() || SubIFDs?.length;
    this.isBioFormats6Pyramid = SubIFDs;
    this.isPyramid = this.numLevels > 1;
    // The omexml specification only allows for these - zarr is more flexible so this
    // is for unifying the two loaders in upstream applications.
    this.dimensions = [
      {
        field: 'channel',
        type: 'nominal',
        values: this.channelNames
      },
      {
        field: 'z',
        type: 'ordinal',
        values: range(this.omexml.SizeZ)
      },
      {
        field: 'time',
        type: 'ordinal',
        values: range(this.omexml.SizeT)
      },
      { field: 'x', type: 'quantitative', values: null },
      { field: 'y', type: 'quantitative', values: null }
    ];
    // We use zarr's internal format.  It encodes endianness, but we leave it little for now
    // since javascript is little endian.
    this.dtype = DTYPE_LOOKUP[this.omexml.Type];
    // This is experimental and will take some tuning to properly detect.  For now,
    // if the SamplesPerPixel is 3 (i.e interleaved) or if there are three uint8 channels,
    // we flag that as rgb.
    this.isRgb =
      this.omexml.SamplesPerPixel === 3 ||
      (this.channelNames.length === 3 && this.dtype === '<u1');
  }

  /**
   * Returns an IFD index for a given loader selection.
   * @param {number} z Z axis selection.
   * @param {number} time Time axis selection.
   * @param {String} channel Channel axis selection.
   * @returns {number} IFD index.
   */
  _getIFDIndex({ z = 0, channel, time = 0 }) {
    let channelIndex;
    // Without names, enforce a numeric channel indexing scheme
    if (this.channelNames.every(v => !v)) {
      console.warn(
        'No channel names found in OMEXML.  Please be sure to use numeric indexing.'
      );
      channelIndex = channel;
    } else if (typeof channel === 'string') {
      channelIndex = this.channelNames.indexOf(channel);
    } else if (typeof channel === 'number') {
      channelIndex = channel;
    } else {
      throw new Error('Channel selection must be numeric index or string');
    }
    const { SizeZ, SizeT, SizeC, DimensionOrder } = this.omexml;
    switch (DimensionOrder) {
      case 'XYZCT': {
        return time * SizeZ * SizeC + channelIndex * SizeZ + z;
      }
      case 'XYZTC': {
        return channelIndex * SizeZ * SizeT + time * SizeZ + z;
      }
      case 'XYCTZ': {
        return z * SizeC * SizeT + time * SizeC + channelIndex;
      }
      case 'XYCZT': {
        return time * SizeC * SizeZ + z * SizeC + channelIndex;
      }
      case 'XYTCZ': {
        return z * SizeT * SizeC + channelIndex * SizeT + time;
      }
      case 'XYTZC': {
        return channelIndex * SizeT * SizeZ + z * SizeT + time;
      }
      default: {
        throw new Error('Dimension order is required for OMETIFF');
      }
    }
  }

  /**
   * Handles `onTileError` within deck.gl
   * @param {Error} err Error thrown in tile layer
   */
  // eslint-disable-next-line class-methods-use-this
  onTileError(err) {
    console.error(err);
  }

  /**
   * Returns image tiles at tile-position (x, y) at pyramidal level z.
   * @param {number} x positive integer
   * @param {number} y positive integer
   * @param {number} z positive integer (0 === highest zoom level)
   * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number (tileSize), height: number (tileSize).
   * Default is `{data: [], width: tileSize, height: tileSize}`.
   */
  async getTile({ x, y, z, loaderSelection = [] }) {
    if (!this._tileInBounds({ x, y, z })) {
      return null;
    }
    const { tiff, isBioFormats6Pyramid, omexml, tileSize } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const pyramidOffset = z * SizeZ * SizeT * SizeC;
    let image;
    const tileRequests = loaderSelection.map(async sel => {
      const index = this._getIFDIndex(sel);
      const pyramidIndex = pyramidOffset + index;
      // We need to put the request for parsing the file directory into this array.
      // This allows us to get tiff pages directly based on offset without parsing everything.
      if (!isBioFormats6Pyramid) {
        this._parseIFD(pyramidIndex);
      } else {
        // Pyramids with large z-stacks + large numbers of channels could get slow
        // so we allow for offsets for the lowest-resolution images ("parentImage").
        this._parseIFD(index);
        const parentImage = await tiff.getImage(index);
        if (z !== 0) {
          tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
            parentImage.fileDirectory.SubIFDs[z - 1]
          );
        }
      }
      image = await tiff.getImage(pyramidIndex);
      return this._getChannel({ image, x, y });
    });

    const tiles = await Promise.all(tileRequests);
    return {
      data: tiles,
      width: tileSize,
      height: tileSize
    };
  }

  /**
   * Returns full image panes (at level z if pyramid)
   * @param {number} z positive integer (0 === highest zoom level)
   * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number, height: number
    * Default is `{data: [], width, height}`.

   */
  async getRaster({ z, loaderSelection }) {
    const { tiff, omexml, isBioFormats6Pyramid, pool } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const rasters = await Promise.all(
      loaderSelection.map(async sel => {
        const index = this._getIFDIndex(sel);
        const pyramidIndex = z * SizeZ * SizeT * SizeC + index;
        // We need to put the request for parsing the file directory into this array.
        // This allows us to get tiff pages directly based on offset without parsing everything.
        if (!isBioFormats6Pyramid) {
          this._parseIFD(pyramidIndex);
        } else {
          // Pyramids with large z-stacks + large numbers of channels could get slow
          // so we allow for offsets for the initial images ("parentImage").
          this._parseIFD(index);
          const parentImage = await tiff.getImage(index);
          if (z !== 0) {
            tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
              parentImage.fileDirectory.SubIFDs[z - 1]
            );
          }
        }
        const image = await tiff.getImage(pyramidIndex);
        // Flips bits for us for endianness.
        const raster = await image.readRasters({ pool });
        return raster[0];
      })
    );
    // Get first selection * SizeZ * SizeT * SizeC + loaderSelection[0] size as proxy for image size.
    if (!loaderSelection || loaderSelection.length === 0) {
      return { data: [], ...this.getRasterSize({ z }) };
    }
    const image = await tiff.getImage(
      z * SizeZ * SizeT * SizeC + this._getIFDIndex(loaderSelection[0])
    );
    const width = image.getWidth();
    const height = image.getHeight();
    return {
      data: rasters,
      width,
      height
    };
  }

  /**
   * Returns image width and height (at pyramid level z) without fetching data.
   * This information is inferrable from the provided omexml.
   * This is only used by the OverviewLayer for inferring the box size.
   * It is NOT the actual pixel-size but rather the image size
   * without any padding.
   * @param {number} z positive integer (0 === highest zoom level)
   * @returns {Object} width: number, height: number
   */
  getRasterSize({ z }) {
    const { width, height } = this;
    /* eslint-disable no-bitwise */
    return {
      height: height >> z,
      width: width >> z
    };
    /* eslint-disable no-bitwise */
  }

  /**
   * Get the metadata associated with an OMETiff image layer, in a human-readable format.
   * @returns {Object} Metadata keys mapped to values.
   */
  getMetadata() {
    const { omexml } = this;
    const {
      metadataOMEXML: {
        Image: { AcquisitionDate },
        StructuredAnnotations
      },
      SizeX,
      SizeY,
      SizeZ,
      SizeT,
      SizeC,
      Type,
      PhysicalSizeX,
      PhysicalSizeXUnit,
      PhysicalSizeY,
      PhysicalSizeYUnit,
      PhysicalSizeZ,
      PhysicalSizeZUnit
    } = omexml;

    const physicalSizeAndUnitX =
      PhysicalSizeX && PhysicalSizeXUnit
        ? `${PhysicalSizeX} (${PhysicalSizeXUnit})`
        : '-';
    const physicalSizeAndUnitY =
      PhysicalSizeY && PhysicalSizeYUnit
        ? `${PhysicalSizeY} (${PhysicalSizeYUnit})`
        : '-';
    const physicalSizeAndUnitZ =
      PhysicalSizeZ && PhysicalSizeZUnit
        ? `${PhysicalSizeZ} (${PhysicalSizeZUnit})`
        : '-';
    let roiCount;
    if (StructuredAnnotations) {
      const { MapAnnotation } = StructuredAnnotations;
      roiCount =
        MapAnnotation && MapAnnotation.Value
          ? Object.entries(MapAnnotation.Value).length
          : 0;
    }
    return {
      'Acquisition Date': AcquisitionDate,
      'Dimensions (XY)': `${SizeX} x ${SizeY}`,
      'Pixels Type': Type,
      'Pixels Size (XYZ)': `${physicalSizeAndUnitX} x ${physicalSizeAndUnitY} x ${physicalSizeAndUnitZ}`,
      'Z-sections/Timepoints': `${SizeZ} x ${SizeT}`,
      Channels: SizeC,
      'ROI Count': roiCount
    };
  }

  async _getChannel({ image, x, y }) {
    const { dtype } = this;
    const { TypedArray } = DTYPE_VALUES[dtype];
    const tile = await image.getTileOrStrip(x, y, 0, this.pool);
    const data = new TypedArray(tile.data);
    /*
     * The endianness of JavaScript TypedArrays are determined by the endianness
     * of the end-users' hardware. Nearly all desktop computers are x86 (little endian),
     * so we flip bytes in place for big-endian buffers. This is substantially faster than using
     * the DataView API.
     */
    if (!image.littleEndian) {
      byteSwapInplace(data);
    }

    // If the tile data is not (tileSize x tileSize), pad the data with zeros
    if (data.length < this.tileSize * this.tileSize) {
      const width = Math.min(
        this.tileSize,
        image.getWidth() - x * this.tileSize
      );
      const height = data.length / width;
      return padTileWithZeros(
        { data, width, height },
        this.tileSize,
        this.tileSize
      );
    }

    return data;
  }

  _tileInBounds({ x, y, z }) {
    const { width, height, tileSize, numLevels } = this;
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

  _parseIFD(index) {
    const { tiff, offsets } = this;
    if (offsets.length > 0) {
      tiff.ifdRequests[index] = tiff.parseFileDirectoryAt(offsets[index]);
    }
  }
}
