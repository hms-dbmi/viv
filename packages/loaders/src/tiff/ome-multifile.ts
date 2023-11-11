/* eslint-disable */
import { fromUrl, type GeoTIFF } from 'geotiff';
import { getOmePixelSourceMeta, type OmeTiffSelection } from './lib/utils';
import { fromString, type OmeXml } from '../omexml';
import TiffPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(`Assert failed${message ? `: ${message}` : ''}`);
  }
}

function keyFor({ c, t, z }: OmeTiffSelection): string {
  return `t${t}.c${c}.z${z}`;
}

type TiffDataTags = OmeXml[number]['Pixels']['TiffData'];
type TIffDataItem = TiffDataTags[number];

function isCompleteTiffDataItem(item: TIffDataItem): item is Required<TIffDataItem> {
  return (
    "FirstC" in item &&
    "FirstT" in item &&
    "FirstZ" in item &&
    "IFD" in item &&
    "UUID" in item
  );
}

function createMultifileOmeTiffIndexer(
  tiffData: OmeXml[number]["Pixels"]["TiffData"],
  baseUrl: URL
) {
  const tiffs = new Map<string, Promise<GeoTIFF>>();
  const lookup = new Map<string, { ifd: number; filename: string }>();

  for (const d of tiffData) {
    assert(isCompleteTiffDataItem(d), 'Incomplete TiffData item');
    const filename = d['UUID']['FileName'];
    const key = keyFor({ c: d['FirstC'], t: d['FirstT'], z: d['FirstZ'] });
    lookup.set(key, { filename, ifd: d['IFD'] });
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

export async function load(href: string) {
  const url = new URL(href);
  assert(url.pathname.endsWith('.ome'), 'Not a valid multifile ome extension');
  const text = await fetch(url).then(res => res.text());
  const rootMeta = fromString(text);
  // We just support a single image for now
  const imgMeta = rootMeta[0];
  const indexer = createMultifileOmeTiffIndexer(imgMeta['Pixels']['TiffData'], url);
  const { labels, getShape, physicalSizes, dtype } = getOmePixelSourceMeta(imgMeta);
  const source = new TiffPixelSource(
    indexer,
    dtype,
    guessTiffTileSize(await indexer({ c: 0, t: 0, z: 0 })),
    getShape(0),
    labels,
    { physicalSizes },
  );
  return {
    data: [source],
    metadata: imgMeta,
  }
}
