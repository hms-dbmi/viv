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
uniform vec2 sliderValues[6];

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

  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);
  float intensityCombo = 0.0;
  for(int i = 0; i < 6; i++) {
    intensityCombo += max(0.0,intensityArray[i]);
  }
  color = colormap(intensityCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(color, geometry);
}
