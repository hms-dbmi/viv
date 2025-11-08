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
  float total = 0.0;
  for(int i = 0; i < NUM_CHANNELS; i++) {
    total += maxVals[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Maximum Intensity Projection in 3D.
 */
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

export default MaximumIntensityProjectionExtension;
