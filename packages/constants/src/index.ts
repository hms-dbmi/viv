import { GL } from '@luma.gl/constants';

export const MAX_COLOR_INTENSITY = 255;

export const DEFAULT_COLOR_OFF = [0, 0, 0];

export const MAX_CHANNELS = 6;

export const DEFAULT_FONT_FAMILY =
  "-apple-system, 'Helvetica Neue', Arial, sans-serif";

/**
 * @deprecated We plan to remove `DTYPE_VALUES` as a part of Viv's public API as it
 * leaks internal implementation details. If this is something your project relies
 * on, please open an issue for further discussion.
 *
 * More info can be found here: https://github.com/hms-dbmi/viv/pull/372#discussion_r571707517
 */
export const DTYPE_VALUES = {
  Uint8: {
    format: 'r8uint',
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_BYTE,
    max: 2 ** 8 - 1,
    sampler: 'usampler2D'
  },
  Uint16: {
    format: 'r16uint',
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_SHORT,
    max: 2 ** 16 - 1,
    sampler: 'usampler2D'
  },
  Uint32: {
    format: 'r32uint',
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_INT,
    max: 2 ** 32 - 1,
    sampler: 'usampler2D'
  },
  Float32: {
    format: 'r32float',
    dataFormat: GL.RED,
    type: GL.FLOAT,
    // Not sure what to do about this one - a good use case for channel stats, I suppose:
    // https://en.wikipedia.org/wiki/Single-precision_floating-point_format.
    max: 3.4 * 10 ** 38,
    sampler: 'sampler2D'
  },
  Int8: {
    format: 'r8sint',
    dataFormat: GL.RED_INTEGER,
    type: GL.BYTE,
    max: 2 ** (8 - 1) - 1,
    sampler: 'isampler2D'
  },
  Int16: {
    format: 'r16sint',
    dataFormat: GL.RED_INTEGER,
    type: GL.SHORT,
    max: 2 ** (16 - 1) - 1,
    sampler: 'isampler2D'
  },
  Int32: {
    format: 'r32sint',
    dataFormat: GL.RED_INTEGER,
    type: GL.INT,
    max: 2 ** (32 - 1) - 1,
    sampler: 'isampler2D'
  },
  // Cast Float64 as 32 bit float point so it can be rendered.
  Float64: {
    format: 'r32float',
    dataFormat: GL.RED,
    type: GL.FLOAT,
    // Not sure what to do about this one - a good use case for channel stats, I suppose:
    // https://en.wikipedia.org/wiki/Single-precision_floating-point_format.
    max: 3.4 * 10 ** 38,
    sampler: 'sampler2D',
    cast: (data: ArrayLike<number>) => new Float32Array(data)
  }
} as const;

export const COLORMAPS = [
  'jet',
  'hsv',
  'hot',
  'cool',
  'spring',
  'summer',
  'autumn',
  'winter',
  'bone',
  'copper',
  'greys',
  'yignbu',
  'greens',
  'yiorrd',
  'bluered',
  'rdbu',
  'picnic',
  'rainbow',
  'portland',
  'blackbody',
  'earth',
  'electric',
  'alpha',
  'viridis',
  'inferno',
  'magma',
  'plasma',
  'warm',
  'rainbow-soft',
  'bathymetry',
  'cdom',
  'chlorophyll',
  'density',
  'freesurface-blue',
  'freesurface-red',
  'oxygen',
  'par',
  'phase',
  'salinity',
  'temperature',
  'turbidity',
  'velocity-blue',
  'velocity-green',
  'cubehelix'
] as const;

export enum RENDERING_MODES {
  MAX_INTENSITY_PROJECTION = 'Maximum Intensity Projection',
  MIN_INTENSITY_PROJECTION = 'Minimum Intensity Projection',
  ADDITIVE = 'Additive'
}
