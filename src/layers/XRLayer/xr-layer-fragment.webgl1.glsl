#define SHADER_NAME xr-layer-fragment-shader
precision highp float;

// our texture
uniform sampler2D channel0;
uniform sampler2D channel1;
uniform sampler2D channel2;
uniform sampler2D channel3;
uniform sampler2D channel4;
uniform sampler2D channel5;

// range
uniform vec2 contrastLimits[6];

// color
uniform vec3 colors[6];
uniform float intensityArray[6];

// opacity
uniform float opacity;

// uniform for making a transparent color.
uniform vec3 transparentColor;
uniform bool useTransparentColor;

varying vec2 vTexCoord;

void main() {

  float intensityValue0 = sample_and_apply_contrast_limits(channel0, vTexCoord, contrastLimits[0]);
  float intensityValue1 = sample_and_apply_contrast_limits(channel1, vTexCoord, contrastLimits[1]);
  float intensityValue2 = sample_and_apply_contrast_limits(channel2, vTexCoord, contrastLimits[2]);
  float intensityValue3 = sample_and_apply_contrast_limits(channel3, vTexCoord, contrastLimits[3]);
  float intensityValue4 = sample_and_apply_contrast_limits(channel4, vTexCoord, contrastLimits[4]);
  float intensityValue5 = sample_and_apply_contrast_limits(channel5, vTexCoord, contrastLimits[5]);

  vec3 rgbCombo = vec3(0.);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue0, colors[0], vTexCoord, 0);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue1, colors[1], vTexCoord, 1);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue2, colors[2], vTexCoord, 2);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue3, colors[3], vTexCoord, 3);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue4, colors[4], vTexCoord, 4);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue5, colors[5], vTexCoord, 5);

  gl_FragColor = apply_opacity(rgbCombo, useTransparentColor, transparentColor, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
