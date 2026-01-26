import { BaseDecoder, fromBlob, fromFile, fromUrl, GeoTIFFImage, addDecoder } from 'geotiff';
import { decompress } from 'lzw-tiff-decoder';
import quickselect from 'quickselect';
import * as z from 'zod';
import { KeyError, openGroup, HTTPStore } from 'zarr';

var __defProp$3 = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => {
  __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class LZWDecoder extends BaseDecoder {
  constructor(fileDirectory) {
    super();
    __publicField$3(this, "maxUncompressedSize");
    const width = fileDirectory.TileWidth || fileDirectory.ImageWidth;
    const height = fileDirectory.TileLength || fileDirectory.ImageLength;
    const nbytes = fileDirectory.BitsPerSample[0] / 8;
    this.maxUncompressedSize = width * height * nbytes;
  }
  async decodeBlock(buffer) {
    const bytes = new Uint8Array(buffer);
    const decoded = await decompress(bytes, this.maxUncompressedSize);
    return decoded.buffer;
  }
}

const DTYPE_LOOKUP$1 = {
  uint8: "Uint8",
  uint16: "Uint16",
  uint32: "Uint32",
  float: "Float32",
  double: "Float64",
  int8: "Int8",
  int16: "Int16",
  int32: "Int32"
};
function getChannelStats(arr) {
  let len = arr.length;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let total = 0;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
    if (arr[len] > max) {
      max = arr[len];
    }
    total += arr[len];
  }
  const mean = total / arr.length;
  len = arr.length;
  let sumSquared = 0;
  while (len--) {
    sumSquared += (arr[len] - mean) ** 2;
  }
  const sd = (sumSquared / arr.length) ** 0.5;
  const mid = Math.floor(arr.length / 2);
  const firstQuartileLocation = Math.floor(arr.length / 4);
  const thirdQuartileLocation = 3 * Math.floor(arr.length / 4);
  quickselect(arr, mid);
  const median = arr[mid];
  quickselect(arr, firstQuartileLocation, 0, mid);
  const q1 = arr[firstQuartileLocation];
  quickselect(arr, thirdQuartileLocation, mid, arr.length - 1);
  const q3 = arr[thirdQuartileLocation];
  const cutoffArr = arr.filter((i) => i > 0);
  const cutoffPercentile = 5e-4;
  const topCutoffLocation = Math.floor(
    cutoffArr.length * (1 - cutoffPercentile)
  );
  const bottomCutoffLocation = Math.floor(cutoffArr.length * cutoffPercentile);
  quickselect(cutoffArr, topCutoffLocation);
  quickselect(cutoffArr, bottomCutoffLocation, 0, topCutoffLocation);
  const contrastLimits = [
    cutoffArr[bottomCutoffLocation] || 0,
    cutoffArr[topCutoffLocation] || 0
  ];
  return {
    mean,
    sd,
    q1,
    q3,
    median,
    domain: [min, max],
    contrastLimits
  };
}
function intToRgba(int) {
  if (!Number.isInteger(int)) {
    throw Error("Not an integer.");
  }
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, int, false);
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes);
}
function isInterleaved(shape) {
  const lastDimSize = shape[shape.length - 1];
  return lastDimSize === 3 || lastDimSize === 4;
}
function getLabels(dimOrder) {
  return dimOrder.toLowerCase().split("").reverse();
}
function getImageSize(source) {
  const interleaved = isInterleaved(source.shape);
  const [height, width] = source.shape.slice(interleaved ? -3 : -2);
  return { height, width };
}
function prevPowerOf2(x) {
  return 2 ** Math.floor(Math.log2(x));
}
const SIGNAL_ABORTED = "__vivSignalAborted";
function isElement(node) {
  return node.nodeType === 1;
}
function isText(node) {
  return node.nodeType === 3;
}
function xmlToJson(xmlNode, options) {
  if (isText(xmlNode)) {
    return xmlNode.nodeValue?.trim() ?? "";
  }
  if (xmlNode.childNodes.length === 0 && (!xmlNode.attributes || xmlNode.attributes.length === 0)) {
    return "";
  }
  const xmlObj = {};
  if (xmlNode.attributes && xmlNode.attributes.length > 0) {
    const attrsObj = {};
    for (let i = 0; i < xmlNode.attributes.length; i++) {
      const attr = xmlNode.attributes[i];
      attrsObj[attr.name] = attr.value;
    }
    xmlObj[options.attrtibutesKey] = attrsObj;
  }
  for (let i = 0; i < xmlNode.childNodes.length; i++) {
    const childNode = xmlNode.childNodes[i];
    if (!isElement(childNode)) {
      continue;
    }
    const childXmlObj = xmlToJson(childNode, options);
    if (childXmlObj !== void 0 && childXmlObj !== "") {
      if (childNode.nodeName === "#text" && xmlNode.childNodes.length === 1) {
        return childXmlObj;
      }
      if (xmlObj[childNode.nodeName]) {
        if (!Array.isArray(xmlObj[childNode.nodeName])) {
          xmlObj[childNode.nodeName] = [xmlObj[childNode.nodeName]];
        }
        xmlObj[childNode.nodeName].push(childXmlObj);
      } else {
        xmlObj[childNode.nodeName] = childXmlObj;
      }
    }
  }
  return xmlObj;
}
function parseXML(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Necessary for parsing XML
    xmlString.replace(/\u0000$/, ""),
    "application/xml"
  );
  return xmlToJson(doc.documentElement, { attrtibutesKey: "attr" });
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assert failed${message ? `: ${message}` : ""}`);
  }
}

const VIV_PROXY_KEY = "__viv";
const OFFSETS_PROXY_KEY = `${VIV_PROXY_KEY}-offsets`;
function createOffsetsProxy(tiff, offsets) {
  const get = (target, key) => {
    if (key === "getImage") {
      return (index) => {
        if (!(index in target.ifdRequests) && index in offsets) {
          const offset = offsets[index];
          target.ifdRequests[index] = target.parseFileDirectoryAt(offset);
        }
        return target.getImage(index);
      };
    }
    if (key === OFFSETS_PROXY_KEY) {
      return true;
    }
    return Reflect.get(target, key);
  };
  return new Proxy(tiff, { get });
}

function extractPhysicalSizesfromPixels(d) {
  if (!d["PhysicalSizeX"] || !d["PhysicalSizeY"] || !d["PhysicalSizeXUnit"] || !d["PhysicalSizeYUnit"]) {
    return void 0;
  }
  const physicalSizes = {
    x: { size: d["PhysicalSizeX"], unit: d["PhysicalSizeXUnit"] },
    y: { size: d["PhysicalSizeY"], unit: d["PhysicalSizeYUnit"] }
  };
  if (d["PhysicalSizeZ"] && d["PhysicalSizeZUnit"]) {
    physicalSizes.z = {
      size: d["PhysicalSizeZ"],
      unit: d["PhysicalSizeZUnit"]
    };
  }
  return physicalSizes;
}
function parsePixelDataType(dtype) {
  assert(dtype in DTYPE_LOOKUP$1, `Pixel type ${dtype} not supported.`);
  return DTYPE_LOOKUP$1[dtype];
}
function extractAxesFromPixels(d) {
  const labels = getLabels(d["DimensionOrder"]);
  const shape = Array(labels.length).fill(0);
  shape[labels.indexOf("t")] = d["SizeT"];
  shape[labels.indexOf("c")] = d["SizeC"];
  shape[labels.indexOf("z")] = d["SizeZ"];
  shape[labels.indexOf("y")] = d["SizeY"];
  shape[labels.indexOf("x")] = d["SizeX"];
  if (d["Interleaved"]) {
    labels.push("_c");
    shape.push(3);
  }
  return { labels, shape };
}
function getShapeForBinaryDownsampleLevel(options) {
  const { axes, level } = options;
  const xIndex = axes.labels.indexOf("x");
  assert(xIndex !== -1, "x dimension not found");
  const yIndex = axes.labels.indexOf("y");
  assert(yIndex !== -1, "y dimension not found");
  const resolutionShape = axes.shape.slice();
  resolutionShape[xIndex] = axes.shape[xIndex] >> level;
  resolutionShape[yIndex] = axes.shape[yIndex] >> level;
  return resolutionShape;
}
function getTiffTileSize(image) {
  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();
  const size = Math.min(tileWidth, tileHeight);
  return prevPowerOf2(size);
}
function guessImageDataType(image) {
  const sampleIndex = 0;
  const format = image.fileDirectory?.SampleFormat?.[sampleIndex] ?? 1;
  const bitsPerSample = image.fileDirectory.BitsPerSample[sampleIndex];
  switch (format) {
    case 1:
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP$1.uint8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP$1.uint16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP$1.uint32;
      }
      break;
    case 2:
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP$1.int8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP$1.int16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP$1.int32;
      }
      break;
    case 3:
      switch (bitsPerSample) {
        case 16:
          return DTYPE_LOOKUP$1.float;
        case 32:
          return DTYPE_LOOKUP$1.float;
        case 64:
          return DTYPE_LOOKUP$1.double;
      }
      break;
  }
  throw Error("Unsupported data format/bitsPerSample");
}
function getMultiTiffShapeMap(tiffs) {
  let [c, z, t] = [0, 0, 0];
  for (const tiff of tiffs) {
    c = Math.max(c, tiff.selection.c);
    z = Math.max(z, tiff.selection.z);
    t = Math.max(t, tiff.selection.t);
  }
  const firstTiff = tiffs[0].tiff;
  return {
    x: firstTiff.getWidth(),
    y: firstTiff.getHeight(),
    z: z + 1,
    c: c + 1,
    t: t + 1
  };
}
function getChannelSamplesPerPixel(tiffs, numChannels) {
  const channelSamplesPerPixel = Array(numChannels).fill(0);
  for (const tiff of tiffs) {
    const curChannel = tiff.selection.c;
    const curSamplesPerPixel = tiff.tiff.getSamplesPerPixel();
    const existingSamplesPerPixel = channelSamplesPerPixel[curChannel];
    if (existingSamplesPerPixel && existingSamplesPerPixel !== curSamplesPerPixel) {
      throw Error("Channel samples per pixel mismatch");
    }
    channelSamplesPerPixel[curChannel] = curSamplesPerPixel;
  }
  return channelSamplesPerPixel;
}
function getMultiTiffMeta(dimensionOrder, tiffs) {
  const firstTiff = tiffs[0].tiff;
  const shapeMap = getMultiTiffShapeMap(tiffs);
  const shape = [];
  for (const dim of dimensionOrder.toLowerCase()) {
    shape.unshift(shapeMap[dim]);
  }
  const labels = getLabels(dimensionOrder);
  const dtype = guessImageDataType(firstTiff);
  return { shape, labels, dtype };
}
function getMultiTiffPixelMedatata(imageNumber, dimensionOrder, shapeMap, dType, tiffs, channelNames, channelSamplesPerPixel) {
  const channelMetadata = [];
  for (let i = 0; i < shapeMap.c; i += 1) {
    channelMetadata.push({
      ID: `Channel:${imageNumber}:${i}`,
      Name: channelNames[i],
      SamplesPerPixel: channelSamplesPerPixel[i]
    });
  }
  return {
    BigEndian: !tiffs[0].tiff.littleEndian,
    DimensionOrder: dimensionOrder,
    ID: `Pixels:${imageNumber}`,
    SizeC: shapeMap.c,
    SizeT: shapeMap.t,
    SizeX: shapeMap.x,
    SizeY: shapeMap.y,
    SizeZ: shapeMap.z,
    Type: dType,
    Channels: channelMetadata
  };
}
function getMultiTiffMetadata(imageName, tiffImages, channelNames, dimensionOrder, dType) {
  const imageNumber = 0;
  const id = `Image:${imageNumber}`;
  const date = "";
  const description = "";
  const shapeMap = getMultiTiffShapeMap(tiffImages);
  const channelSamplesPerPixel = getChannelSamplesPerPixel(
    tiffImages,
    shapeMap.c
  );
  if (channelNames.length !== shapeMap.c)
    throw Error(
      "Wrong number of channel names for number of channels provided"
    );
  const pixels = getMultiTiffPixelMedatata(
    imageNumber,
    dimensionOrder,
    shapeMap,
    dType,
    tiffImages,
    channelNames,
    channelSamplesPerPixel
  );
  const format = () => {
    return {
      "Acquisition Date": date,
      "Dimensions (XY)": `${shapeMap.x} x ${shapeMap.y}`,
      PixelsType: dType,
      "Z-sections/Timepoints": `${shapeMap.z} x ${shapeMap.t}`,
      Channels: shapeMap.c
    };
  };
  return {
    ID: id,
    Name: imageName,
    AcquisitionDate: date,
    Description: description,
    Pixels: pixels,
    format
  };
}
function parseFilename(path) {
  const parsedFilename = {};
  const filename = path.split("/").pop();
  const splitFilename = filename?.split(".");
  if (splitFilename) {
    parsedFilename.name = splitFilename.slice(0, -1).join(".");
    [, parsedFilename.extension] = splitFilename;
  }
  return parsedFilename;
}
function createGeoTiffObject(source, { headers }) {
  if (source instanceof Blob) {
    return fromBlob(source);
  }
  const url = typeof source === "string" ? new URL(source) : source;
  if (url.protocol === "file:") {
    return fromFile(url.pathname);
  }
  return fromUrl(url.href, { headers, cacheSize: Number.POSITIVE_INFINITY });
}
async function createGeoTiff(source, options = {}) {
  const tiff = await createGeoTiffObject(source, options);
  return options.offsets ? createOffsetsProxy(tiff, options.offsets) : tiff;
}

function createOmeImageIndexerFromResolver(resolveBaseResolutionImageLocation, image) {
  const ifdCache = [];
  return async (sel, pyramidLevel) => {
    const { tiff, ifdIndex } = await resolveBaseResolutionImageLocation(sel);
    const baseImage = await tiff.getImage(ifdIndex);
    if (pyramidLevel === 0) {
      return baseImage;
    }
    let index;
    if (baseImage.fileDirectory.SubIFDs) {
      index = baseImage.fileDirectory.SubIFDs[pyramidLevel - 1];
    } else {
      const resolutionOffset = pyramidLevel * image.size.z * image.size.t * image.size.c;
      index = ifdIndex + resolutionOffset;
    }
    if (!ifdCache[index]) {
      ifdCache[index] = await tiff.parseFileDirectoryAt(index);
    }
    const ifd = ifdCache[index];
    return new GeoTIFFImage(
      ifd.fileDirectory,
      ifd.geoKeyDirectory,
      baseImage.dataView,
      tiff.littleEndian,
      tiff.cache,
      tiff.source
    );
  };
}
function getMultiTiffIndexer(tiffs) {
  function selectionToKey({ c = 0, t = 0, z = 0 }) {
    return `${c}-${t}-${z}`;
  }
  const lookup = new Map(
    tiffs.map(({ selection, tiff }) => [selectionToKey(selection), tiff])
  );
  return async (sel) => {
    const key = selectionToKey(sel);
    const img = lookup.get(key);
    if (!img)
      throw new Error(`No image available for selection ${key}`);
    return img;
  };
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => {
  __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class TiffPixelSource {
  constructor(indexer, dtype, tileSize, shape, labels, meta, pool) {
    this.dtype = dtype;
    this.tileSize = tileSize;
    this.shape = shape;
    this.labels = labels;
    this.meta = meta;
    this.pool = pool;
    __publicField$2(this, "_indexer");
    this._indexer = indexer;
  }
  async getRaster({ selection, signal }) {
    const image = await this._indexer(selection);
    return this._readRasters(image, { signal });
  }
  async getTile({ x, y, selection, signal }) {
    const { height, width } = this._getTileExtent(x, y);
    const x0 = x * this.tileSize;
    const y0 = y * this.tileSize;
    const window = [x0, y0, x0 + width, y0 + height];
    const image = await this._indexer(selection);
    return this._readRasters(image, { window, width, height, signal });
  }
  async _readRasters(image, props) {
    const interleave = isInterleaved(this.shape);
    const raster = await image.readRasters({
      interleave,
      ...props,
      pool: this.pool
    });
    if (props?.signal?.aborted) {
      throw SIGNAL_ABORTED;
    }
    const data = interleave ? raster : raster[0];
    return {
      data,
      width: raster.width,
      height: raster.height
    };
  }
  /*
   * Computes tile size given x, y coord.
   */
  _getTileExtent(x, y) {
    const { height: zoomLevelHeight, width: zoomLevelWidth } = getImageSize(this);
    let height = this.tileSize;
    let width = this.tileSize;
    const maxXTileCoord = Math.floor(zoomLevelWidth / this.tileSize);
    const maxYTileCoord = Math.floor(zoomLevelHeight / this.tileSize);
    if (x === maxXTileCoord) {
      width = zoomLevelWidth % this.tileSize;
    }
    if (y === maxYTileCoord) {
      height = zoomLevelHeight % this.tileSize;
    }
    return { height, width };
  }
  onTileError(err) {
    console.error(err);
  }
}

function assertSameResolution(images) {
  const width = images[0].tiff.getWidth();
  const height = images[0].tiff.getHeight();
  for (const image of images) {
    if (image.tiff.getWidth() !== width || image.tiff.getHeight() !== height) {
      throw new Error("All images must have the same width and height");
    }
  }
}
async function assertCompleteStack(images, indexer) {
  for (let t = 0; t <= Math.max(...images.map((i) => i.selection.t)); t += 1) {
    for (let c = 0; c <= Math.max(...images.map((i) => i.selection.c)); c += 1) {
      for (let z = 0; z <= Math.max(...images.map((i) => i.selection.z)); z += 1) {
        await indexer({ t, c, z });
      }
    }
  }
}
async function load$2(imageName, images, channelNames, pool) {
  assertSameResolution(images);
  const firstImage = images[0].tiff;
  const { PhotometricInterpretation: photometricInterpretation } = firstImage.fileDirectory;
  const dimensionOrder = "XYZCT";
  const tileSize = getTiffTileSize(firstImage);
  const meta = { photometricInterpretation };
  const indexer = getMultiTiffIndexer(images);
  const { shape, labels, dtype } = getMultiTiffMeta(dimensionOrder, images);
  const metadata = getMultiTiffMetadata(
    imageName,
    images,
    channelNames,
    dimensionOrder,
    dtype
  );
  await assertCompleteStack(images, indexer);
  const source = new TiffPixelSource(
    indexer,
    dtype,
    tileSize,
    shape,
    labels,
    meta,
    pool
  );
  return {
    data: [source],
    metadata
  };
}

function flattenAttributes({
  attr,
  ...rest
}) {
  return { ...attr, ...rest };
}
function ensureArray(x) {
  return Array.isArray(x) ? x : [x];
}
const DimensionOrderSchema = z.enum([
  "XYZCT",
  "XYZTC",
  "XYCTZ",
  "XYCZT",
  "XYTCZ",
  "XYTZC"
]);
const PixelTypeSchema = z.enum([
  "int8",
  "int16",
  "int32",
  "uint8",
  "uint16",
  "uint32",
  "float",
  "bit",
  "double",
  "complex",
  "double-complex"
]);
const PhysicalUnitSchema = z.enum([
  "Ym",
  "Zm",
  "Em",
  "Pm",
  "Tm",
  "Gm",
  "Mm",
  "km",
  "hm",
  "dam",
  "m",
  "dm",
  "cm",
  "mm",
  "\xB5m",
  "nm",
  "pm",
  "fm",
  "am",
  "zm",
  "ym",
  "\xC5",
  "thou",
  "li",
  "in",
  "ft",
  "yd",
  "mi",
  "ua",
  "ly",
  "pc",
  "pt",
  "pixel",
  "reference frame"
]);
z.enum([
  "Rectangle",
  "Ellipse",
  "Polygon",
  "Polyline",
  "Line",
  "Point",
  "Label"
]);
const TransformSchema = z.object({}).extend({
  attr: z.object({
    A00: z.coerce.number(),
    A01: z.coerce.number(),
    A02: z.coerce.number(),
    A10: z.coerce.number(),
    A11: z.coerce.number(),
    A12: z.coerce.number()
  })
}).transform(flattenAttributes);
function createShapeSchema(specificAttrs, shapeType) {
  return z.object({
    Transform: TransformSchema.optional()
  }).extend({
    attr: z.object({
      // Common Shape attributes (inherited by all shapes)
      ID: z.string(),
      Label: z.string().optional(),
      // OME-XML uses "Label" 
      Name: z.string().optional(),
      // Some implementations also use "Name"
      // Visual styling attributes
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      StrokeDashArray: z.string().optional(),
      LineCap: z.enum(["Butt", "Round", "Square"]).optional(),
      // Spatial/temporal context attributes
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      // Text and font attributes
      Text: z.string().optional(),
      FontFamily: z.string().optional(),
      FontSize: z.coerce.number().optional(),
      FontStyle: z.enum(["Normal", "Italic", "Bold", "BoldItalic"]).optional(),
      // Interaction and state attributes
      Locked: z.string().transform((v) => v.toLowerCase() === "true").optional(),
      Visible: z.string().transform((v) => v.toLowerCase() === "true").optional(),
      // Shape-specific attributes
      ...specificAttrs
    })
  }).transform(flattenAttributes).transform((data) => ({ ...data, type: shapeType }));
}
const RectangleSchema = createShapeSchema({
  X: z.coerce.number(),
  // Top-left X coordinate
  Y: z.coerce.number(),
  // Top-left Y coordinate
  Width: z.coerce.number(),
  // Rectangle width
  Height: z.coerce.number()
  // Rectangle height
}, "rectangle");
const EllipseSchema = createShapeSchema({
  X: z.coerce.number(),
  // Center X coordinate
  Y: z.coerce.number(),
  // Center Y coordinate
  RadiusX: z.coerce.number(),
  // Horizontal radius
  RadiusY: z.coerce.number()
  // Vertical radius
}, "ellipse");
const LineSchema = createShapeSchema({
  X1: z.coerce.number(),
  // Start point X coordinate
  Y1: z.coerce.number(),
  // Start point Y coordinate
  X2: z.coerce.number(),
  // End point X coordinate
  Y2: z.coerce.number()
  // End point Y coordinate
}, "line");
const PointSchema = createShapeSchema({
  X: z.coerce.number(),
  // Point X coordinate
  Y: z.coerce.number()
  // Point Y coordinate
}, "point");
const PolygonSchema = createShapeSchema({
  Points: z.string()
  // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, "polygon");
const PolylineSchema = createShapeSchema({
  Points: z.string()
  // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, "polyline");
const LabelSchema = createShapeSchema({
  X: z.coerce.number(),
  // Label X coordinate
  Y: z.coerce.number()
  // Label Y coordinate
}, "label");
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
const ROISchema = z.object({
  Union: UnionSchema.optional()
}).extend({
  attr: z.object({
    ID: z.string(),
    Name: z.string().optional(),
    Description: z.string().optional()
  })
}).transform(flattenAttributes).transform((data) => {
  const shapes = [];
  if (data.Union) {
    if (data.Union.Rectangle)
      shapes.push(...data.Union.Rectangle);
    if (data.Union.Ellipse)
      shapes.push(...data.Union.Ellipse);
    if (data.Union.Line)
      shapes.push(...data.Union.Line);
    if (data.Union.Point)
      shapes.push(...data.Union.Point);
    if (data.Union.Polygon)
      shapes.push(...data.Union.Polygon);
    if (data.Union.Polyline)
      shapes.push(...data.Union.Polyline);
    if (data.Union.Label)
      shapes.push(...data.Union.Label);
    if (data.Union.rectangles)
      shapes.push(...data.Union.rectangles);
    if (data.Union.ellipses)
      shapes.push(...data.Union.ellipses);
    if (data.Union.lines)
      shapes.push(...data.Union.lines);
    if (data.Union.points)
      shapes.push(...data.Union.points);
    if (data.Union.polygons)
      shapes.push(...data.Union.polygons);
    if (data.Union.polylines)
      shapes.push(...data.Union.polylines);
    if (data.Union.labels)
      shapes.push(...data.Union.labels);
  }
  const { Union, ...rest } = data;
  return { ...rest, shapes };
});
const ROIRefSchema = z.object({}).extend({
  attr: z.object({
    ID: z.string()
  })
}).transform(flattenAttributes);
const ChannelSchema = z.object({}).extend({
  attr: z.object({
    ID: z.string(),
    SamplesPerPixel: z.coerce.number().optional(),
    Name: z.string().optional(),
    Color: z.coerce.number().transform(intToRgba).optional()
  })
}).transform(flattenAttributes);
const UuidSchema = z.object({}).extend({
  attr: z.object({
    FileName: z.string()
  })
}).transform(flattenAttributes);
const TiffDataSchema = z.object({ UUID: UuidSchema.optional() }).extend({
  attr: z.object({
    IFD: z.coerce.number().default(0),
    PlaneCount: z.coerce.number().default(1),
    FirstT: z.coerce.number().optional(),
    FirstC: z.coerce.number().optional(),
    FirstZ: z.coerce.number().optional()
  })
}).transform(flattenAttributes);
const PixelsSchema = z.object({
  Channel: z.preprocess(ensureArray, ChannelSchema.array()),
  TiffData: z.preprocess(ensureArray, TiffDataSchema.array()).optional()
}).extend({
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
    PhysicalSizeXUnit: PhysicalUnitSchema.optional().default("\xB5m"),
    PhysicalSizeYUnit: PhysicalUnitSchema.optional().default("\xB5m"),
    PhysicalSizeZUnit: PhysicalUnitSchema.optional().default("\xB5m"),
    BigEndian: z.string().transform((v) => v.toLowerCase() === "true").optional(),
    Interleaved: z.string().transform((v) => v.toLowerCase() === "true").optional()
  })
}).transform(flattenAttributes).transform(({ Channel, ...rest }) => ({ Channels: Channel, ...rest }));
const ImageSchema = z.object({
  AquisitionDate: z.string().optional().default(""),
  Description: z.unknown().optional().default(""),
  Pixels: PixelsSchema,
  ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
}).extend({
  attr: z.object({
    ID: z.string(),
    Name: z.string().optional()
  })
}).transform(flattenAttributes);
const OmeSchema = z.object({
  Image: z.preprocess(ensureArray, ImageSchema.array()).optional(),
  ROI: z.preprocess(ensureArray, ROISchema.array()).optional(),
  ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
}).transform((raw) => {
  const images = raw.Image ?? [];
  const rootRefs = raw.ROIRef ?? [];
  const imageRefs = images.flatMap((img) => img.ROIRef ?? []);
  const ROIRefCombined = [...rootRefs, ...imageRefs];
  return { ...raw, ROIRefCombined };
});
function fromString(str) {
  const raw = parseXML(str);
  const omeXml = OmeSchema.parse(raw);
  console.log("simon", omeXml);
  return {
    images: omeXml.Image ?? [],
    rois: omeXml.ROI ?? [],
    roiRefs: omeXml.ROIRefCombined ?? []
  };
}

function isCompleteTiffDataItem(item) {
  return "FirstC" in item && "FirstT" in item && "FirstZ" in item && "IFD" in item && "UUID" in item;
}
function createMultifileImageDataLookup(tiffData) {
  const lookup = /* @__PURE__ */ new Map();
  function keyFor({ t, c, z }) {
    return `t${t}.c${c}.z${z}`;
  }
  assert(tiffData, "No TiffData in OME-XML");
  for (const imageData of tiffData) {
    assert(isCompleteTiffDataItem(imageData), "Incomplete TiffData item");
    const key = keyFor({
      t: imageData["FirstT"],
      c: imageData["FirstC"],
      z: imageData["FirstZ"]
    });
    const imageDataPointer = {
      ifd: imageData["IFD"],
      filename: imageData["UUID"]["FileName"]
    };
    lookup.set(key, imageDataPointer);
  }
  return {
    getImageDataPointer(selection) {
      const entry = lookup.get(keyFor(selection));
      assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
      return entry;
    }
  };
}
function createMultifileOmeTiffResolver(options) {
  const tiffs = /* @__PURE__ */ new Map();
  const lookup = createMultifileImageDataLookup(options.tiffData);
  return async (selection) => {
    const entry = lookup.getImageDataPointer(selection);
    if (!tiffs.has(entry.filename)) {
      const url = new URL(entry.filename, options.baseUrl);
      const tiff2 = await createGeoTiff(url, options);
      tiffs.set(entry.filename, tiff2);
    }
    const tiff = tiffs.get(entry.filename);
    assert(tiff, `No GeoTIFF for ${entry.filename}`);
    return { tiff, ifdIndex: entry.ifd };
  };
}
async function getPixelSourceOptionsForImage(metadata, config) {
  const resolveOmeSelection = createMultifileOmeTiffResolver({
    tiffData: metadata["Pixels"]["TiffData"],
    baseUrl: config.baseUrl,
    headers: config.headers
  });
  const { tiff, ifdIndex } = await resolveOmeSelection({ c: 0, t: 0, z: 0 });
  const baseImage = await tiff.getImage(ifdIndex);
  const pyramidIndexer = createOmeImageIndexerFromResolver(
    resolveOmeSelection,
    {
      size: {
        z: metadata["Pixels"]["SizeZ"],
        t: metadata["Pixels"]["SizeT"],
        c: metadata["Pixels"]["SizeC"]
      }
    }
  );
  return {
    pyramidIndexer,
    levels: baseImage.fileDirectory.SubIFDs ? baseImage.fileDirectory.SubIFDs.length + 1 : 1,
    tileSize: getTiffTileSize(baseImage),
    axes: extractAxesFromPixels(metadata["Pixels"]),
    dtype: parsePixelDataType(metadata["Pixels"]["Type"]),
    meta: {
      physicalSizes: extractPhysicalSizesfromPixels(metadata["Pixels"]),
      photometricInterpretation: baseImage.fileDirectory.PhotometricInterpretation
    }
  };
}
async function loadMultifileOmeTiff(source, options = {}) {
  assert(
    !(source instanceof File),
    "File or Blob not supported for multifile OME-TIFF"
  );
  const url = new URL(source);
  const text = await fetch(url).then((res) => res.text());
  const parsed = fromString(text);
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];
  const roiMap = new Map(rois.map((roi) => [roi.ID, roi]));
  const images = (parsed.images || []).map((image) => {
    const imageROIRefs = roiRefs.filter((roiRef) => {
      return true;
    });
    const imageROIs = imageROIRefs.map((roiRef) => roiMap.get(roiRef.ID)).filter(Boolean);
    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });
  const tiffImages = [];
  for (const metadata of images) {
    const opts = await getPixelSourceOptionsForImage(metadata, {
      baseUrl: url,
      headers: options.headers || {}
    });
    const data = Array.from(
      { length: opts.levels },
      (_, level) => new TiffPixelSource(
        (sel) => opts.pyramidIndexer({ t: sel.t ?? 0, c: sel.c ?? 0, z: sel.z ?? 0 }, level),
        opts.dtype,
        opts.tileSize,
        getShapeForBinaryDownsampleLevel({ axes: opts.axes, level }),
        opts.axes.labels,
        opts.meta,
        options.pool
      )
    );
    tiffImages.push({ data, metadata });
  }
  return tiffImages;
}

function resolveMetadata(omexml, SubIFDs) {
  const rois = omexml.rois || [];
  const roiRefs = omexml.roiRefs || [];
  const roiMap = new Map(rois.map((roi) => [roi.ID, roi]));
  const images = (omexml.images || []).map((image) => {
    const imageROIRefs = roiRefs.filter((roiRef) => {
      return true;
    });
    const imageROIs = imageROIRefs.map((roiRef) => roiMap.get(roiRef.ID)).filter(Boolean);
    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });
  if (SubIFDs) {
    return { levels: SubIFDs.length + 1, rootMeta: images };
  }
  const firstImageMetadata = images[0];
  return { levels: images.length, rootMeta: [firstImageMetadata] };
}
function getRelativeOmeIfdIndex({ z, t, c }, image) {
  const { size, dimensionOrder } = image;
  switch (image.dimensionOrder) {
    case "XYZCT":
      return z + size.z * c + size.z * size.c * t;
    case "XYZTC":
      return z + size.z * t + size.z * size.t * c;
    case "XYCTZ":
      return c + size.c * t + size.c * size.t * z;
    case "XYCZT":
      return c + size.c * z + size.c * size.z * t;
    case "XYTCZ":
      return t + size.t * c + size.t * size.c * z;
    case "XYTZC":
      return t + size.t * z + size.t * size.z * c;
    default:
      throw new Error(`Invalid dimension order: ${dimensionOrder}`);
  }
}
function createSingleFileOmeTiffPyramidalIndexer(tiff, image) {
  return createOmeImageIndexerFromResolver((sel) => {
    const withinImageIndex = getRelativeOmeIfdIndex(sel, image);
    const ifdIndex = withinImageIndex + image.ifdOffset;
    return { tiff, ifdIndex };
  }, image);
}
async function loadSingleFileOmeTiff(source, options = {}) {
  const { offsets, headers, pool } = options;
  const tiff = await createGeoTiff(source, { headers, offsets });
  const firstImage = await tiff.getImage();
  const { rootMeta, levels } = resolveMetadata(
    fromString(firstImage.fileDirectory.ImageDescription),
    firstImage.fileDirectory.SubIFDs
  );
  const images = [];
  let imageIfdOffset = 0;
  for (const metadata of rootMeta) {
    const imageSize = {
      z: metadata["Pixels"]["SizeZ"],
      c: metadata["Pixels"]["SizeC"],
      t: metadata["Pixels"]["SizeT"]
    };
    const axes = extractAxesFromPixels(metadata["Pixels"]);
    const pyramidIndexer = createSingleFileOmeTiffPyramidalIndexer(tiff, {
      size: imageSize,
      ifdOffset: imageIfdOffset,
      dimensionOrder: metadata["Pixels"]["DimensionOrder"]
    });
    const dtype = parsePixelDataType(metadata["Pixels"]["Type"]);
    const tileSize = getTiffTileSize(
      await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0)
    );
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata["Pixels"]),
      photometricInterpretation: firstImage.fileDirectory.PhotometricInterpretation
    };
    const data = Array.from(
      { length: levels },
      (_, level) => {
        return new TiffPixelSource(
          (sel) => pyramidIndexer({ t: sel.t ?? 0, c: sel.c ?? 0, z: sel.z ?? 0 }, level),
          dtype,
          tileSize,
          getShapeForBinaryDownsampleLevel({ axes, level }),
          axes.labels,
          meta,
          pool
        );
      }
    );
    images.push({ data, metadata });
    imageIfdOffset += imageSize.t * imageSize.z * imageSize.c;
  }
  return images;
}

addDecoder(5, () => LZWDecoder);
function isSupportedCompanionOmeTiffFile(source) {
  return typeof source === "string" && source.endsWith(".companion.ome");
}
async function loadOmeTiff(source, opts = {}) {
  const load = isSupportedCompanionOmeTiffFile(source) ? loadMultifileOmeTiff : loadSingleFileOmeTiff;
  const loaders = await load(source, opts);
  return opts.images === "all" ? loaders : loaders[0];
}
function getImageSelectionName(imageName, imageNumber, imageSelections) {
  return imageSelections.length === 1 ? imageName : `${imageName}_${imageNumber.toString()}`;
}
async function loadMultiTiff(sources, opts = {}) {
  const { pool, headers = {}, name = "MultiTiff" } = opts;
  const tiffImage = [];
  const channelNames = [];
  for (const source of sources) {
    const [s, file] = source;
    const imageSelections = Array.isArray(s) ? s : [s];
    if (typeof file === "string") {
      const parsedFilename = parseFilename(file);
      const extension = parsedFilename.extension?.toLowerCase();
      if (extension === "tif" || extension === "tiff") {
        const tiffImageName = parsedFilename.name;
        if (tiffImageName) {
          const curImage = await createGeoTiff(file, {
            headers
          });
          for (let i = 0; i < imageSelections.length; i++) {
            const curSelection = imageSelections[i];
            if (curSelection) {
              const tiff = await curImage.getImage(i);
              tiffImage.push({ selection: curSelection, tiff });
              channelNames[curSelection.c] = getImageSelectionName(
                tiffImageName,
                i,
                imageSelections
              );
            }
          }
        }
      }
    } else {
      const { name: name2 } = parseFilename(file.path);
      if (name2) {
        const curImage = await fromBlob(file);
        for (let i = 0; i < imageSelections.length; i++) {
          const curSelection = imageSelections[i];
          if (curSelection) {
            const tiff = await curImage.getImage(i);
            if (tiff.fileDirectory.SamplesPerPixel > 1) {
              throw new Error(
                `Multiple samples per pixel in tiff not supported as part of a multi-tiff, found ${tiff.fileDirectory.SamplesPerPixel} samples per pixel`
              );
            }
            tiffImage.push({ selection: curSelection, tiff });
            channelNames[curSelection.c] = getImageSelectionName(
              name2,
              i,
              imageSelections
            );
          }
        }
      }
    }
  }
  if (tiffImage.length > 0) {
    return load$2(name, tiffImage, opts.channelNames || channelNames, pool);
  }
  throw new Error("Unable to load image from provided TiffFolder source.");
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function joinUrlParts(...args) {
  return args.map((part, i) => {
    if (i === 0)
      return part.trim().replace(/[/]*$/g, "");
    return part.trim().replace(/(^[/]*|[/]*$)/g, "");
  }).filter((x) => x.length).join("/");
}
class ReadOnlyStore {
  async keys() {
    return [];
  }
  async deleteItem() {
    return false;
  }
  async setItem() {
    console.warn("Cannot write to read-only store.");
    return false;
  }
}
class FileStore extends ReadOnlyStore {
  constructor(fileMap, rootPrefix = "") {
    super();
    __publicField$1(this, "_map");
    __publicField$1(this, "_rootPrefix");
    this._map = fileMap;
    this._rootPrefix = rootPrefix;
  }
  _key(key) {
    return joinUrlParts(this._rootPrefix, key);
  }
  async getItem(key) {
    const file = this._map.get(this._key(key));
    if (!file) {
      throw new KeyError(key);
    }
    const buffer = await file.arrayBuffer();
    return buffer;
  }
  async containsItem(key) {
    const path = this._key(key);
    return this._map.has(path);
  }
}

function isOmeZarr(dataShape, Pixels) {
  const { SizeT, SizeC, SizeZ, SizeY, SizeX } = Pixels;
  const omeZarrShape = [SizeT, SizeC, SizeZ, SizeY, SizeX];
  return dataShape.every((size, i) => omeZarrShape[i] === size);
}
function guessBioformatsLabels({ shape }, { Pixels }) {
  if (isOmeZarr(shape, Pixels)) {
    return getLabels("XYZCT");
  }
  const labels = getLabels(Pixels.DimensionOrder);
  labels.forEach((lower, i) => {
    const label = lower.toUpperCase();
    const xmlSize = Pixels[`Size${label}`];
    if (!xmlSize) {
      throw Error(`Dimension ${label} is invalid for OME-XML.`);
    }
    if (shape[i] !== xmlSize) {
      throw Error("Dimension mismatch between zarr source and OME-XML.");
    }
  });
  return labels;
}
function getRootPrefix(files, rootName) {
  const first = files.find((f) => f.path.indexOf(rootName) > 0);
  if (!first) {
    throw Error("Could not find root in store.");
  }
  const prefixLength = first.path.indexOf(rootName) + rootName.length;
  return first.path.slice(0, prefixLength);
}
function isAxis(axisOrLabel) {
  return typeof axisOrLabel[0] !== "string";
}
function castLabels(dimnames) {
  return dimnames;
}
async function loadMultiscales(store, path = "") {
  const grp = await openGroup(store, path);
  const rootAttrs = await grp.attrs.asObject();
  let paths = ["0"];
  let labels = castLabels(["t", "c", "z", "y", "x"]);
  if ("multiscales" in rootAttrs) {
    const { datasets, axes } = rootAttrs.multiscales[0];
    paths = datasets.map((d) => d.path);
    if (axes) {
      if (isAxis(axes)) {
        labels = castLabels(axes.map((axis) => axis.name));
      } else {
        labels = castLabels(axes);
      }
    }
  }
  const data = paths.map((path2) => grp.getItem(path2));
  return {
    data: await Promise.all(data),
    rootAttrs,
    labels
  };
}
function guessTileSize(arr) {
  const interleaved = isInterleaved(arr.shape);
  const [yChunk, xChunk] = arr.chunks.slice(interleaved ? -3 : -2);
  const size = Math.min(yChunk, xChunk);
  return prevPowerOf2(size);
}

function getIndexer(labels) {
  const labelSet = new Set(labels);
  if (labelSet.size !== labels.length) {
    throw new Error("Labels must be unique");
  }
  return (sel) => {
    if (Array.isArray(sel)) {
      return [...sel];
    }
    const selection = Array(labels.length).fill(0);
    for (const [key, value] of Object.entries(sel)) {
      const index = labels.indexOf(key);
      if (index === -1) {
        throw new Error(`Invalid indexer key: ${key}`);
      }
      selection[index] = value;
    }
    return selection;
  };
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const DTYPE_LOOKUP = {
  u1: "Uint8",
  u2: "Uint16",
  u4: "Uint32",
  f4: "Float32",
  f8: "Float64",
  i1: "Int8",
  i2: "Int16",
  i4: "Int32"
};
function slice(start, stop) {
  return { start, stop, step: 1, _slice: true };
}
class BoundsCheckError extends Error {
}
class ZarrPixelSource {
  constructor(data, labels, tileSize) {
    this.labels = labels;
    this.tileSize = tileSize;
    __publicField(this, "_data");
    __publicField(this, "_indexer");
    this._indexer = getIndexer(labels);
    this._data = data;
  }
  get shape() {
    return this._data.shape;
  }
  get dtype() {
    const suffix = this._data.dtype.slice(1);
    if (!(suffix in DTYPE_LOOKUP)) {
      throw Error(`Zarr dtype not supported, got ${suffix}.`);
    }
    return DTYPE_LOOKUP[suffix];
  }
  get _xIndex() {
    const interleave = isInterleaved(this._data.shape);
    return this._data.shape.length - (interleave ? 2 : 1);
  }
  _chunkIndex(selection, { x, y }) {
    const sel = this._indexer(selection);
    sel[this._xIndex] = x;
    sel[this._xIndex - 1] = y;
    return sel;
  }
  /**
   * Converts x, y tile indices to zarr dimension Slices within image bounds.
   */
  _getSlices(x, y) {
    const { height, width } = getImageSize(this);
    const [xStart, xStop] = [
      x * this.tileSize,
      Math.min((x + 1) * this.tileSize, width)
    ];
    const [yStart, yStop] = [
      y * this.tileSize,
      Math.min((y + 1) * this.tileSize, height)
    ];
    if (xStart === xStop || yStart === yStop) {
      throw new BoundsCheckError("Tile slice is zero-sized.");
    }
    if (xStart < 0 || yStart < 0 || xStop > width || yStop > height) {
      throw new BoundsCheckError("Tile slice is out of bounds.");
    }
    return [slice(xStart, xStop), slice(yStart, yStop)];
  }
  async _getRaw(selection, getOptions) {
    const result = await this._data.getRaw(selection, getOptions);
    if (typeof result !== "object") {
      throw new Error("Expected object from getRaw");
    }
    return result;
  }
  async getRaster({
    selection,
    signal
  }) {
    const sel = this._chunkIndex(selection, { x: null, y: null });
    const result = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = result;
    return { data, width, height };
  }
  async getTile(props) {
    const { x, y, selection, signal } = props;
    const [xSlice, ySlice] = this._getSlices(x, y);
    const sel = this._chunkIndex(selection, { x: xSlice, y: ySlice });
    const tile = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = tile;
    return { data, height, width };
  }
  onTileError(err) {
    if (!(err instanceof BoundsCheckError)) {
      throw err;
    }
  }
}

async function load$1(root, xmlSource) {
  let xmlSourceText;
  if (typeof xmlSource !== "string") {
    xmlSourceText = await xmlSource.text();
  } else {
    xmlSourceText = xmlSource;
  }
  const parsed = fromString(xmlSourceText);
  const images = parsed.images || [];
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];
  const roiMap = new Map(rois.map((roi) => [roi.ID, roi]));
  let imgMeta = images[0];
  if (imgMeta) {
    const imageROIRefs = roiRefs.filter((roiRef) => {
      return true;
    });
    const imageROIs = imageROIRefs.map((roiRef) => roiMap.get(roiRef.ID)).filter(Boolean);
    const { ROIRef: _omitROIRef, ...imgWithoutRefs } = imgMeta;
    imgMeta = { ...imgWithoutRefs, ROIs: imageROIs };
  }
  const { data } = await loadMultiscales(root, "0");
  const labels = guessBioformatsLabels(data[0], imgMeta);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map((arr) => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: imgMeta
  };
}

async function load(store) {
  const { data, rootAttrs, labels } = await loadMultiscales(store);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map((arr) => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: rootAttrs
  };
}

async function loadBioformatsZarr(source, options = {}) {
  const METADATA = "METADATA.ome.xml";
  const ZARR_DIR = "data.zarr";
  if (typeof source === "string") {
    const url = source.endsWith("/") ? source.slice(0, -1) : source;
    const store2 = new HTTPStore(`${url}/${ZARR_DIR}`, options);
    const xmlSource = await fetch(`${url}/${METADATA}`, options.fetchOptions);
    if (!xmlSource.ok) {
      throw Error("No OME-XML metadata found for store.");
    }
    return load$1(store2, xmlSource);
  }
  const fMap = /* @__PURE__ */ new Map();
  let xmlFile;
  for (const file of source) {
    if (file.name === METADATA) {
      xmlFile = file;
    } else {
      fMap.set(file.path, file);
    }
  }
  if (!xmlFile) {
    throw Error("No OME-XML metadata found for store.");
  }
  const store = new FileStore(fMap, getRootPrefix(source, ZARR_DIR));
  return load$1(store, xmlFile);
}
async function loadOmeZarr(source, options = {}) {
  const store = new HTTPStore(source, options);
  if (options?.type !== "multiscales") {
    throw Error("Only multiscale OME-Zarr is supported.");
  }
  return load(store);
}

export { SIGNAL_ABORTED, TiffPixelSource, ZarrPixelSource, getChannelStats, getImageSize, isInterleaved, loadBioformatsZarr, loadMultiTiff, loadOmeTiff, loadOmeZarr };
