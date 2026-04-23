---
"@vivjs/extensions": minor
"@vivjs/constants": minor
"@vivjs/loaders": minor
"@vivjs/viewers": minor
"@vivjs/layers": minor
"@vivjs/views": minor
"@hms-dbmi/viv": minor
"@vivjs/types": minor
---

Updates DeckGL from `~9.1.11` to `~9.2.9` (and LumaGL from `~9.1.9` to `~9.2.6`).
For basic usage of Viv, this will be the most prominent change.

For "power users" who have implemented custom Viv layers or layer extensions:
- Custom layers and extensions may also need to migrate to [Uniform Buffer Objects](https://deck.gl/docs/upgrade-guide#uniform-buffers) due to the DeckGL upgrade.
- The internal shader assembly pipeline has been redesigned to allow a dynamic number of channels (and 'planes' for volumetric rendering) at runtime.
    - For custom layers, `VivLayer` subclasses must implement `getNumChannels(): number` and `getNumPlanes(): number`, to enable compatibility with `VivLayerExtension`s that assume a dynamic number of channels.
    - For custom layer extensions, `VivLayerExtension` subclasses must implement the `getVivShaderTemplates(): { modules }` method (rather than a `getShaders` method). The function signature of `DECKGL_MUTATE_COLOR` has also changed.

Optionally, `VivLayer`s can use the new `VivShaderAssembler` and `expandShaderModule` in order to assemble fragment/vertex shaders that assume a dynamic number of channels.

See [sites/docs/src/CUSTOM_SHADERS.md](./sites/docs/src/CUSTOM_SHADERS.md) for more details.