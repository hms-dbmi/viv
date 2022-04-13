import AdditiveColormap3DExtension from './AdditiveColormap3DExtension';
import rendering from './rendering-modes';
import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Additive Blending in 3D.
 * */
const AdditiveBlendExtension = class extends AdditiveColormap3DExtension {
  constructor(args) {
    super(args);
    this.opts.rendering = rendering[RENDERING_NAMES.ADDITIVE];
  }
};

AdditiveBlendExtension.extensionName = 'AdditiveBlendExtension';

export default AdditiveBlendExtension;
