import OMEXML from './omeXML';
import { isInTileBounds } from './utils';

function getOffsets(omexml) {
  const { metadataOMEXML } = omexml;
  if (!metadataOMEXML['ns2:StructuredAnnotations']) {
    return '[]';
  }
  const annotation =
    metadataOMEXML['ns2:StructuredAnnotations']['ns2:XMLAnnotation'][
      'ns2:Value'
    ]['ns3:OriginalMetadata'];
  return annotation['ns3:Key'] === 'IFD_Offsets' ? annotation['ns3:Value'] : [];
}

export default class OMETiffLoader {
  constructor(tiff, pool, firstImage, omexmlString, offsets) {
    this.pool = pool;
    this.tiff = tiff;
    this.type = 'ome-tiff';
    // get first image's description, which contains OMEXML
    this.omexml = new OMEXML(omexmlString);
    this.offsets = offsets || JSON.parse(getOffsets(this.omexml));
    this.numLevels = this.omexml.getNumberOfImages();
    this.channelNames = this.omexml.getChannelNames();
    console.log(this.channelNames);
    this.width = this.omexml.SizeX;
    this.height = this.omexml.SizeY;
    this.tileSize = firstImage.getTileWidth();
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

  _getIFDIndex({ z = 0, channel, time = 0 }) {
    const channelndex = this.channelNames.indexOf(channel);
    const { SizeZ, SizeT, SizeC, DimensionOrder } = this.omexml;
    switch (DimensionOrder) {
      case 'XYZCT': {
        return time * SizeZ * SizeC + channelndex * SizeZ + z;
      }
      case 'XYZTC': {
        return channelndex * SizeZ * SizeT + time * SizeZ + z;
      }
      case 'XYCTZ': {
        return z * SizeC * SizeT + time * SizeC + channelndex;
      }
      case 'XYCZT': {
        return time * SizeC * SizeZ + z * SizeC + channelndex;
      }
      case 'XYTCZ': {
        return z * SizeT * SizeC + channelndex * SizeT + time;
      }
      case 'XYTZC': {
        return channelndex * SizeT * SizeZ + z * SizeT + time;
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

  async getTile({ x, y, z, loaderSelection }) {
    if (!this._tileInBounds({ x, y, z })) {
      return { data: null, width: this.tileSize, height: this.tileSize };
    }
    const { tiff, offsets } = this;
    const tileRequests = loaderSelection.map(async index => {
      const { SizeZ, SizeT, SizeC } = this.omexml;
      const pyramidIndex = z * SizeZ * SizeT * SizeC + index;

      if (!tiff.ifdRequests[pyramidIndex] && offsets) {
        tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
          offsets[pyramidIndex]
        );
      }
      // Offset by resolution of the pyramid, `z * SizeZ * SizeT * SizeC`
      const image = await tiff.getImage(pyramidIndex);
      return this._getChannel({ image, x, y });
    });
    const tiles = await Promise.all(tileRequests);
    return { data: tiles, width: this.tileSize, height: this.tileSize };
  }

  async getRaster({ z = 0, loaderSelection }) {
    const { tiff, offsets, omexml } = this;
    const { SizeZ, SizeT, SizeC } = omexml;
    const rasters = await Promise.all(
      loaderSelection.map(async index => {
        const pyramidIndex = z * SizeZ * SizeT * SizeC + index;
        if (!tiff.ifdRequests[pyramidIndex] && offsets) {
          tiff.ifdRequests[pyramidIndex] = tiff.parseFileDirectoryAt(
            offsets[pyramidIndex]
          );
        }
        const image = await tiff.getImage(pyramidIndex);
        const raster = await image.readRasters();
        return raster[0];
      })
    );
    // Get first selection size as proxy for image size.
    const image = await tiff.getImage(
      z * SizeZ * SizeT * SizeC + loaderSelection[0]
    );
    const width = image.getWidth();
    const height = image.getHeight();
    return { data: rasters, width, height };
  }

  // This information is inferrable from the provided omexml.
  // This is only used by the OverviewLayer for inferring the box size.
  // It is NOT the actual pixel-size but rather the image size
  // without any padding.
  getRasterSize({ z }) {
    const { width, height } = this;
    // eslint-disable-next-line no-bitwise
    return { height: (height >> z) - 2, width: (width >> z) - 2 };
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
    return data;
  }

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
