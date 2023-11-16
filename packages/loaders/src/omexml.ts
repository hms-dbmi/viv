import { intToRgba, parseXML } from './utils';
import * as z from 'zod';

export type OmeXml = ReturnType<typeof fromString>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {}; // eslint-disable-line

function flattenAttributes<T extends { attr: Record<string, unknown> }>({
  attr,
  ...rest
}: T): Prettify<Pick<T, Exclude<keyof T, 'attr'>> & T['attr']> {
  // @ts-expect-error - TS doesn't like the prettify type
  return { ...attr, ...rest };
}

function ensureArray<T>(x: T | T[]) {
  return Array.isArray(x) ? x : [x];
}

export type DimensionOrder = z.infer<typeof DimensionOrderSchema>;
const DimensionOrderSchema = z.enum([
  'XYZCT',
  'XYZTC',
  'XYCTZ',
  'XYCZT',
  'XYTCZ',
  'XYTZC'
]);

const PixelTypeSchema = z.enum([
  'int8',
  'int16',
  'int32',
  'uint8',
  'uint16',
  'uint32',
  'float',
  'bit',
  'double',
  'complex',
  'double-complex'
]);

export type UnitsLength = z.infer<typeof UnitsLengthSchema>;
const UnitsLengthSchema = z.enum([
  'Ym',
  'Zm',
  'Em',
  'Pm',
  'Tm',
  'Gm',
  'Mm',
  'km',
  'hm',
  'dam',
  'm',
  'dm',
  'cm',
  'mm',
  'µm',
  'nm',
  'pm',
  'fm',
  'am',
  'zm',
  'ym',
  'Å',
  'thou',
  'li',
  'in',
  'ft',
  'yd',
  'mi',
  'ua',
  'ly',
  'pc',
  'pt',
  'pixel',
  'reference frame'
]);

const ChannelSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      SamplesPerPixel: z.coerce.number().optional(),
      Name: z.string().optional(),
      Color: z.coerce.number().transform(intToRgba).optional()
    })
  })
  .transform(flattenAttributes);

const UuidSchema = z
  .object({})
  .extend({
    attr: z.object({
      FileName: z.string()
    })
  })
  .transform(flattenAttributes);

const TiffDataSchema = z
  .object({ UUID: UuidSchema.optional() })
  .extend({
    attr: z.object({
      IFD: z.coerce.number(),
      PlaneCount: z.coerce.number(),
      FirstT: z.coerce.number().optional(),
      FirstC: z.coerce.number().optional(),
      FirstZ: z.coerce.number().optional()
    })
  })
  .transform(flattenAttributes);

const PixelsSchema = z
  .object({
    Channel: z.preprocess(ensureArray, ChannelSchema.array()),
    TiffData: z.preprocess(ensureArray, TiffDataSchema.array()).optional()
  })
  .extend({
    attr: z.object({
      ID: z.string(),
      DimensionOrder: DimensionOrderSchema,
      Type: PixelTypeSchema,
      SizeT: z.coerce.number(),
      SizeC: z.coerce.number(),
      SizeZ: z.coerce.number(),
      SizeY: z.coerce.number(),
      SizeX: z.coerce.number(),
      PhysicalSizeX: z.coerce.number().optional(),
      PhysicalSizeY: z.coerce.number().optional(),
      PhysicalSizeZ: z.coerce.number().optional(),
      SignificantBits: z.coerce.number().optional(),
      PhysicalSizeXUnit: UnitsLengthSchema.optional().default('µm'),
      PhysicalSizeYUnit: UnitsLengthSchema.optional().default('µm'),
      PhysicalSizeZUnit: UnitsLengthSchema.optional().default('µm'),
      BigEndian: z
        .string()
        .transform(v => v.toLowerCase() === 'true')
        .optional(),
      Interleaved: z
        .string()
        .transform(v => v.toLowerCase() === 'true')
        .optional()
    })
  })
  .transform(flattenAttributes)
  // Rename the `Channel` key to `Channels` for backwards compatibility
  .transform(({ Channel, ...rest }) => ({ Channels: Channel, ...rest }));

const ImageSchema = z
  .object({
    AquisitionDate: z.string().optional().default(''),
    Description: z.unknown().optional().default(''),
    Pixels: PixelsSchema
  })
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional()
    })
  })
  .transform(flattenAttributes);

const OmeSchema = z
  .object({
    Image: z.preprocess(ensureArray, ImageSchema.array())
  })
  .extend({
    attr: z.object({
      xmlns: z.string(),
      'xmlns:xsi': z.string(),
      'xsi:schemaLocation': z.string()
    })
  })
  .transform(flattenAttributes);

export function fromString(str: string) {
  const raw = parseXML(str);
  const omeXml = OmeSchema.parse(raw);
  return omeXml['Image'].map(img => {
    return {
      ...img,
      format() {
        const sizes = (['X', 'Y', 'Z'] as const)
          .map(name => {
            const size = img.Pixels[`PhysicalSize${name}` as const];
            const unit = img.Pixels[`PhysicalSize${name}Unit` as const];
            return size ? `${size} ${unit}` : '-';
          })
          .join(' x ');

        return {
          'Acquisition Date': img.AquisitionDate,
          'Dimensions (XY)': `${img.Pixels['SizeX']} x ${img.Pixels['SizeY']}`,
          'Pixels Type': img.Pixels['Type'],
          'Pixels Size (XYZ)': sizes,
          'Z-sections/Timepoints': `${img.Pixels['SizeZ']} x ${img.Pixels['SizeT']}`,
          Channels: img.Pixels['SizeC']
        };
      }
    };
  });
}
