import { ShaderAssembler, type ShaderModule } from '@luma.gl/shadertools';
import { LayerExtension, type Layer } from '@deck.gl/core';
import {
  VIV_CHANNEL_INDEX_PLACEHOLDER,
  VIV_PLANE_INDEX_PLACEHOLDER
} from '@vivjs/constants';

/**
 * Interface for Viv layers that support dynamic channel and plane counts.
 * Layers implementing this interface must provide methods to query their
 * actual channel/plane counts at runtime.
 */
export interface VivLayer extends Layer {
  /**
   * Returns the number of channels for this layer instance.
   * Should be based on actual data (e.g., selections.length), not MAX_CHANNELS.
   */
  getNumChannels(): number;

  /**
   * Returns the number of planes for this layer instance.
   * Defaults to 1 for 2D layers, or clippingPlanes.length for 3D layers.
   */
  getNumPlanes(): number;
}

/**
 * Expands a single line by replacing the channel or plane index placeholder with each index number.
 * Lines containing VIV_CHANNEL_INDEX are replicated for each channel (0 to numChannels-1).
 * Lines containing VIV_PLANE_INDEX are replicated for each plane (0 to numPlanes-1).
 */
function expandLine(line: string, numChannels: number, numPlanes = 1): string {
  if (line.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) {
    let str = '';
    for (let i = 0; i < numChannels; i++) {
      str += `${line.replaceAll(VIV_CHANNEL_INDEX_PLACEHOLDER, i.toString())}\n`;
    }
    // Remove the trailing comma if present (for array initializers)
    if (str.endsWith(',\n')) {
      str = `${str.slice(0, -2)}\n`;
    }
    return str;
  }
  if (line.includes(VIV_PLANE_INDEX_PLACEHOLDER)) {
    let str = '';
    for (let i = 0; i < numPlanes; i++) {
      str += `${line.replaceAll(VIV_PLANE_INDEX_PLACEHOLDER, i.toString())}\n`;
    }
    // Remove the trailing comma if present (for array initializers)
    if (str.endsWith(',\n')) {
      str = `${str.slice(0, -2)}\n`;
    }
    return str;
  }
  return line;
}

/**
 * Processes a GLSL shader string, expanding channel and plane index placeholders.
 *
 * Each line containing VIV_CHANNEL_INDEX is replicated for each channel,
 * with the placeholder replaced by the channel number.
 * Each line containing VIV_PLANE_INDEX is replicated for each plane,
 * with the placeholder replaced by the plane number.
 *
 * For multi-line per-channel logic, use arrays and iterate with NUM_CHANNELS:
 * ```glsl
 * float intensity${I} = float(texture(channel${I}, vTexCoord).r);
 * float[] intensity = float[NUM_CHANNELS](
 *   // keep this on a separate line so it can be duplicated... then final comma will be removed.
 *   intensity${I},
 * );
 * for(int i = 0; i < NUM_CHANNELS; i++) { ... }
 * ```
 */
function processGLSLShader(
  shader: string,
  numChannels: number,
  numPlanes = 1
): string {
  return shader
    .split('\n')
    .map(line => expandLine(line, numChannels, numPlanes))
    .join('\n');
}

/**
 * Expands a shader module's uniformTypes and shader code to include per-channel and per-plane declarations.
 * This is mostly an internal implementation detail used by `VivLayer` implementations, it's not expected that
 * extensions should call it directly.
 * Any uniformType key containing VIV_CHANNEL_INDEX_PLACEHOLDER will be expanded (we tend to import this `as I`).
 * Any uniformType key containing VIV_PLANE_INDEX_PLACEHOLDER will be expanded.
 * Any shader code (fs/vs) containing these placeholders will be expanded.
 * Required for per-channel/per-plane uniforms because counts vary at runtime.
 *
 *
 * @param module - Shader module definition
 * @param numChannels - Number of channels to expand
 * @param numPlanes - Number of planes to expand (default: 1)
 * @returns Expanded shader module with per-channel/per-plane uniformTypes and shader code
 *
 * @example
 * import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
 * const module = {
 *   name: 'my-module',
 *   uniformTypes: {
 *     [`color${I}`]: 'vec3<f32>'
 *   },
 *   fs: `uniform myUniforms {
 *     // note that with the current implementation it is important that statements needing expansion appear on their own line
 *     vec3 color${I}; 
 *   } my;`
 * };
 * const expanded = expandShaderModule(module, 3);
 * // expanded.uniformTypes = { color0: 'vec3<f32>', color1: 'vec3<f32>', color2: 'vec3<f32>' }
 * // expanded.fs = `uniform myUniforms {
 * //   // note that with the current implementation it is important that statements needing expansion appear on their own line
 * //   vec3 color0;
 * //   vec3 color1;
 * //   vec3 color2;
 * // } my;`
 */
