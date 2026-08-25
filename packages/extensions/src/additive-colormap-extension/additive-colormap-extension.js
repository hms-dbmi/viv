import { apply_transparent_color } from '../shader-utils';
import { VivLayerExtension } from '../viv-shader-assembler';

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
      opacity: 'f32',
      useTransparentColor: 'u32'
    },
    fs: `\
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
  // we should review use of 'boolean', don't want to change it everywhere if not necessary.
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
const AdditiveColormapExtension = class extends VivLayerExtension {
  // this doesn't need any shader code template manipulation, as long as NUM_CHANNELS is defined
  // we could just use `LayerExtension.getShaders()` as before here
  getVivShaderTemplates() {
    const name = this?.props?.colormap || defaultProps.colormap.value;
    const apply_cmap = cmaps[name];
    if (!apply_cmap) {
      throw Error(`No colormap named ${name} found in registry`);
    }
    return { modules: [colormapModuleFactory(name, apply_cmap)] };
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    // When colormap changes, getShaders() returns different modules, which triggers
    // extensionsChanged in the layer, causing the layer to recreate models.
    // We should NOT manage models here - that's the layer's responsibility.
    const name = this?.props?.colormap || defaultProps.colormap.value;
    const extensionName = `additive_colormap_${name}`;
    // Set uniforms on all models - getModels() returns an array (may be empty during model recreation)
    const models = this.getModels();
    for (const model of models) {
      model.shaderInputs.setProps({
        [extensionName]: {
          opacity: this.props.opacity,
          useTransparentColor: this.props.useTransparentColor
        }
      });
    }
  }
};

AdditiveColormapExtension.extensionName = 'AdditiveColormapExtension';
AdditiveColormapExtension.defaultProps = defaultProps;

export default AdditiveColormapExtension;
