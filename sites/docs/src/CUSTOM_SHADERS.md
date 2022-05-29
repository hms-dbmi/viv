Viv's shaders can be modified via [deck.gl shader hooks](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#standard-shader-hooks). The `LensExtension`, `AdditiveColormapExtension`, and `ColorPaletteExtesnion` (default) in Viv [implement shader hooks](https://github.com/hms-dbmi/viv/tree/master/src/extensions). Implementing your own shader hook requires extending the [standard layer extension](https://deck.gl/docs/api-reference/extensions/overview) with a `getShaders` method that returns an `inject` function for one of the following supported hooks:

### `DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`

This hook allows for custom processing of raw pixel intensities. For example, a non-linear (or alternative) transformation function may be provided to override the default linear ramp function with two contrast limit endpoints. This hook is available on all layers in all modes. By default, the layer provides a reasonable function for this.

### `DECKGL_MUTATE_COLOR(inout vec4 rgba, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5, vec2 vTexCoord)`

This hook allows for users to mutate conversion of a processed intensity (from `DECKGL_PROCESS_INTENSITY`) into a color. This is only available in 2D layers.  An implementation for this hook is required by all Viv extensions.

### `DECKGL_FILTER_COLOR(inout vec4 color, FragmentGeometry geometry)`

Please see deck.gl's [documentation](https://deck.gl/docs/developer-guide/custom-layers/writing-shaders#fsdeckgl_filter_color) as this is a standard hook. This hook may be used for example to apply a gamma transformation to the output colors.

