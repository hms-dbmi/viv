import { MAX_CHANNELS, VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
import { getDtypeValues } from '../utils';

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
  //worth revisiting given we plan on allowing more channels.
  const isLinear = interpolation === 'linear';
  const values = getDtypeValues(isLinear ? 'Float32' : dtype);
  // we probably want to move this kind of uniformTypes generation to some kind of helper
  // nb - this particular code isn't actually doing anything functionally useful as I write this
  // ^^ and now revisiting, I thought that comment might be outdated, but as of this moment it makes no discernible difference
  const uniformTypes = {
    // we can change this to total nonsense and nothing changes in the app AFAICT
    // if it were to be of use for type-safety etc... I'm not sure where or how.
    // but that might mean that we'd want to do some expandShaderModule type thing here.
    [`contrastLimits${I}`]: 'vec2<f32>'
  };
  return {
    shaderModule: { ...coreShaderModule, uniformTypes },
    filter: interpolation,
    cast: isLinear ? data => new Float32Array(data) : data => data,
    ...values
  };
}
