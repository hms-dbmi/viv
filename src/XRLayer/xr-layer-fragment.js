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
uniform uint redSliderValue;
uniform uint blueSliderValue;
uniform uint greenSliderValue;

in vec2 vTexCoord;

out vec4 color;

void main() {
  uvec4 redTextureColor = texture(redTexture, vTexCoord);
  uvec4 greenTextureColor = texture(greenTexture, vTexCoord);
  uvec4 blueTextureColor = texture(blueTexture, vTexCoord);
  color = vec4(vec3(float(redTextureColor.r) / float(redSliderValue), float(greenTextureColor.r) / float(greenSliderValue), float(blueTextureColor.r) / float(blueSliderValue)), 1);
}
`;
