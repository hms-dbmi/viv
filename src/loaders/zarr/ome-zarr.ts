import type { ZarrArray } from 'zarr';
import { loadMultiscales } from './lib/utils';
import ZarrPixelSource from './pixel-source';

export async function load(store: ZarrArray['store']) {
  const { data, rootAttrs } = await loadMultiscales(store);
  const labels = ['t', 'c', 'z', 'y', 'x'] as Labels<['t', 'c', 'z']>;
  const pyramid = data.map(arr => new ZarrPixelSource(arr, labels));
  return {
    data: pyramid.filter(level => pyramid[0].tileSize === level.tileSize),
    metadata: rootAttrs,
  }
}