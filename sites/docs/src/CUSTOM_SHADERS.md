### 2D

> **WARNING - Breaking Changes**: If you have custom extensions, see the [Migration Guide](#migration-guide) below for important changes to support dynamic channel counts and deck.gl v9 UBO.

Viv's shaders in 2D can be modified via [deck.gl shader hooks](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#standard-shader-hooks). The `LensExtension`, `AdditiveColormapExtension`, and `ColorPaletteExtension` (default) in Viv [implement shader hooks](https://github.com/hms-dbmi/viv/tree/main/src/extensions). In Viv you should extend `VivLayerExtension` from `@vivjs/extensions` (a thin wrapper around deck.gl's `LayerExtension`) and return shader modules that inject into one of the following hooks.

#### Viv shader extensions (`VivLayerExtension`)

Custom shader behavior in Viv is implemented by subclassing `VivLayerExtension` and implementing `getVivShaderTemplates()`, which will be internally called `getShader()`:

```js
import { VivLayerExtension } from '@vivjs/extensions';
import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

class MyExtension extends VivLayerExtension {
  getVivShaderTemplates() {
    return { modules: [myShaderModule] };
  }

  updateState({ props, oldProps, changeFlags }) {
    super.updateState({ props, oldProps, changeFlags });
    const numChannels = this.getNumChannels();
    const myUniformBlock = {};
    for (let i=0; i < numChannels; i++) {
      myUniformBlock[`color${i}`] = props.color[i];
    }
    for (const model of this.getModels()) {
      model.shaderInputs.setProps({
        myUniformBlock
      });
    }
  }
}
```

It is important not to override the `getShaders()` method directly, as has been designed to ensure that when deck.gl calls it, the appropriate 'expanded' version will be returned for the given layer.

Each module can contribute GLSL via its `fs` / `vs` fields and an `inject` map keyed by hook names such as `'fs:DECKGL_MUTATE_COLOR'` or `'fs:DECKGL_PROCESS_INTENSITY'`.

#### `DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`

This hook allows for custom processing of raw pixel intensities. For example, a non-linear (or alternative) transformation function may be provided to override the default linear ramp function with two contrast limit endpoints. This hook is available on all layers in all modes. By default, the layer provides a reasonable function for this.

#### `DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)`

**Breaking Change:** The signature of this hook changed from accepting multiple individual float parameters (`intensity0`, `intensity1`, etc.) to accepting a single `float[NUM_CHANNELS] intensity` array parameter.

This hook allows for users to mutate conversion of a processed intensity (from `DECKGL_PROCESS_INTENSITY`) into a color. This is only available in 2D layers. An implementation for this hook is required by all Viv extensions.

#### `DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry)`

Please see deck.gl's [documentation](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#fsdeckgl_filter_color) as this is a standard hook. This hook may be used for example to apply a gamma transformation to the output colors.

### Migration Guide

#### 1. Dynamic Channel Count (Breaking Change)

Viv supports a **dynamic number of channels at runtime** instead of a fixed maximum. This is a fundamental architectural change that affects how shaders are written.

**Key changes:**

- `NUM_CHANNELS` now varies at runtime based on layer props (for example, the length of `selections`).
- Shader modules should be written as templates and generated programmatically so that uniforms and loops respect the current channel count; avoid fixed-index assumptions like `intensity0` through `intensity5`.
- For per-channel data (including UBO uniforms), use `VIV_CHANNEL_INDEX_PLACEHOLDER` and loop constructs with `NUM_CHANNELS` so Viv can expand your shader code for the active channel count.

#### 2. DECKGL_MUTATE_COLOR Hook Signature Change

The `DECKGL_MUTATE_COLOR` hook signature has changed from accepting multiple individual float parameters to accepting a single array parameter to support dynamic channel counts.

**Old Signature (deprecated):**

```glsl
DECKGL_MUTATE_COLOR(inout vec4 rgba, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5, vec2 vTexCoord)
```

**New Signature:**

```glsl
DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)
```

**How to Update Your Code:**

Replace direct parameter names with array accesses and use loops for dynamic channel handling:

- `intensity0` → `intensity[0]`
- `intensity1` → `intensity[1]`
- Hardcoded operations → loops with `NUM_CHANNELS`

**Example:**

