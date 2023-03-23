import GL from '@luma.gl/constants';
import { isWebGL2 } from '@luma.gl/core';
import { hasFeature, FEATURES } from '@luma.gl/webgl';
import { getDtypeValues } from '../utils';

import fs from './xr-layer-fragment.glsl';
import vs from './xr-layer-vertex.glsl';

const coreShaderModule = { fs, vs };

function validateWebGL2Filter(gl, interpolation) {
  const canShowFloat = hasFeature(gl, FEATURES.TEXTURE_FLOAT);
  const canShowLinear = hasFeature(gl, FEATURES.TEXTURE_FILTER_LINEAR_FLOAT);

  if (!canShowFloat) {
    throw new Error(
      'WebGL1 context does not support floating point textures.  Unable to display raster data.'
    );
  }

  if (!canShowLinear && interpolation === GL.LINEAR) {
    console.warn(
      'LINEAR filtering not supported in WebGL1 context.  Falling back to NEAREST.'
    );
    return GL.NEAREST;
  }

  return interpolation;
}

export function getRenderingAttrs(dtype, gl, interpolation) {
  if (!isWebGL2(gl)) {
    return {
      format: GL.LUMINANCE,
      dataFormat: GL.LUMINANCE,
      type: GL.FLOAT,
      sampler: 'sampler2D',
      shaderModule: coreShaderModule,
      filter: validateWebGL2Filter(gl, interpolation),
      cast: data => new Float32Array(data)
    };
  }
  // Linear filtering only works when the data type is cast to Float32.
  const isLinear = interpolation === GL.LINEAR;
  // Need to add es version tag so that shaders work in WebGL2 since the tag is needed for using usampler2d with WebGL2.
  // Very cursed!
  const upgradedShaderModule = { ...coreShaderModule };
  const version300str = '#version 300 es\n';
  upgradedShaderModule.fs = version300str.concat(upgradedShaderModule.fs);
  upgradedShaderModule.vs = version300str.concat(upgradedShaderModule.vs);
  const values = getDtypeValues(isLinear ? 'Float32' : dtype);
  return {
    shaderModule: upgradedShaderModule,
    filter: interpolation,
    cast: isLinear ? data => new Float32Array(data) : data => data,
    ...values
  };
}
