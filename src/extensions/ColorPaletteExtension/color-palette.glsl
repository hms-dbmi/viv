#pragma glslify: apply_transparent_color = require(../utils.glsl)

uniform vec3 transparentColor;
uniform bool useTransparentColor;
uniform float opacity;


uniform vec3 colors[6];

void mutate_color(inout vec3 rgb, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5) { 
  rgb += max(0.0, min(1.0, intensity0)) * vec3(colors[0]);
  rgb += max(0.0, min(1.0, intensity1)) * vec3(colors[1]);
  rgb += max(0.0, min(1.0, intensity2)) * vec3(colors[2]);
  rgb += max(0.0, min(1.0, intensity3)) * vec3(colors[3]);
  rgb += max(0.0, min(1.0, intensity4)) * vec3(colors[4]);
  rgb += max(0.0, min(1.0, intensity5)) * vec3(colors[5]);
}

vec4 apply_opacity(vec3 rgb) {
  return vec4(apply_transparent_color(rgb, transparentColor, useTransparentColor, opacity));
}
