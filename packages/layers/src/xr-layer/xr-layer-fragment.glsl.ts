import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

export default `\
#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp SAMPLER_TYPE;

// our texture
uniform SAMPLER_TYPE channel${I};

in vec2 vTexCoord;

// range
// todo: unfortunately probably need to stop using an array for such things.
uniform vec2 contrastLimits[NUM_CHANNELS];
// the token after uniform is one that will be used in JS (with or without Uniforms)
// uniform xrLayerUniforms {
//   vec2 contrastLimits${I};
// } xrLayer;

out vec4 fragColor;

void main() {

  float intensity${I} = float(texture(channel${I}, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity${I}, contrastLimits[${I}], ${I});
  // DECKGL_PROCESS_INTENSITY(intensity${I}, xrLayer.contrastLimits${I}, ${I});

  float[] intensity = float[NUM_CHANNELS](
    // as of this writing, this will be expanded by some very fragile string processing to remove final comma...
    // needs documenting and hopefully improving.
    intensity${I},
  );
  DECKGL_MUTATE_COLOR(fragColor, intensity, vTexCoord);


  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
