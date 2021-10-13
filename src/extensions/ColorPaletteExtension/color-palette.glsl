#pragma glslify: apply_transparent_color = require(../utils.glsl)

uniform vec3 transparentColor;
uniform bool useTransparentColor;
uniform float opacity;


uniform vec3 colors[6];

void mutate_color(inout vec3 rgb, float intensity, int channelIndex){
  rgb += max(0.0, min(1.0, intensity)) * vec3(colors[channelIndex]);
}

vec4 apply_opacity(vec3 rgb) {
  return vec4(apply_transparent_color(rgb, transparentColor, useTransparentColor, opacity));
}
