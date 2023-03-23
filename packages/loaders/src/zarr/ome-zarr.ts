import type { ZarrArray } from 'zarr';
import type { Labels } from '@vivjs/types';
import { loadMultiscales, guessTileSize } from './lib/utils';
import ZarrPixelSource from './pixel-source';

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

// See https://ngff.openmicroscopy.org/latest/#axes-md
export interface Axis {
  name: string;
  type?: string;
  unit?: string;
}

interface Multiscale {
  datasets: { path: string }[];
  axes?: string[] | Axis[];
  version?: string;
}

export interface RootAttrs {
  omero: Omero;
  multiscales: Multiscale[];
}

export async function load(store: ZarrArray['store']) {
  const { data, rootAttrs, labels } = await loadMultiscales(store);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: rootAttrs
  };
}
