import AdditiveColormap3DExtension from './AdditiveColormap3DExtension';
import rendering from './rendering-modes';
import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Minimum Intensity Projection in 3D.
 */
const MinimumIntensityProjectionExtension = class extends AdditiveColormap3DExtension {
  constructor(args) {
    super(args);
    this.opts.rendering = rendering[RENDERING_NAMES.MIN_INTENSITY_PROJECTION];
  }
};

MinimumIntensityProjectionExtension.extensionName =
  'MinimumIntensityProjectionExtension';

export default MinimumIntensityProjectionExtension;
