import BaseExtension from './BaseExtension';
import rendering from './rendering-modes';
import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with additive blending.
 * */
const AdditiveBlendExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.opts.rendering = rendering[RENDERING_NAMES.ADDITIVE];
  }
};

AdditiveBlendExtension.extensionName = 'AdditiveBlendExtension';

export default AdditiveBlendExtension;
