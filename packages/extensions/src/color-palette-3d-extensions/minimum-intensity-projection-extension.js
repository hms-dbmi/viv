import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
  float minVals[6] = float[6](1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0.);
`;

const _RENDER = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] < minVals[i]) {
      minVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER = `\
  vec3 rgbCombo = vec3(0.0);
  for(int i = 0; i < 6; i++) {
    rgbCombo += max(0.0, min(1.0, minVals[i])) * vec3(colors[i]);
  }
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
