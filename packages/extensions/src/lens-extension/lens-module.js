const fs = `\
// lens bounds for ellipse
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool lensEnabled;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

// color palette
uniform vec3 colors[6];

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
// Return a float for boolean arithmetic calculation.
float get_use_color_float(vec2 vTexCoord, int channelIndex) {
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = lensEnabled && isFragInLensBounds;
  return float(int((inLensAndUseLens && channelIndex == lensSelection) || (!inLensAndUseLens)));
 
}
void mutate_color(inout vec3 rgb, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5, vec2 vTexCoord){
  float useColorValue = 0.;

  useColorValue = get_use_color_float(vTexCoord, 0);
  rgb += max(0., min(1., intensity0)) * max(vec3(colors[0]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 1);
  rgb += max(0., min(1., intensity1)) * max(vec3(colors[1]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 2);
  rgb += max(0., min(1., intensity2)) * max(vec3(colors[2]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 3);
  rgb += max(0., min(1., intensity3)) * max(vec3(colors[3]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 4);
  rgb += max(0., min(1., intensity4)) * max(vec3(colors[4]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 5);
  rgb += max(0., min(1., intensity5)) * max(vec3(colors[5]), (1. - useColorValue) * vec3(1., 1., 1.));
}
`;

export default {
  name: 'lens-module',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity0, intensity1, intensity2, intensity3, intensity4, intensity5, vTexCoord);
   rgba = vec4(rgb, 1.);
  `,
    'fs:#main-end': `
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
     gl_FragColor = (lensEnabled && isFragOnLensBounds) ? vec4(lensBorderColor, 1.) : gl_FragColor;
  `
  }
};
