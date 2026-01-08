import { ShaderAssembler, type ShaderModule } from '@luma.gl/shadertools';
import type { AssembleShaderProps } from '@luma.gl/shadertools/dist/lib/shader-assembly/assemble-shaders';
import {
  MAX_CHANNELS,
  VIV_CHANNEL_INDEX_PLACEHOLDER,
  VIV_PLANE_INDEX_PLACEHOLDER
} from '@vivjs/constants';

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
 * Any uniformType key containing VIV_CHANNEL_INDEX_PLACEHOLDER will be expanded.
 * Any uniformType key containing VIV_PLANE_INDEX_PLACEHOLDER will be expanded.
 * Any shader code (fs/vs) containing these placeholders will be expanded.
 * Required for per-channel/per-plane uniforms because counts vary at runtime.
 *
 * Note: This is different from VivShaderAssembler.assembleGLSLShaderPair() which only
 * expands the main shader code, not the shader code inside modules.
 *
 * @param module - Shader module definition
 * @param numChannels - Number of channels to expand
 * @param numPlanes - Number of planes to expand (default: 1)
 * @returns Expanded shader module with per-channel/per-plane uniformTypes and shader code
 *
 * @example
 * const module = {
 *   name: 'my-module',
 *   uniformTypes: {
 *     [`color${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: 'vec3<f32>'
 *   },
 *   fs: `uniform myUniforms { vec3 color${VIV_CHANNEL_INDEX_PLACEHOLDER}; } my;`
 * };
 * const expanded = expandShaderModule(module, 3);
 * // expanded.uniformTypes = { color0: 'vec3<f32>', color1: 'vec3<f32>', color2: 'vec3<f32>' }
 * // expanded.fs = with color0, color1, color2 declarations
 */
export function expandShaderModule(
  module: ShaderModule,
  numChannels: number,
  numPlanes = 1
): ShaderModule {
  const expandedModule: ShaderModule = { ...module };

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

  // Expand shader code if present
  // Module shader code is NOT expanded by assembleGLSLShaderPair(), so we must do it here
  if (module.fs) {
    expandedModule.fs = processGLSLShader(module.fs, numChannels, numPlanes);
  }
  if (module.vs) {
    expandedModule.vs = processGLSLShader(module.vs, numChannels, numPlanes);
  }

  return expandedModule;
}

export default class VivShaderAssembler extends ShaderAssembler {
  static defaultVivAssemblers: Record<string, VivShaderAssembler> = {};
  readonly numChannels: number;
  readonly numPlanes: number;

  constructor(numChannels = MAX_CHANNELS, numPlanes = 1) {
    super();
    console.log(
      `Creating VivShaderAssembler for ${numChannels} channels and ${numPlanes} planes`
    );
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
    this.numChannels = numChannels;
    this.numPlanes = numPlanes;
  }

  /**
   * Expands a shader module's uniformTypes for this assembler's channel and plane count.
   *
   * @param module - Shader module definition
   * @returns Expanded shader module with per-channel and per-plane uniformTypes
   */
  expandShaderModule(module: ShaderModule): ShaderModule {
    return expandShaderModule(module, this.numChannels, this.numPlanes);
  }

  assembleGLSLShaderPair(props: AssembleShaderProps) {
    if (props.fs)
      props.fs = processGLSLShader(props.fs, this.numChannels, this.numPlanes);
    return super.assembleGLSLShaderPair(props);
  }
  static getVivAssembler(NUM_CHANNELS = MAX_CHANNELS, NUM_PLANES = 1) {
    const key = `${NUM_CHANNELS}_${NUM_PLANES}`;
    if (!VivShaderAssembler.defaultVivAssemblers[key]) {
      VivShaderAssembler.defaultVivAssemblers[key] = new VivShaderAssembler(
        NUM_CHANNELS,
        NUM_PLANES
      );
    }
    return VivShaderAssembler.defaultVivAssemblers[key];
    // return ShaderAssembler.getDefaultShaderAssembler();
  }
}
