#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp usampler2D;
#pragma glslify: magma = require('glsl-colormap/magma')
#pragma glslify: viridis = require('glsl-colormap/viridis')
#pragma glslify: turbidity = require('glsl-colormap/turbidity')
#pragma glslify: hot = require('glsl-colormap/hot')
#pragma glslify: greys = require('glsl-colormap/greys')
#pragma glslify: rainbow = require('glsl-colormap/rainbow')


// our texture
uniform usampler2D channelColormap;

// range
uniform vec2 sliderValues;

// opacity
uniform float opacity;

in vec2 vTexCoord;

out vec4 color;



void main() {
  float intensityValue = (float(texture(channelColormap, vTexCoord).r) - sliderValues[0]) / sliderValues[1];

  color = vec4(colormap(min(1.0,intensityValue)).xyz, opacity);
}
