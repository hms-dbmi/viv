/* eslint-disable */
import type { GeoTIFF } from 'geotiff';
import {
  createGeoTiff,
  getOmePixelSourceMeta,
  type OmeTiffSelection
} from './lib/utils';
import { fromString, type OmeXml } from '../omexml';
import TiffPixelSource from './pixel-source';
import { guessTiffTileSize, assert } from '../utils';
import type Pool from './lib/Pool';

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

function gatherResources(omexml: OmeXml[number]) {
  const lookup = new Map<string, { ifd: number; filename: string }>();
  for (const d of omexml['Pixels']['TiffData']) {
    assert(isCompleteTiffDataItem(d), 'Incomplete TiffData item');
    const filename = d['UUID']['FileName'];
    const key = keyFor({ c: d['FirstC'], t: d['FirstT'], z: d['FirstZ'] });
    lookup.set(key, { filename, ifd: d['IFD'] });
  }
  return {
    get(selection: OmeTiffSelection): { ifd: number; filename: string } {
      const entry = lookup.get(keyFor(selection));
      assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
      return entry;
    }
  };
}

function createMultifileOmeTiffIndexer(
  lookup: ReturnType<typeof gatherResources>,
  resolver: TiffResolver
) {
  return async (selection: OmeTiffSelection) => {
    const entry = lookup.get(selection);
    const tiff = await resolver.resolve(entry.filename);
    const image = await tiff.getImage(entry.ifd);
    return image;
  };
}

interface TiffResolver {
  resolve(filename: string): Promise<GeoTIFF>;
}

function createTiffResolver(options: {
  baseUrl: URL;
  headers?: Headers | Record<string, string>;
}): TiffResolver {
  const cache = new Map<string, GeoTIFF>();
  return {
    async resolve(filename: string) {
      if (!cache.has(filename)) {
        const url = new URL(filename, options.baseUrl);
        const tiff = await createGeoTiff(url, options);
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
  const resolver = createTiffResolver({ baseUrl: url });
  const promises = rootMeta.map(async imgMeta => {
    const resources = gatherResources(imgMeta);
    const indexer = createMultifileOmeTiffIndexer(resources, resolver);
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
  return Promise.all(promises);
}
