import type { DTYPE_VALUES, COLORMAPS } from '@vivjs/constants';
import type { Matrix4 } from 'math.gl';

export type SupportedDtype = keyof typeof DTYPE_VALUES;
export type SupportedTypedArray = InstanceType<
  (typeof globalThis)[`${SupportedDtype}Array`]
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
  signal?: AbortSignal;
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

export type Color = [r: number, g: number, b: number];

type ColorPaletteExtensionProps = {
  colors: Color[];
  opacity: number;
  transparentColor: Color;
  useTransparentColor: boolean;
};

type AdditiveColormapExtensionProps = {
  colormap: (typeof COLORMAPS)[number];
  opacity: number;
  useTransparentColor: boolean;
};

type LensExtensionProps = {
  lensEnabled: boolean;
  lensSelection: number;
  lensRadius: number;
  lensBorderRadius: number;
  colors: Color[];
  lensBorderColor: Color;
};

type ColorPalette3DExtensionProps = {
  colors: Color[];
};

type AdditiveColormap3DExtensionProps = {
  colormap: (typeof COLORMAPS)[number];
};

// types to be refined _if_ on LayerProps
type PreciseLayerProps<S extends string[]> = {
  contrastLimits: [begin: number, end: number][];
  selections: PixelSourceSelection<S>[];
  dtype: keyof typeof DTYPE_VALUES;
  opacity?: number;
  modelMatrix?: Matrix4 | undefined;
};

type Override<What, With> = Omit<What, keyof With> & With;

type ExtractLoader<LayerProps, S extends string[]> = LayerProps extends {
  loader: object[];
}
  ? { loader: PixelSource<S>[] }
  : LayerProps extends { loader: object }
    ? { loader: PixelSource<S> }
    : unknown;

// Add optional extention props to layer if 'extensions' is defined on LayerProps.
type WithExtensionProps<LayerProps> = LayerProps extends { extensions: unknown }
  ? Partial<
      ColorPaletteExtensionProps &
        AdditiveColormapExtensionProps &
        LensExtensionProps &
        ColorPalette3DExtensionProps &
        AdditiveColormap3DExtensionProps
    > & { [extensionProp: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  : unknown;

/**
 * DocumentationJS does not understand TS syntax in JSDoc annotations,
 * which means our generated types from `LayerProps` aren't very precise.
 *
 * This utility type overrides keys from `LayerProps` with
 * more precise types if they exist in `PreciseLayerProps`. We import this type in
 * each Layer constructor, ignored by DocumentationJS, meaning our documentation
 * stays the same (with less precise types) but code completion / type-checking
 * is much more strict and useful.
 */
export type Viv<LayerProps, S extends string[] = string[]> = Override<
  Omit<LayerProps, 'loader'>,
  PreciseLayerProps<S>
> &
  ExtractLoader<LayerProps, S> &
  WithExtensionProps<LayerProps>;
