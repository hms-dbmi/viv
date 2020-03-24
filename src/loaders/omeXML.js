/* eslint-disable radix */
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
    return Number.parseInt(this.Pixels['@_SizeZ']);
  }

  get SizeT() {
    return Number.parseInt(this.Pixels['@_SizeT']);
  }

  get SizeC() {
    return Number.parseInt(this.Pixels['@_SizeC']);
  }

  get SizeX() {
    return Number.parseInt(this.Pixels['@_SizeX']);
  }

  get SizeY() {
    return Number.parseInt(this.Pixels['@_SizeY']);
  }

  get DimensionOrder() {
    return this.Pixels['@_DimensionOrder'];
  }

  get Type() {
    return this.Pixels['@_Type'];
  }

  get PhysicalSizeYUnit(){
    return this.Pixels['@_PhysicalSizeYUnit']
  }

  get PhysicalSizeXUnit() {
    return this.Pixels['@_PhysicalSizeXUnit']
  }

  get PhysicalSizeY() {
    return this.Pixels['@_PhysicalSizeY']
  }

  get PhysicalSizeX() {
    return this.Pixels['@_PhysicalSizeX']
  }

  getChannelNames() {
    return this.Pixels.Channel.map(channel => channel['@_Name']);
  }

  getNumberOfImages() {
    return this.metadataOMEXML.Image.length || 0;
  }
}
