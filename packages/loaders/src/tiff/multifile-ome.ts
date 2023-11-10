import { ensureArray } from "../utils";
import { fromUrl, type GeoTIFF } from "geotiff";
import { getOmePixelSourceMeta, type OmeTiffSelection } from "./lib/utils";
import TiffPixelSource from "./pixel-source";

function convertString(value: string): string | number | boolean {
  // Attempt to convert to number
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    return numValue;
  }
  // Attempt to convert to boolean
  if (value.toLowerCase() === "true") {
    return true;
  } else if (value.toLowerCase() === "false") {
    return false;
  }
  // Default to string
  return value;
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === 1;
}

function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

type JsonValue =
  | string
  | number
  | boolean
  | { [x: string]: JsonValue }
  | Array<JsonValue>;

function xmlToJson(
  xmlNode: HTMLElement,
  options: { attrNodeName: string },
): JsonValue | string | number | boolean {
  if (isText(xmlNode)) {
    // If the node is a text node
    return convertString(xmlNode.nodeValue?.trim() ?? "");
  }

  // If the node has no attributes and no children, return an empty string
  if (
    xmlNode.childNodes.length === 0 &&
    (!xmlNode.attributes || xmlNode.attributes.length === 0)
  ) {
    return "";
  }

  const jsonObj: JsonValue = {};

  if (xmlNode.attributes && xmlNode.attributes.length > 0) {
    const attrsObj: Record<string, string | boolean | number> = {};
    for (let i = 0; i < xmlNode.attributes.length; i++) {
      const attr = xmlNode.attributes[i];
      attrsObj[attr.name] = convertString(attr.value);
    }
    jsonObj[options.attrNodeName] = attrsObj;
  }

  for (let i = 0; i < xmlNode.childNodes.length; i++) {
    const childNode = xmlNode.childNodes[i];
    if (!isElement(childNode)) {
      continue;
    }
    const childJson = xmlToJson(childNode, options);
    if (childJson !== undefined && childJson !== "") {
      if (childNode.nodeName === "#text" && xmlNode.childNodes.length === 1) {
        return childJson;
      }
      if (jsonObj[childNode.nodeName]) {
        if (!Array.isArray(jsonObj[childNode.nodeName])) {
          jsonObj[childNode.nodeName] = [jsonObj[childNode.nodeName]];
        }
        (jsonObj[childNode.nodeName] as JsonValue[]).push(childJson);
      } else {
        jsonObj[childNode.nodeName] = childJson;
      }
    }
  }

  return jsonObj;
}

export function parseXML(xmlStr: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "application/xml");
  return xmlToJson(doc.documentElement, { attrNodeName: "attr" });
}

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(`Assert failed${message ? `: ${message}` : ''}`);
  }
}

function lookupKey({ c, t, z }: OmeTiffSelection): string {
  return `t${t}.c${c}.z${z}`;
}

export async function load(url: URL) {
  assert(url.pathname.endsWith(".ome"), "Not a valid multifile ome extension");
  const text = await fetch(url).then((res) => res.text());
  const xml = parseXML(text);

  const tiffs = new Map<string, Promise<GeoTIFF>>;
  const lookup = new Map<string, { ifd: number, filename: string }>();
  for (const d of ensureArray(xml["Image"])[0]["Pixels"]["TiffData"]) {
    const filename = d["UUID"].attr["FileName"];
    const sel: OmeTiffSelection = { c: d.attr.FirstC, t: d.attr.FirstT, z: d.attr.FirstZ };
    lookup.set(lookupKey(sel), { filename, ifd: d.attr["IFD"] });
    if (!tiffs.has(filename)) {
      tiffs.set(filename, fromUrl(new URL(filename, url).href));
    }
  }

  const { attr, ...rest } = xml["Image"]["Pixels"];
  const meta = getOmePixelSourceMeta({ Pixels: { ...rest, ...attr }});

  async function indexer(selection: OmeTiffSelection) {
    const entry = lookup.get(lookupKey(selection));
    assert(entry, `No image for selection: ${JSON.stringify(selection)}`)
    const tiff = await tiffs.get(entry.filename)!;
    return tiff.getImage(entry.ifd);
  }
  const pixelSource = new TiffPixelSource(
    indexer,
    meta.dtype,
    512,
    meta.getShape(0),
    meta.labels,
  );
  console.log(pixelSource)
}
