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


// range
uniform vec2 contrastLimits[6];

float apply_contrast_limits(float intensity, int channelIndex) {
  // Because WebGL1 cannot index the contrastLimits array dynamically, we need to use this assignment trick to apply the contrast funtion.
  intensity =  float(channelIndex != 0) * intensity + float(channelIndex == 0) * max(0., (intensity - contrastLimits[0][0]) / max(0.0005, (contrastLimits[0][1] - contrastLimits[0][0])));
  intensity =  float(channelIndex != 1) * intensity + float(channelIndex == 1) * max(0., (intensity - contrastLimits[1][0]) / max(0.0005, (contrastLimits[1][1] - contrastLimits[1][0])));
  intensity =  float(channelIndex != 2) * intensity + float(channelIndex == 2) * max(0., (intensity - contrastLimits[2][0]) / max(0.0005, (contrastLimits[2][1] - contrastLimits[2][0])));
  intensity =  float(channelIndex != 3) * intensity + float(channelIndex == 3) * max(0., (intensity - contrastLimits[3][0]) / max(0.0005, (contrastLimits[3][1] - contrastLimits[3][0])));
  intensity =  float(channelIndex != 4) * intensity + float(channelIndex == 4) * max(0., (intensity - contrastLimits[4][0]) / max(0.0005, (contrastLimits[4][1] - contrastLimits[4][0])));
  intensity =  float(channelIndex != 5) * intensity + float(channelIndex == 5) * max(0., (intensity - contrastLimits[5][0]) / max(0.0005, (contrastLimits[5][1] - contrastLimits[5][0])));
  return intensity;
}

vec4 apply_opacity(vec3 color, bool useTransparentColor, vec3 transparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}

vec4 colormap(float intensity, float opacity, bool useTransparentColor) {
  return apply_opacity(COLORMAP_FUNCTION(min(1.,intensity)).xyz, useTransparentColor, COLORMAP_FUNCTION(0.).xyz, opacity);
}