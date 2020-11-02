export default {
  name: 'channel-intensity-module',
  defines: {
    SAMPLER_TYPE: 'usampler2D'
  },
  fs: `\

  vec3 hsv_to_rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  vec3 rgb_to_hsv(vec3 rgb) {
    float Cmax = max(rgb.r, max(rgb.g, rgb.b));
    float Cmin = min(rgb.r, min(rgb.g, rgb.b));
    float delta = Cmax - Cmin;

    vec3 hsv = vec3(0., 0., Cmax);

    if (Cmax > Cmin) {
      hsv.y = delta / Cmax;

      if (rgb.r == Cmax) {
        hsv.x = (rgb.g - rgb.b) / delta;
      }
      else {
        if (rgb.g == Cmax){
          hsv.x = 2. + (rgb.b - rgb.r) / delta;
        }
        else {
          hsv.x = 4. + (rgb.r - rgb.g) / delta;
        }
      }
      hsv.x = fract(hsv.x / 6.);
    }
    return hsv;
  }

  float sample_and_apply_sliders(SAMPLER_TYPE channel, vec2 vTexCoord, vec2 sliderValues) {
    float fragIntensity = float(texture(channel, vTexCoord).r);
    float slidersAppliedToIntensity = (fragIntensity - sliderValues[0]) / max(0.0005, (sliderValues[1] - sliderValues[0]));
    return max(0.0, slidersAppliedToIntensity);
  }

  vec3 process_channel_intensity(float intensity, vec3 colorValues, int channelIndex, bool inLensAndUseLens, int lensSelection) {
    float useColorValue = float(int((inLensAndUseLens && channelIndex == lensSelection) || (!inLensAndUseLens)));
    // Use arithmetic instead of if-then for useColorValue.
    vec3 hsvCombo = rgb_to_hsv(max(vec3(colorValues), (1.0 - useColorValue) * vec3(255, 255, 255)));
    // Sum up the intesitiies in additive blending.
    hsvCombo = vec3(hsvCombo.xy, max(0.0, intensity));
    return hsv_to_rgb(hsvCombo);
  }

  vec3 sample_colormap_texture(float intensity, sampler2D colormap) {
    vec2 loc = vec2(min(max(intensity, 1.0 / 255.0), 1.0 - (1.0 / 255.0)), 0.5);
    vec3 sampled = texture(colormap, loc).rgb;
    return sampled;
  }
`
};
