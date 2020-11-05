#define SHADER_NAME xr-layer-fragment-shader-colormap
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

// opacity
uniform float opacity;
uniform float divisor;

varying vec2 vTexCoord;


void main() {
  float intensityValue0 = sample_and_apply_sliders(channel0, vTexCoord, sliderValues[0]);
  float intensityValue1 = sample_and_apply_sliders(channel1, vTexCoord, sliderValues[1]);
  float intensityValue2 = sample_and_apply_sliders(channel2, vTexCoord, sliderValues[2]);
  float intensityValue3 = sample_and_apply_sliders(channel3, vTexCoord, sliderValues[3]);
  float intensityValue4 = sample_and_apply_sliders(channel4, vTexCoord, sliderValues[4]);
  float intensityValue5 = sample_and_apply_sliders(channel5, vTexCoord, sliderValues[5]);

  float intensityCombo = 0.0;
  
  intensityCombo += max(0.0,intensityValue0);
  intensityCombo += max(0.0,intensityValue1);
  intensityCombo += max(0.0,intensityValue2);
  intensityCombo += max(0.0,intensityValue3);
  intensityCombo += max(0.0,intensityValue4);
  intensityCombo += max(0.0,intensityValue5);

  gl_FragColor = colormap(intensityCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
