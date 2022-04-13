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
const ColorPalette3DExtension = class extends LayerExtension {
  draw() {
    const { colors, channelsVisible } = this.props;
    const paddedColors = padColors({
      channelsVisible: channelsVisible || this.selections.map(() => true),
      colors: colors || getDefaultPalette(this.props.selections.length)
    });
    const uniforms = {
      colors: paddedColors
    };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
};

ColorPalette3DExtension.extensionName = 'ColorPalette3DExtension';
ColorPalette3DExtension.defaultProps = defaultProps;

export default ColorPalette3DExtension;
