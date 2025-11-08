import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float maxVals[NUM_CHANNELS] = float[NUM_CHANNELS](-1.0, -1.0, -1.0, -1.0, -1.0, -1.0);
`;

const _RENDER = `\
  float intensityArray[NUM_CHANNELS] = float[NUM_CHANNELS](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < NUM_CHANNELS; i++) {
    if(intensityArray[i] > maxVals[i]) {
      maxVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER = `\
  vec3 rgbCombo = vec3(0.0);
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgbCombo += max(0.0, min(1.0, maxVals[i])) * vec3(colors[i]);
  }
  color = vec4(rgbCombo, 1.0);
`;

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Maximum Intensity Projection.
 * */
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

export default MaximumIntensityProjectionExtension;
