export default `\
#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp SAMPLER_TYPE;

// our texture
uniform SAMPLER_TYPE channel<VIV_CHANNEL_INDEX>;

in vec2 vTexCoord;

// range
uniform vec2 contrastLimits[NUM_CHANNELS];

out vec4 fragColor;

void main() {

  float intensity<VIV_CHANNEL_INDEX> = float(texture(channel<VIV_CHANNEL_INDEX>, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity<VIV_CHANNEL_INDEX>, contrastLimits[<VIV_CHANNEL_INDEX>], <VIV_CHANNEL_INDEX>);

  float[] intensity = float[NUM_CHANNELS](
    intensity<VIV_CHANNEL_INDEX>,
  );
  DECKGL_MUTATE_COLOR(fragColor, intensity, vTexCoord);


  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
