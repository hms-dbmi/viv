#define SHADER_NAME xr-layer-fragment-shader
precision highp float;

// our texture
uniform sampler2D channel0;
uniform sampler2D channel1;
uniform sampler2D channel2;
uniform sampler2D channel3;
uniform sampler2D channel4;
uniform sampler2D channel5;

// range
uniform vec2 sliderValues[6];

// color
uniform vec3 colorValues[6];
uniform float intensityArray[6];

// opacity
uniform float opacity;

varying vec2 vTexCoord;


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
  float intensityValue0 = (float(texture(channel0, vTexCoord).r) - sliderValues[0][0]) / max(1.0, (sliderValues[0][1] - sliderValues[0][0]));
  float intensityValue1 = (float(texture(channel1, vTexCoord).r) - sliderValues[1][0]) / max(1.0, (sliderValues[1][1] - sliderValues[1][0]));
  float intensityValue2 = (float(texture(channel2, vTexCoord).r) - sliderValues[2][0]) / max(1.0, (sliderValues[2][1] - sliderValues[2][0]));
  float intensityValue3 = (float(texture(channel3, vTexCoord).r) - sliderValues[3][0]) / max(1.0, (sliderValues[3][1] - sliderValues[3][0]));
  float intensityValue4 = (float(texture(channel4, vTexCoord).r) - sliderValues[4][0]) / max(1.0, (sliderValues[4][1] - sliderValues[4][0]));
  float intensityValue5 = (float(texture(channel5, vTexCoord).r) - sliderValues[5][0]) / max(1.0, (sliderValues[5][1] - sliderValues[5][0]));

  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);

  hsvCombo = rgb2hsv(vec3(colorValues[0]));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue0));
  rgbCombo += hsv2rgb(hsvCombo);

  hsvCombo = rgb2hsv(vec3(colorValues[1]));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue1));
  rgbCombo += hsv2rgb(hsvCombo);

  hsvCombo = rgb2hsv(vec3(colorValues[2]));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue2));
  rgbCombo += hsv2rgb(hsvCombo);

  hsvCombo = rgb2hsv(vec3(colorValues[3]));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue3));
  rgbCombo += hsv2rgb(hsvCombo);

  hsvCombo = rgb2hsv(vec3(colorValues[4]));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue4));
  rgbCombo += hsv2rgb(hsvCombo);

  hsvCombo = rgb2hsv(vec3(colorValues[5]));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue5));
  rgbCombo += hsv2rgb(hsvCombo);

  gl_FragColor = vec4(rgbCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
