import { ShaderAssembler, type ShaderModule } from '@luma.gl/shadertools';
import type { AssembleShaderProps } from '@luma.gl/shadertools/dist/lib/shader-assembly/assemble-shaders';
import { MAX_CHANNELS, VIV_CHANNEL_INDEX_PLACEHOLDER } from '@vivjs/constants';

/**
 * Expands a single line by replacing the channel index placeholder with each channel number.
 * Lines containing VIV_CHANNEL_INDEX are replicated for each channel (0 to numChannels-1).
 */
function expandLine(line: string, numChannels: number): string {
  if (!line.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) return line;
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

/**
 * Processes a GLSL shader string, expanding channel index placeholders.
 *
 * Each line containing VIV_CHANNEL_INDEX is replicated for each channel,
 * with the placeholder replaced by the channel number.
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
function processGLSLShader(shader: string, numChannels: number): string {
  return shader
    .split('\n')
    .map(line => expandLine(line, numChannels))
    .join('\n');
}

/**
 * Expands a shader module's uniformTypes to include per-channel declarations.
 * Any uniformType key containing VIV_CHANNEL_INDEX_PLACEHOLDER will be expanded.
 * Required for per-channel uniforms because NUM_CHANNELS varies at runtime.
 *
 * @param module - Shader module definition
 * @param numChannels - Number of channels to expand
 * @returns Expanded shader module with per-channel uniformTypes
 *
 * @example
 * const module = {
 *   name: 'my-module',
 *   uniformTypes: {
 *     opacity: 'f32',
 *     [`color${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: 'vec3<f32>'
 *   }
 * };
 * const expanded = VivShaderAssembler.expandShaderModule(module, 3);
 * // expanded.uniformTypes = { opacity: 'f32', color0: 'vec3<f32>', color1: 'vec3<f32>', color2: 'vec3<f32>' }
 */
export function expandShaderModule(
  module: ShaderModule,
  numChannels: number
): ShaderModule {
  if (!module.uniformTypes) {
    return module;
  }

  const expandedUniformTypes: typeof module.uniformTypes = {};
  
  for (const [key, value] of Object.entries(module.uniformTypes)) {
    if (key.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) {
      // Expand this uniform for each channel
      for (let i = 0; i < numChannels; i++) {
        const expandedKey = key.replaceAll(VIV_CHANNEL_INDEX_PLACEHOLDER, i.toString());
        expandedUniformTypes[expandedKey] = value;
      }
    } else {
      // Keep non-channel uniforms as-is
      expandedUniformTypes[key] = value;
    }
  }

  return {
    ...module,
    uniformTypes: expandedUniformTypes
  };
}

export default class VivShaderAssembler extends ShaderAssembler {
  static defaultVivAssemblers: Record<number, VivShaderAssembler> = {};
  readonly numChannels: number;
  
  constructor(numChannels = MAX_CHANNELS) {
    super();
    console.log(`Creating VivShaderAssembler for ${numChannels} channels`);
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
  }
  
  /**
   * Expands a shader module's uniformTypes for this assembler's channel count.
   * 
   * @param module - Shader module definition
   * @returns Expanded shader module with per-channel uniformTypes
   */
  expandShaderModule(module: ShaderModule): ShaderModule {
    return expandShaderModule(module, this.numChannels);
  }
  
  assembleGLSLShaderPair(props: AssembleShaderProps) {
    if (props.fs) props.fs = processGLSLShader(props.fs, this.numChannels);
    return super.assembleGLSLShaderPair(props);
  }
  static getVivAssembler(NUM_CHANNELS = MAX_CHANNELS) {
    if (!VivShaderAssembler.defaultVivAssemblers[NUM_CHANNELS]) {
      VivShaderAssembler.defaultVivAssemblers[NUM_CHANNELS] =
        new VivShaderAssembler(NUM_CHANNELS);
    }
    return VivShaderAssembler.defaultVivAssemblers[NUM_CHANNELS];
    // return ShaderAssembler.getDefaultShaderAssembler();
  }
}
