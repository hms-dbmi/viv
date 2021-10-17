import fs from './lens.glsl';

export default {
  name: 'lens-module',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity0, vTexCoord, 0);
   mutate_color(rgb, intensity1, vTexCoord, 1);
   mutate_color(rgb, intensity2, vTexCoord, 2);
   mutate_color(rgb, intensity3, vTexCoord, 3);
   mutate_color(rgb, intensity4, vTexCoord, 4);
   mutate_color(rgb, intensity5, vTexCoord, 5);
   rgba.rgb = rgb;
  `,
    'fs:#main-end': `
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
     gl_FragColor = (isLensOn && isFragOnLensBounds) ? vec4(lensBorderColor, 1.) : gl_FragColor;
  `
  }
};
