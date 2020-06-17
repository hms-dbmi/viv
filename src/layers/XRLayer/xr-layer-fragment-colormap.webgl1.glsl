#define SHADER_NAME xr-layer-fragment-shader-colormap
precision highp float;

#pragma glslify: jet = require("glsl-colormap/jet")
#pragma glslify: hsv = require("glsl-colormap/hsv")
#pragma glslify: hot = require("glsl-colormap/hot")
#pragma glslify: cool = require("glsl-colormap/cool")
#pragma glslify: spring = require("glsl-colormap/spring")
#pragma glslify: summer = require("glsl-colormap/summer")
#pragma glslify: autumn = require("glsl-colormap/autumn")
#pragma glslify: winter = require("glsl-colormap/winter")
#pragma glslify: bone = require("glsl-colormap/bone")
#pragma glslify: copper = require("glsl-colormap/copper")
#pragma glslify: greys = require("glsl-colormap/greys")
#pragma glslify: yignbu = require("glsl-colormap/yignbu")
#pragma glslify: greens = require("glsl-colormap/greens")
#pragma glslify: yiorrd = require("glsl-colormap/yiorrd")
#pragma glslify: bluered = require("glsl-colormap/bluered")
#pragma glslify: rdbu = require("glsl-colormap/rdbu")
#pragma glslify: picnic = require("glsl-colormap/picnic")
#pragma glslify: rainbow = require("glsl-colormap/rainbow")
#pragma glslify: portland = require("glsl-colormap/portland")
#pragma glslify: blackbody = require("glsl-colormap/blackbody")
#pragma glslify: earth = require("glsl-colormap/earth")
#pragma glslify: electric = require("glsl-colormap/electric")
#pragma glslify: alpha = require("glsl-colormap/alpha")
#pragma glslify: viridis = require("glsl-colormap/viridis")
#pragma glslify: inferno = require("glsl-colormap/inferno")
#pragma glslify: magma = require("glsl-colormap/magma")
#pragma glslify: plasma = require("glsl-colormap/plasma")
#pragma glslify: warm = require("glsl-colormap/warm")
#pragma glslify: rainbow-soft = require("glsl-colormap/rainbow-soft")
#pragma glslify: bathymetry = require("glsl-colormap/bathymetry")
#pragma glslify: cdom = require("glsl-colormap/cdom")
#pragma glslify: chlorophyll = require("glsl-colormap/chlorophyll")
#pragma glslify: density = require("glsl-colormap/density")
#pragma glslify: freesurface-blue = require("glsl-colormap/freesurface-blue")
#pragma glslify: freesurface-red = require("glsl-colormap/freesurface-red")
#pragma glslify: oxygen = require("glsl-colormap/oxygen")
#pragma glslify: par = require("glsl-colormap/par")
#pragma glslify: phase = require("glsl-colormap/phase")
#pragma glslify: salinity = require("glsl-colormap/salinity")
#pragma glslify: temperature = require("glsl-colormap/temperature")
#pragma glslify: turbidity = require("glsl-colormap/turbidity")
#pragma glslify: velocity-blue = require("glsl-colormap/velocity-blue")
#pragma glslify: velocity-green = require("glsl-colormap/velocity-green")
#pragma glslify: cubehelix = require("glsl-colormap/cubehelix")


// our texture
uniform sampler2D channel0;
uniform sampler2D channel1;
uniform sampler2D channel2;
uniform sampler2D channel3;
uniform sampler2D channel4;
uniform sampler2D channel5;

// range
uniform vec2 sliderValues[6];

// opacity
uniform float opacity;
uniform float divisor;

varying vec2 vTexCoord;


void main() {
  float intensityValue0 = (float(texture(channel0, vTexCoord).r) - sliderValues[0][0]) / sliderValues[0][1];
  float intensityValue1 = (float(texture(channel1, vTexCoord).r) - sliderValues[1][0]) / sliderValues[1][1];
  float intensityValue2 = (float(texture(channel2, vTexCoord).r) - sliderValues[2][0]) / sliderValues[2][1];
  float intensityValue3 = (float(texture(channel3, vTexCoord).r) - sliderValues[3][0]) / sliderValues[3][1];
  float intensityValue4 = (float(texture(channel4, vTexCoord).r) - sliderValues[4][0]) / sliderValues[4][1];
  float intensityValue5 = (float(texture(channel5, vTexCoord).r) - sliderValues[5][0]) / sliderValues[5][1];

  float intensityCombo = 0.0;
  
  intensityCombo += max(0.0,intensityValue0);
  intensityCombo += max(0.0,intensityValue1);
  intensityCombo += max(0.0,intensityValue2);
  intensityCombo += max(0.0,intensityValue3);
  intensityCombo += max(0.0,intensityValue4);
  intensityCombo += max(0.0,intensityValue5);

  gl_FragColor = vec4(colormapFunction(min(1.0,intensityCombo)).xyz, opacity);
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
