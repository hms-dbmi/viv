### 2D

Viv's shaders in 2D can be modified via [deck.gl shader hooks](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#standard-shader-hooks). The `LensExtension`, `AdditiveColormapExtension`, and `ColorPaletteExtesnion` (default) in Viv [implement shader hooks](https://github.com/hms-dbmi/viv/tree/main/src/extensions). Implementing your own shader hook requires extending the [standard layer extension](https://deck.gl/docs/api-reference/extensions/overview) with a `getShaders` method that returns an `inject` function for one of the following supported hooks:

#### `DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`

This hook allows for custom processing of raw pixel intensities. For example, a non-linear (or alternative) transformation function may be provided to override the default linear ramp function with two contrast limit endpoints. This hook is available on all layers in all modes. By default, the layer provides a reasonable function for this.

#### `DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)`

This hook allows for users to mutate conversion of a processed intensity (from `DECKGL_PROCESS_INTENSITY`) into a color. This is only available in 2D layers. An implementation for this hook is required by all Viv extensions.

#### `DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry)`

Please see deck.gl's [documentation](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#fsdeckgl_filter_color) as this is a standard hook. This hook may be used for example to apply a gamma transformation to the output colors.

### Channel Index Expansion

Viv supports a channel index placeholder for generating per-channel shader code. Use `VIV_CHANNEL_INDEX_PLACEHOLDER` from `@vivjs/constants` in your shader strings, and Viv will expand lines containing it for each channel.

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
  DECKGL_PROCESS_INTENSITY(intensity${I}, contrastLimits[${I}], ${I});

  // Collect into array (element must be on its own line line duplication, and comma should be at the end
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

This pattern avoids issues with multi-line per-channel code where mutable state could produce unexpected results. Each expansion line should be self-contained. If for some reason it is required to have more complex nested iterration etc, that ought to work as normal.

### 3D

Viv's shaders can be modified in 3D similar to the above, with the exception of `DECKGL_MUTATE_COLOR`. Instead, at least one provided extension must implement `_BEFORE_RENDER`, `_RENDER` and `_AFTER_RENDER`. Specifically, one extension must have `opts.rendering` as an object with at least the `_RENDER` property a string that contains valid glsl code. For example, the `MaximumIntensityProjectionExtension` uses `_BEFORE_RENDER` to set up an array which will hold the found maximum intensities. `_RENDER` fills that array as maximum intensities are found. And finally `_AFTER_RENDER` will place those intensities in the `color` or `fragColor` buffer to be rendered.
