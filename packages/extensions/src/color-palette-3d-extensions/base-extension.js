import { VivLayerExtension } from '../viv-shader-assembler';

const defaultProps = {
  colors: { type: 'array', value: null, compare: true }
};

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * */
const BaseExtension = class extends VivLayerExtension {
  constructor(...args) {
    super(args);
    // After deck.gl 8.8, it does not seem like this is always initialized.
    // TODO - review. looks like this whole class may be irrelevant.
    // then again - it might be useful to have a `BaseVivExtension` class that is what users actually use...
    // Colors are now managed by the XR3DLayer via the fragmentUniforms3D UBO
    // The layer handles colors through shaderInputs.setProps() with fragmentUniforms3D
    this.opts = this.opts || {};
  }
  getVivShaderTemplates() {
    // nb - this is a special case
    // the properties on rendering will be hooked in and expanded as part of layer fs code
    // rather than via standard deck.gl extension mechanisms...
    return {}
  }

};

BaseExtension.extensionName = 'BaseExtension';
BaseExtension.defaultProps = defaultProps;

export default BaseExtension;
