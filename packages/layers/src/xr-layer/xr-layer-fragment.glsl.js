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
// todo: unfortunately probably need to stop using an array for such things.
uniform vec2 contrastLimits[NUM_CHANNELS];
// the token after uniform is one that will be used in JS (with or without Uniforms)
// uniform xrLayerUniforms {
//   // this is going to be a nuisance to associate with props...
//   vec2 contrastLimits<VIV_CHANNEL_INDEX>;
// } xrLayer;

out vec4 fragColor;

void main() {

  float intensity<VIV_CHANNEL_INDEX> = float(texture(channel<VIV_CHANNEL_INDEX>, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity<VIV_CHANNEL_INDEX>, contrastLimits[<VIV_CHANNEL_INDEX>], <VIV_CHANNEL_INDEX>);
  // DECKGL_PROCESS_INTENSITY(intensity<VIV_CHANNEL_INDEX>, xrLayer.contrastLimits<VIV_CHANNEL_INDEX>, <VIV_CHANNEL_INDEX>);

  float[] intensity = float[NUM_CHANNELS](
    // as of this writing, this will be expanded by some very fragile string processing to remove final comma...
    // needs documenting and hopefully improving.
    intensity<VIV_CHANNEL_INDEX>,
  );
  DECKGL_MUTATE_COLOR(fragColor, intensity, vTexCoord);


  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
