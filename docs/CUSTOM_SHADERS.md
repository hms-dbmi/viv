Viv's shaders can be modified via [deck.gl hook functions](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#standard-shader-hooks).  The `LensExtension` in Viv is implemented using this feature - look [here]() for an example.   To take advantage of this feature, pass in a deck.gl [layer extension](https://deck.gl/docs/api-reference/extensions/overview) where the `getShaders` function returns an `inject` method for one of the following supported hooks:

### `DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`

This hook allows for custom processing of raw pixel intensities. For example, an non-linear (or alternative) transformation function may be provided to override the default linear ramp function with 2 contrast limit endpoints. This hook is available on all layers in all modes.

### `DECKGL_MUTATE_COLOR(inout vec3 rgb, float intensity, vec3 color, vec2 texCoord, int channelIndex)`

This hook allows for users to mutate conversion of a processed intensity (from `DECKGL_PROCESS_INTENSITY`) into a color when not using a colormap like `viridis` or `jet` via the `colormap` prop. This is only available in 2D layers.

### `DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry)`

Please see deck.gl's [documentation](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#fsdeckgl_filter_color) as this is a standard hook. This hook may be used for example to apply a gamma transformation to the output colors.

