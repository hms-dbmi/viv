import { describe, expect, test } from 'vitest';
import { parse } from '@shaderfrog/glsl-parser';
import { ShaderAssembler, type ShaderModule } from '@luma.gl/shadertools';
import {
  VIV_CHANNEL_INDEX_PLACEHOLDER,
  VIV_PLANE_INDEX_PLACEHOLDER
} from '@vivjs/constants';
import {
  expandShaderModule,
  VivShaderAssembler
} from '../src/viv-shader-assembler';

// These JS modules export plain objects whose types don't exactly match
// luma.gl's ShaderModule (string values vs union-typed values). The cast
// is safe -- expandShaderModule only reads keys/values, it doesn't validate
// them against the union.
import channelIntensity from '../../layers/src/xr-layer/shader-modules/channel-intensity';
import channelIntensity3D from '../../layers/src/xr-3d-layer/shader-modules/channel-intensity-3d';
import fragmentUniforms3D from '../../layers/src/xr-3d-layer/shader-modules/fragment-uniforms-3d';

const I = VIV_CHANNEL_INDEX_PLACEHOLDER;
const P = VIV_PLANE_INDEX_PLACEHOLDER;

const GLSL_PARSE_OPTIONS = { quiet: true };

/**
 * Cast a loosely-typed module object to ShaderModule for use with expandShaderModule.
 * The real shader modules are JS files whose inferred types don't satisfy luma.gl's
 * strict ShaderModule generics, but they work correctly at runtime.
 */
// biome-ignore lint/suspicious/noExplicitAny: test helper bridging JS module types to ShaderModule
function asModule(m: any): ShaderModule {
  return m as ShaderModule;
}

/**
 * Wrap a GLSL snippet (uniform block, function defs) into a minimal
 * valid GLSL 300 es program so `@shaderfrog/glsl-parser` can parse it.
 */
function wrapSnippet(snippet: string): string {
  return `#version 300 es
precision highp float;
precision highp int;
${snippet}
void main() {}
`;
}

/**
 * Parse GLSL and throw on syntax error. Returns the AST on success.
 */
function assertValidGLSL(source: string, label?: string) {
  try {
    return parse(source, GLSL_PARSE_OPTIONS);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const msg = label ? `GLSL parse failed (${label})` : 'GLSL parse failed';
    throw new Error(`${msg}: ${message}\n---source---\n${source}`);
  }
}

// ---------------------------------------------------------------------------
// Tier 1: Hook function invariant tests (regression guard for overview-layer)
// ---------------------------------------------------------------------------
describe('ShaderAssembler hook isolation', () => {
  test('default ShaderAssembler does NOT have hooks referencing NUM_CHANNELS', () => {
    const defaultAssembler = ShaderAssembler.getDefaultShaderAssembler();
    // @ts-expect-error accessing private _hookFunctions
    const hooks: string[] = defaultAssembler._hookFunctions;
    for (const hook of hooks) {
      const hookStr = typeof hook === 'string' ? hook : JSON.stringify(hook);
      expect(hookStr).not.toContain('NUM_CHANNELS');
    }
  });

  test('VivShaderAssembler has DECKGL_MUTATE_COLOR and DECKGL_PROCESS_INTENSITY hooks', () => {
    const vivAssembler = VivShaderAssembler.getDefaultVivShaderAssembler();
    // @ts-expect-error accessing private _hookFunctions
    const hooks: string[] = vivAssembler._hookFunctions;
    expect(hooks.some(h => typeof h === 'string' && h.includes('DECKGL_MUTATE_COLOR'))).toBe(true);
    expect(hooks.some(h => typeof h === 'string' && h.includes('DECKGL_PROCESS_INTENSITY'))).toBe(true);
  });

  test('VivShaderAssembler hooks reference NUM_CHANNELS (in MUTATE_COLOR)', () => {
    const vivAssembler = VivShaderAssembler.getDefaultVivShaderAssembler();
    // @ts-expect-error accessing private _hookFunctions
    const hooks: string[] = vivAssembler._hookFunctions;
    const mutateHook = hooks.find(
      h => typeof h === 'string' && h.includes('DECKGL_MUTATE_COLOR')
    );
    expect(mutateHook).toBeDefined();
    expect(mutateHook).toContain('NUM_CHANNELS');
  });
});

