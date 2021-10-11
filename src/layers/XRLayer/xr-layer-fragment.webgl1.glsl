#define SHADER_NAME xr-layer-fragment-shader
precision highp float;

// our texture
uniform sampler2D channel0;
uniform sampler2D channel1;
uniform sampler2D channel2;
uniform sampler2D channel3;
uniform sampler2D channel4;
uniform sampler2D channel5;

// color
uniform vec3 colors[6];
uniform float intensityArray[6];

// opacity
uniform float opacity;

// uniform for making a transparent color.
uniform vec3 transparentColor;
uniform bool useTransparentColor;

varying vec2 vTexCoord;

// range
uniform vec2 contrastLimits[6];

void main() {

  float intensityValue0 = float(texture(channel0, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensityValue0, contrastLimits[0], 0);
  float intensityValue1 = float(texture(channel1, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensityValue1, contrastLimits[1], 1);
  float intensityValue2 = float(texture(channel2, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensityValue2, contrastLimits[2], 2);
  float intensityValue3 = float(texture(channel3, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensityValue3, contrastLimits[3], 3);
  float intensityValue4 = float(texture(channel4, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensityValue4, contrastLimits[4], 4);
  float intensityValue5 = float(texture(channel5, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensityValue5, contrastLimits[5], 5);


  vec3 rgbCombo = vec3(0.);
  DECKGL_MUTATE_COLOR(rgbCombo, intensityValue0, colors[0], vTexCoord, 0);
  DECKGL_MUTATE_COLOR(rgbCombo, intensityValue1, colors[1], vTexCoord, 1);
  DECKGL_MUTATE_COLOR(rgbCombo, intensityValue2, colors[2], vTexCoord, 2);
  DECKGL_MUTATE_COLOR(rgbCombo, intensityValue3, colors[3], vTexCoord, 3);
  DECKGL_MUTATE_COLOR(rgbCombo, intensityValue4, colors[4], vTexCoord, 4);
  DECKGL_MUTATE_COLOR(rgbCombo, intensityValue5, colors[5], vTexCoord, 5);
  
  gl_FragColor = apply_opacity(rgbCombo, useTransparentColor, transparentColor, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
