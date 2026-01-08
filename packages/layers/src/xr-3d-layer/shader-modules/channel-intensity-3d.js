import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const moduleName = 'channelIntensity3D';

const fs = `\
uniform ${moduleName}Uniforms {
  vec2 contrastLimits${I};
} ${moduleName};

float apply_contrast_limits(float intensity, vec2 contrastLimits) {
  float contrastLimitsAppliedToIntensity = (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0]));
  return max(0., contrastLimitsAppliedToIntensity);
}
`;

export default {
  name: moduleName,
  uniformTypes: {
    [`contrastLimits${I}`]: 'vec2<f32>'
  },
  fs
};
