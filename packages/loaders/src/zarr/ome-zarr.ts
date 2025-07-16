import type { Readable } from 'zarrita';
import { guessTileSize, loadMultiscales } from './lib/utils';
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
  coordinateTransformations?: object[]; // TODO: stricter type
}

type SpatialDataTempAttrs = {
  channels_metadata?: {
    channels: { label: number }[];
  }
  'image-label'?: { version: string };
}

export type RootAttrs = {
  omero: Omero;
  multiscales: Multiscale[];
} | SpatialDataTempAttrs;

export type LoadOmeZarrReturnValue = {
  data: ZarrPixelSource[];
  metadata: RootAttrs;
};

export async function load(store: Readable) {
  const { data, rootAttrs, labels } = await loadMultiscales(store);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, { labels, tileSize }));
  return {
    data: pyramid,
    metadata: rootAttrs
  };
}
