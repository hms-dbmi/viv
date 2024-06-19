import { getDtypeValues } from '../utils';

import fs from './xr-layer-fragment.glsl';
import vs from './xr-layer-vertex.glsl';

const coreShaderModule = { fs, vs };


export function getRenderingAttrs(dtype, device, interpolation) {
  /// - WebGL1 is no longer supported by lumagl etc.
  /// 'device' is no longer used, possible in future we want to distinguish between WebGL and WebGPU?
  // Linear filtering only works when the data type is cast to Float32.
  const isLinear = interpolation === 'linear';
  // Need to add es version tag so that shaders work in WebGL2 since the tag is needed for using usampler2d with WebGL2.
  // Very cursed! << can probably be removed with deck.gl >9
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
