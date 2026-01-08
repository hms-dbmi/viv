import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
import { apply_transparent_color } from '../shader-utils';

const moduleName = 'colorPaletteModule';

const fs = `\
uniform ${moduleName}Uniforms {
  vec3 transparentColor;
  uint useTransparentColor;
  float opacity;
  vec3 color${I};
} ${moduleName};

${apply_transparent_color}

void mutate_color(inout vec3 rgb, float intensity) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    ${moduleName}.color${I},
  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgb += max(0.0, min(1.0, intensity)) * vec3(colors[i]);
  }
}

vec4 apply_opacity(vec3 rgb) {
  bool useTransparentColor = ${moduleName}.useTransparentColor != uint(0);
  return vec4(apply_transparent_color(rgb, ${moduleName}.transparentColor, useTransparentColor, ${moduleName}.opacity));
}
`;

const DECKGL_MUTATE_COLOR = `\
vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity);
rgba = apply_opacity(rgb);
`;

export default {
  name: moduleName,
  uniformTypes: {
    transparentColor: 'vec3<f32>',
    useTransparentColor: 'u32',
    opacity: 'f32',
    [`color${I}`]: 'vec3<f32>'
  },
  fs,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': DECKGL_MUTATE_COLOR
  }
};
