
vec4 apply_opacity(vec3 color, bool useTransparentColor, vec3 transparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}

#pragma glslify: export(apply_opacity)
