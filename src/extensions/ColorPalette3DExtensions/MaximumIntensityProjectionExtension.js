import BaseExtension from './BaseExtension';
import rendering from './rendering-modes';
import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Maximum Intensity Projection.
 * */
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.opts.rendering = rendering[RENDERING_NAMES.MAX_INTENSITY_PROJECTION];
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

export default MaximumIntensityProjectionExtension;
