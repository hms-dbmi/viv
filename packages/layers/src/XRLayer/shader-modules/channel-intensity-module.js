import fs from './channel-intensity.glsl';

export default {
  name: 'channel-intensity-module',
  defines: {
    SAMPLER_TYPE: 'usampler2D',
    COLORMAP_FUNCTION: ''
  },
  fs
};
