#pragma glslify: apply_opacity = require(../utils.glsl)

uniform vec3 colors[6];

void mutate_color(inout vec3 rgb, float intensity, int channelIndex){
  rgb += max(0.0, min(1.0, intensity)) * vec3(colors[channelIndex]);
}
