import { LayerExtension } from '@deck.gl/core';
import { apply_transparent_color, define_num_channels } from '../shader-utils';

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
  const extensionName = `additive_colormap_${name}`;
  return {
    name: extensionName,
    uniformTypes: {
      opacity: "f32",
      useTransparentColor: "u32",
    },
    fs: `\
${define_num_channels}
// uniform float opacity;
// uniform bool useTransparentColor;
uniform ${extensionName}Uniforms {
  float opacity;
  uint useTransparentColor; //no bool-like type in decode-shader-types.ts
} ${extensionName};
${apply_transparent_color}
${apply_cmap}
vec4 colormap(float intensity) {
  float opacity = ${extensionName}.opacity;
  bool useTransparentColor = ${extensionName}.useTransparentColor != uint(0);
  return vec4(apply_transparent_color(apply_cmap(min(1.,intensity)).xyz, apply_cmap(0.).xyz, useTransparentColor, opacity));
}`,
    inject: {
      'fs:DECKGL_MUTATE_COLOR': `\
  float intensityCombo = 0.;
  for (int i = 0; i < NUM_CHANNELS; i++) {
    intensityCombo += max(0.,intensity[i]);
  }
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
    // does any of this existing logic need to change?
    // (like, is there ever more than one model?)
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.colormap !== oldProps.colormap) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
        this.setState({ model: this._getModel(device) });
      }
    }
    const name = this?.props?.colormap || defaultProps.colormap.value;
    const extensionName = `additive_colormap_${name}`;
    for (const model of this.getModels()) {
      model.shaderInputs.setProps({
        [extensionName]: {
          opacity: this.props.opacity,
          useTransparentColor: this.props.useTransparentColor
        }
      })
    }
  }
};

AdditiveColormapExtension.extensionName = 'AdditiveColormapExtension';
AdditiveColormapExtension.defaultProps = defaultProps;

export default AdditiveColormapExtension;
