### 2D

> **WARNING - Breaking Changes**: If you have custom extensions, see the [Migration Guide](#migration-guide) below for important changes to support dynamic channel counts and deck.gl v9 UBO.

Viv's shaders in 2D can be modified via [deck.gl shader hooks](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#standard-shader-hooks). The `LensExtension`, `AdditiveColormapExtension`, and `ColorPaletteExtesnion` (default) in Viv [implement shader hooks](https://github.com/hms-dbmi/viv/tree/main/src/extensions). Implementing your own shader hook requires extending the [standard layer extension](https://deck.gl/docs/api-reference/extensions/overview) with a `getShaders` method that returns an `inject` function for one of the following supported hooks:

#### `DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`

This hook allows for custom processing of raw pixel intensities. For example, a non-linear (or alternative) transformation function may be provided to override the default linear ramp function with two contrast limit endpoints. This hook is available on all layers in all modes. By default, the layer provides a reasonable function for this.

#### `DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)`

**Breaking Change:** The signature of this hook changed from accepting multiple individual float parameters (`intensity0`, `intensity1`, etc.) to accepting a single `float[NUM_CHANNELS] intensity` array parameter.

This hook allows for users to mutate conversion of a processed intensity (from `DECKGL_PROCESS_INTENSITY`) into a color. This is only available in 2D layers. An implementation for this hook is required by all Viv extensions.

#### `DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry)`

Please see deck.gl's [documentation](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#fsdeckgl_filter_color) as this is a standard hook. This hook may be used for example to apply a gamma transformation to the output colors.

### Migration Guide

> **WORK IN PROGRESS**: This migration guide documents breaking changes and new patterns. Implementation status:
> - **Partial**: Dynamic channel count support with `VIV_CHANNEL_INDEX_PLACEHOLDER` - works but `MAX_CHANNELS` still hardcoded in constants (line 7 of `packages/constants/src/index.ts`), not truly runtime-dynamic yet
> - **Pending testing**: `expandShaderModule()` helper - needs scrutiny and real-world usage
> - **Not started**: UBO migration for existing extensions
> - **Not started**: Actual usage of helper in built-in extensions

#### 1. Dynamic Channel Count (Breaking Change)

Viv is moving toward supporting a **dynamic number of channels at runtime** instead of a fixed maximum. This is a fundamental architectural change that affects how shaders are written.

**Current Status:** Partially implemented. `MAX_CHANNELS` is currently hardcoded at 10 (was 6) in `packages/constants/src/index.ts` but the infrastructure supports varying channel counts - tested working with values from 6 to 10. True per-layer runtime variation not yet implemented.

**Key Changes:**

- `NUM_CHANNELS` varies based on `MAX_CHANNELS` constant (goal: per-layer instance based on actual data)
- Shaders must be generated programmatically to match the channel count
- Fixed-index assumptions (e.g., always having `intensity0` through `intensity5`) no longer work

**Impact on Extensions:**

Custom extensions must adapt to handle variable channel counts. This means:
- Using `VIV_CHANNEL_INDEX_PLACEHOLDER` for per-channel shader code generation
- Using loop constructs with `NUM_CHANNELS` instead of hardcoded channel counts
- For UBO uniforms: using helper utilities to generate per-channel uniform declarations

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

// In your extension's getShaders() method:
getShaders() {
  return {
    modules: [shaderModule]
  };
}
```

#### 3. Uniform Buffer Objects (UBO) Migration

> **NOT YET IMPLEMENTED**: Built-in Viv extensions have not yet been migrated to UBO. This section documents the target pattern.

Viv is migrating to deck.gl v9.1+ which requires Uniform Buffer Objects (UBO) instead of WebGL1-style global uniforms. See the [deck.gl upgrade guide](https://deck.gl/docs/upgrade-guide) for more details.

**The Challenge:**

Unfortunately, luma.gl's UBO system does not support arrays in uniform declarations. This means:
- Cannot use: `uniform vec3 colors[NUM_CHANNELS];`
- Must use: `uniform vec3 color0; uniform vec3 color1; uniform vec3 color2;` etc.

Combined with Viv's dynamic `NUM_CHANNELS`, this creates a problem: you cannot hardcode uniform declarations because the channel count varies at runtime.

**The Solution:**

Viv provides `expandShaderModule()` to programmatically generate per-channel uniform declarations based on the actual `NUM_CHANNELS` value at runtime. It uses the same `VIV_CHANNEL_INDEX_PLACEHOLDER` pattern as shader code for consistency.

**Old Style (global uniforms):**

```js
const shaderModule = {
  name: 'my-custom-extension',
  fs: `
    uniform float opacity;
  `,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
      rgba = vec4(rgba.rgb, opacity);
    `
  }
};
```

**New Style (UBO) - Using `expandShaderModule`:**

```js
import { expandShaderModule } from '@vivjs/layers';
import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';

const baseModule = {
  name: 'my-custom-extension',
  uniformTypes: {
    opacity: 'f32',
    // Use placeholder in the key - will be expanded automatically
    [`color${I}`]: 'vec3<f32>'
  },
  fs: `
    uniform myCustomExtensionUniforms {
      float opacity;
      vec3 color${I};
    } myCustomExtension;
  `,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
      vec3 color = vec3(0.0);
      color += intensity[0] * myCustomExtension.color0;
      color += intensity[1] * myCustomExtension.color1;
      color += intensity[2] * myCustomExtension.color2;
      rgba = vec4(color, myCustomExtension.opacity);
    `
  }
};

