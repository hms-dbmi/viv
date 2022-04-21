import AdditiveBlendExtension from './AdditiveBlendExtension';
import MaximumIntensityProjectionExtension from './MaximumIntensityProjectionExtension';
import MinimumIntensityProjectionExtension from './MinimumIntensityProjectionExtension';
import BaseExtension from './BaseExtension';

/** @type {Extension3D} */
const ColorPalette3DExtensions = {
  BaseExtension,
  AdditiveBlendExtension,
  MaximumIntensityProjectionExtension,
  MinimumIntensityProjectionExtension
};

export default ColorPalette3DExtensions;