// ---------------------------------------------------------------------------
// Tier 2: Full assembly + GLSL parse-validation
// ---------------------------------------------------------------------------
describe('shader assembly GLSL validation', () => {
  const platformInfo = {
    type: 'webgl' as const,
    shaderLanguage: 'glsl' as const,
    shaderLanguageVersion: 300 as const,
    gpu: 'test',
    features: new Set<string>()
  };

  test('default ShaderAssembler assembles a minimal shader without NUM_CHANNELS', () => {
    const assembler = ShaderAssembler.getDefaultShaderAssembler();
    const minimalVs = `#version 300 es
void main() { gl_Position = vec4(0.0); }`;
    const minimalFs = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(1.0); }`;

    const result = assembler.assembleGLSLShaderPair({
      platformInfo,
      vs: minimalVs,
      fs: minimalFs,
      modules: []
    });

    expect(result.vs).not.toContain('NUM_CHANNELS');
    expect(result.fs).not.toContain('NUM_CHANNELS');
    assertValidGLSL(result.fs, 'default assembler minimal fs');
    assertValidGLSL(result.vs, 'default assembler minimal vs');
  });

  test.each([1, 3, 6])('VivShaderAssembler assembles channelIntensity module for %i channels', (numChannels) => {
    const expanded = expandShaderModule(asModule(channelIntensity), numChannels);
    expect(expanded.fs).toBeDefined();
    assertValidGLSL(wrapSnippet(expanded.fs as string), `channelIntensity fs (${numChannels} ch)`);
  });

  test.each([1, 3, 6])('VivShaderAssembler assembles channelIntensity3D module for %i channels', (numChannels) => {
    const expanded = expandShaderModule(asModule(channelIntensity3D), numChannels);
    expect(expanded.fs).toBeDefined();
    assertValidGLSL(wrapSnippet(expanded.fs as string), `channelIntensity3D fs (${numChannels} ch)`);
  });

  test('fragmentUniforms3D expands with both channel and plane placeholders and parses', () => {
    const expanded = expandShaderModule(asModule(fragmentUniforms3D), 3, 2);
    expect(expanded.fs).toBeDefined();
    assertValidGLSL(wrapSnippet(expanded.fs as string), 'fragmentUniforms3D fs (3ch, 2planes)');

    expect(expanded.fs).toContain('color0');
    expect(expanded.fs).toContain('color1');
    expect(expanded.fs).toContain('color2');
    expect(expanded.fs).toContain('normal0');
    expect(expanded.fs).toContain('normal1');
    expect(expanded.fs).not.toContain('normal2');
    expect(expanded.fs).toContain('distance0');
    expect(expanded.fs).toContain('distance1');
    expect(expanded.fs).not.toContain('distance2');
  });

  // Future: once deck.gl layer tests work, add integration tests that call
  // layer.getShaders() and assemble the full pipeline through VivShaderAssembler.
  // This would cover the complete path including deck.gl's own module injection.
});

// ---------------------------------------------------------------------------
// Tier 3: Unit tests for expandShaderModule
// ---------------------------------------------------------------------------
describe('expandShaderModule', () => {
  test('expands uniformTypes keys with channel placeholder', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      uniformTypes: { [`val${I}`]: 'f32' }
    }), 3);
    expect(expanded.uniformTypes).toEqual({
      val0: 'f32',
      val1: 'f32',
      val2: 'f32'
    });
  });

  test('expands uniformTypes keys with plane placeholder', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      uniformTypes: { [`normal${P}`]: 'vec3<f32>' }
    }), 1, 4);
    expect(expanded.uniformTypes).toEqual({
      normal0: 'vec3<f32>',
      normal1: 'vec3<f32>',
      normal2: 'vec3<f32>',
      normal3: 'vec3<f32>'
    });
  });

  test('leaves non-placeholder uniformTypes keys unchanged', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      uniformTypes: {
        opacity: 'f32',
        [`color${I}`]: 'vec3<f32>'
      }
    }), 2);
    expect(expanded.uniformTypes).toEqual({
      opacity: 'f32',
      color0: 'vec3<f32>',
      color1: 'vec3<f32>'
    });
  });

  test('expands fs shader code per-channel', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      fs: `float val${I} = 0.0;`
    }), 3);
    expect(expanded.fs).toContain('float val0 = 0.0;');
    expect(expanded.fs).toContain('float val1 = 0.0;');
    expect(expanded.fs).toContain('float val2 = 0.0;');
    expect(expanded.fs).not.toContain(I);
  });

  test('expands vs shader code per-channel', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      vs: `float val${I} = 0.0;`
    }), 2);
    expect(expanded.vs).toContain('float val0 = 0.0;');
    expect(expanded.vs).toContain('float val1 = 0.0;');
    expect(expanded.vs).not.toContain(I);
  });

  test('removes trailing comma from array initializer lines', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      fs: `float[] arr = float[3](\n  val${I},\n);`
    }), 3);
    const lines = (expanded.fs as string).split('\n');
    const lastValLine = lines.filter(l => l.trim().match(/^val\d/)).pop();
    expect(lastValLine).toBeDefined();
    expect((lastValLine as string).trim()).toBe('val2');
  });

  test('sets NUM_CHANNELS and NUM_PLANES in defines', () => {
    const expanded = expandShaderModule(asModule({ name: 'test' }), 5, 3);
    const defines = expanded.defines as unknown as Record<string, string>;
    expect(defines).toBeDefined();
    expect(defines.NUM_CHANNELS).toBe('5');
    expect(defines.NUM_PLANES).toBe('3');
  });

  test('preserves existing defines', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      defines: { SAMPLER_TYPE: 'usampler2D' }
    }), 2);
    const defines = expanded.defines as unknown as Record<string, string>;
    expect(defines.SAMPLER_TYPE).toBe('usampler2D');
    expect(defines.NUM_CHANNELS).toBe('2');
  });

  test('handles module with no uniformTypes, fs, or vs', () => {
    const expanded = expandShaderModule(asModule({ name: 'empty-module' }), 4);
    expect(expanded.name).toBe('empty-module');
    expect(expanded.uniformTypes).toBeUndefined();
    expect(expanded.fs).toBeUndefined();
    expect(expanded.vs).toBeUndefined();
    const defines = expanded.defines as unknown as Record<string, string>;
    expect(defines.NUM_CHANNELS).toBe('4');
  });

  test('handles mixed channel and plane placeholders in uniformTypes', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      uniformTypes: {
        xSlice: 'vec2<f32>',
        [`color${I}`]: 'vec3<f32>',
        [`normal${P}`]: 'vec3<f32>',
        [`distance${P}`]: 'f32'
      }
    }), 2, 3);
    expect(expanded.uniformTypes).toEqual({
      xSlice: 'vec2<f32>',
      color0: 'vec3<f32>',
      color1: 'vec3<f32>',
      normal0: 'vec3<f32>',
      normal1: 'vec3<f32>',
      normal2: 'vec3<f32>',
      distance0: 'f32',
      distance1: 'f32',
      distance2: 'f32'
    });
  });

  test('does not mutate the original module', () => {
    const module = asModule({
      name: 'test',
      uniformTypes: { [`val${I}`]: 'f32' },
      fs: `float val${I};`,
      defines: { FOO: true }
    });
    const originalUniformTypes = { ...module.uniformTypes };
    const originalFs = module.fs;
    expandShaderModule(module, 3);
    expect(module.uniformTypes).toEqual(originalUniformTypes);
    expect(module.fs).toBe(originalFs);
    expect(module.defines).toEqual({ FOO: true });
  });

  test('single channel expansion (edge case)', () => {
    const expanded = expandShaderModule(asModule({
      name: 'test',
      uniformTypes: { [`contrastLimits${I}`]: 'vec2<f32>' },
      fs: `vec2 contrastLimits${I};`
    }), 1);
    expect(expanded.uniformTypes).toEqual({ contrastLimits0: 'vec2<f32>' });
    expect(expanded.fs).toContain('contrastLimits0');
    expect(expanded.fs).not.toContain(I);
  });

  test('throws when numChannels is 0', () => {
    expect(() => expandShaderModule(asModule({ name: 'test' }), 0)).toThrow();
  });

  test('throws when numPlanes is 0', () => {
    expect(() => expandShaderModule(asModule({ name: 'test' }), 1, 0)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// GLSL parse-validation of real shader module expansion
// ---------------------------------------------------------------------------
describe('real shader module GLSL validation', () => {
  test('channelIntensity module expanded fs is valid GLSL for various channel counts', () => {
    for (const n of [1, 2, 3, 6, 10]) {
      const expanded = expandShaderModule(asModule(channelIntensity), n);
      assertValidGLSL(wrapSnippet(expanded.fs as string), `channelIntensity (${n} ch)`);
    }
  });

  test('channelIntensity3D module expanded fs is valid GLSL for various channel counts', () => {
    for (const n of [1, 2, 3, 6, 10]) {
      const expanded = expandShaderModule(asModule(channelIntensity3D), n);
      assertValidGLSL(wrapSnippet(expanded.fs as string), `channelIntensity3D (${n} ch)`);
    }
  });

  test('fragmentUniforms3D expanded fs is valid GLSL for various channel/plane combos', () => {
    const combos = [
      [1, 1],
      [3, 1],
      [3, 2],
      [6, 4],
      [10, 3]
    ];
    for (const [ch, pl] of combos) {
      const expanded = expandShaderModule(asModule(fragmentUniforms3D), ch, pl);
      assertValidGLSL(wrapSnippet(expanded.fs as string), `fragmentUniforms3D (${ch}ch, ${pl}planes)`);
    }
  });

  // Future: test full xr-layer-fragment.glsl.ts expansion + assembly once
  // deck.gl layer lifecycle tests are working. The template contains deck.gl
  // macros (DECKGL_MUTATE_COLOR, DECKGL_FILTER_COLOR, etc.) and references
  // to `geometry` struct that would need stubs for standalone parse-validation.
});
