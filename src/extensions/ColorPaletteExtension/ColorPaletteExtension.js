import { LayerExtension } from '@deck.gl/core';
import colorPalette from './color-palette-module';
import { padColors } from '../utils';

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * @property {number=} opacity Opacity of the layer.
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This propertyeter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent
* */
const defaultProps = {
  colors: { type: 'array', value: [], compare: true },
  opacity: { type: 'number', value: 1.0, compare: true },
  transparentColor: { type: 'array', value: null, compare: true },
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
      channelsVisible,
      opacity,
      transparentColor,
    } = this.props;
    const paddedColors = padColors({
      channelsVisible,
      colors
    });
    const uniforms = { colors: paddedColors,  opacity,
          transparentColor: (transparentColor || [0, 0, 0]).map(i => i / 255),
          useTransparentColor: Boolean(transparentColor),
  };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
}

ColorPaletteExtension.extensionName = 'ColorPaletteExtension';
ColorPaletteExtension.defaultProps = defaultProps;

export default ColorPaletteExtension;
