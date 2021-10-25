import { LayerExtension } from '@deck.gl/core';
import additiveColormap from './additive-colormap-module';

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {boolean} useTransparentColor Indicates whether the shader should make the output of colormap_function(0) color transparent
 * */
const defaultProps = {
  colormap: { type: 'string', value: 'viridis', compare: true },
  opacity: { type: 'number', value: 1.0, compare: true },
  useTransparentColor: { type: 'boolean', value: false, compare: true }
};

const AdditiveColormapExtension = class extends LayerExtension {
  getShaders() {
    return {
      defines: {
        COLORMAP_FUNCTION: this?.props?.colormap || 'viridis'
      },
      modules: [additiveColormap]
    };
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.colormap !== oldProps.colormap) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
        this.setState({ model: this._getModel(gl) });
      }
    }
  }

  draw() {
    const { useTransparentColor = false, opacity = 1.0 } = this.props;
    const uniforms = {
      opacity,
      useTransparentColor
    };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }
};

AdditiveColormapExtension.extensionName = 'AdditiveColormapExtension';
AdditiveColormapExtension.defaultProps = defaultProps;

export default AdditiveColormapExtension;
