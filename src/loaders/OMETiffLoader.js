import TiffLoader from './TiffLoader';

/**
 * This class serves as a wrapper for reading ome-tiff data.
 * Inherites from TiffLoader and implements the necessary methods.
 * */
export default class OMETiffLoader extends TiffLoader {
  constructor(args) {
    super(args);
    const {
      firstImage: {
        fileDirectory: { SubIFDs }
      }
    } = args;
    this.isBioFormats6Pyramid = Boolean(SubIFDs);
    this.type = 'ome-tiff';
  }

  async getImages(loaderSelection, z = 0) {
    const { _tiff, isBioFormats6Pyramid } = this;
    const imageRequests = loaderSelection.map(async sel => {
      const pyramidIndex = this._getIFDIndex(sel, z);
      const index = this._getIFDIndex(sel);
      // We need to put the request for parsing the file directory into this array.
      // This allows us to get tiff pages directly based on offset without parsing everything.
      if (!isBioFormats6Pyramid) {
        this._parseIFD(pyramidIndex);
      } else {
        // Pyramids with large z-stacks + large numbers of channels could get slow
        // so we allow for offsets for the lowest-resolution images ("parentImage").
        this._parseIFD(index);
        const parentImage = await _tiff.getImage(index);
        if (z !== 0) {
          _tiff.ifdRequests[pyramidIndex] = _tiff.parseFileDirectoryAt(
            parentImage.fileDirectory.SubIFDs[z - 1]
          );
        }
      }
      return _tiff.getImage(pyramidIndex);
    });
    return Promise.all(imageRequests);
  }

  async getTile(args) {
    const tiles = await super.getTile(args);
    return this._convertIntRasters(tiles);
  }

  async getRaster({ z, loaderSelection }) {
    const rasters = await super.getRaster({
      z,
      loaderSelection
    });
    return this._convertIntRasters(rasters);
  }

  getRasterSize({ z }) {
    const { metadata } = this;
    const { SizeX: width, SizeY: height } = metadata;
    /* eslint-disable no-bitwise */
    return {
      height: height >> z,
      width: width >> z
    };
    /* eslint-disable no-bitwise */
  }

  getMetadata() {
    const { metadata } = this;
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
    } = metadata;

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

  _getIFDIndex({ z = 0, channel, time = 0 }, zIndex = 0) {
    let channelIndex;
    // Without names, enforce a numeric channel indexing scheme
    const channelNames = this.dimensions.find(dim => dim.field === 'channel')
      .values;
    if (channelNames.every(v => !v)) {
      console.warn(
        'No channel names found in OMEXML.  Please be sure to use numeric indexing.'
      );
      channelIndex = channel;
    } else if (typeof channel === 'string') {
      channelIndex = channelNames.indexOf(channel);
    } else if (typeof channel === 'number') {
      channelIndex = channel;
    } else {
      throw new Error('Channel selection must be numeric index or string');
    }
    const sizeZ = this.dimensions.find(dim => dim.field === 'z').values.length;
    const sizeT = this.dimensions.find(dim => dim.field === 'time').values
      .length;
    const sizeC = this.dimensions.find(dim => dim.field === 'channel').values
      .length;
    const dimensionOrder = this.dimensions
      .map(dim => dim.field[0])
      .reverse()
      .join('');
    const pyramidOffset = zIndex * sizeZ * sizeT * sizeC;
    switch (dimensionOrder) {
      case 'xyzct': {
        return pyramidOffset + time * sizeZ * sizeC + channelIndex * sizeZ + z;
      }
      case 'xyztc': {
        return pyramidOffset + channelIndex * sizeZ * sizeT + time * sizeZ + z;
      }
      case 'xyctz': {
        return pyramidOffset + z * sizeC * sizeT + time * sizeC + channelIndex;
      }
      case 'xyczt': {
        return pyramidOffset + time * sizeC * sizeZ + z * sizeC + channelIndex;
      }
      case 'xytcz': {
        return pyramidOffset + z * sizeT * sizeC + channelIndex * sizeT + time;
      }
      case 'xytzc': {
        return pyramidOffset + channelIndex * sizeT * sizeZ + z * sizeT + time;
      }
      default: {
        throw new Error('Dimension order is required for OMETIFF');
      }
    }
  }

  _convertIntRasters(rasters) {
    let data;
    if (this.metadata.Type.startsWith('int')) {
      // geotiff.js returns the correct typedarray but need to cast to Uint for viv.
      const b = rasters.data[0].BYTES_PER_ELEMENT;
      // eslint-disable-next-line no-nested-ternary
      const T = b === 1 ? Uint8Array : b === 2 ? Uint16Array : Uint32Array;
      data = rasters.data.map(r => new T(r));
    } else {
      data = rasters.data;
    }
    return {
      ...rasters,
      data
    };
  }
}
