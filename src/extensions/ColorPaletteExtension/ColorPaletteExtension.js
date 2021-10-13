import { LayerExtension } from '@deck.gl/core';
import colorPalette from './color-palette-module';
import { padColors } from '../utils';

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @param {Object} props
 * @param {Array<Array<number>>=} props.colors Array of colors to map channels to (RGB).
* */
const defaultProps = {
  colors: { type: 'array', value: [], compare: true },
};
const ColorPaletteExtension = class extends LayerExtension {
  getShaders() {
    return {
      ...super.getShaders(),
      modules: [colorPalette]
    };
  }

  draw() {
    const {
      colors,
      channelsVisible
    } = this.props;
    const paddedColors = padColors({
      channelsVisible,
      colors
    });
    const uniforms = { colors: paddedColors };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
}

ColorPaletteExtension.extensionName = 'ColorPaletteExtension';
ColorPaletteExtension.defaultProps = defaultProps;

export default ColorPaletteExtension;
