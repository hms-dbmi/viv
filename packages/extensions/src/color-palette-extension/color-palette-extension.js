import { LayerExtension } from '@deck.gl/core';
import { MAX_CHANNELS } from '@vivjs/constants';
import { getDefaultPalette, padColorsForUBO } from '../utils';
import { expandShaderModule } from '../viv-shader-assembler';
import colorPalette from './color-palette-module';

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
    const expandedColorPalette = expandShaderModule(colorPalette, MAX_CHANNELS);
    return {
      ...super.getShaders(),
      modules: [expandedColorPalette]
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

    // Get selections safely
    const selections = this.props.selections || this.selections || [];
    const numChannels = selections.length || MAX_CHANNELS;

    const paddedColors = padColorsForUBO({
      channelsVisible: channelsVisible || selections.map(() => true),
      colors: colors || getDefaultPalette(numChannels)
    });

    const colorPaletteUniforms = {
      opacity,
      transparentColor: (transparentColor || [0, 0, 0]).map(i => i / 255),
      useTransparentColor: useTransparentColor ? 1 : 0
    };

    // Add per-channel colors
    for (let i = 0; i < MAX_CHANNELS; i++) {
      colorPaletteUniforms[`color${i}`] = paddedColors[i];
    }

    this.state.model?.shaderInputs.setProps({
      colorPaletteModule: colorPaletteUniforms
    });
  }
};

ColorPaletteExtension.extensionName = 'ColorPaletteExtension';
ColorPaletteExtension.defaultProps = defaultProps;

export default ColorPaletteExtension;
