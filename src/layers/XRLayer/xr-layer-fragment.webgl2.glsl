#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp SAMPLER_TYPE;

// our texture
uniform SAMPLER_TYPE channel0;
uniform SAMPLER_TYPE channel1;
uniform SAMPLER_TYPE channel2;
uniform SAMPLER_TYPE channel3;
uniform SAMPLER_TYPE channel4;
uniform SAMPLER_TYPE channel5;

// range
uniform vec2 contrastLimits[6];

// color
uniform vec3 colors[6];

// opacity
uniform float opacity;

// lens bounds for ellipse
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

// uniform for making a transparent color.
uniform vec3 transparentColor;
uniform bool useTransparentColor;

in vec2 vTexCoord;

out vec4 color;

void main() {

  float intensityValue0 = sample_and_apply_contrast_limits(channel0, vTexCoord, contrastLimits[0]);
  float intensityValue1 = sample_and_apply_contrast_limits(channel1, vTexCoord, contrastLimits[1]);
  float intensityValue2 = sample_and_apply_contrast_limits(channel2, vTexCoord, contrastLimits[2]);
  float intensityValue3 = sample_and_apply_contrast_limits(channel3, vTexCoord, contrastLimits[3]);
  float intensityValue4 = sample_and_apply_contrast_limits(channel4, vTexCoord, contrastLimits[4]);
  float intensityValue5 = sample_and_apply_contrast_limits(channel5, vTexCoord, contrastLimits[5]);

  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  // Find out if the frag is in bounds of the lens.
  bool isFragInLensBounds = frag_in_lens_bounds(lensCenter, vTexCoord, majorLensAxis, minorLensAxis, lensBorderRadius);
  bool isFragOnLensBounds = frag_on_lens_bounds(lensCenter, vTexCoord, majorLensAxis, minorLensAxis, lensBorderRadius);

  // Declare variables.
  bool inLensAndUseLens = isLensOn && isFragInLensBounds;
  vec3 rgbCombo = vec3(0.);

  for(int i = 0; i < 6; i++) {
    rgbCombo += process_channel_intensity(intensityArray[i], colors[i], i, inLensAndUseLens, lensSelection);
  }


  // Ternaries are faster than checking this first and then returning/breaking out of shader.
  rgbCombo = (isLensOn && isFragOnLensBounds) ? lensBorderColor : rgbCombo;
  color = apply_opacity(rgbCombo, useTransparentColor, transparentColor, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(color, geometry);
}