import { LayerExtension } from '@deck.gl/core';
import additiveColormap from './additive-colormap-module';
import { padColors } from '../utils';

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @param {Object} props
 * @param {Array<Array<number>>=} props.colors Array of colors to map channels to (RGB).
* */
const defaultProps = {
  colors: { type: 'array', value: [], compare: true },
};
const AdditiveColormapExtension = class extends LayerExtension {
  getShaders() {
    const newColormapExtension = { ...additiveColormap, fs: additiveColormap.fs.replaceAll('COLORMAP_FUNCTION', 'viridis') } 
    return {
      ...super.getShaders(),
      modules: [newColormapExtension]
    };
  }

  draw() {
    const {
      colors,
      channelsVisible,
      opacity,
    } = this.props;
    const paddedColors = padColors({
      channelsVisible,
      colors
    });

    const uniforms = { colors: paddedColors,  opacity,
      useTransparentColor: true,
  };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
}

AdditiveColormapExtension.extensionName = 'AdditiveColormapExtension';
AdditiveColormapExtension.defaultProps = defaultProps;

export default AdditiveColormapExtension;
