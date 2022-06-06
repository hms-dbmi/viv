export const apply_transparent_color = `\
vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}
`;

export function createAdditiveColormapModule(name, apply_cmap) {
  return {
    name: `additive-colormap-${name}`,
    fs: `\
uniform float opacity;
uniform bool useTransparentColor;

${apply_transparent_color}
${apply_cmap}

vec4 colormap(float intensity) {
  return vec4(apply_transparent_color(apply_cmap(min(1.,intensity)).xyz, apply_cmap(0.).xyz, useTransparentColor, opacity));
}`,
    inject: {
      'fs:DECKGL_MUTATE_COLOR': `\
  float intensityCombo = 0.;
  intensityCombo += max(0.,intensity0);
  intensityCombo += max(0.,intensity1);
  intensityCombo += max(0.,intensity2);
  intensityCombo += max(0.,intensity3);
  intensityCombo += max(0.,intensity4);
  intensityCombo += max(0.,intensity5);
  rgba = colormap(intensityCombo);`
    }
  };
}
