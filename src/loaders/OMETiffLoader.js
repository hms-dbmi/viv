// import OMEXML from './omeXML';
// import { isInTileBounds } from './utils';

// function flip16(info) {
//   const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 2);
//   const len = flipper.length;
//   for (let i = 0; i < len; i += 2) {
//     let t = flipper[i];
//     flipper[i] = flipper[i + 1];
//     flipper[i + 1] = t;
//   }
// }

// export default class OMETiffLoader {
//   constructor(tiff, pool, firstImage, omexmlString, offsets) {
//     this.pool = pool;
//     this.tiff = tiff;
//     this.type = 'ome-tiff';
//     // get first image's description, which contains OMEXML
//     this.omexml = new OMEXML(omexmlString);
//     this.offsets = offsets || [];
//     this.numLevels = this.omexml.getNumberOfImages();
//     this.channelNames = this.omexml.getChannelNames();
//     this.width = this.omexml.SizeX;
//     this.height = this.omexml.SizeY;
//     this.tileSize = firstImage.getTileWidth();
//     this.isPyramid = !!this.numLevels;
//     const type = this.omexml.Type;
//     if (type === 'uint8') {
//       this.dtype = '<u1';
//     }
//     if (type === 'uint16') {
//       this.dtype = '<u2';
//     }
//     if (type === 'uint32') {
//       this.dtype = '<u4';
//     }
//     if (type === 'float32') {
//       this.dtype = '<f4';
//     }
//     console.log(this);
//   }

//   /**
//    * Returns an IFD index for a given loader selection.
//    * @param {number} z Z axis selection.
//    * @param {number} time Time axis selection.
//    * @param {String} channel Channel axis selection.
//    * @returns {number} IFD index.
//    */
//   _getIFDIndex({ z = 0, channel, time = 0 }) {
//     let channelIndex;
//     if (this.channelNames.every(v => !v)) {
//       // Without names, enforce a numeric channel indexing scheme
//       console.warn(
//         'There are no channel names in the OMEXML.  Please use numeric indexing'
//       );
//       channelIndex = channel;
//     } else {
//       channelIndex = this.channelNames.indexOf(channel);
//     }
//     const { SizeZ, SizeT, SizeC, DimensionOrder } = this.omexml;
//     switch (DimensionOrder) {
//       case 'XYZCT': {
//         return time * SizeZ * SizeC + channelIndex * SizeZ + z;
//       }
//       case 'XYZTC': {
//         return channelIndex * SizeZ * SizeT + time * SizeZ + z;
//       }
//       case 'XYCTZ': {
//         return z * SizeC * SizeT + time * SizeC + channelIndex;
//       }
//       case 'XYCZT': {
//         return time * SizeC * SizeZ + z * SizeC + channelIndex;
//       }
//       case 'XYTCZ': {
//         return z * SizeT * SizeC + channelIndex * SizeT + time;
//       }
//       case 'XYTZC': {
//         return channelIndex * SizeT * SizeZ + z * SizeT + time;
//       }
//       default: {
//         throw new Error('Dimension order is required for OMETIFF');
//       }
//     }
//   }

//   /**
//    * Handles `onTileError` within deck.gl
//    * @param {Error} err Error thrown in tile layer
//    */
//   // eslint-disable-next-line class-methods-use-this
//   onTileError(err) {
//     console.error(err);
//   }

//   /**
//    * Returns image tiles at tile-position (x, y) at pyramidal level z.
//    * @param {number} x positive integer
//    * @param {number} y positive integer
//    * @param {number} z positive integer (0 === highest zoom level)
//    * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
//    * @returns {Object} data: TypedArray[], width: number (tileSize), height: number (tileSize)
//    */
//   async getTile({ x, y, z, loaderSelection }) {
//     if (!this._tileInBounds({ x, y, z })) {
//       return {
//         data: null,
//         width: this.tileSize,
//         height: this.tileSize
//       };
//     }
//     const { tiff, offsets } = this;
//     const tileRequests = loaderSelection.map(async index => {
//       const { SizeZ, SizeT, SizeC } = this.omexml;
//       const pyramidIndex = z * SizeZ * SizeT * SizeC + index;

