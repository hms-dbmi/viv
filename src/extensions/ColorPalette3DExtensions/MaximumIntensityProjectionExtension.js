import ColorPalette3DExtension from './ColorPalette3DExtension';
import rendering from './rendering-modes';
import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * */
const MaximumIntensityProjectionExtension = class extends ColorPalette3DExtension {
  constructor(args) {
    super(args);
    this.rendering = rendering[RENDERING_NAMES.MAX_INTENSITY_PROJECTION];
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

export default MaximumIntensityProjectionExtension;
