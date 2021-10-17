import { LayerExtension } from '@deck.gl/core';
import additiveColormap from './additive-colormap-module';
import { padColors } from '../utils';

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This propertyeter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent
* */
const defaultProps = {
  colors: { type: 'array', value: [], compare: true },
  colormap: { type: 'string', value: 'viridis', compare: true },
  opacity: { type: 'number', value: 1.0, compare: true }
};

const AdditiveColormapExtension = class extends LayerExtension {
  getShaders() {
    const newColormapExtension = { ...additiveColormap, fs: additiveColormap.fs.replaceAll('COLORMAP_FUNCTION', 'viridis') } 
    return {
      ...super.getShaders(),
      modules: [newColormapExtension]
    };
  }
  
  updateState({ props, oldProps, changeFlags, ...rest }){
     super.updateState({ props, oldProps, changeFlags, ...rest });
    if (
      changeFlags.extensionsChanged ||
      props.colormap !== oldProps.colormap ||
      props.interpolation !== oldProps.interpolation
    ) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
     
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
