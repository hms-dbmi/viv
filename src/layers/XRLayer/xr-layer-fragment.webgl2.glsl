#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp usampler2D;

// our texture
uniform usampler2D channel0;
uniform usampler2D channel1;
uniform usampler2D channel2;
uniform usampler2D channel3;
uniform usampler2D channel4;
uniform usampler2D channel5;

// range
uniform vec2 sliderValues[6];

// color
uniform vec3 colorValues[6];

// opacity
uniform float opacity;

in vec2 vTexCoord;

out vec4 color;


vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 rgb) {
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

void main() {
  float intensityValue0 = (float(texture(channel0, vTexCoord).r) - sliderValues[0][0]) / sliderValues[0][1];
  float intensityValue1 = (float(texture(channel1, vTexCoord).r) - sliderValues[1][0]) / sliderValues[1][1];
  float intensityValue2 = (float(texture(channel2, vTexCoord).r) - sliderValues[2][0]) / sliderValues[2][1];
  float intensityValue3 = (float(texture(channel3, vTexCoord).r) - sliderValues[3][0]) / sliderValues[3][1];
  float intensityValue4 = (float(texture(channel4, vTexCoord).r) - sliderValues[4][0]) / sliderValues[4][1];
  float intensityValue5 = (float(texture(channel5, vTexCoord).r) - sliderValues[5][0]) / sliderValues[5][1];

  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    hsvCombo = rgb2hsv(vec3(colorValues[i]));
    hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityArray[i]));
    rgbCombo += hsv2rgb(hsvCombo);
  }

  color = vec4(rgbCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(color, geometry);
}