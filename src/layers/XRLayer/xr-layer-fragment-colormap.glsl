#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp usampler2D;
 #pragma glslify: magma = require('glsl-colormap/magma')

// our texture
uniform usampler2D channel0;

// range
uniform vec2 sliderValues;

// opacity
uniform float opacity;

in vec2 vTexCoord;

out vec4 color;



void main() {
  float intensityValue = (float(texture(channel0, vTexCoord).r) - sliderValues[0]) / sliderValues[1];

  color = magma(intensityValue);
}
