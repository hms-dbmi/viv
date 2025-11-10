export const apply_transparent_color = `\
vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}
`;

export function generateNumChannelsCode() {
  // what do we want to do here?
  // where we have things like `uniform vec3 colors[NUM_CHANNELS];`
  // we are unfortunately likely to need something like this instead:
  // inidices.map(i => `uniform vec3 colors${i};`).join('\n')
  // we could try to allow the nicer syntax, explicitly parsing for [NUM_CHANNELS]...
  // that's one thing for declarations, but trying to process the uses will be messy.
  // First pass of this can be to make things work with a fixed NUM_CHANNELS...
  // prototyping what will need to be done for varying NUM_CHANNELS,
  // and what the semantics for extensions will need to be.
}
