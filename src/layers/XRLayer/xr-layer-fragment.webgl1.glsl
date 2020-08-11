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
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool isLensOn;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

varying vec2 vTexCoord;

bool fragInLensBounds() {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.
  
  // Check membership in ellipse.
  return pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.0) < (1.0 - lensBorderRadius);
}

bool fragOnLensBounds() {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.0);
  
  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1.0 && ellipseDistance >= (1.0 - lensBorderRadius);
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
  bool isFragOnLensBounds = fragOnLensBounds();

  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);

  bool inLensAndUseLens = isLensOn && isFragInLensBounds;

  float useColorValue = float(int((inLensAndUseLens && 0 == lensSelection) || (!inLensAndUseLens)));
  // Max is faster than ternaries/if-else for turning on/off channels.
  hsvCombo = rgb2hsv(max(vec3(colorValues[0]), (1.0 - useColorValue) * vec3(255, 255, 255)));
  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue0));
  rgbCombo += hsv2rgb(hsvCombo);


  useColorValue = float(int((inLensAndUseLens && 1 == lensSelection) || (!inLensAndUseLens)));
  // Max is faster than ternaries/if-else for turning on/off channels.
  hsvCombo = rgb2hsv(max(vec3(colorValues[1]), (1.0 - useColorValue) * vec3(255, 255, 255)));  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue1));
  rgbCombo += hsv2rgb(hsvCombo);


  useColorValue = float(int((inLensAndUseLens && 2 == lensSelection) || (!inLensAndUseLens)));
  // Max is faster than ternaries/if-else for turning on/off channels.
  hsvCombo = rgb2hsv(max(vec3(colorValues[2]), (1.0 - useColorValue) * vec3(255, 255, 255)));  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue2));
  rgbCombo += hsv2rgb(hsvCombo);


  useColorValue = float(int((inLensAndUseLens && 3 == lensSelection) || (!inLensAndUseLens)));
  // Max is faster than ternaries/if-else for turning on/off channels.
  hsvCombo = rgb2hsv(max(vec3(colorValues[3]), (1.0 - useColorValue) * vec3(255, 255, 255)));  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue3));
  rgbCombo += hsv2rgb(hsvCombo);


  useColorValue = float(int((inLensAndUseLens && 4 == lensSelection) || (!inLensAndUseLens)));
  // Max is faster than ternaries/if-else for turning on/off channels.
  hsvCombo = rgb2hsv(max(vec3(colorValues[4]), (1.0 - useColorValue) * vec3(255, 255, 255)));  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue4));
  rgbCombo += hsv2rgb(hsvCombo);


  useColorValue = float(int((inLensAndUseLens && 5 == lensSelection) || (!inLensAndUseLens)));
  // Max is faster than ternaries/if-else for turning on/off channels.
  hsvCombo = rgb2hsv(max(vec3(colorValues[5]), (1.0 - useColorValue) * vec3(255, 255, 255)));  hsvCombo = vec3(hsvCombo.xy, max(0.0,intensityValue5));
  rgbCombo += hsv2rgb(hsvCombo);

  // Ternaries are faster than checking this first and then returning/breaking out of shader.
  rgbCombo = (isLensOn && isFragOnLensBounds) ? lensBorderColor : rgbCombo;

  gl_FragColor = vec4(rgbCombo, opacity);
  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
