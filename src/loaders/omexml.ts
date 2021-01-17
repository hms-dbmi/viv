import parser from 'fast-xml-parser';
import { ensureArray, intToRgba } from './utils';

// WARNING: Changes to the parser options _will_ effect the types in types/omexml.d.ts.
const PARSER_OPTIONS = {
  // Nests attributes withtout prefix under 'attr' key for each node
  attributeNamePrefix: '',
  attrNodeName: 'attr',

  // Parses numbers for both attributes and nodes
  parseNodeValue: true,
  parseAttributeValue: true,

  // Forces attributes to be parsed
  ignoreAttributes: false
};

const parse = (str: string): ParserResult.Root =>
  parser.parse(str, PARSER_OPTIONS);

export function fromString(str: string) {
  const res = parse(str);
  if (!res.OME) {
    throw Error('Failed to parse OME-XML metadata.');
  }
  return ensureArray(res.OME.Image).map(img => {
    const Channels = ensureArray(img.Pixels.Channel).map(c => {
      if ('Color' in c.attr) {
        return { ...c.attr, Color: intToRgba(c.attr.Color) };
      }
      return { ...c.attr };
    });
    const { AquisitionDate = '', Description = '' } = img;
    const image = {
      ...img.attr,
      AquisitionDate,
      Description,
      Pixels: {
        ...img.Pixels.attr,
        Channels
      }
    };
    return {
      ...image,
      format() {
        const { Pixels } = image;

        const sizes = (['X', 'Y', 'Z'] as const)
          .map(name => {
            const size = Pixels[`PhysicalSize${name}` as const];
            const unit = Pixels[`PhysicalSize${name}Unit` as const];
            return size && unit ? `${size} ${unit}` : '-';
          })
          .join(' x ');

        return {
          'Acquisition Date': image.AquisitionDate,
          'Dimensions (XY)': `${Pixels.SizeX} x ${Pixels.SizeY}`,
          'Pixels Type': Pixels.Type,
          'Pixels Size (XYZ)': sizes,
          'Z-sections/Timepoints': `${Pixels.SizeZ} x ${Pixels.SizeT}`,
          Channels: Pixels.SizeC
        };
      }
    };
  });
}

export type OMEXML = ReturnType<typeof fromString>;
