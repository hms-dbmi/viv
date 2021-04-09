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

vec3 hsv_to_rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb_to_hsv(vec3 rgb) {
  float Cmax = max(rgb.r, max(rgb.g, rgb.b));
  float Cmin = min(rgb.r, min(rgb.g, rgb.b));
  float delta = Cmax - Cmin;

  vec3 hsv = vec3(0., 0., Cmax);

  if (Cmax > Cmin) {
    hsv.y = delta / Cmax;

    if (rgb.r == Cmax) {
      hsv.x = (rgb.g - rgb.b) / delta;
    }
    else {
      if (rgb.g == Cmax){
        hsv.x = 2. + (rgb.b - rgb.r) / delta;
      }
      else {
        hsv.x = 4. + (rgb.r - rgb.g) / delta;
      }
    }
    hsv.x = fract(hsv.x / 6.);
  }
  return hsv;
}

float sample_and_apply_sliders(sampler3D channel, vec3 vTexCoord, vec2 sliderValues) {
  float fragIntensity = float(texture(channel, vTexCoord).r);
  float slidersAppliedToIntensity = (fragIntensity - sliderValues[0]) / max(0.0005, (sliderValues[1] - sliderValues[0]));
  return max(0.0, slidersAppliedToIntensity);
}

vec4 colormap(float intensity, float opacity) {
  return vec4(_COLORMAP_FUNCTION(min(1.0,intensity)).xyz, opacity);
}