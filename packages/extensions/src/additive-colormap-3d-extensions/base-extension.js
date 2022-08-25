import { LayerExtension } from '@deck.gl/core';
import * as cmaps from '../generated-colormaps.js';

/**
 * A utility to create a Deck.gl shader module for a `glsl-colormap`.
 *
 * The colormap implemenation must be named `apply_cmap` and take the form,
 *
 * ```glsl
 * vec4 apply_cmap (float x) {
 *   // implementation
 * }
 * ```
 *
 * @param {string} name colormap function name
 * @param {string} apply_cmap glsl colormap function implementation
 *
 */
function colormapModuleFactory3D(name, apply_cmap) {
  const fs = `\
${apply_cmap}

vec4 colormap(float intensity, float opacity) {
  return vec4(apply_cmap(min(1.,intensity)).xyz, opacity);
}`;
  return {
    name: `additive-colormap-3d-${name}`,
    fs
  };
}

const defaultProps = {
  colormap: { type: 'string', value: 'viridis', compare: true }
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * */
const BaseExtension = class extends LayerExtension {
  constructor(...args) {
    super(args);
    // After deck.gl 8.8, it does not seem like this is always initialized.
    this.opts = this.opts || {};
  }

  getShaders() {
    const name = this?.props?.colormap || defaultProps.colormap.value;
    const apply_cmap = cmaps[name];
    return {
      ...super.getShaders(),
      modules: [colormapModuleFactory3D(name, apply_cmap)]
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

BaseExtension.extensionName = 'BaseExtension';
BaseExtension.defaultProps = defaultProps;

export default BaseExtension;