//       if (!tiff.ifdRequests[pyramidIndex] && offsets) {
//         tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
//           offsets[pyramidIndex]
//         );
//       }
//       // Offset by resolution of the pyramid, `z * SizeZ * SizeT * SizeC`

//       const image = await tiff.getImage(pyramidIndex);
//       return this._getChannel({ image, x, y });
//     });
//     const tiles = await Promise.all(tileRequests);
//     console.log(tiles);
//     return {
//       data: tiles,
//       width: this.tileSize,
//       height: this.tileSize
//     };
//   }

//   /**
//    * Returns full image panes (at level z if pyramid)
//    * @param {number} z positive integer (0 === highest zoom level)
//    * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
//    * @returns {Object} data: TypedArray[], width: number, height: number
//    */
//   async getRaster({ z = 0, loaderSelection }) {
//     // const { tiff, offsets, omexml } = this;
//     // const { SizeZ, SizeT, SizeC } = omexml;
//     // const rasters = await Promise.all(
//     //   loaderSelection.map(async index => {
//     //     const pyramidIndex = z * SizeZ * SizeT * SizeC + index;
//     //     if (!tiff.ifdRequests[pyramidIndex] && offsets) {
//     //       tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
//     //         offsets[pyramidIndex]
//     //       );
//     //     }
//     //     const image = await tiff.getImage(pyramidIndex);
//     //     console.log(image)
//     //     const raster = await image.readRasters();
//     //     return raster[0];
//     //   })
//     // );
//     // // Get first selection size as proxy for image size.
//     // const image = await tiff.getImage(
//     //   z * SizeZ * SizeT * SizeC + loaderSelection[0]
//     // );
//     // const width = image.getWidth();
//     // const height = image.getHeight();
//     // return { data: rasters, width, height };
//   }

//   /**
//    * Returns image width and height (at pyramid level z) without fetching data.
//    * This information is inferrable from the provided omexml.
//    * This is only used by the OverviewLayer for inferring the box size.
//    * It is NOT the actual pixel-size but rather the image size
//    * without any padding.
//    * @param {number} z positive integer (0 === highest zoom level)
//    * @returns {Object} width: number, height: number
//    */
//   getRasterSize({ z }) {
//     const { width, height } = this;
//     /* eslint-disable no-bitwise */
//     return {
//       height: (height >> z) - 2,
//       width: (width >> z) - 2
//     };
//     /* eslint-disable no-bitwise */
//   }

//   async _getChannel({ image, x, y }) {
//     const tile = await image.getTileOrStrip(x, y, 0, this.pool);
//     const is8Bits = image.fileDirectory.BitsPerSample[0] === 8;
//     const is16Bits = image.fileDirectory.BitsPerSample[0] === 16;
//     const is32Bits = image.fileDirectory.BitsPerSample[0] === 32;
//     const data =
//       (is8Bits && new Uint8Array(tile.data)) ||
//       (is16Bits && new Uint16Array(tile.data)) ||
//       (is32Bits && new Uint32Array(tile.data));
//     flip16(data);
//     return data;
//   }

//   /**
//    * Converts Array of loader selection objects into an IFD index.
//    *
//    * Ex.
//    *  const loaderSelectionObj = [
//    *     { time: 1, channel: 'a', z: 0 },
//    *     { time: 1, channel: 'b', z: 0 }
//    *  ];
//    *  const serialized = loader.serializeSelection(loaderSelectionObj);
//    *  console.log(serialized);
//    *  // 4, 5
//    *
//    * @param {Array || Object} loaderSelectionObjs Human-interpretable array of desired selection objects
//    * @returns {Array} number[][], IFD indices for selecting an image of the tiff.
//    */
//   serializeSelection(loaderSelectionObjs) {
//     // Wrap selection in array if only one is provided
//     const selectionObjs = Array.isArray(loaderSelectionObjs)
//       ? loaderSelectionObjs
//       : [loaderSelectionObjs];
//     const serialized = selectionObjs.map(obj => this._serialize(obj));
//     return serialized;
//   }

//   _serialize(selectionObj) {
//     const serializedSelection = this._getIFDIndex(selectionObj);
//     return serializedSelection;
//   }

