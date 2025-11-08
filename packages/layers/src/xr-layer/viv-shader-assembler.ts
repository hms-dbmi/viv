import { ShaderAssembler } from "@luma.gl/shadertools";
import type { AssembleShaderProps } from "@luma.gl/shadertools/dist/lib/shader-assembly/assemble-shaders";
import { MAX_CHANNELS } from "@vivjs/constants";

export const VIV_CHANNEL_INDEX_PLACEHOLDER = '<VIV_CHANNEL_INDEX>';

function processGLSLShaderLine(line: string, numChannels: number) {
  if (!line.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) return line;
  let str = "";
  for (let i=0; i<numChannels; i++) {
    str += `${line.replaceAll(VIV_CHANNEL_INDEX_PLACEHOLDER, i.toString())}\n`
  }
  // Remove the trailing comma if present
  if (str.endsWith(',\n')) {
    str = `${str.slice(0, -2)}\n`;
  }
  return str;
}
function processGLSLShader(shader: string, n: number) {
  return shader.split('\n').map(line => processGLSLShaderLine(line, n)).join('\n')
}
export default class VivShaderAssembler extends ShaderAssembler {
  static defaultVivAssemblers: Record<number, VivShaderAssembler> = {};
  numChannels: number;
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
  assembleGLSLShaderPair(props: AssembleShaderProps) {
    console.log(`Assembling GLSL shader pair for ${this.numChannels} channels`);
    // do some preprocessing here to handle varying NUM_CHANNELS?
    if (props.fs) props.fs = processGLSLShader(props.fs, 6);
    return super.assembleGLSLShaderPair(props);
  }
  static getVivAssembler(NUM_CHANNELS = MAX_CHANNELS) {
    if (!VivShaderAssembler.defaultVivAssemblers[NUM_CHANNELS]) {
      VivShaderAssembler.defaultVivAssemblers[NUM_CHANNELS] = new VivShaderAssembler(NUM_CHANNELS);
    }
    return VivShaderAssembler.defaultVivAssemblers[NUM_CHANNELS];
    // return ShaderAssembler.getDefaultShaderAssembler();
  }
}
