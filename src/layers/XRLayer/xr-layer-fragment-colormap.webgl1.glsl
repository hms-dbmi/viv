#define SHADER_NAME xr-layer-fragment-shader-colormap
precision highp float;


// our texture
uniform sampler2D channel0;
uniform sampler2D channel1;
uniform sampler2D channel2;
uniform sampler2D channel3;
uniform sampler2D channel4;
uniform sampler2D channel5;

// opacity
uniform float opacity;
uniform float divisor;

// uniforms for making a transparent color.
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
