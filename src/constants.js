import GL from '@luma.gl/constants';

export const MAX_COLOR_INTENSITY = 255;

export const DEFAULT_COLOR_OFF = [0, 0, 0];

export const MAX_SLIDERS_AND_CHANNELS = 6;

export const DTYPE_VALUES = {
  '<u1': {
    format: GL.R8UI,
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_BYTE,
    max: 2 ** 8 - 1,
    TypedArray: Uint8Array
  },
  '<u2': {
    format: GL.R16UI,
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_SHORT,
    max: 2 ** 16 - 1,
    TypedArray: Uint16Array
  },
  '<u4': {
    format: GL.R32UI,
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_INT,
    max: 2 ** 32 - 1,
    TypedArray: Uint32Array
  },
  '<f4': {
    format: GL.R32F,
    dataFormat: GL.RED,
    type: GL.FLOAT,
    max: 2 ** 31 - 1,
    TypedArray: Float32Array
  }
};

export const NO_WEBGL2 = !document.createElement('canvas').getContext('webgl2');
