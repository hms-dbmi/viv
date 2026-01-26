import * as z from 'zod';
import { intToRgba, parseXML } from './utils';

// Main API type: full metadata structure
export type OmeXml = {
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

/**
 * ROI Shape Types (OME-XML 2016-06 Schema Compliant)
 * 
 * All shapes inherit common attributes from the base Shape entity:
 * - ID: Unique identifier (required)
 * - Label: Optional label (OME-XML standard attribute)
 * - Name: Optional name (alternative naming attribute)
 * - FillColor, StrokeColor, StrokeWidth, StrokeDashArray, LineCap: Visual styling
 * - TheC, TheT, TheZ: Channel/time/z-slice association
 * - Text, FontFamily, FontSize, FontStyle: Text attributes
 * - Locked, Visible: Interaction state
 * - Transform: Optional affine transformation matrix
 * 
 * Each shape type adds its own specific attributes:
 * - Rectangle: X, Y, Width, Height (top-left corner + dimensions)
 * - Ellipse: X, Y, RadiusX, RadiusY (center + radii)
 * - Point: X, Y (point coordinates)
 * - Line: X1, Y1, X2, Y2 (start and end points)
 * - Polyline: Points (space-separated coordinate pairs: "x1,y1 x2,y2 ...")
 * - Polygon: Points (space-separated coordinate pairs: "x1,y1 x2,y2 ...")
 * - Label: X, Y (label position)
 * 
 * @see https://www.openmicroscopy.org/Schemas/Documentation/Generated/OME-2016-06/ome.html
 */
export type ShapeType = z.infer<typeof ShapeTypeSchema>;
const ShapeTypeSchema = z.enum([
  'Rectangle',
  'Ellipse',
  'Polygon',
  'Polyline',
  'Line',
  'Point',
  'Label'
]);

// Transform schema for affine transformations
const TransformSchema = z
  .object({})
  .extend({
    attr: z.object({
      A00: z.coerce.number(),
      A01: z.coerce.number(),
      A02: z.coerce.number(),
      A10: z.coerce.number(),
      A11: z.coerce.number(),
      A12: z.coerce.number()
    })
  })
  .transform(flattenAttributes);

// Helper function to create shape schemas with common attributes
function createShapeSchema(specificAttrs: z.ZodRawShape, shapeType: string) {
  return z
    .object({
      Transform: TransformSchema.optional()
    })
    .extend({
      attr: z.object({
        // Common Shape attributes (inherited by all shapes)
        ID: z.string(),
        Label: z.string().optional(),      // OME-XML uses "Label" 
        Name: z.string().optional(),       // Some implementations also use "Name"

        // Visual styling attributes
        FillColor: z.coerce.number().transform(intToRgba).optional(),
        StrokeColor: z.coerce.number().transform(intToRgba).optional(),
        StrokeWidth: z.coerce.number().optional(),
        StrokeDashArray: z.string().optional(),
        LineCap: z.enum(['Butt', 'Round', 'Square']).optional(),

        // Spatial/temporal context attributes
        TheC: z.coerce.number().optional(),
        TheT: z.coerce.number().optional(),
        TheZ: z.coerce.number().optional(),

        // Text and font attributes
        Text: z.string().optional(),
        FontFamily: z.string().optional(),
        FontSize: z.coerce.number().optional(),
        FontStyle: z.enum(['Normal', 'Italic', 'Bold', 'BoldItalic']).optional(),

        // Interaction and state attributes
        Locked: z
          .string()
          .transform(v => v.toLowerCase() === 'true')
          .optional(),
        Visible: z
          .string()
          .transform(v => v.toLowerCase() === 'true')
          .optional(),

        // Shape-specific attributes
        ...specificAttrs
      })
    })
    .transform(flattenAttributes)
    .transform(data => ({ ...data, type: shapeType }));
}

const RectangleSchema = createShapeSchema({
  X: z.coerce.number(),        // Top-left X coordinate
  Y: z.coerce.number(),        // Top-left Y coordinate
  Width: z.coerce.number(),    // Rectangle width
  Height: z.coerce.number()    // Rectangle height
}, 'rectangle');
export type Rectangle = z.infer<typeof RectangleSchema>;

const EllipseSchema = createShapeSchema({
  X: z.coerce.number(),        // Center X coordinate
  Y: z.coerce.number(),        // Center Y coordinate
  RadiusX: z.coerce.number(),  // Horizontal radius
  RadiusY: z.coerce.number()   // Vertical radius
}, 'ellipse');
export type Ellipse = z.infer<typeof EllipseSchema>;

const LineSchema = createShapeSchema({
  X1: z.coerce.number(),       // Start point X coordinate
  Y1: z.coerce.number(),       // Start point Y coordinate
  X2: z.coerce.number(),       // End point X coordinate
  Y2: z.coerce.number()        // End point Y coordinate
}, 'line');
export type Line = z.infer<typeof LineSchema>;

const PointSchema = createShapeSchema({
  X: z.coerce.number(),        // Point X coordinate
  Y: z.coerce.number()         // Point Y coordinate
}, 'point');
export type Point = z.infer<typeof PointSchema>;

const PolygonSchema = createShapeSchema({
  Points: z.string()           // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, 'polygon');
export type Polygon = z.infer<typeof PolygonSchema>;

const PolylineSchema = createShapeSchema({
  Points: z.string()           // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, 'polyline');
export type Polyline = z.infer<typeof PolylineSchema>;

const LabelSchema = createShapeSchema({
  X: z.coerce.number(),        // Label X coordinate
  Y: z.coerce.number()         // Label Y coordinate
}, 'label');
export type Label = z.infer<typeof LabelSchema>;

// Union type of all shape types
export type Shape = Rectangle | Ellipse | Line | Point | Polygon | Polyline | Label;

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
  Polyline: z.preprocess(ensureArray, PolylineSchema.array()).optional(),
  Label: z.preprocess(ensureArray, LabelSchema.array()).optional(),

  // Lowercase plural variants
  rectangles: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  ellipses: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  lines: z.preprocess(ensureArray, LineSchema.array()).optional(),
  points: z.preprocess(ensureArray, PointSchema.array()).optional(),
  polygons: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  polylines: z.preprocess(ensureArray, PolylineSchema.array()).optional(),
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
      if (data.Union.Rectangle) shapes.push(...data.Union.Rectangle);
      if (data.Union.Ellipse) shapes.push(...data.Union.Ellipse);
      if (data.Union.Line) shapes.push(...data.Union.Line);
      if (data.Union.Point) shapes.push(...data.Union.Point);
      if (data.Union.Polygon) shapes.push(...data.Union.Polygon);
      if (data.Union.Polyline) shapes.push(...data.Union.Polyline);
      if (data.Union.Label) shapes.push(...data.Union.Label);

      // Lowercase plural variants
      if (data.Union.rectangles) shapes.push(...data.Union.rectangles);
      if (data.Union.ellipses) shapes.push(...data.Union.ellipses);
      if (data.Union.lines) shapes.push(...data.Union.lines);
      if (data.Union.points) shapes.push(...data.Union.points);
      if (data.Union.polygons) shapes.push(...data.Union.polygons);
      if (data.Union.polylines) shapes.push(...data.Union.polylines);
      if (data.Union.labels) shapes.push(...data.Union.labels);
    }

    // Return ROI with shapes as a flat array instead of nested Union
    const { Union, ...rest } = data;
    return { ...rest, shapes };
  });
export type ROI = z.infer<typeof ROISchema>;

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

// Main API: return full metadata structure
export function fromString(str: string): OmeXml {
  const raw = parseXML(str);
  const omeXml = OmeSchema.parse(raw);
  console.log('simon', omeXml);
  // With schema-level normalization, parsing is a simple projection
  return {
    images: omeXml.Image ?? [],
    rois: omeXml.ROI ?? [],
    roiRefs: (omeXml as any).ROIRefCombined ?? []
  };
}
