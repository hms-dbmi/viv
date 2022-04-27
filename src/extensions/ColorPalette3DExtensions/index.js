import AdditiveBlendExtension from './AdditiveBlendExtension';
import MaximumIntensityProjectionExtension from './MaximumIntensityProjectionExtension';
import MinimumIntensityProjectionExtension from './MinimumIntensityProjectionExtension';
import BaseExtension from './BaseExtension';

/**
 * This object contains the BaseExtension, which can be extended for other color palette-style rendering, as well
 * implementations of three ray casting algorithms as extensions.
 * @typedef Extension3D
 * @type {object}
 * @property {object} BaseExtension
 * @property {object} AdditiveBlendExtension
 * @property {object} MaximumIntensityProjectionExtension
 * @property {object} MinimumIntensityProjectionExtension
 */
const ColorPalette3DExtensions = {
  BaseExtension,
  AdditiveBlendExtension,
  MaximumIntensityProjectionExtension,
  MinimumIntensityProjectionExtension
};

export default ColorPalette3DExtensions;
