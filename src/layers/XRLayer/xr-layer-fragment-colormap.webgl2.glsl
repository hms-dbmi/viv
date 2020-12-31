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
uniform SAMPLER_TYPE channel6;
uniform SAMPLER_TYPE channel7;
uniform SAMPLER_TYPE channel8;

// range
uniform vec2 sliderValues[MAX_SLIDERS_AND_CHANNELS];

// opacity
uniform float opacity;

in vec2 vTexCoord;

out vec4 color;



void main() {
  float intensityValue0 = sample_and_apply_sliders(channel0, vTexCoord, sliderValues[0]);
  float intensityValue1 = sample_and_apply_sliders(channel1, vTexCoord, sliderValues[1]);
  float intensityValue2 = sample_and_apply_sliders(channel2, vTexCoord, sliderValues[2]);
  float intensityValue3 = sample_and_apply_sliders(channel3, vTexCoord, sliderValues[3]);
  float intensityValue4 = sample_and_apply_sliders(channel4, vTexCoord, sliderValues[4]);
  float intensityValue5 = sample_and_apply_sliders(channel5, vTexCoord, sliderValues[5]);
  float intensityValue6 = sample_and_apply_sliders(channel6, vTexCoord, sliderValues[6]);
  float intensityValue7 = sample_and_apply_sliders(channel7, vTexCoord, sliderValues[7]);
  float intensityValue8 = sample_and_apply_sliders(channel8, vTexCoord, sliderValues[8]);

  float intensityArray[MAX_SLIDERS_AND_CHANNELS] = float[MAX_SLIDERS_AND_CHANNELS](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5, intensityValue6, intensityValue7, intensityValue8);
  float intensityCombo = 0.0;
  for(int i = 0; i < MAX_SLIDERS_AND_CHANNELS; i++) {
    intensityCombo += max(0.0,intensityArray[i]);
  }
  color = colormap(intensityCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(color, geometry);
}
