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

// color
uniform vec3 colors[6];

// opacity
uniform float opacity;

// uniform for making a transparent color.
uniform vec3 transparentColor;
uniform bool useTransparentColor;

in vec2 vTexCoord;

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


  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  vec3 rgbCombo = vec3(0.);

  for(int i = 0; i < 6; i++) {
    DECKGL_MUTATE_COLOR(rgbCombo, intensityArray[i], colors[i], vTexCoord, i);
  }


  gl_FragColor = apply_opacity(rgbCombo, useTransparentColor, transparentColor, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
