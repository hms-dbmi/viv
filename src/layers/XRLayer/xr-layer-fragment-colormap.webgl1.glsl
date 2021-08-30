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
uniform vec2 windows[6];

// opacity
uniform float opacity;
uniform float divisor;

// uniforms for making a transparent color.
uniform bool useTransparentColor;

varying vec2 vTexCoord;


void main() {
  float intensityValue0 = sample_and_apply_windows(channel0, vTexCoord, windows[0]);
  float intensityValue1 = sample_and_apply_windows(channel1, vTexCoord, windows[1]);
  float intensityValue2 = sample_and_apply_windows(channel2, vTexCoord, windows[2]);
  float intensityValue3 = sample_and_apply_windows(channel3, vTexCoord, windows[3]);
  float intensityValue4 = sample_and_apply_windows(channel4, vTexCoord, windows[4]);
  float intensityValue5 = sample_and_apply_windows(channel5, vTexCoord, windows[5]);

  float intensityCombo = 0.;
  
  intensityCombo += max(0.,intensityValue0);
  intensityCombo += max(0.,intensityValue1);
  intensityCombo += max(0.,intensityValue2);
  intensityCombo += max(0.,intensityValue3);
  intensityCombo += max(0.,intensityValue4);
  intensityCombo += max(0.,intensityValue5);

  gl_FragColor = colormap(intensityCombo, opacity, useTransparentColor);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
