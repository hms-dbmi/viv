export const apply_transparent_color = `\
vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}
`;

// this will need revisiting for varying NUM_CHANNELS...
// with much more involved shader assembly logic.
// At present it needs to be used by each extension as if it's in the fragment source it ends up appearing too late.
// we should update xr-layer.js where the shader assembly is done to reduce this burden.
export const define_num_channels = `\
#define NUM_CHANNELS 6
`;