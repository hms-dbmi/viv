import { ShaderAssembler } from '@luma.gl/shadertools';
// oops, this may cause problems for publishing... or maybe not if this is only internal.
import type { AssembleShaderProps } from '@luma.gl/shadertools/dist/lib/shader-assembly/assemble-shaders';
import { MAX_CHANNELS, VIV_CHANNEL_INDEX_PLACEHOLDER } from '@vivjs/constants';

// open question - should VivShaderAssembler be exposed as public API?
// I doubt many people would have a reason to want it... but I likely will.
// The reason for wanting to do so would be if an application needs
// to implement complex viv extensions, with more involved code-generation...
// Users should probably be discouraged from managing their own ShaderAssemblers
// especially until we are more confident in their use.
// So in deciding the public form of viv extension API (which should be ergonic/well-typed & stable),
// it should also allow where possible for somewhat arbitrary extensibility
// without getting too complex... i.e. some kind of shader generation pipeline thing.
// Viv shouldn't be the place where any complex functionality along those lines
// is maintained... but it should expose enough to allow other applications to experiment
// with appropriate documentation on what is considered stable & supported,
// vs what is there for experimental purposes.

const I = VIV_CHANNEL_INDEX_PLACEHOLDER;
//not a practical example, but the line-duplication will not work if there's a multiline expression
//with mutable state. Not clear how we'd handle that in a simple way.
`
float mutableThing = 0.;
mutableThing = opacity${I};
float value${I} = mutableThing;

mutableThing = opacity0;
float value0 = mutableThing;
mutableThing = opacity1;
float value1 = mutableThing;

mutableThing = opacity0;
mutableThing = opacity1;
float value0 = mutableThing;
float value1 = mutableThing;
`;


function processGLSLShaderLine(line: string, numChannels: number) {
  if (!line.includes(VIV_CHANNEL_INDEX_PLACEHOLDER.toString())) return line;
  let str = '';
  for (let i = 0; i < numChannels; i++) {
    str += `${line.replaceAll(VIV_CHANNEL_INDEX_PLACEHOLDER.toString(), i.toString())}\n`;
  }
  // Remove the trailing comma if present
  if (str.endsWith(',\n')) {
    str = `${str.slice(0, -2)}\n`;
  }
  return str;
}
function processGLSLShader(shader: string, n: number) {
  return shader
    .split('\n')
    .map(line => processGLSLShaderLine(line, n))
    .join('\n');
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
