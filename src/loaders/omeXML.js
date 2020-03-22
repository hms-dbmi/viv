import parser from 'fast-xml-parser';

export default class OMEXML {
  constructor(omexmlString) {
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      allowBooleanAttributes: true
    };
    this.metadataOMEXML = parser.parse(omexmlString, options).OME;
    const { Pixels } = this.metadataOMEXML.Image.length
      ? this.metadataOMEXML.Image[0]
      : this.metadataOMEXML.Image;
    this.Pixels = Pixels;
  }

  get SizeZ() {
    return this.Pixels['@_SizeZ'];
  }

  get SizeT() {
    return this.Pixels['@_SizeT'];
  }

  get SizeC() {
    return this.Pixels['@_SizeC'];
  }

  get SizeX() {
    return this.Pixels['@_SizeX'];
  }

  get SizeY() {
    return this.Pixels['@_SizeY'];
  }

  get DimensionOrder() {
    return this.Pixels['@_DimensionOrder'];
  }

  get Type() {
    return this.Pixels['@_Type'];
  }

  getChannelNames() {
    return this.Pixels.Channel.map(channel => channel['@_Name']);
  }

  getNumberOfImages() {
    return this.metadataOMEXML.Image.length || 0;
  }
}
