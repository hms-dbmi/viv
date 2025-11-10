import BaseExtension from './base-extension';
import { VIV_CHANNEL_INDEX_PLACEHOLDER } from '@vivjs/constants';
const I = String(VIV_CHANNEL_INDEX_PLACEHOLDER);
const _BEFORE_RENDER = `\
  float minVals[NUM_CHANNELS] = float[NUM_CHANNELS](
      ${I}. / 0.,
    );
`;

const _RENDER = `\
  float intensityArray[NUM_CHANNELS] = float[NUM_CHANNELS](
    intensityValue${I},
  );

  for(int i = 0; i < NUM_CHANNELS; i++) {
    if(intensityArray[i] < minVals[i]) {
      minVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER = `\
  float total = 0.0;
  for(int i = 0; i < NUM_CHANNELS; i++) {
    total += minVals[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Minimum Intensity Projection in 3D.
 */
const MinimumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MinimumIntensityProjectionExtension.extensionName =
  'MinimumIntensityProjectionExtension';

export default MinimumIntensityProjectionExtension;
