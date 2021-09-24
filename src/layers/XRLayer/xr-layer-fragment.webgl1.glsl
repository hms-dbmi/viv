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
uniform vec2 sliderValues[6];

// color
uniform vec3 colorValues[6];
uniform float intensityArray[6];

// opacity
uniform float opacity;

// uniform for making a transparent color.
uniform vec3 transparentColor;
uniform bool useTransparentColor;

varying vec2 vTexCoord;

void main() {

  float intensityValue0 = sample_and_apply_sliders(channel0, vTexCoord, sliderValues[0]);
  float intensityValue1 = sample_and_apply_sliders(channel1, vTexCoord, sliderValues[1]);
  float intensityValue2 = sample_and_apply_sliders(channel2, vTexCoord, sliderValues[2]);
  float intensityValue3 = sample_and_apply_sliders(channel3, vTexCoord, sliderValues[3]);
  float intensityValue4 = sample_and_apply_sliders(channel4, vTexCoord, sliderValues[4]);
  float intensityValue5 = sample_and_apply_sliders(channel5, vTexCoord, sliderValues[5]);

  vec3 rgbCombo = vec3(0.);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue0, colorValues[0], vTexCoord, 0);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue1, colorValues[1], vTexCoord, 1);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue2, colorValues[2], vTexCoord, 2);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue3, colorValues[3], vTexCoord, 3);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue4, colorValues[4], vTexCoord, 4);
  DECKGL_PROCESS_INTENSITY(rgbCombo, intensityValue5, colorValues[5], vTexCoord, 5);

  gl_FragColor = apply_opacity(rgbCombo, useTransparentColor, transparentColor, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
