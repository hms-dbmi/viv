import {
  VIV_CHANNEL_INDEX_PLACEHOLDER as I,
  MAX_CHANNELS
} from '@vivjs/constants';
import { getDtypeValues } from '../utils';

import { expandShaderModule } from '@vivjs/extensions';
import fs from './xr-layer-fragment.glsl';
import vs from './xr-layer-vertex.glsl';

const coreShaderModule = { fs, vs, name: 'xrLayer' };

export function getRenderingAttrs(
  dtype,
  interpolation,
  numChannels = MAX_CHANNELS
) {
  /// - WebGL1 is no longer supported by lumagl etc.
  /// 'device' is no longer used, possible in future we want to distinguish between WebGL and WebGPU?
  // Linear filtering only works when the data type is cast to Float32.
  //!!! todo review whether we really need to be storing data as f32 - probably not.
  //worth revisiting given we're allowing more channels.
  const isLinear = interpolation === 'linear';
  const values = getDtypeValues(isLinear ? 'Float32' : dtype);
  return {
    // maybe we should do this in XRLayer instead
    shaderModule: expandShaderModule(
      { ...coreShaderModule },
      numChannels
    ),
    filter: interpolation,
    cast: isLinear ? data => new Float32Array(data) : data => data,
    ...values
  };
}
