import { getDtypeValues } from '../utils';

import fs from './xr-layer-fragment.glsl';
import vs from './xr-layer-vertex.glsl';

const coreShaderModule = { fs, vs };

export function getRenderingAttrs(dtype, device, interpolation) {
  /// - WebGL1 is no longer supported by lumagl etc.
  /// 'device' is no longer used, possible in future we want to distinguish between WebGL and WebGPU?
  // Linear filtering only works when the data type is cast to Float32.
  const isLinear = interpolation === 'linear';
  const values = getDtypeValues(isLinear ? 'Float32' : dtype);
  return {
    shaderModule: coreShaderModule,
    filter: interpolation,
    cast: isLinear ? data => new Float32Array(data) : data => data,
    ...values
  };
}
