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
uniform vec2 windows[6];

// color
uniform vec3 colors[6];
uniform float intensityArray[6];

// opacity
uniform float opacity;

// lens bounds
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

// uniform for making a transparent color.
uniform vec3 transparentColor;
uniform bool useTransparentColor;

varying vec2 vTexCoord;

void main() {

  float intensityValue0 = sample_and_apply_sliders(channel0, vTexCoord, windows[0]);
  float intensityValue1 = sample_and_apply_sliders(channel1, vTexCoord, windows[1]);
  float intensityValue2 = sample_and_apply_sliders(channel2, vTexCoord, windows[2]);
  float intensityValue3 = sample_and_apply_sliders(channel3, vTexCoord, windows[3]);
  float intensityValue4 = sample_and_apply_sliders(channel4, vTexCoord, windows[4]);
  float intensityValue5 = sample_and_apply_sliders(channel5, vTexCoord, windows[5]);

  // Find out if the frag is in bounds of the lens.
  bool isFragInLensBounds = frag_in_lens_bounds(lensCenter, vTexCoord, majorLensAxis, minorLensAxis, lensBorderRadius);
  bool isFragOnLensBounds = frag_on_lens_bounds(lensCenter, vTexCoord, majorLensAxis, minorLensAxis, lensBorderRadius);

  // Declare variables.
  bool inLensAndUseLens = isLensOn && isFragInLensBounds;

  vec3 rgbCombo = process_channel_intensity(intensityValue0, colors[0], 0, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel_intensity(intensityValue1, colors[1], 1, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel_intensity(intensityValue2, colors[2], 2, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel_intensity(intensityValue3, colors[3], 3, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel_intensity(intensityValue4, colors[4], 4, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel_intensity(intensityValue5, colors[5], 5, inLensAndUseLens, lensSelection);

  // Ternaries are faster than checking this first and then returning/breaking out of shader.
  rgbCombo = (isLensOn && isFragOnLensBounds) ? lensBorderColor : rgbCombo;
  gl_FragColor = apply_opacity(rgbCombo, useTransparentColor, transparentColor, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
