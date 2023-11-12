/* eslint-disable */
import { fromUrl, type GeoTIFF } from 'geotiff';
import { getOmePixelSourceMeta, type OmeTiffSelection } from './lib/utils';
import { fromString, type OmeXml } from '../omexml';
import TiffPixelSource from './pixel-source';
import { guessTiffTileSize } from '../utils';
import type Pool from './lib/Pool';

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

function isCompleteTiffDataItem(
  item: TIffDataItem
): item is Required<TIffDataItem> {
  return (
    'FirstC' in item &&
    'FirstT' in item &&
    'FirstZ' in item &&
    'IFD' in item &&
    'UUID' in item
  );
}

function createMultifileOmeTiffIndexer(
  tiffCache: TiffCache,
  omexml: OmeXml[number]
) {
  const lookup = new Map<string, { ifd: number; filename: string }>();
  for (const d of omexml['Pixels']['TiffData']) {
    assert(isCompleteTiffDataItem(d), 'Incomplete TiffData item');
    const filename = d['UUID']['FileName'];
    const key = keyFor({ c: d['FirstC'], t: d['FirstT'], z: d['FirstZ'] });
    lookup.set(key, { filename, ifd: d['IFD'] });
  }
  return async (selection: OmeTiffSelection) => {
    const entry = lookup.get(keyFor(selection));
    assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
    const tiff = await tiffCache.getGeoTIFF(entry.filename);
    return tiff.getImage(entry.ifd);
  };
}

type TiffCache = ReturnType<typeof tiffCache>;

function tiffCache({
  baseUrl,
  headers
}: {
  baseUrl: URL;
  headers?: Headers | Record<string, string>;
}) {
  const cache = new Map<string, GeoTIFF>();
  return {
    async getGeoTIFF(filename: string) {
      if (!cache.has(filename)) {
        const url = new URL(filename, baseUrl);
        const tiff = await fromUrl(url.href, { cacheSize: Infinity, headers });
        cache.set(filename, tiff);
      }
      return cache.get(filename)!;
    }
  };
}

export async function load(href: string, pool?: Pool) {
  const url = new URL(href);
  const text = await fetch(url).then(res => res.text());
  const rootMeta = fromString(text);
  // Share resources between images
  const cache = tiffCache({ baseUrl: url });
  return rootMeta.map(async imgMeta => {
    const indexer = createMultifileOmeTiffIndexer(cache, imgMeta);
    const { labels, getShape, physicalSizes, dtype } =
      getOmePixelSourceMeta(imgMeta);
    const source = new TiffPixelSource(
      indexer,
      dtype,
      guessTiffTileSize(await indexer({ c: 0, t: 0, z: 0 })),
      getShape(0),
      labels,
      { physicalSizes },
      pool
    );
    return {
      data: [source],
      metadata: imgMeta
    };
  });
}