```js
// Old implementation (fixed 6 channels)
const shaderModule = {
  name: 'my-custom-extension',
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
      // Direct access to individual parameters
      float maxIntensity = max(intensity0, intensity1);
      maxIntensity = max(maxIntensity, intensity2);
      maxIntensity = max(maxIntensity, intensity3);
      maxIntensity = max(maxIntensity, intensity4);
      maxIntensity = max(maxIntensity, intensity5);
      rgba = vec4(vec3(maxIntensity), 1.0);
    `
  }
};

// New implementation (dynamic channels)
const shaderModule = {
  name: 'my-custom-extension',
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
      // Use array access and iteration for any channel count
      float maxIntensity = 0.0;
      for (int i = 0; i < NUM_CHANNELS; i++) {
        maxIntensity = max(maxIntensity, intensity[i]);
      }
      rgba = vec4(vec3(maxIntensity), 1.0);
    `
  }
};

// Instead of using getShaders, tend to use getVivShaderTemplates
getVivShaderTemplates() {
  return {
    modules: [shaderModule]
  };
}
```

#### 3. Uniform Buffer Objects (UBO) Migration

Viv is migrating to deck.gl v9.2+ which requires Uniform Buffer Objects (UBO) instead of WebGL1-style global uniforms. See the [deck.gl upgrade guide](https://deck.gl/docs/upgrade-guide) for more details.

**The Challenge:**

Unfortunately, luma.gl's uniform type system does not, as of this writing, support arrays in uniform declarations. This means we:
- Cannot use: `uniform vec3 colors[NUM_CHANNELS];`
- Must use: `uniform vec3 color0; uniform vec3 color1; uniform vec3 color2;` etc.

Combined with Viv's dynamic `NUM_CHANNELS`, this creates a problem: you cannot hardcode uniform declarations because the channel count varies at runtime.

**The Solution (short version):**

Viv's shader tooling expands per-channel uniforms for you. In your template modules (returned from `getVivShaderTemplates()` on a `VivLayerExtension`), use `uniformTypes` together with `VIV_CHANNEL_INDEX_PLACEHOLDER` and wrap uniforms in a named UBO; Viv will expand `color${I}` into `color0`, `color1`, ... at runtime.

**Old style (global uniforms, 6 separate intensity float arguments):**

```js
const shaderModule = {
  name: 'my-custom-extension',
  fs: `
    uniform float opacity;
    uniform vec3 color[6];
  `,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
      vec3 result = vec3(0.0);
      result += intensity0 * color[0];
      result += intensity1 * color[1];
      result += intensity2 * color[2];
      result += intensity3 * color[3];
      result += intensity4 * color[4];
      result += intensity5 * color[5];
      rgba = vec4(result, opacity);
    `
  }
};
```

**New style (UBO with per-channel uniforms):**

```js
import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const shaderModule = {
  name: 'my-custom-extension',
  uniformTypes: {
    opacity: 'f32',
    [`color${I}`]: 'vec3<f32>'
  },
  fs: `
    uniform myCustomExtensionUniforms {
      float opacity;
      // we'd like to declare this as 'vec3 color[NUM_CHANNELS];'
      // but the current luma.gl implementation won't allow that
      vec3 color${I};
    } myCustomExtension;
  `,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
      vec3 color = vec3(0.0);
      // making a local array allows us to loop later
      vec3 channelColor[NUM_CHANNELS] = vec3[NUM_CHANNELS](
        myCustomExtension.color${I},
      );
      for (int i = 0; i < NUM_CHANNELS; i++) {
        color += intensity[i] * channelColor[i];
      }
      rgba = vec4(color, myCustomExtension.opacity);
    `
  }
};
```

In your extension's `updateState`, use `model.shaderInputs.setProps({ myCustomExtension: { opacity, color0, ..., color{N-1} } })` to supply JS values that match the expanded uniforms. For a complete working example, see `color-palette-module.js` and `color-palette-extension.js` in the Viv extensions package.

Manual declarations like `color0`, `color1`, ... without using the placeholder are fragile: when `NUM_CHANNELS` changes, they will no longer match the expanded uniforms. Prefer the placeholder pattern so the expansion always matches the runtime channel count.

**Key changes:**

- Add a `uniformTypes` object to define the types of your uniforms (e.g., `'f32'` for float, `'u32'` for uint, `'vec3<f32>'` for vec3).
- Wrap related uniforms in a `uniform` block with a unique name and access them through the block (e.g., `myCustomExtension.opacity`).
- For per-channel uniforms, use `VIV_CHANNEL_INDEX_PLACEHOLDER` in both `uniformTypes` keys and shader code so Viv's `expandShaderModule()` can generate per-channel declarations based on the layer's channel count.
- Update your extension's `updateState` method to use `model.shaderInputs.setProps` instead of `model.setUniforms` to feed values into UBOs.

### VivLayerExtension responsibilities and channel index expansion

Viv supports a channel index placeholder for generating per-channel shader code. Use `VIV_CHANNEL_INDEX_PLACEHOLDER` from `@vivjs/constants` in your shader strings, and Viv will expand lines containing it for each channel.

When using Viv layers together with `VivLayerExtension`:

- **Layers** such as `XRLayer` and `XR3DLayer` own the actual channel/plane counts (via methods like `getNumChannels()` / `getNumPlanes()` and their props), create models, and select the shader assembler.
- **Extensions** (subclasses of `VivLayerExtension`) provide shader *templates* via `getVivShaderTemplates()`, using placeholders in `uniformTypes` and shader code.
- `VivLayerExtension.getShaders()` is called with `this` bound to the layer; it reads `this.getNumChannels()` / `this.getNumPlanes()` and expands all modules using `expandShaderModule()`, so your shaders see concrete `color0`, `color1`, ..., plus `NUM_CHANNELS` / `NUM_PLANES` defines.
- Extension methods like `updateState` or `draw` are also invoked with `this` as the layer; use `this.getNumChannels()` (or a layer prop such as `this.props.numChannels` if you set one) to know how many per-channel uniforms to provide, and populate `model.shaderInputs.setProps` with **only** the keys that match the expanded uniforms (e.g. `color0..color{N-1}`) to avoid \"uniform value not present\" warnings.

#### How It Works

**The expansion happens line-by-line.** Each line containing the placeholder is replicated for each channel (0 to NUM_CHANNELS-1), with the placeholder replaced by the channel number. Lines without the placeholder pass through unchanged.

**Critical:** Only put the placeholder in lines you want replicated. For array initializers, put the array declaration on separate lines from the elements:

```js
import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const shader = `
  float intensity${I} = float(texture(channel${I}, vTexCoord).r);

  // CORRECT: array declaration and closing paren are on separate lines
  // Only the element line contains the placeholder and gets replicated
  float[] intensity = float[NUM_CHANNELS](
    intensity${I},
  );
`;
// Expands to (for 2 channels):
// float intensity0 = float(texture(channel0, vTexCoord).r);
// float intensity1 = float(texture(channel1, vTexCoord).r);
//
// float[] intensity = float[NUM_CHANNELS](
//   intensity0,
//   intensity1    // trailing comma automatically removed
// );
```

Do **not** put the placeholder on the same line as the array declaration – that would cause the entire declaration to be duplicated for each channel.

#### Recommended Pattern: Arrays and Iteration

Use the placeholder for code that genuinely cannot use arrays (sampler declarations, texture reads, individual variable declarations). For processing logic, collect values into an array and iterate with `NUM_CHANNELS`:

```js
import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const shader = `
  // Per-channel expansion for things that can't be arrays
  float intensity${I} = float(texture(channel${I}, vTexCoord).r);
  // Collect into array (element must be on its own line to avoid duplication, and comma should be at the end
  // the preprocessor is basic, but this pattern should be sufficient for many cases)
  float[] intensity = float[NUM_CHANNELS](
    intensity${I},
  );

  // Iterate for processing logic
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgb += intensity[i] * vec3(colors[i]);
  }
`;
```

This pattern avoids issues with multi-line per-channel code where mutable state could produce unexpected results. Each expansion line should be self-contained. If for some reason it is required to have more complex nested iteration etc, it can be handled with normal GLSL code.

### 3D

Viv's shaders can be modified in 3D similarly, but they do not use `DECKGL_MUTATE_COLOR`. Instead, at least one extension must provide 3D rendering code by setting `this.rendering = { _RENDER, _BEFORE_RENDER?, _AFTER_RENDER? }` on the extension instance, where each property is a GLSL string. For example, `MaximumIntensityProjectionExtension` uses `_BEFORE_RENDER` to initialize per-channel accumulators, `_RENDER` to update them while ray marching, and `_AFTER_RENDER` to write the final intensities into the `color` / `fragColor` output.
