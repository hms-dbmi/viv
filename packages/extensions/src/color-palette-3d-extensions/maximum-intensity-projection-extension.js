import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float maxVal${I} = -1.0;
`;

const _RENDER = `\
  maxVal${I} = max(intensityValue${I}, maxVal${I});
`;

const _AFTER_RENDER = `\
  vec3 rgbCombo = vec3(0.0);
  rgbCombo += max(0.0, min(1.0, maxVal${I})) * fragmentUniforms3D.color${I};
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
