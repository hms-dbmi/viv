/* eslint-disable */
import { fromUrl, type GeoTIFF } from 'geotiff';
import type { OmeTiffSelection } from './lib/utils';
import { fromString, type OMEXML } from '../omexml';

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(`Assert failed${message ? `: ${message}` : ''}`);
  }
}

function keyFor({ c, t, z }: OmeTiffSelection): string {
  return `t${t}.c${c}.z${z}`;
}

function createIndexer(
  tiffData: NonNullable<OMEXML[0]['Pixels']['TiffData']>,
  baseUrl: URL
) {
  const tiffs = new Map<string, Promise<GeoTIFF>>();
  const lookup = new Map<string, { ifd: number; filename: string }>();

  for (const d of tiffData) {
    const filename = d['UUID'].attr['FileName'];
    const key = keyFor({
      c: d.attr['FirstC'],
      t: d.attr['FirstT'],
      z: d.attr['FirstZ']
    });
    lookup.set(key, { filename, ifd: d.attr['IFD'] });
    if (!tiffs.has(filename)) {
      tiffs.set(filename, fromUrl(new URL(filename, baseUrl).href));
    }
  }

  return async (selection: OmeTiffSelection) => {
    const entry = lookup.get(keyFor(selection));
    assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
    const tiff = await tiffs.get(entry.filename)!;
    return tiff.getImage(entry.ifd);
  };
}

export async function load(url: URL) {
  assert(url.pathname.endsWith('.ome'), 'Not a valid multifile ome extension');
  const text = await fetch(url).then(res => res.text());
  console.log(text);
  const omexml = fromString(text);
  const tiffData = omexml[0]['Pixels']['TiffData'];
  assert(tiffData, 'companion OME-XML is missing TiffData');
  const indexer = createIndexer(tiffData, url);
  return indexer;
}
