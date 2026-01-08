import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const moduleName = 'channelIntensity';

const fs = `\
uniform ${moduleName}Uniforms {
  vec2 contrastLimits${I};
} ${moduleName};

float apply_contrast_limits(float intensity, vec2 contrastLimits) {
    return  max(0., (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0])));
}
`;

export default {
  name: moduleName,
  uniformTypes: {
    [`contrastLimits${I}`]: 'vec2<f32>'
  },
  defines: {
    SAMPLER_TYPE: 'usampler2D',
    COLORMAP_FUNCTION: ''
  },
  fs
};