//   _tileInBounds({ x, y, z }) {
//     const { width, height, tileSize, numLevels } = this;
//     return isInTileBounds({
//       x,
//       y,
//       z,
//       width,
//       height,
//       tileSize,
//       numLevels
//     });
//   }
// }

import { Pool } from 'geotiff';
import OMEXML from './omeXML';
import { isInTileBounds } from './utils';

function flip16(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 2);
  const len = flipper.length;
  for (let i = 0; i < len; i += 2) {
    let t = flipper[i];
    flipper[i] = flipper[i + 1];
    flipper[i + 1] = t;
  }
}

export default class OMETiffLoader {
  constructor(tiff, pool, firstImage, omexmlString, offsets) {
    this.pool = new Pool();
    this.tiff = tiff;
    this.type = 'ome-tiff';
    // get first image's description, which contains OMEXML
    this.omexml = new OMEXML(omexmlString);
    this.offsets = offsets || [];
    this.channelNames = this.omexml.getChannelNames();
    this.width = this.omexml.SizeX;
    this.height = this.omexml.SizeY;
    this.tileSize = firstImage.getTileWidth();
    this.numLevels =
      this.omexml.getNumberOfImages() ||
      Math.max(
        Math.floor(Math.log(this.height, this.tileSize)),
        Math.floor(Math.log(this.width, this.tileSize))
      ) - 2;
    this.isPyramid = !!this.numLevels;
    const type = this.omexml.Type;
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
      return {
        data: null,
        width: this.tileSize,
        height: this.tileSize
      };
    }
    const { tiff, offsets, omexml } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const tileRequests = loaderSelection.map(async index => {
      let image = await tiff.getImage(index);
      if (z !== 0) {
        tiff.ifdRequests[
          z * SizeZ * SizeT * SizeC + index
        ] = tiff.parseFileDirectoryAt(image.fileDirectory.SubIFDs[z - 1]);
        image = await tiff.getImage(z * SizeZ * SizeT * SizeC + index);
      }
      return this._getChannel({ image, x, y });
    });
    const tiles = await Promise.all(tileRequests);
    return {
      data: tiles,
      width: this.tileSize,
      height: this.tileSize
    };
  }

  /**
   * Returns full image panes (at level z if pyramid)
   * @param {number} z positive integer (0 === highest zoom level)
   * @param {Array} loaderSelection, Array of number Arrays specifying channel selections
   * @returns {Object} data: TypedArray[], width: number, height: number
   */
  async getRaster({ z, loaderSelection }) {
    const { tiff, offsets, omexml } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const rasters = await Promise.all(
      loaderSelection.map(async index => {
        const parentImage = await tiff.getImage(index);
        tiff.ifdRequests[
          z * SizeZ * SizeT * SizeC + index
        ] = tiff.parseFileDirectoryAt(parentImage.fileDirectory.SubIFDs[z - 1]);
        const image = await tiff.getImage(z * SizeZ * SizeT * SizeC + index);
        const raster = await image.readRasters();
        return raster[0];
      })
    );
    // Get first selectioz * SizeZ * SizeT * SizeC + loaderSelection[0]n size as proxy for image size.
    const image = await tiff.getImage(
      z * SizeZ * SizeT * SizeC + loaderSelection[0]
    );
    const width = image.getWidth();
    const height = image.getHeight();
    console.log({ data: rasters, width, height });
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
      height: (height >> z) - 2,
      width: (width >> z) - 2
    };
    /* eslint-disable no-bitwise */
  }

  async _getChannel({ image, x, y }) {
    const tile = await image.getTileOrStrip(x, y, 0, this.pool);
    const is8Bits = image.fileDirectory.BitsPerSample[0] === 8;
    const is16Bits = image.fileDirectory.BitsPerSample[0] === 16;
    const is32Bits = image.fileDirectory.BitsPerSample[0] === 32;
    const data =
      (is8Bits && new Uint8Array(tile.data)) ||
      (is16Bits && new Uint16Array(tile.data)) ||
      (is32Bits && new Uint32Array(tile.data));
    flip16(data);
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
