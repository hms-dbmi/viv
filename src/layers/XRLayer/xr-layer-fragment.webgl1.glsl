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

// lens bounds
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

varying vec2 vTexCoord;

bool fragInLensBounds() {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.
  
  // Check membership in ellipse.
  return pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.0) < (1.0 - lensBorderRadius);
}

bool fragOnLensBounds() {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.0);
  
  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1.0 && ellipseDistance >= (1.0 - lensBorderRadius);
}

void main() {
  // Find out if the frag is in bounds of the lens.
  bool isFragInLensBounds = fragInLensBounds();
  bool isFragOnLensBounds = fragOnLensBounds();

  // Declare variables.
  bool inLensAndUseLens = isLensOn && isFragInLensBounds;

  vec3 rgbCombo = process_channel(channel0, vTexCoord, colorValues[0], sliderValues[0], 0, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel(channel1, vTexCoord, colorValues[1], sliderValues[1], 1, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel(channel2, vTexCoord, colorValues[2], sliderValues[2], 2, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel(channel3, vTexCoord, colorValues[3], sliderValues[3], 3, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel(channel4, vTexCoord, colorValues[4], sliderValues[4], 4, inLensAndUseLens, lensSelection);
  rgbCombo += process_channel(channel5, vTexCoord, colorValues[5], sliderValues[5], 5, inLensAndUseLens, lensSelection);

  // Ternaries are faster than checking this first and then returning/breaking out of shader.
  rgbCombo = (isLensOn && isFragOnLensBounds) ? lensBorderColor : rgbCombo;

  gl_FragColor = vec4(rgbCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
