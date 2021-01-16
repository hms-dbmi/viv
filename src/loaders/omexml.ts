import parser from 'fast-xml-parser';

// WARNING: Changes to the parser options _will_ effect the types in types/omexml.d.ts.
const PARSER_OPTIONS = {
  // Nests attributes withtout prefix under 'attr' key for each node
  attributeNamePrefix: '',
  attrNodeName: 'attr',

  // Parses numbers for both attributes and nodes
  parseNodeValue: true,
  parseAttributeValue: true,

  // Forces attributes to be parsed
  ignoreAttributes: false,  
};

const parse = (str: string): ParserResult.Root =>
  parser.parse(str, PARSER_OPTIONS);

function ensureArray<T>(x: T | T[]) {
  return Array.isArray(x) ? x : [x];
}

type RGBA = [r: number, g: number, b: number, a: number];
// Adapted from: https://github.com/ome/ome-zarr-py/blob/db60b8272e0fe005920f8a296d4828b7a32e663e/ome_zarr/conversions.py#L16
function intToRgba(int: number): RGBA {
  if (!Number.isInteger(int)) {
    throw Error('Not an integer.');
  }

  // Write number to int32 representation (4 bytes).
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, int, false); // offset === 0, littleEndian === false

  // Take u8 view and extract number for each byte (1 byte for R/G/B/A).
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes) as RGBA;
}

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
    return {
      ...img.attr,
      AquisitionDate,
      Description,
      Pixels: {
        ...img.Pixels.attr,
        Channels
      }
    };
  });
}

export type OMEXML = ReturnType<typeof fromString>;
