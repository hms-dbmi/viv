import type { ZarrArray } from 'zarr';
import { loadMultiscales, guessTileSize } from './lib/utils';
import ZarrPixelSource from './pixel-source';
import type { Labels } from '../../types';

interface Channel {
  channelsVisible: boolean;
  color: string;
  label: string;
  window: {
    min?: number;
    max?: number;
    start: number;
    end: number;
  };
}

interface Omero {
  channels: Channel[];
  rdefs: {
    defaultT?: number;
    defaultZ?: number;
    model: string;
  };
  name?: string;
}

interface Multiscale {
  datasets: { path: string }[];
  version?: string;
}

export interface RootAttrs {
  omero: Omero;
  multiscales: Multiscale[];
}

export async function load(store: ZarrArray['store']) {
  const { data, rootAttrs } = await loadMultiscales(store);
  const labels = ['t', 'c', 'z', 'y', 'x'] as Labels<['t', 'c', 'z']>;
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: rootAttrs
  };
}
