import { LayerExtension } from '@deck.gl/core';
import colorPalette from './color-palette-module';

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @param {Object} props
 * @param {Array<Array<number>>=} props.colors Array of colors to map channels to (RGB).
* */
const defaultProps = {
  color: { type: 'array', value: [], compare: true },
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
    } = this.props;
    const uniforms = { colors };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
}

ColorPaletteExtension.extensionName = 'ColorPaletteExtension';
ColorPaletteExtension.defaultProps = defaultProps;

export default ColorPaletteExtension;
