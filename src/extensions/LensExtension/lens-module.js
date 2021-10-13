import fs from './lens.glsl';

export default {
  name: 'lens-module',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
   process_channel_intensity_with_lens(rgb, intensity0, vTexCoord, 0);
   process_channel_intensity_with_lens(rgb, intensity1, vTexCoord, 1);
   process_channel_intensity_with_lens(rgb, intensity2, vTexCoord, 2);
   process_channel_intensity_with_lens(rgb, intensity3, vTexCoord, 3);
   process_channel_intensity_with_lens(rgb, intensity4, vTexCoord, 4);
   process_channel_intensity_with_lens(rgb, intensity5, vTexCoord, 5);
  `,
    'fs:#main-end': `
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
     gl_FragColor = (isLensOn && isFragOnLensBounds) ? vec4(lensBorderColor, 1.) : gl_FragColor;
  `
  }
};
