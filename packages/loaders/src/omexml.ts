import * as z from 'zod';
import { intToRgba, parseXML } from './utils';

// Backwards-compatible type: previously fromString returned an array of images
export type OmeXml = ReturnType<typeof fromString>;
export type OmeXmlParsed = {
  images?: any[];
  rois?: any[];
  roiRefs?: any[];
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

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

export type PhysicalUnit = z.infer<typeof PhysicalUnitSchema>;
const PhysicalUnitSchema = z.enum([
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

// ROI Shape Types
export type ShapeType = z.infer<typeof ShapeTypeSchema>;
const ShapeTypeSchema = z.enum([
  'Rectangle',
  'Ellipse',
  'Polygon',
  'Line',
  'Point',
  'Label',
  'Mask'
]);

// Rectangle shape schema
const RectangleSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      X: z.coerce.number(),
      Y: z.coerce.number(),
      Width: z.coerce.number(),
      Height: z.coerce.number()
    })
  })
  .transform(flattenAttributes)
  .transform(data => ({ ...data, kind: 'rectangle' }));

// Ellipse shape schema
const EllipseSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      X: z.coerce.number(),
      Y: z.coerce.number(),
      RadiusX: z.coerce.number(),
      RadiusY: z.coerce.number()
    })
  })
  .transform(flattenAttributes)
  .transform(data => ({ ...data, kind: 'ellipse' }));

// Line shape schema
const LineSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      X1: z.coerce.number(),
      Y1: z.coerce.number(),
      X2: z.coerce.number(),
      Y2: z.coerce.number()
    })
  })
  .transform(flattenAttributes)
  .transform(data => ({ ...data, kind: 'line' }));

// Point shape schema
const PointSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      X: z.coerce.number(),
      Y: z.coerce.number()
    })
  })
  .transform(flattenAttributes)
  .transform(data => ({ ...data, kind: 'point' }));

// Polygon shape schema
const PolygonSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      Points: z.string() // Format: "x1,y1 x2,y2 x3,y3 ..."
    })
  })
  .transform(flattenAttributes)
  .transform(data => ({ ...data, kind: 'polygon' }));

// Label shape schema
const LabelSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      X: z.coerce.number(),
      Y: z.coerce.number(),
      Text: z.string().optional()
    })
  })
  .transform(flattenAttributes)
  .transform(data => ({ ...data, kind: 'label' }));

// Union schema to contain shapes
// Support BOTH standard OME-XML element names (capitalized singular)
// and alternative lowercase plural keys observed in some generators
const UnionSchema = z.object({
  // Standard OME-XML element names
  Rectangle: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  Ellipse: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  Line: z.preprocess(ensureArray, LineSchema.array()).optional(),
  Point: z.preprocess(ensureArray, PointSchema.array()).optional(),
  Polygon: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  Label: z.preprocess(ensureArray, LabelSchema.array()).optional(),

  // Lowercase plural variants
  rectangles: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  ellipses: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  lines: z.preprocess(ensureArray, LineSchema.array()).optional(),
  points: z.preprocess(ensureArray, PointSchema.array()).optional(),
  polygons: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  labels: z.preprocess(ensureArray, LabelSchema.array()).optional()
});

// ROI schema - transforms Union into a flat array of shapes
const ROISchema = z
  .object({
    Union: UnionSchema.optional()
  })
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      Description: z.string().optional()
    })
  })
  .transform(flattenAttributes)
  .transform(data => {
    // Flatten Union into a simple array of shapes
    const shapes: Array<{ type: string;[key: string]: any }> = [];
    if (data.Union) {
      // Capitalized singular (standard OME-XML)
      if (data.Union.Rectangle) shapes.push(...data.Union.Rectangle.map((r: any) => ({ type: 'rectangle', ...r })));
      if (data.Union.Ellipse) shapes.push(...data.Union.Ellipse.map((e: any) => ({ type: 'ellipse', ...e })));
      if (data.Union.Line) shapes.push(...data.Union.Line.map((l: any) => ({ type: 'line', ...l })));
      if (data.Union.Point) shapes.push(...data.Union.Point.map((p: any) => ({ type: 'point', ...p })));
      if (data.Union.Polygon) shapes.push(...data.Union.Polygon.map((p: any) => ({ type: 'polygon', ...p })));
      if (data.Union.Label) shapes.push(...data.Union.Label.map((l: any) => ({ type: 'label', ...l })));

      // Lowercase plural variants
      if (data.Union.rectangles) shapes.push(...data.Union.rectangles.map((r: any) => ({ type: 'rectangle', ...r })));
      if (data.Union.ellipses) shapes.push(...data.Union.ellipses.map((e: any) => ({ type: 'ellipse', ...e })));
      if (data.Union.lines) shapes.push(...data.Union.lines.map((l: any) => ({ type: 'line', ...l })));
      if (data.Union.points) shapes.push(...data.Union.points.map((p: any) => ({ type: 'point', ...p })));
      if (data.Union.polygons) shapes.push(...data.Union.polygons.map((p: any) => ({ type: 'polygon', ...p })));
      if (data.Union.labels) shapes.push(...data.Union.labels.map((l: any) => ({ type: 'label', ...l })));
    }

    // Return ROI with shapes as a flat array instead of nested Union
    const { Union, ...rest } = data;
    return { ...rest, shapes };
  });

// ROIRef schema
const ROIRefSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string()
    })
  })
  .transform(flattenAttributes);

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
      IFD: z.coerce.number().default(0),
      PlaneCount: z.coerce.number().default(1),
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
      PhysicalSizeXUnit: PhysicalUnitSchema.optional().default('µm'),
      PhysicalSizeYUnit: PhysicalUnitSchema.optional().default('µm'),
      PhysicalSizeZUnit: PhysicalUnitSchema.optional().default('µm'),
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
    Pixels: PixelsSchema,
    ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
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
    Image: z.preprocess(ensureArray, ImageSchema.array()).optional(),
    ROI: z.preprocess(ensureArray, ROISchema.array()).optional(),
    ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
  })
  // Normalize/augment at the schema level to simplify parseOmeXml
  .transform(raw => {
    const images = raw.Image ?? [];
    const rootRefs = raw.ROIRef ?? [];
    const imageRefs = images.flatMap(img => img.ROIRef ?? []);
    const ROIRefCombined = [...rootRefs, ...imageRefs];
    return { ...raw, ROIRefCombined };
  });
// TODO: Verify that these attributes are always present
// .extend({
//   attr: z.object({
//     'xmlns': z.string(),
//     'xmlns:xsi': z.string(),
//     'xsi:schemaLocation': z.string()
//   })
// })
// .transform(flattenAttributes);

export function parseOmeXml(str: string): OmeXmlParsed {
  const raw = parseXML(str);
  const omeXml = OmeSchema.parse(raw);
  console.log('Parsed OME-XML', omeXml);
  // With schema-level normalization, parsing is a simple projection
  return {
    images: omeXml.Image ?? [],
    rois: omeXml.ROI ?? [],
    roiRefs: (omeXml as any).ROIRefCombined ?? []
  };
}

// Backwards-compatible API: return only the images array (prior behavior).
export function fromString(str: string) {
  const parsed = parseOmeXml(str);
  return parsed.images ?? [];
}
