const fs = `\
float apply_contrast_limits(float intensity, vec2 contrastLimits) {
    return  max(0., (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0])));
}
`;

export default {
  name: 'channel-intensity',
  defines: {
    SAMPLER_TYPE: 'usampler2D',
    COLORMAP_FUNCTION: ''
  },
  fs
};
