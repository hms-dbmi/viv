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

in vec2 vTexCoord;

// range
uniform vec2 contrastLimits[6];

void main() {
  
  float intensity0 = 0.;
  DECKGL_SAMPLE_TEXTURE(intensity0, channel0, vTexCoord);
  DECKGL_PROCESS_INTENSITY(intensity0, contrastLimits[0], 0);
  float intensity1 = 0.;
  DECKGL_SAMPLE_TEXTURE(intensity1, channel1, vTexCoord);
  DECKGL_PROCESS_INTENSITY(intensity1, contrastLimits[1], 1);
  float intensity2 = 0.;
  DECKGL_SAMPLE_TEXTURE(intensity2, channel2, vTexCoord);
  DECKGL_PROCESS_INTENSITY(intensity2, contrastLimits[2], 2);
  float intensity3 = 0.;
  DECKGL_SAMPLE_TEXTURE(intensity3, channel3, vTexCoord);
  DECKGL_PROCESS_INTENSITY(intensity3, contrastLimits[3], 3);
  float intensity4 = 0.;
  DECKGL_SAMPLE_TEXTURE(intensity4, channel4, vTexCoord);
  DECKGL_PROCESS_INTENSITY(intensity4, contrastLimits[4], 4);
  float intensity5 = 0.;
  DECKGL_SAMPLE_TEXTURE(intensity5, channel5, vTexCoord);
  DECKGL_PROCESS_INTENSITY(intensity5, contrastLimits[5], 5);

  DECKGL_MUTATE_COLOR(gl_FragColor, intensity0, intensity1, intensity2, intensity3, intensity4, intensity5, vTexCoord);


  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
