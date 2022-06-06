import { LayerExtension } from '@deck.gl/core';
import colorPalette from './color-palette-module';
import { getDefaultPalette, padColors } from '../utils';

const defaultProps = {
  colors: { type: 'array', value: null, compare: true },
  opacity: { type: 'number', value: 1.0, compare: true },
  transparentColor: { type: 'array', value: null, compare: true },
  useTransparentColor: { type: 'boolean', value: false, compare: true }
};
/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * @property {number=} opacity Opacity of the layer.
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * @property {Boolean=} useTransparentColor Whether or not to use the value provided to transparentColor.
 */
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
      channelsVisible,
      opacity = defaultProps.opacity.value,
      transparentColor = defaultProps.transparentColor.value,
      useTransparentColor = defaultProps.useTransparentColor.value
    } = this.props;
    const paddedColors = padColors({
      channelsVisible: channelsVisible || this.selections.map(() => true),
      colors: colors || getDefaultPalette(this.props.selections.length)
    });
    const uniforms = {
      colors: paddedColors,
      opacity,
      transparentColor: (transparentColor || [0, 0, 0]).map(i => i / 255),
      useTransparentColor: Boolean(useTransparentColor)
    };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
};

ColorPaletteExtension.extensionName = 'ColorPaletteExtension';
ColorPaletteExtension.defaultProps = defaultProps;

export default ColorPaletteExtension;
