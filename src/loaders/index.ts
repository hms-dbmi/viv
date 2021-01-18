export { loadOmeTiff } from './tiff';
export { loadBioformatsZarr, loadOmeZarr } from './zarr';
export { getChannelStats } from './utils';

export * as TiffPixelSource from './tiff/pixel-source';
export * as ZarrPixelSource from './zarr/pixel-source';

type SupportedDtype = 'Uint8' | 'Uint16' | 'Uint32' | 'Float32';
type SupportedTypedArray = InstanceType<typeof globalThis[`${SupportedDtype}Array`]>;

interface LayerData {
  data: SupportedTypedArray;
  width: number;
  height: number;
}

type PixelSourceSelection<S extends string[]> = { [K in S[number]]: number };

interface RasterSelection<S extends string[]> {
  selection: PixelSourceSelection<S>;
}

interface TileSelection<S extends string[]> {
  x: number;
  y: number;
  selection: PixelSourceSelection<S>;
  signal?: AbortSignal;
}

interface PhysicalSize {
  size: number;
  unit: string;
}

interface PixelSourceMeta {
  physicalSizes?: { [key: string]: PhysicalSize; };
  photometricInterpretation?: number;
}

type Labels<S extends string[]> = [...S, 'y', 'x'] | [...S, 'y', 'x', '_c'];

interface PixelSource<S extends string[]> {
  getRaster(sel: RasterSelection<S>): Promise<LayerData>;
  getTile(sel: TileSelection<S>): Promise<LayerData>;
  shape: number[];
  dtype: SupportedDtype;
  labels: Labels<S>;
  tileSize: number;
  meta?: PixelSourceMeta;
}