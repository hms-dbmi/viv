import AdditiveBlendExtension from './AdditiveBlendExtension';
import MaximumIntensityProjectionExtension from './MaximumIntensityProjectionExtension';
import MinimumIntensityProjectionExtension from './MinimumIntensityProjectionExtension';
import BaseExtension from './BaseExtension';

/**
 * @typedef Extension3D
 * @type {object}
 * @property {object} BaseExtension
 * @property {object} AdditiveBlendExtension
 * @property {object} MaximumIntensityProjectionExtension
 * @property {object} MinimumIntensityProjectionExtension
 */

/** @type {Extension3D} */
const AdditiveColormap3DExtensions = {
  BaseExtension,
  AdditiveBlendExtension,
  MaximumIntensityProjectionExtension,
  MinimumIntensityProjectionExtension
};

export default AdditiveColormap3DExtensions;
