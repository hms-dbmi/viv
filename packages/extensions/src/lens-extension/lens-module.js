import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const moduleName = 'lensModule';

const fs = `\
uniform ${moduleName}Uniforms {
  // lens bounds for ellipse
  float majorLensAxis;
  float minorLensAxis;

  // lens uniforms
  vec2 lensCenter;
  uint lensEnabled;
  int lensSelection;
  vec3 lensBorderColor;
  float lensBorderRadius;

  // color palette
  vec3 color${I};
} ${moduleName};

bool frag_in_lens_bounds(vec2 vTexCoord) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.

  // Check membership in ellipse.
  return pow((${moduleName}.lensCenter.x - vTexCoord.x) / ${moduleName}.majorLensAxis, 2.) + pow((${moduleName}.lensCenter.y - vTexCoord.y) / ${moduleName}.minorLensAxis, 2.) < (1. - ${moduleName}.lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 vTexCoord) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((${moduleName}.lensCenter.x - vTexCoord.x) / ${moduleName}.majorLensAxis, 2.) + pow((${moduleName}.lensCenter.y - vTexCoord.y) / ${moduleName}.minorLensAxis, 2.);

  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1. && ellipseDistance >= (1. - ${moduleName}.lensBorderRadius);
}
// Return a float for boolean arithmetic calculation.
float get_use_color_float(vec2 vTexCoord, int channelIndex) {
  bool lensEnabled = ${moduleName}.lensEnabled != uint(0);
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = lensEnabled && isFragInLensBounds;
  return float(int((inLensAndUseLens && channelIndex == ${moduleName}.lensSelection) || (!inLensAndUseLens)));
 
}
void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity, vec2 vTexCoord) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    ${moduleName}.color${I},
  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    float useColorValue = get_use_color_float(vTexCoord, i);
    rgb += max(0., min(1., intensity[i])) * max(vec3(colors[i]), (1. - useColorValue) * vec3(1., 1., 1.));
  }
}
`;

export default {
  name: moduleName,
  uniformTypes: {
    majorLensAxis: 'f32',
    minorLensAxis: 'f32',
    lensCenter: 'vec2<f32>',
    lensEnabled: 'u32',
    lensSelection: 'i32',
    lensBorderColor: 'vec3<f32>',
    lensBorderRadius: 'f32',
    [`color${I}`]: 'vec3<f32>'
  },
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity, vTexCoord);
   rgba = vec4(rgb, 1.);
  `,
    'fs:#main-end': `
      bool lensEnabled = ${moduleName}.lensEnabled != uint(0);
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
      fragColor = (lensEnabled && isFragOnLensBounds) ? vec4(${moduleName}.lensBorderColor, 1.) : fragColor;
  `
  }
};
