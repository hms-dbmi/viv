// lens bounds for ellipse
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

bool frag_in_lens_bounds(vec2 vTexCoord) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.
  
  // Check membership in ellipse.
  return pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.) < (1. - lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 vTexCoord) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.);
  
  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1. && ellipseDistance >= (1. - lensBorderRadius);
}

void process_channel_intensity_with_lens(inout vec3 rgbOut, float intensity, vec3 color, vec2 vTexCoord, int channelIndex){
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = isLensOn && isFragInLensBounds;
  float useColorValue = float(int((inLensAndUseLens && channelIndex == lensSelection) || (!inLensAndUseLens)));
  // Use arithmetic instead of if-then for useColorValue.
  rgbOut += max(0., min(1., intensity)) * max(vec3(color), (1. - useColorValue) * vec3(1., 1., 1.));
}