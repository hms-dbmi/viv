Viv's layer allow for custom shader hooks to be defined via [deck.gl hook functions](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#standard-shader-hooks). To take advantage of these, please pass in a deck.gl [layer extension](https://deck.gl/docs/api-reference/extensions/overview) whose `getShaders` function has a definition in `inject` for one of these hooks. Viv supports 3 hooks on the fragment shader:

### `DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`

This hook allows for custom processing of the raw intensities of the pixels. You may for example want to apply a nonlinear or otherwise different function instead of the standard ramp function with 2 contrast limit endpoints we apply. This hook is available on all layers in all modes

### `DECKGL_MUTATE_COLOR(inout float intensity, int channelIndex)`

This hook allows for users to mutate conversion of a processed intensity (from `DECKGL_PROCESS_INTENSITY`) into a color when not using a colormap like `viridis` or `jet` via the `colormap` prop. This is only available in 2D layers.

### `DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry)`

Please see deck.gl's [documentation](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#fsdeckgl_filter_color) as this is a stnadard hook. For example in this function, you may wish to apply a gamma transformation to the output colors.

Using these is fully optional and up to the discretion of the user.
