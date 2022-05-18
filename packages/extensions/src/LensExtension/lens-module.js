import fs from './lens.glsl';

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
