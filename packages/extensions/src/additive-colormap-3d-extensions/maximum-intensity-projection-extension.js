import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float maxVal${I} = -1.;
`;

const _RENDER = `\
  maxVal${I} = max(intensityValue${I}, maxVal${I});
`;

const _AFTER_RENDER = `\
  float total = 0.0;
  total += maxVal${I};
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
