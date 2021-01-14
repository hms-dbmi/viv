// VERY incomplete type declaration for OMEXML object returned from 'fast-xml-parser'
declare module OMEXMLParserResult {
    // Structure of node is determined by the PARSER_OPTIONS.
    type Node<T, A> = T & { attr: A };
    type Attrs<Fields extends string, T=string> = { [K in Fields]: T };

    type OMEAttrs = Attrs<'xmlns' | 'xmlns:xsi' | 'xsi:schemaLocation'>;
    type OME = Node<{ Insturment: Insturment, Image: Image | Image[]}, OMEAttrs>;

    type Insturment = Node<{ Objective: Node<{}, Attrs<'ID' | 'Model' | 'NominalMagnification'>>}, Attrs<'ID'>>

    interface ImageNodes {
        AquisitionDate?: string;
        Description?: string;
        Pixels: Pixels;
        InstrumentRef: Node<{}, { ID:string }>;
        ObjectiveSettings: Node<{}, { ID: string }>;
    }
    type Image = Node<ImageNodes, Attrs<'ID' | 'Name'>>;

    type PixelType = 'int8' | 'int16' | 'int32' | 'uint8' | 'uint16' | 'uint32' | 'float' | 'bit' | 'double' | 'complex' | 'double-complex';
    type DimensionOrder = 'XYZCT' | 'XYZTC' | 'XYCTZ' | 'XYCZT' | 'XYTCZ' | 'XYTZC';

    type PhysicalSizes<Names> = `PhysicalSize${Names}` | `PhysicalSize${Names}Unit`;
    type Sizes<Names> = `Size${Names}`;

    type PixelAttrs = 
        Attrs<PhysicalSizes<'X' | 'Y'> | 'SignificantBits' | Sizes<'T' | 'C' | 'Z' | 'Y' | 'X'>, number> &
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