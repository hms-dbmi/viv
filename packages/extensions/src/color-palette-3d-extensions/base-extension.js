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

  updateState({props, oldProps, changeFlags, ...rest}) {
    super.updateState({props, oldProps, changeFlags, ...rest});
    const { colors, channelsVisible } = this.props;
    const paddedColors = padColors({
      // probably can't have these as booleans in the shader?
      channelsVisible: channelsVisible || this.selections.map(() => true),
      colors: colors || getDefaultPalette(this.props.selections.length)
    });
    const uniforms = {
      colors: paddedColors
    };
    for (const model of this.getModels()) {
      model.setUniforms(uniforms);
      // model.shaderInputs.setProps({
      //   // what should this be?
      //   <binding name>: uniforms
      // })
    }
  }
};

BaseExtension.extensionName = 'BaseExtension';
BaseExtension.defaultProps = defaultProps;

export default BaseExtension;
