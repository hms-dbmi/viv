import { LayerExtension } from '@deck.gl/core';
import additiveColormap from './additive-colormap-module';
import { COLORMAPS } from '../../constants';

const defaultProps = {
  colormap: { type: 'string', value: 'viridis', compare: true }
};

function removeExtraColormapFunctionsFromShader(colormap) {
  // Always include viridis so shaders compile,
  // but otherwise we discard all other colormaps via a regex.
  // With all the colormaps, the shaders were too large
  // and crashed our computers when we loaded volumes too large.
  const discardColormaps = COLORMAPS.filter(
    i => i !== (colormap || 'viridis')
  ).map(i => i.replace(/-/g, '_'));
  const discardRegex = new RegExp(
    `vec4 (${discardColormaps.join(
      '(_([0-9]*))?|'
    )})\\(float x_[0-9]+\\){([^}]+)}`,
    'g'
  );
  const channelsModules = {
    ...additiveColormap,
    fs: additiveColormap.fs.replace(discardRegex, ''),
    defines: {
      COLORMAP_FUNCTION: colormap || defaultProps.colormap.value
    }
  };
  return channelsModules;
}

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * */
const AdditiveColormap3DExtension = class extends LayerExtension {
  getShaders() {
    return {
      ...super.getShaders(),
      modules: [
        removeExtraColormapFunctionsFromShader(
          this?.props?.colormap || defaultProps.colormap.value
        )
      ]
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
};

AdditiveColormap3DExtension.extensionName = 'AdditiveColormap3DExtension';
AdditiveColormap3DExtension.defaultProps = defaultProps;

export default AdditiveColormap3DExtension;
