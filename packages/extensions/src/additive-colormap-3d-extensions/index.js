import AdditiveBlendExtension from './additive-blend-extension';
import BaseExtension from './base-extension';
import MaximumIntensityProjectionExtension from './maximum-intensity-projection-extension';
import MinimumIntensityProjectionExtension from './minimum-intensity-projection-extension';

/**
 * This object contains the BaseExtension, which can be extended for other additive colormap-style (i.e viridis, jet etc.) rendering, as well
 * implementations of three ray casting algorithms as extensions.
 * @typedef Extension3D
 * @type {object}
 * @property {object} BaseExtension
 * @property {object} AdditiveBlendExtension
 * @property {object} MaximumIntensityProjectionExtension
 * @property {object} MinimumIntensityProjectionExtension
 */
const AdditiveColormap3DExtensions = {
  BaseExtension,
  AdditiveBlendExtension,
  MaximumIntensityProjectionExtension,
  MinimumIntensityProjectionExtension
};

export default AdditiveColormap3DExtensions;
