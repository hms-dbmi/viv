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

// lens bounds
uniform vec4 lensBounds;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;

in vec2 vTexCoord;

out vec4 color;

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
  // Scale intesities.
  float intensityValue0 = (float(texture(channel0, vTexCoord).r) - sliderValues[0][0]) / max(1.0, (sliderValues[0][1] - sliderValues[0][0]));
  float intensityValue1 = (float(texture(channel1, vTexCoord).r) - sliderValues[1][0]) / max(1.0, (sliderValues[1][1] - sliderValues[1][0]));
  float intensityValue2 = (float(texture(channel2, vTexCoord).r) - sliderValues[2][0]) / max(1.0, (sliderValues[2][1] - sliderValues[2][0]));
  float intensityValue3 = (float(texture(channel3, vTexCoord).r) - sliderValues[3][0]) / max(1.0, (sliderValues[3][1] - sliderValues[3][0]));
  float intensityValue4 = (float(texture(channel4, vTexCoord).r) - sliderValues[4][0]) / max(1.0, (sliderValues[4][1] - sliderValues[4][0]));
  float intensityValue5 = (float(texture(channel5, vTexCoord).r) - sliderValues[5][0]) / max(1.0, (sliderValues[5][1] - sliderValues[5][0]));

  // Find out if the frag is in bounds of the lens.
  bool isFragInLensBounds = fragInLensBounds();

  // Declare variables.
  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    // If we are using the lens and this frag is in bounds, focus on only the selection.
    // Otherwise, use the props color value.
    if(isLensOn && isFragInLensBounds){
      if(i == lensSelection) {
        hsvCombo = rgb2hsv(vec3(colorValues[i]));
      } else {
        hsvCombo = rgb2hsv(vec3(255, 255, 255));
      }
    } else {
      hsvCombo = rgb2hsv(vec3(colorValues[i]));
    }
    // Sum up the intesitiies in additive blending.
    hsvCombo = vec3(hsvCombo.xy, max(0.0, intensityArray[i]));
    rgbCombo += hsv2rgb(hsvCombo);
  }

  color = vec4(rgbCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(color, geometry);
}