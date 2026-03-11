import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float minVal${I} = 1.0 / 0.0;
`;

const _RENDER = `\
  minVal${I} = min(intensityValue${I}, minVal${I});
`;

const _AFTER_RENDER = `\
  vec3 rgbCombo = vec3(0.0);
  rgbCombo += max(0.0, min(1.0, minVal${I})) * fragmentUniforms3D.color${I};
  color = vec4(rgbCombo, 1.0);
`;

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Minimum Intensity Projection.
 * */
const MinimumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MinimumIntensityProjectionExtension.extensionName =
  'MinimumIntensityProjectionExtension';

export default MinimumIntensityProjectionExtension;
