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

// lens bounds
uniform vec4 lensBounds;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;

varying vec2 vTexCoord;

bool fragInLensBounds() {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.

  // Width radius.
  float majorAxis = abs(lensBounds[2] - lensBounds[0]);

  // Height radius.
  float minorAxis = abs(lensBounds[1] - lensBounds[3]);

  // Ellipse center
  vec2 lensCenter = vec2(lensBounds[0] + ((lensBounds[2] - lensBounds[0]) / 2.0),lensBounds[1] + ((lensBounds[3] - lensBounds[1]) / 2.0));
  
  // Check membership in ellipse.
  return pow((lensCenter.x - vTexCoord.x) / majorAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorAxis, 2.0) < 1.0;
}

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
  
  // Find out if the frag is in bounds of the lens.
  bool isFragInLensBounds = fragInLensBounds();

  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);

  if(isLensOn && isFragInLensBounds){
    if(0 == lensSelection) {
      hsvCombo = rgb2hsv(vec3(colorValues[0]));
    } else {
      hsvCombo = rgb2hsv(vec3(255, 255, 255));
    }
  } else {
    hsvCombo = rgb2hsv(vec3(colorValues[0]));
  }
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue0));
  rgbCombo += hsv2rgb(hsvCombo);

  if(isLensOn && isFragInLensBounds){
    if(1 == lensSelection) {
      hsvCombo = rgb2hsv(vec3(colorValues[1]));
    } else {
      hsvCombo = rgb2hsv(vec3(255, 255, 255));
    }
  } else {
    hsvCombo = rgb2hsv(vec3(colorValues[1]));
  }
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue1));
  rgbCombo += hsv2rgb(hsvCombo);

  if(isLensOn && isFragInLensBounds){
    if(2 == lensSelection) {
      hsvCombo = rgb2hsv(vec3(colorValues[2]));
    } else {
      hsvCombo = rgb2hsv(vec3(255, 255, 255));
    }
  } else {
    hsvCombo = rgb2hsv(vec3(colorValues[2]));
  }
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue2));
  rgbCombo += hsv2rgb(hsvCombo);

  if(isLensOn && isFragInLensBounds){
    if(3 == lensSelection) {
      hsvCombo = rgb2hsv(vec3(colorValues[3]));
    } else {
      hsvCombo = rgb2hsv(vec3(255, 255, 255));
    }
  } else {
    hsvCombo = rgb2hsv(vec3(colorValues[3]));
  }
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue3));
  rgbCombo += hsv2rgb(hsvCombo);

  if(isLensOn && isFragInLensBounds){
    if(4 == lensSelection) {
      hsvCombo = rgb2hsv(vec3(colorValues[4]));
    } else {
      hsvCombo = rgb2hsv(vec3(255, 255, 255));
    }
  } else {
    hsvCombo = rgb2hsv(vec3(colorValues[4]));
  }
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue4));
  rgbCombo += hsv2rgb(hsvCombo);

  if(isLensOn && isFragInLensBounds){
    if(5 == lensSelection) {
      hsvCombo = rgb2hsv(vec3(colorValues[5]));
    } else {
      hsvCombo = rgb2hsv(vec3(255, 255, 255));
    }
  } else {
    hsvCombo = rgb2hsv(vec3(colorValues[5]));
  }
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue5));
  rgbCombo += hsv2rgb(hsvCombo);

  gl_FragColor = vec4(rgbCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
