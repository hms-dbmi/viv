import type { DTYPE_VALUES } from './constants';
import type { Matrix4 } from 'math.gl';

export type SupportedDtype = keyof typeof DTYPE_VALUES;
export type SupportedTypedArray = InstanceType<
  typeof globalThis[`${SupportedDtype}Array`]
>;

export interface PixelData {
  data: SupportedTypedArray;
  width: number;
  height: number;
}

export type PixelSourceSelection<S extends string[]> = {
  [K in S[number]]: number;
};

export interface RasterSelection<S extends string[]> {
  selection: PixelSourceSelection<S>;
}

export interface TileSelection<S extends string[]> {
  x: number;
  y: number;
  selection: PixelSourceSelection<S>;
  signal?: AbortSignal;
}

interface PhysicalSize {
  size: number;
  unit: string;
}

export interface PixelSourceMeta {
  physicalSizes?: { [key: string]: PhysicalSize };
  photometricInterpretation?: number;
}

export type Labels<S extends string[]> =
  | [...S, 'y', 'x']
  | [...S, 'y', 'x', '_c'];

export interface PixelSource<S extends string[]> {
  getRaster(sel: RasterSelection<S>): Promise<PixelData>;
  getTile(sel: TileSelection<S>): Promise<PixelData>;
  onTileError(err: Error): void;
  shape: number[];
  dtype: SupportedDtype;
  labels: Labels<S>;
  tileSize: number;
  meta?: PixelSourceMeta;
}

interface VivProps<S extends string[]> {
  sliderValues: [begin: number, end: number][];
  colorValues: [r: number, g: number, b: number][];
  loaderSelection: PixelSourceSelection<S>[];
  domain?: [min: number, max: number][];
  modelMatrix?: Matrix4;
}

/**
 * DocumentationJS does not understand TS syntax in JSDoc annotations,
 * which means our generated types from `LayerProps` aren't very precise.
 *
 * This utility type overrides keys from `LayerProps` with
 * more precise types if they exist in `VivProps`. We import this type in
 * each Layer constructor, ignored by DocumentationJS, meaning our documentation
 * stays the same (with less precise types) but code completion / type-checking
 * is much more strict and useful.
 */
export type Viv<LayerProps, S extends string[] = string[]> = Omit<
  LayerProps,
  keyof VivProps<S> | 'loader'
> &
  {
    [K in keyof VivProps<S>]: K extends keyof LayerProps
      ? VivProps<S>[K]
      : never;
  } & {
    loader: 'loader' extends keyof LayerProps
      ? LayerProps['loader'] extends any[]
        ? PixelSource<S>[]
        : PixelSource<S>
      : never;
  };
