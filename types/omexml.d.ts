// VERY incomplete type declaration for OMEXML object returned from 'fast-xml-parser'
declare module ParserResult {
  // Structure of node is determined by the PARSER_OPTIONS.
  type Node<T, A> = T & { attr: A };
  type Attrs<Fields extends string, T=string> = { [K in Fields]: T };

  type OMEAttrs = Attrs<'xmlns' | 'xmlns:xsi' | 'xsi:schemaLocation'>;
  type OME = Node<{ Insturment: Insturment, Image: Image | Image[] }, OMEAttrs>;

  type Insturment = Node<{ Objective: Node<{}, Attrs<'ID' | 'Model' | 'NominalMagnification'>>}, Attrs<'ID'>>

  interface ImageNodes {
    AquisitionDate?: string;
    Description?: string;
    Pixels: Pixels;
    InstrumentRef: Node<{}, { ID: string }>;
    ObjectiveSettings: Node<{}, { ID: string }>;
  }
  type Image = Node<ImageNodes, Attrs<'ID' | 'Name'>>;

  type PixelType = 'int8' | 'int16' | 'int32' | 'uint8' | 'uint16' | 'uint32' | 'float' | 'bit' | 'double' | 'complex' | 'double-complex';
  type DimensionOrder = 'XYZCT' | 'XYZTC' | 'XYCTZ' | 'XYCZT' | 'XYTCZ' | 'XYTZC';
  type UnitsLength =
    'Ym' | 'Zm' | 'Em' | 'Pm' | 'Tm' | 'Gm' | 'Mm' | 'km' | 'hm' | 'dam' | 'm' | 'dm' | 'cm' | 'mm' | 'µm' | 'nm' | 'pm' | 'fm' |
    'am' | 'zm' | 'ym' | 'Å' | 'thou' | 'li' | 'in' | 'ft' | 'yd' | 'mi' | 'ua' | 'ly' | 'pc' | 'pt' | 'pixel' | 'reference frame';

  type PhysicalSize<Name> = `PhysicalSize${Name}`;
  type PhysicalSizeUnit<Name> = `PhysicalSize${Name}Unit`;
  type Size<Names> = `Size${Names}`;

  type PixelAttrs = 
    Attrs<PhysicalSize<'X' | 'Y'> | 'SignificantBits' | Size<'T' | 'C' | 'Z' | 'Y' | 'X'>, number> &
    Attrs<PhysicalSizeUnit<'X' | 'Y'>, UnitsLength> &
    Attrs<'BigEndian' | 'Interleaved', boolean> & {
      ID: string;
      DimensionOrder: DimensionOrder,
      Type: PixelType
    };

  type Pixels = Node<{ Channel: Channel | Channel[], TiffData: Node<{}, Attrs<'IFD' | 'PlaneCount'>> }, PixelAttrs>;

  type ChannelAttrs = {
    ID: string;
    SamplesPerPixel: number;
    Name?: string;
  } | {
    ID: string;
    SamplesPerPixel: number;
    Name?: string;
    Color: number;
  };

  type Channel = Node<{}, ChannelAttrs>;

  type Root = { OME: OME };
}