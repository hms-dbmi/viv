import fs from './color-palette.glsl';

const DECKGL_MUTATE_COLOR = `\
vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity0, intensity1, intensity2, intensity3, intensity4, intensity5);
rgba = apply_opacity(rgb);
`;

export default {
  name: 'color-palette-module',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': DECKGL_MUTATE_COLOR
  }
};
