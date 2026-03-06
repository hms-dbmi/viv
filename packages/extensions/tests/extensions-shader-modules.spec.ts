import { describe, expect, test } from 'vitest';

import {
  EXPECTED_COLOR_PALETTE_FS_3_CHANNELS,
  EXPECTED_COLOR_PALETTE_INJECT_DECKGL_MUTATE_COLOR,
  EXPECTED_LENS_FS_3_CHANNELS,
  EXPECTED_LENS_INJECT_DECKGL_MUTATE_COLOR,
  EXPECTED_LENS_INJECT_MAIN_END
} from './fixtures/extensions-shader-modules.fixtures';

import AdditiveColormap3DBaseExtension from '../src/additive-colormap-3d-extensions/base-extension';
import AdditiveColormapExtension from '../src/additive-colormap-extension/additive-colormap-extension';
import ColorPalette3DBaseExtension from '../src/color-palette-3d-extensions/base-extension';
import ColorPaletteExtension from '../src/color-palette-extension/color-palette-extension';
import LensExtension from '../src/lens-extension/lens-extension';
import { type VivLayer, VivLayerExtension } from '../src/viv-shader-assembler';
import { assertValidGLSL, wrapSnippet } from './glsl-test-helpers';

// Minimal stub "layer-like" class, sufficient for getShaders tests.
class StubVivLayer {
  constructor(
    private readonly numChannels: number,
    private readonly numPlanes: number
  ) {}

  getNumChannels(): number {
    return this.numChannels;
  }

  getNumPlanes(): number {
    return this.numPlanes;
  }
}

// return stub cast to VivLayer to satisfy TS
function getStubVivLayer(channels = 3, planes = 1) {
  return new StubVivLayer(channels, planes) as unknown as VivLayer;
}

function getShadersFromLayer(layer: VivLayer, extension: VivLayerExtension) {
  const getShaders = VivLayerExtension.prototype.getShaders as (
    this: VivLayer,
    extension: VivLayerExtension
  ) => ReturnType<VivLayerExtension['getShaders']>;
  return getShaders.call(layer, extension);
}

describe('color-palette shader module expansion', () => {
  test('getShaders produces expected fs and inject for 3 channels', () => {
    const layer = getStubVivLayer(3, 1);
    const ext = new ColorPaletteExtension();
    const shaders = getShadersFromLayer(layer, ext);

    expect(shaders.modules).toHaveLength(1);
    const module = shaders.modules[0];

    const defines = module.defines as Record<string, string> | undefined;
    expect(defines?.NUM_CHANNELS).toBe('3');
    expect(defines?.NUM_PLANES).toBe('1');

    expect(module.uniformTypes).toEqual({
      transparentColor: 'vec3<f32>',
      useTransparentColor: 'u32',
      opacity: 'f32',
      color0: 'vec3<f32>',
      color1: 'vec3<f32>',
      color2: 'vec3<f32>'
    });

    // Normalize whitespace to keep this test focused on structural
    // regressions in the generated shader code rather than purely formatting
    // changes (indentation, extra blank lines).
    const normalize = (s: string) =>
      s
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    expect(normalize(module.fs as string)).toBe(
      normalize(EXPECTED_COLOR_PALETTE_FS_3_CHANNELS)
    );
    expect(module.inject?.['fs:DECKGL_MUTATE_COLOR']).toBe(
      EXPECTED_COLOR_PALETTE_INJECT_DECKGL_MUTATE_COLOR
    );

    assertValidGLSL(wrapSnippet(module.fs as string), 'colorPalette fs (3ch)');
  });
});

describe('lens shader module expansion', () => {
  test('getShaders produces expected fs and injects for 3 channels', () => {
    const layer = getStubVivLayer(3, 1);
    const ext = new LensExtension();
    const shaders = getShadersFromLayer(layer, ext);

    expect(shaders.modules).toHaveLength(1);
    const module = shaders.modules[0];

    const defines = module.defines as Record<string, string> | undefined;
    expect(defines?.NUM_CHANNELS).toBe('3');
    expect(defines?.NUM_PLANES).toBe('1');

    expect(module.uniformTypes).toEqual({
      majorLensAxis: 'f32',
      minorLensAxis: 'f32',
      lensCenter: 'vec2<f32>',
      lensEnabled: 'u32',
      lensSelection: 'i32',
      lensBorderColor: 'vec3<f32>',
      lensBorderRadius: 'f32',
      color0: 'vec3<f32>',
      color1: 'vec3<f32>',
      color2: 'vec3<f32>'
    });

    expect(module.fs).toBe(EXPECTED_LENS_FS_3_CHANNELS);
    expect(module.inject?.['fs:DECKGL_MUTATE_COLOR']).toBe(
      EXPECTED_LENS_INJECT_DECKGL_MUTATE_COLOR
    );
    expect(module.inject?.['fs:#main-end']).toBe(EXPECTED_LENS_INJECT_MAIN_END);

    assertValidGLSL(wrapSnippet(module.fs as string), 'lens fs (3ch)');
  });
});

describe('additive colormap extension (2D)', () => {
  test('colormap module has expected uniforms and structure', () => {
    const layer = getStubVivLayer();
    const ext = new AdditiveColormapExtension();
    const shaders = getShadersFromLayer(layer, ext);

    expect(shaders.modules).toHaveLength(1);
    const module = shaders.modules[0];

    // Ensure layer.getNumChannels() is used when expanding (stub passes 3 → expect NUM_CHANNELS 3)
    const defines = module.defines as Record<string, string> | undefined;
    expect(defines?.NUM_CHANNELS).toBe('3');
    expect(defines?.NUM_PLANES).toBe('1');

    expect(module.uniformTypes).toEqual({
      opacity: 'f32',
      useTransparentColor: 'u32'
    });

    const fs = module.fs as string;
    expect(fs).toContain('uniform additive_colormap_');
    expect(fs).toContain('float opacity;');
    expect(fs).toContain('uint useTransparentColor;');
    expect(fs).toContain('apply_transparent_color');
    expect(fs).toContain('vec4 colormap(float intensity)');

    assertValidGLSL(wrapSnippet(fs), 'additive colormap fs');
  });
});

describe('3D extensions', () => {
  test('additive colormap 3D base produces valid GLSL for viridis', () => {
    const layer = getStubVivLayer();
    const ext = new AdditiveColormap3DBaseExtension();
    const shaders = getShadersFromLayer(layer, ext);

    expect(shaders.modules).toHaveLength(1);
    const module = shaders.modules[0];
    const fs = module.fs as string;

    expect(fs).toContain('vec4 colormap(float intensity, float opacity)');
    assertValidGLSL(wrapSnippet(fs), 'additive colormap 3D fs');
  });

  test('color palette 3D base cooperates with getShaders', () => {
    const layer = getStubVivLayer(3, 2);
    const ext = new ColorPalette3DBaseExtension();
    const shaders = getShadersFromLayer(layer, ext);

    // For now this base extension returns an empty template object.
    // If that contract changes, this test should be updated alongside it.
    expect(shaders.modules).toEqual([]);
  });
});
