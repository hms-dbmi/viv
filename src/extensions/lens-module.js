import fs from './lens.glsl';

export default {
  name: 'lens-module',
  fs,
  inject: {
    'fs:DECKGL_PROCESS_INTENSITY': `
    process_channel_intensity_with_lens(rgbOut, intensity, color, vTexCoord, channelIndex);
  `,
    'fs:#main-end': `
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
     color = (isLensOn && isFragOnLensBounds) ? vec4(lensBorderColor, 1.) : color;
  `
  }
};
