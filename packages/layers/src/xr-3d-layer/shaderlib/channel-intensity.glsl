float apply_contrast_limits(float intensity, vec2 contrastLimits) {
  float contrastLimitsAppliedToIntensity = (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0]));
  return max(0., contrastLimitsAppliedToIntensity);
}