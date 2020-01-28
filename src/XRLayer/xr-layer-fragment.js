export default `#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp usampler2D;


// our texture
uniform usampler2D redTexture;
uniform usampler2D greenTexture;
uniform usampler2D blueTexture;
// range
uniform uint sliderValues[3];

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

 		if (rgb.r == Cmax)
 			hsv.x = (rgb.g - rgb.b) / delta;
 		else {
 			if (rgb.g == Cmax)
 				hsv.x = 2. + (rgb.b - rgb.r) / delta;
 			else
 				hsv.x = 4. + (rgb.r - rgb.g) / delta;
 		}
 		hsv.x = fract(hsv.x / 6.);
 	}
 	return hsv;
 }

void main() {
  vec4 redTextureColor = vec4(texture(redTexture, vTexCoord)) / float(sliderValues[0]);
  vec4 greenTextureColor = vec4(texture(greenTexture, vTexCoord)) / float(sliderValues[1]);
  vec4 blueTextureColor = vec4(texture(blueTexture, vTexCoord)) / float(sliderValues[2]);

  vec3 hsvCombo1 = rgb2hsv(vec3(1.0,0.0,0.0));
  hsvCombo1 = vec3(hsvCombo1.xy, redTextureColor.r);
  vec3 rgbCombo1 = hsv2rgb(hsvCombo1);

  vec3 hsvCombo2 = rgb2hsv(vec3(0.0,1.0,0.0));
  hsvCombo2 = vec3(hsvCombo2.xy, greenTextureColor.r);
  vec3 rgbCombo2 = hsv2rgb(hsvCombo2);

  vec3 hsvCombo3 = rgb2hsv(vec3(0.0,0.0,1.0));
  hsvCombo3 = vec3(hsvCombo3.xy, blueTextureColor.r);
  vec3 rgbCombo3 = hsv2rgb(hsvCombo3);

  color = vec4(rgbCombo1 + rgbCombo2 + rgbCombo3, 1);
}
`;
