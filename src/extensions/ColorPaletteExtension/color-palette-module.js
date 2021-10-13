import fs from './color-palette.glsl';

export default {
  name: 'color-palette-module',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity0, 0);
   mutate_color(rgb, intensity1, 1);
   mutate_color(rgb, intensity2, 2);
   mutate_color(rgb, intensity3, 3);
   mutate_color(rgb, intensity4, 4);
   mutate_color(rgb, intensity5, 5);
   rgba = apply_opacity(rgb);
  `,
  }
};
