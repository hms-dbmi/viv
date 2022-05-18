import fs from './additive-colormap.glsl';

export default {
  name: 'additive-colormap',
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
  float intensityCombo = 0.;
  intensityCombo += max(0.,intensity0);
  intensityCombo += max(0.,intensity1);
  intensityCombo += max(0.,intensity2);
  intensityCombo += max(0.,intensity3);
  intensityCombo += max(0.,intensity4);
  intensityCombo += max(0.,intensity5);
  rgba = colormap(intensityCombo);
`
  }
};