// Expand the module for your channel count
const shaderModule = expandShaderModule(baseModule, NUM_CHANNELS);
```

**Manual Declaration (Not Viable):**

Manual declarations are **not viable** because `NUM_CHANNELS` varies at runtime. Hardcoding a fixed number of channels will break when the actual channel count differs:

```js
// DON'T DO THIS - will fail with variable channel counts
const shaderModule = {
  name: 'my-custom-extension',
  uniformTypes: {
    opacity: 'f32',
    color0: 'vec3<f32>',
    color1: 'vec3<f32>',
    color2: 'vec3<f32>',
    // What if NUM_CHANNELS is 1? Or 6? This breaks!
  },
  // ... rest of module
};
```

Always use `expandShaderModule()` for per-channel uniforms.

**Key changes:**

- Add `uniformTypes` object to define the types of your uniforms (e.g., `'f32'` for float, `'u32'` for uint, `'vec3<f32>'` for vec3)
- Wrap your uniforms in a `uniform` block with a unique name
- **Required:** For per-channel uniforms, you **must** use `expandShaderModule()` because `NUM_CHANNELS` varies at runtime
- Use channel expansion with `VIV_CHANNEL_INDEX_PLACEHOLDER` in both shader code and uniformTypes keys (see "Channel Index Expansion" section)
- Access uniforms through the block name (e.g., `myCustomExtension.opacity` instead of `opacity`)
- Update your extension's `updateState` method to use `model.shaderInputs.setProps` instead of `model.setUniforms`:

```js
updateState({ props, oldProps, changeFlags, ...rest }) {
  super.updateState({ props, oldProps, changeFlags, ...rest });
  for (const model of this.getModels()) {
    model.shaderInputs.setProps({
      myCustomExtension: {
        opacity: this.props.opacity,
        color0: this.props.colors[0],
        color1: this.props.colors[1],
        color2: this.props.colors[2],
        // etc. - consider using a loop or channel expansion for this too
      }
    });
  }
}
```

#### Implementation Status & TODO

**Written but needs testing:**
- `expandShaderModule()` helper function - needs scrutiny and real-world usage
- Export from `@vivjs/layers` - added but untested
- Hook signature changed to `float[NUM_CHANNELS] intensity` - implemented in shader assembler

**TODO - Not started:**
- Make `NUM_CHANNELS` truly runtime-dynamic
  - Current: `MAX_CHANNELS` is hardcoded at 10 in `packages/constants/src/index.ts:7`
  - Works when changed and tested with avivator (6 to 10), but requires recompile
  - Need mechanism to vary per-layer instance at actual runtime
- Test `expandShaderModule()` helper with actual extensions
- Migrate `ColorPaletteExtension` to use UBO with `expandShaderModule()`
  - Current: uses global `uniform vec3 colors[NUM_CHANNELS];` (line 9 in `color-palette-module.js`)
  - Target: use `expandShaderModule()` with UBO block and placeholder pattern
- Migrate `AdditiveColormapExtension` to use UBO
  - Already uses UBO but may need adjustments for dynamic channels
- Migrate `LensExtension` if it has per-channel uniforms
- Update `updateState` methods in all extensions to use `model.shaderInputs.setProps`
- Test with variable channel counts (1, 2, 3, 4, 5, 6 channels)
- Consider helper for generating `updateState` prop setting code (to avoid manual `color0`, `color1`, etc.)

**Known Issues:**
- `MAX_CHANNELS` is still a compile-time constant (hardcoded at 10 in `packages/constants/src/index.ts`), not truly runtime-dynamic
- Array syntax in uniforms (`colors[NUM_CHANNELS]`) is not supported in luma.gl UBO but is still used in some extensions
- Manual uniform setting in `updateState` is verbose and error-prone with variable channels

### Channel Index Expansion

Viv supports a channel index placeholder for generating per-channel shader code. Use `VIV_CHANNEL_INDEX_PLACEHOLDER` from `@vivjs/constants` in your shader strings, and Viv will expand lines containing it for each channel.

**Note:** Channel expansion is required for per-channel uniforms in UBO blocks, as arrays are not supported in UBO uniform declarations in deck.gl/luma.gl. See the "Uniform Buffer Objects (UBO) Migration" section above for examples.

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

Do **not** put the placeholder on the same line as the array declaration - that line will be replicated, creating duplicate declarations:

```js
// WRONG: entire line gets replicated, creating multiple array declarations!
float[] intensity = float[NUM_CHANNELS](intensity${I},);

// Would incorrectly expand to:
// float[] intensity = float[NUM_CHANNELS](intensity0,);
// float[] intensity = float[NUM_CHANNELS](intensity1,);
```

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

Viv's shaders can be modified in 3D similar to the above, with the exception of `DECKGL_MUTATE_COLOR`. Instead, at least one provided extension must implement `_BEFORE_RENDER`, `_RENDER` and `_AFTER_RENDER`. Specifically, one extension must have `opts.rendering` as an object with at least the `_RENDER` property a string that contains valid glsl code. For example, the `MaximumIntensityProjectionExtension` uses `_BEFORE_RENDER` to set up an array which will hold the found maximum intensities. `_RENDER` fills that array as maximum intensities are found. And finally `_AFTER_RENDER` will place those intensities in the `color` or `fragColor` buffer to be rendered.
