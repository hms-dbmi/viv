import { LayerExtension } from '@deck.gl/core';
import { getDefaultPalette, padColors } from '../utils';

const defaultProps = {
  colors: { type: 'array', value: null, compare: true }
};

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * */
const BaseExtension = class extends LayerExtension {
  constructor(...args) {
    super(args);
    // After deck.gl 8.8, it does not seem like this is always initialized.
    this.opts = this.opts || {};
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    // Colors are now managed by the XR3DLayer via the fragmentUniforms3D UBO
    // No need to set uniforms here anymore since model.setUniforms is deprecated
    // The layer handles colors through shaderInputs.setProps() with fragmentUniforms3D
  }
};

BaseExtension.extensionName = 'BaseExtension';
BaseExtension.defaultProps = defaultProps;

export default BaseExtension;
