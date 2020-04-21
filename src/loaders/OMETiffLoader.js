import OMEXML from './omeXML';
import { isInTileBounds } from './utils';
import { DTYPE_VALUES } from '../constants';
// Credit to https://github.com/zbjornson/node-bswap/blob/master/bswap.js for the implementation.
// I could not get this to import, and it doesn't appear anyone else can judging by the "Used by" on github.
// We need this for handling the endianness returned by geotiff since it only returns bytes.
function flip16(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 2);
  const len = flipper.length;
  for (let i = 0; i < len; i += 2) {
    const t = flipper[i];
    flipper[i] = flipper[i + 1];
    flipper[i + 1] = t;
  }
}

function flip32(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 4);
  const len = flipper.length;
  for (let i = 0; i < len; i += 4) {
    let t = flipper[i];
    flipper[i] = flipper[i + 3];
    flipper[i + 3] = t;
    t = flipper[i + 1];
    flipper[i + 1] = flipper[i + 2];
    flipper[i + 2] = t;
  }
}

function flip64(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 8);
  const len = flipper.length;
  for (let i = 0; i < len; i += 8) {
    let t = flipper[i];
    flipper[i] = flipper[i + 7];
    flipper[i + 7] = t;
    t = flipper[i + 1];
    flipper[i + 1] = flipper[i + 6];
    flipper[i + 6] = t;
    t = flipper[i + 2];
    flipper[i + 2] = flipper[i + 5];
    flipper[i + 5] = t;
    t = flipper[i + 3];
    flipper[i + 3] = flipper[i + 4];
    flipper[i + 4] = t;
  }
}

function flipEndianness(arr) {
  switch (arr.BYTES_PER_ELEMENT) {
    case 1:
      // no op
      return;
    case 2:
      flip16(arr);
      break;
    case 4:
      flip32(arr);
      break;
    case 8:
      flip64(arr);
      break;
    default:
      throw new Error('Invalid input');
  }
}

/**
 * This class serves as a wrapper for fetching tiff data from a file server.
 * */
export default class OMETiffLoader {
  constructor({ tiff, poolOrDecoder, firstImage, omexmlString, offsets }) {
    this.poolOrDecoder = poolOrDecoder;
    this.tiff = tiff;
    this.type = 'ome-tiff';
    // get first image's description, which contains OMEXML
    this.omexml = new OMEXML(omexmlString);
    this.offsets = offsets || [];
    this.channelNames = this.omexml.getChannelNames();
    this.width = this.omexml.SizeX;
    this.height = this.omexml.SizeY;
    this.tileSize = firstImage.getTileWidth();
    const { SubIFDs } = firstImage.fileDirectory;
    this.numLevels =
      this.omexml.getNumberOfImages() || (SubIFDs && SubIFDs.length);
    this.isBioFormats6Pyramid = SubIFDs;
    this.isPyramid = this.numLevels > 1;

    const type = this.omexml.Type;
    // We use zarr's internal format.  It encodes endiannes, but we leave it little for now
    // since javascript is little endian.
    if (type === 'uint8') {
      this.dtype = '<u1';
    }
    if (type === 'uint16') {
      this.dtype = '<u2';
    }
    if (type === 'uint32') {
      this.dtype = '<u4';
    }
    if (type === 'float32') {
      this.dtype = '<f4';
    }
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
    if (this.channelNames.every(v => !v)) {
      // Without names, enforce a numeric channel indexing scheme
      console.warn(
        'There are no channel names in the OMEXML.  Please use numeric indexing'
      );
      channelIndex = channel;
    } else {
      channelIndex = this.channelNames.indexOf(channel);
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
   * @returns {Object} data: TypedArray[], width: number (tileSize), height: number (tileSize)
   */
  async getTile({ x, y, z, loaderSelection }) {
    if (!this._tileInBounds({ x, y, z })) {
      return null;
    }
    const { tiff, offsets, isBioFormats6Pyramid, omexml, tileSize } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const pyramidOffset = z * SizeZ * SizeT * SizeC;
    let image;
    const tileRequests = loaderSelection.map(async index => {
      const pyramidIndex = pyramidOffset + index;
      // We need to put the request for parsing the file directory into this array.
      // This allows us to get tiff pages directly based on offset without parsing everything.
      if (!isBioFormats6Pyramid) {
        if (offsets) {
          tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
            offsets[pyramidIndex]
          );
        }
      } else {
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
    const { ImageLength } = image.fileDirectory;
    return {
      data: tiles,
      width: tileSize,
      height:
        tiles[0].length === tileSize ** 2
          ? tileSize
          : Math.min(tileSize, ImageLength - y * tileSize)
    };
  }

  /**
   * Returns full image panes (at level z if pyramid)
   * @param {number} z positive integer (0 === highest zoom level)
   * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number, height: number
   */
  async getRaster({ z, loaderSelection }) {
    const { tiff, offsets, omexml, isBioFormats6Pyramid, poolOrDecoder } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const rasters = await Promise.all(
      loaderSelection.map(async index => {
        const pyramidIndex = z * SizeZ * SizeT * SizeC + index;
        // We need to put the request for parsing the file directory into this array.
        // This allows us to get tiff pages directly based on offset without parsing everything.
        if (!isBioFormats6Pyramid) {
          if (offsets) {
            tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
              offsets[pyramidIndex]
            );
          }
        } else {
          const parentImage = await tiff.getImage(index);
          if (z !== 0) {
            tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
              parentImage.fileDirectory.SubIFDs[z - 1]
            );
          }
        }
        const image = await tiff.getImage(pyramidIndex);
        // Flips bits for us for endianness.
        const raster = await image.readRasters({ pool: poolOrDecoder });
        return raster[0];
      })
    );
    // Get first selectioz * SizeZ * SizeT * SizeC + loaderSelection[0]n size as proxy for image size.
    const image = await tiff.getImage(
      z * SizeZ * SizeT * SizeC + loaderSelection[0]
    );
    const width = image.getWidth();
    const height = image.getHeight();
    return { data: rasters, width, height };
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

  async _getChannel({ image, x, y }) {
    const { dtype } = this;
    const { TypedArray } = DTYPE_VALUES[dtype];
    const tile = await image.getTileOrStrip(x, y, 0, this.poolOrDecoder);
    const data = new TypedArray(tile.data);
    // Javascript needs little endian byteorder, so we flip if the data is not.
    // eslint-disable-next-line no-unused-expressions
    if (!image.littleEndian) {
      flipEndianness(data);
    }
    return data;
  }

  /**
   * Converts Array of loader selection objects into an IFD index.
   *
   * Ex.
   *  const loaderSelectionObj = [
   *     { time: 1, channel: 'a', z: 0 },
   *     { time: 1, channel: 'b', z: 0 }
   *  ];
   *  const serialized = loader.serializeSelection(loaderSelectionObj);
   *  console.log(serialized);
   *  // 4, 5
   *
   * @param {Array || Object} loaderSelectionObjs Human-interpretable array of desired selection objects
   * @returns {Array} number[][], IFD indices for selecting an image of the tiff.
   */
  serializeSelection(loaderSelectionObjs) {
    // Wrap selection in array if only one is provided
    const selectionObjs = Array.isArray(loaderSelectionObjs)
      ? loaderSelectionObjs
      : [loaderSelectionObjs];
    const serialized = selectionObjs.map(obj => this._serialize(obj));
    return serialized;
  }

  _serialize(selectionObj) {
    const serializedSelection = this._getIFDIndex(selectionObj);
    return serializedSelection;
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
}