export function expandShaderModule(
  module: ShaderModule,
  numChannels: number,
  numPlanes = 1
): ShaderModule {
  const expandedModule = { ...module };

  // Expand uniformTypes if present
  if (module.uniformTypes) {
    const expandedUniformTypes: typeof module.uniformTypes = {};

    for (const [key, value] of Object.entries(module.uniformTypes)) {
      if (key.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) {
        // Expand this uniform for each channel
        for (let i = 0; i < numChannels; i++) {
          const expandedKey = key.replaceAll(
            VIV_CHANNEL_INDEX_PLACEHOLDER,
            i.toString()
          );
          expandedUniformTypes[expandedKey] = value;
        }
      } else if (key.includes(VIV_PLANE_INDEX_PLACEHOLDER)) {
        // Expand this uniform for each plane
        for (let i = 0; i < numPlanes; i++) {
          const expandedKey = key.replaceAll(
            VIV_PLANE_INDEX_PLACEHOLDER,
            i.toString()
          );
          expandedUniformTypes[expandedKey] = value;
        }
      } else {
        // Keep non-indexed uniforms as-is
        expandedUniformTypes[key] = value;
      }
    }
    expandedModule.uniformTypes = expandedUniformTypes;
  }

  if (module.fs) {
    expandedModule.fs = processGLSLShader(module.fs, numChannels, numPlanes);
  }
  if (module.vs) {
    expandedModule.vs = processGLSLShader(module.vs, numChannels, numPlanes);
  }
  // maybe we can expand the type and do something recursive like this...
  // might not even need `VivLayerExtension`.
  // if (expandedModule.modules) {
  //   expandedModule.modules = expandedModule.modules.map(m => expandShaderModule(m, numChannels, numPlanes));
  // }
  return expandedModule;
}

/**
 * This class is used internally by `VivLayer`s to avoid problems with other normal deck.gl layers (in particular,
 * `PolygonLayer`s used in `overview-layer`) that lack defines for `NUM_CHANNELS` which is part of the declared signature
 * of Viv's hooks. This leads to shader compiler errors when these layers are used.
 * 
 * Registering viv-specific hooks here also reduces the places in which we break encapsulation of `ShaderAssembler`.
 */
export class VivShaderAssembler extends ShaderAssembler {
  static _default: VivShaderAssembler;
  constructor() {
    super();
    // make sure we copy over any default modules and hook functions that deck.gl might need
    // not sure how confident we are that this will work in all circumstances... but we seem to be ok for now.
    const defaultShaderAssembler = ShaderAssembler.getDefaultShaderAssembler();
    const defaultModules = defaultShaderAssembler._getModuleList();
    //@ts-expect-error - private property but we need to access it (we already did even before messing about with this)
    const defaultHookFunctions = defaultShaderAssembler._hookFunctions;
    for (const module of defaultModules) {
      this.addDefaultModule(module);
    }
    for (const hookFunction of defaultHookFunctions) {
      this.addShaderHook(hookFunction);
    }
    //!!! if we add this hook to the defaultShaderAssembler used by other deck layers,
    // then they fail to compile because of undefined NUM_CHANNELS
    const mutateStr =
      'fs:DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)';
    const processStr =
      'fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)';

    this.addShaderHook(mutateStr);
    this.addShaderHook(processStr);
  }
  static getDefaultVivShaderAssembler() {
    if (!VivShaderAssembler._default) {
      VivShaderAssembler._default = new VivShaderAssembler();
    }
    return VivShaderAssembler._default;
  }
}


/**
 * Base class for Viv-specific layer extensions.
 *
 * Responsibilities:
 * - Extensions implement `getVivShaderTemplates` and return shader *templates* (with placeholders)
 * - `VivLayerExtension.getShaders`:
 *   - Is called with `this` bound to the layer instance and `extension` as the extension instance
 *     (this is similar to the pattern used by deck.gl more generally)
 *   - Expands shader modules (uniformTypes + fs/vs) using `expandShaderModule` when any part of 
 *     the system calls `getShaders()`
 */
export abstract class VivLayerExtension<OptionsT = unknown> extends LayerExtension<OptionsT> {
  static extensionName = 'VivLayerExtension';

  /**
   * Extensions must implement this to return shader *templates* (with placeholders),
   * not expanded modules.
   */
  abstract getVivShaderTemplates(): ReturnType<LayerExtension['getShaders']>;

  /**
   * deck.gl calls this as `extension.getShaders.call(layer, extension)`.
   * `this` is therefore the layer, and `extension` is the extension instance.
   */
  getShaders(
    this: VivLayer,
    extension: this
  ): ReturnType<LayerExtension['getShaders']> {
    const templates = extension.getVivShaderTemplates() || {};

    //not optional - we'll make sure these are implemented
    const numChannels = this.getNumChannels();
    const numPlanes = this.getNumPlanes();

    const modules = (templates.modules || []).map((m: ShaderModule) =>
      expandShaderModule(m, numChannels, numPlanes)
    );

    return {
      modules
    };
  }
}
