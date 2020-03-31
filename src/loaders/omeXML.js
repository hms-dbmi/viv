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
    this._Pixels = Pixels;
    this.SizeZ = Number.parseInt(Pixels['@_SizeZ']);
    this.SizeT = Number.parseInt(Pixels['@_SizeT']);
    this.SizeC = Number.parseInt(Pixels['@_SizeC']);
    this.SizeX = Number.parseInt(Pixels['@_SizeX']);
    this.SizeY = Number.parseInt(Pixels['@_SizeY']);
    this.DimensionOrder = Pixels['@_DimensionOrder'];
    this.Type = Pixels['@_Type'];
    this.PhysicalSizeYUnit = Pixels['@_PhysicalSizeYUnit'];
    this.PhysicalSizeXUnit = Pixels['@_PhysicalSizeXUnit'];
    this.PhysicalSizeY = Pixels['@_PhysicalSizeY'];
    this.PhysicalSizeX = Pixels['@_PhysicalSizeX'];
  }

  getChannelNames() {
    return this._Pixels.Channel.map(channel => channel['@_Name']);
  }

  getNumberOfImages() {
    return this.metadataOMEXML.Image.length || 0;
  }
}
