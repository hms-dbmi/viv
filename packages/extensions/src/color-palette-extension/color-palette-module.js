import { apply_transparent_color, define_num_channels } from '../shader-utils';

const fs = `\
${define_num_channels}
uniform vec3 transparentColor;
uniform bool useTransparentColor;
uniform float opacity;

// need a strategy for these
uniform vec3 colors[NUM_CHANNELS];

${apply_transparent_color}

void mutate_color(inout vec3 rgb, float intensity) { 
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgb += max(0.0, min(1.0, intensity)) * vec3(colors[i]);
  }
}

vec4 apply_opacity(vec3 rgb) {
  return vec4(apply_transparent_color(rgb, transparentColor, useTransparentColor, opacity));
}
`;

const DECKGL_MUTATE_COLOR = `\
vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity);
rgba = apply_opacity(rgb);
`;

export default {
  name: 'color-palette-module',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': DECKGL_MUTATE_COLOR
  }
};
