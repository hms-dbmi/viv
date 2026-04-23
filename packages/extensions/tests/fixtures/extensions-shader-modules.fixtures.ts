/**
 * Golden expanded GLSL outputs for Viv extension shader modules.
 *
 * These are intentionally "dumb" full-string snapshots of the expanded
 * module.fs / inject snippets for representative channel counts.
 *
 * When you intentionally change the corresponding shader templates, regenerate
 * these fixtures by:
 * - running the extension shader tests in watch mode, observing the updated
 *   `expanded.fs` / inject values from failing assertions, and
 * - copying the new strings back into this file.
 *
 * Note that certain variables such as NUM_CHANNELS are not expanded by the Viv shader assembler;
 * the luma.gl ShaderModule.defines handles these.
 * Reference: https://github.com/visgl/luma.gl/blob/f941b224ce1267b635b6d6cfa5640402c53c43d9/modules/shadertools/src/lib/shader-module/shader-module.ts#L81
 */

export const EXPECTED_COLOR_PALETTE_FS_3_CHANNELS = `uniform colorPaletteModuleUniforms {
  vec3 transparentColor;
  uint useTransparentColor;
  float opacity;
  vec3 color0;
  vec3 color1;
  vec3 color2;

} colorPaletteModule;

vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}

void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity, vec2 vTexCoord) {

  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    colorPaletteModule.color0,
    colorPaletteModule.color1,
    colorPaletteModule.color2

  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgb += max(0.0, min(1.0, intensity[i])) * vec3(colors[i]);
  }
}
vec4 apply_opacity(vec3 rgb) {
  bool useTransparentColor = colorPaletteModule.useTransparentColor != uint(0);
  return vec4(apply_transparent_color(rgb, colorPaletteModule.transparentColor, useTransparentColor, colorPaletteModule.opacity));
}
`;

export const EXPECTED_COLOR_PALETTE_INJECT_DECKGL_MUTATE_COLOR = `vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity, vTexCoord);
rgba = apply_opacity(rgb);
`;

export const EXPECTED_LENS_FS_3_CHANNELS = `uniform lensModuleUniforms {
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
  vec3 color0;
  vec3 color1;
  vec3 color2;

} lensModule;

bool frag_in_lens_bounds(vec2 vTexCoord) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.

  // Check membership in ellipse.
  return pow((lensModule.lensCenter.x - vTexCoord.x) / lensModule.majorLensAxis, 2.) + pow((lensModule.lensCenter.y - vTexCoord.y) / lensModule.minorLensAxis, 2.) < (1. - lensModule.lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 vTexCoord) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((lensModule.lensCenter.x - vTexCoord.x) / lensModule.majorLensAxis, 2.) + pow((lensModule.lensCenter.y - vTexCoord.y) / lensModule.minorLensAxis, 2.);

  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1. && ellipseDistance >= (1. - lensModule.lensBorderRadius);
}
// Return a float for boolean arithmetic calculation.
float get_use_color_float(vec2 vTexCoord, int channelIndex) {
  bool lensEnabled = lensModule.lensEnabled != uint(0);
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = lensEnabled && isFragInLensBounds;
  return float(int((inLensAndUseLens && channelIndex == lensModule.lensSelection) || (!inLensAndUseLens)));
 
}
void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity, vec2 vTexCoord) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    lensModule.color0,
    lensModule.color1,
    lensModule.color2

  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    float useColorValue = get_use_color_float(vTexCoord, i);
    rgb += max(0., min(1., intensity[i])) * max(vec3(colors[i]), (1. - useColorValue) * vec3(1., 1., 1.));
  }
}
`;

export const EXPECTED_LENS_INJECT_DECKGL_MUTATE_COLOR = `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity, vTexCoord);
   rgba = vec4(rgb, 1.);
  `;

export const EXPECTED_LENS_INJECT_MAIN_END = `
      bool lensEnabled = lensModule.lensEnabled != uint(0);
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
      fragColor = (lensEnabled && isFragOnLensBounds) ? vec4(lensModule.lensBorderColor, 1.) : fragColor;
  `;
