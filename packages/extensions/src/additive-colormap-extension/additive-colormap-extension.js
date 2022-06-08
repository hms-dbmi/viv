import { LayerExtension } from '@deck.gl/core';
import { apply_transparent_color } from '../shader-utils';

// This file is generated via `packages/extensions/prepare.mjs`
import * as cmaps from '../generated-colormaps';

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
function colormapModuleFactory(name, apply_cmap) {
  return {
    name: `additive-colormap-${name}`,
    fs: `\
uniform float opacity;
uniform bool useTransparentColor;

${apply_transparent_color}
${apply_cmap}

vec4 colormap(float intensity) {
  return vec4(apply_transparent_color(apply_cmap(min(1.,intensity)).xyz, apply_cmap(0.).xyz, useTransparentColor, opacity));
}`,
    inject: {
      'fs:DECKGL_MUTATE_COLOR': `\
  float intensityCombo = 0.;
  intensityCombo += max(0.,intensity0);
  intensityCombo += max(0.,intensity1);
  intensityCombo += max(0.,intensity2);
  intensityCombo += max(0.,intensity3);
  intensityCombo += max(0.,intensity4);
  intensityCombo += max(0.,intensity5);
  rgba = colormap(intensityCombo);`
    }
  };
}

const defaultProps = {
  colormap: { type: 'string', value: 'viridis', compare: true },
  opacity: { type: 'number', value: 1.0, compare: true },
  useTransparentColor: { type: 'boolean', value: false, compare: true }
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {boolean=} useTransparentColor Indicates whether the shader should make the output of colormap_function(0) color transparent
 * */
const AdditiveColormapExtension = class extends LayerExtension {
  getShaders() {
    const name = this?.props?.colormap || defaultProps.colormap.value;
    const apply_cmap = cmaps[name];
    if (!apply_cmap) {
      throw Error(`No colormap named ${name} found in registry`);
    }
    return { modules: [colormapModuleFactory(name, apply_cmap)] };
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
    const {
      useTransparentColor = defaultProps.useTransparentColor.value,
      opacity = defaultProps.opacity.value
    } = this.props;
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
