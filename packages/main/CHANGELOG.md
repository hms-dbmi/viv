# @hms-dbmi/viv

## 0.17.3

### Patch Changes

- Disallow multiple samples-per-pixel in multi-file tiff loaders (`@vivjs/loaders`) ([#883](https://github.com/hms-dbmi/viv/pull/883))


## 0.17.2

### Patch Changes

- Fix typo in luma texture format for Float32Array (`r32float`) (`@vivjs/constants`) ([#868](https://github.com/hms-dbmi/viv/pull/868))

## 0.17.1

### Patch Changes

- Restore support for signed integer data formats (`Int8`, `Int16`, `Int32`) (`@vivjs/constants`) ([#865](https://github.com/hms-dbmi/viv/pull/865))

## 0.17.0

### Minor Changes

- **This release includes backward-incompatible changes**. To avoid automatically adopting such releases, ensure you are either pinning the exact version of `@hms-dbmi/viv` in your `package.json` file or using a version range syntax that only accepts patch updates, such as `~0.16.1`. Refer to npm's [semver documentation](https://docs.npmjs.com/cli/v6/using-npm/semver/) for details. (`@vivjs/constants`, `@vivjs/extensions`, `@vivjs/layers`, `@vivjs/loaders`, `@hms-dbmi/viv`, `@vivjs/types`, `@vivjs/viewers`, `@vivjs/views`) ([#839](https://github.com/hms-dbmi/viv/pull/839))

  **Migrate to deck.gl v9**

  This update modifies our code internally to support deck.gl v9, dropping compatibility with deck.gl v8. See the [release notes](https://deck.gl/docs/whats-new#deckgl-v90) to learn more.

  **Impact**:

  We haven’t changed Viv's public API, but the upgrade to deck.gl 9.0 is considered **breaking** due to changes in its dependencies, which may require updates to WebGL-related code (e.g., shaders, injections, constants). Here are potential issues users may face in migrating:

  - deprecating WebGL1
  - changing any public-facing GL-specific variables to use the new luma.gl backend-agnostic variables (such as `interpolation` on the `ImageLayer`)
  - shader injection-location name changes (i.e., `gl_fragColor` -> `fragColor`)

  **Action**:

  - You will need to upgrade to deck.gl `9.0.x` if you use it directly as having multiple versions of deck.gl is not supported. The above list only includes changes internally to Viv and is not an exhaustive summary of all changes required for our migration. For full details on upgrading to deck.gl `9.0.x`, please refer to the [upgrade guide](https://deck.gl/docs/upgrade-guide#upgrading-to-v90).
  - Pin a specific Viv version or semver range to prevent unintended updates.

### Patch Changes

## 0.16.1

### Patch Changes

- Relax `IFD` and `PlaneCount` strictness in OME-XML validation (`@vivjs/loaders`) ([#783](https://github.com/hms-dbmi/viv/pull/783))

## 0.16.0

### Minor Changes

- feat: Support multiscale multifile-OME-TIFFs (`@vivjs/loaders`) ([#748](https://github.com/hms-dbmi/viv/pull/748))

  This release extends Viv's multifile OME-TIFF data-loading capabilities to multiscale TIFFs as well. The `loadOmeTiff` utility now recognizes and loads multiresolution images described in a `companion.ome` metadata file.

  ```js
  import { loadOmeTiff } from "@vivjs/loaders";

  let loader = await loadOmeTiff("http://localhost:8080/data.companion.ome");
  ```

### Patch Changes

## 0.15.1

### Patch Changes

- Support multifile OME-TIFF in `loadOmeTiff` (`@vivjs/loaders`) ([#740](https://github.com/hms-dbmi/viv/pull/740))

## 0.15.0

### Minor Changes

- 53e6014: Bump `deck.gl` to v8.8.27 and `luma.gl` to v8.5.21 (`@vivjs/extensions`, `@vivjs/constants`, `@vivjs/viewers`, `@vivjs/layers`, `@vivjs/views`)

### Patch Changes

- 51aca92: fix: Throw error for missing OME-XML in `loadBioformatsZarr` (`@vivjs/loaders`)
- a1a8007: feat: Set default PhysicalSizeUnit to µm (`@vivjs/loaders`)
- 43f659a: fix: Allow `unknown` OME-XML Description by default (`@vivjs/loaders`)

## 0.14.2

### Added

### Changed

- Fix Avivator demo for OME-Zarr with only spatial axes
- Allow OME-XML to omit `TiffData` tags

## 0.14.1

### Added

### Changed

- Trim trailing `\u0000` from OME-XML string for Firefox parsing compatibility.

## 0.14.0

### Added

- Validate expected OME-XML data-types
- Set default `extensions` in `OverviewLayer`

### Changed

- Bump `gl` to v6 and move to Node.js 18 in CI.
- Narrow required interface for `ZarrPixelSource`.
- Update dev dependencies
- Drop `fast-xml-parser` dependency in `@vivjs/loaders`

## 0.13.8

### Added

- Added ScaleBarLayer snapping feature. Will convert scale value to one of `[1, 2, 3, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500]` and adjust units accordingly, rescaling the length of the bar in pixels to match. Use `snap: true` prop to enable.

### Changed

- Fixed typo in `sites/docs/src/IMAGE_RENDERING.md`

## 0.13.7

### Changed

- Fixed `click` event not firing on Overview panel
- Fixed `zoom` in `getDefaultInitialViewState`

### Added

### Changed

- Fix `Float64` reversion from the fix in 0.12.8

## 0.13.6

### Added

- Max/Min Option per channel in Avivator.

### Changed

- Issue cloudfront invalidation on deployment.
- Fixed typos in README
- Fix loading of omengff `multiscales` by allowing loading `labels` from new `axes` metadata

## 0.13.5

### Added

### Changed

- Fix Avivator to not require `Color` attribute.

## 0.13.4

### Added

- Added support for loading local TIFFs using GeoTIFF's `fromFile` loader.
- Added `Color` attribute support for `Channel` meta-tag.
- Run tests only on ubuntu 20 in CI to prevent WebGL context creation failures.

### Changed

## 0.13.3

### Added

- `@pnpm/meta-updater` added to project
- Added support for loading stacked TIFFs to the Multi TIFF loader.
- Added 10x Xenium to the "In Action" page

### Changed

- Fix visualization of interpolation at highest level to be pixelated in `MultiscaleImageLayer` after breaking in deck.gl 8.8

## 0.13.2

### Added

### Changed

- Upgrade deck.gl to 8.8
- Use correct deck.gl 8.8 `getTileData` args.
- Replace `postversion` script with `version` script for CI release.
- Remove `package-lock.json` from root (since we use pnpm)
- Update HTTP response check to `!==200` in `avivator/utils.js`, and changed variable name `isOffsets404` to `isOffsetsNot200`
- Fix `onHover` function in `VivViewer` after deck.gl 8.8 upgrade.

## 0.13.1

### Added

- Added support for loading multiple single channel TIFFs.

### Changed

- Update doc strings for `loadMultiTiff`
- Update release notes in `README.md`

## 0.13.0

### Added

### Changed

- Migrate to pnpm monorepo
- Fix all image URLs in README
- Only run CHANGELOG action on pull_requests
- fix(main): image URLs in README
- test release (v0.13.0-alpha.0)
- add `postversion` script to `package.json`

## 0.12.9

### Added

- See documentation for a description of the newly added 3D extensions and how they work.

### Changed

- Refactor 3D rendering to use extensions just like 2D.

## 0.12.9

### Added

- Support passing in additional layers to VivViewer through deckProps

### Changed

## 0.12.8

### Added

### Changed

- Log errors for loading in Avivator
- Fix casting bug for `Float64`
- Disable `Pool` usage temporarily in Avivator due to broken Worker module
- Also disable `Pool` temporarily in Avivator for `File` OME-TIFF sources
- Update ciatation in README
- Add CITATION.cff
- Separate Journal and Software citation information.

## 0.12.7

### Added

### Changed

- Migrate off `geotiff` fork to latest release from [`geotiff/geotiff.js`](https://github.com/geotiffjs/geotiff.js/)

## 0.12.6

### Added

### Changed

- Bump `deck.gl` to 8.6.7
- Fix custom `BitmapLayer` compilation issue by providing `extensions: []`

## 0.12.5

### Added

### Changed

- Fix geotiff file size check, implemented when fixing 416 issue. Not all servers return file size as part of response.

## 0.12.4

### Added

### Changed

- Upgrade geotiff fork to viv-0.0.3 to resolve 416 issue
- Disable `@vite/plugin-react` for ESM build

## 0.12.3

### Added

### Changed

- Fix multi-image tiff indexing.
- Change `ScaleBarLayer` to use `toPrecision` instead of string cutoff.

## 0.12.2

### Added

### Changed

- Fix "Add Channel" and "Show Volume" buttons in Avivator

## 0.12.1

### Added

- New note about port-forwarding to visualize remote data in the tutorial README
- Setup workflow to deploy Avivator via GitHub Pages.
- Support multiple images within an OME-TIFF file
- Add note about Safari not working with `localhost` connections.

### Changed

- Fix image links in README.md.
- Add extensions to docs.
- Fix broken GH-pages workflow.
- Fix exported types for Viv v0.12.
- Fix selection callbacks.

## 0.12.0

### Added

- New `LensExtension` for controlling lensing on layers as a deck.gl extension
  - props like `lensBorderRadius` no longer used directly by the layer in favor of using the `extensions` prop with new `LensExtension` in connjunction with these props. So, to be able to use the lens feature, you must pass in the old props as well as the `LensExtension` to `extensions`.
    - See https://deck.gl/docs/developer-guide/custom-layers/layer-extensions for more information on how to use `extensions` and what they are
- Expose `DECKGL_FILTER_COLOR`, `DECKGL_PROCESS_INTENSITY`, AND `DECKGL_MUTATE_COLOR` hooks and document them.
- Upgrade deck.gl to 8.6
- `extensions` are now the main way for controlling how shaders render the image
  - `LensExtension`, `ColorPaletteExtension`, and `AdditiveColormapExtension` are exported from `viv` to be used mutually exclusively for controlling how the fragment shader renders. The `ColorPaletteExtension` is used by default and provides the normal one color per channel pseudo-coloring. `AdditiveColormapExtension` provides colormaps like `viridis`, `jet` and more. There have been slight changes to the props so please see the docs for more infomation.
  - These extensions are mutually exclusive and only available for 2D layers - for example you will need to add something like the following to your 2D layers for compatibility
  ```
  extensions: (colormap ? [
    new AdditiveColormapExtension(),
  ] : [
    new ColorPaletteExtension(),
  ])
  ```
- Add `@data` alias for serving local data during development
- Add Avivator video tutorial to README.md
- Support basic OME-NGFF in Avivator
- Add support for the `multiscales[].axes` field introduced in OME-NGFF v0.3
- Bump zarr.js to get support for both `/` and `.` dimension separators
- Add `onResolutionChange` callback and resolution indicator in Avivator

### Changed

- Remove special selection mechanism in `Viewers`/`Views` by using deck.gl's fixed `TileLayer` capabilities for caching the tileset.
- Fix `SAMPLES.md` demo
- Update tutorial
- Clean up README.md with latest additions to Viv
- Bold format names in README
- Add description of "Indexed TIFF" to Avivator snackbar warning when offsets are missing
- Refactor `zustand` stores to follow best practice in Avivator.
- Fix `onViewportLoad` callback for `MultiscaleImageLayer`
- There has been a small change to how `transparentColor` is handled - `useTransparentColor` is now necessary for `AdditiveColormapExtension` and `ColorPaletteExtension` to use the feature in addition to `transparentColor` for `ColorPaletteExtension`. The truthiness of `transparentColor` is no longer relied on.

## 0.11.0

### Added

### Changed

- Change API for all public props
  - `sliderValues` -> `contrastLimits`
  - `colorValues` -> `colors`
  - `channelIsOn` -> `channelsVisible`
  - `loaderSelection` -> `selections`
  - `MAX_SLIDERS_AND_CHANNELS` -> `MAX_CHANNELS`
- Upgrade `Vite` to `~2.5.4`
- Fix value-picking for `VivViewer`.
- `glOptions` is removed in favor of a general `deckProps` for Viewer components for all props that can be passed to the `DeckGL` component.

## 0.10.6

### Added

### Changed

- Upgrade deck.gl to 8.5
- Update fork of geotiff.js
- Fix changelog check in `bash`.
- Update README to note Node version restrictions.
- Maintain the value of the channel color in HSV when applying intensity (3D + 2D)
- Fix documentation for React Components.
- Fix documentation for TypeScript exports.
- Fix channel stats for thin 3D volumes in Avivator.
- Better checking for viewable volumes at certain resolutions.
- Don't do RGB-HSV conversion on shaders. Instead, scale RGB linearly.
- Consistent shader floats `n.0` -> `n.`
- Pin deck.gl to minor versions

## 0.10.5

### Added

### Changed

- Fix Galaxy note in the README.md.
- Fix interleaved RGB issue in Avivator when setting up viewer initially.

## 0.10.4

### Added

### Changed

- Make OME-TIFF loader use a `guessTileSize` function just like the zarr loaders in order to handle pyramids that are not tiled, just downsampled.
- Don't use `changeFlags` for `updateState` prop diffing.
- Fix broken decoder Pool. Remove pool proxy.
- Replace Webpack & Rollup with Vite for development & build.

## 0.10.3

### Added

- Add in-layer warning about WebGL1 to `VolumeLayer`.

### Changed

- Remove unneeeded `VolumeButton.js` file.
- Make sure loading message reappears if the resolution changes.
- Pass `glOptions` from the viewers to `DeckGL`

## 0.10.2

### Added

### Changed

- Fix WebGL1 Float + LINEAR combination in `XRLayer`

## 0.10.1

### Added

- Log metadata for current file in Avivator.

### Changed

- Fix viewer props docs.
- Fix lens in Avivator + `ImageLayer`.

## 0.10.0

### Added

- Add `VolumeView`, `VolumeViewer`, `VolumeLayer`, and `XR3DLayer` classes for volumetric ray casting.
- Add screenshots to README.md
- Allow users to choose `LINEAR` or `NEAREST` interpolation filtering for `XRLayer`.

### Changed

- Fix bug in `getChannelStats` where we only considered values over 1 for the sliders
- Fix bug in `getChannelStats` where array of zeros passed in causes undefined slider settings
- Check all properties in `onHover` to avoid crashes
- Check for dependabot before running CHANGELOG checks
- Make default setting for `MutliscaleImageLayer` for interpolation to be `NEAREST` at highest resolution, `LINEAR` otherwise.

## 0.9.5

### Added

### Changed

- Fix `VivViewer` and `VivView` types.
- Fix `ImageLayer` `loader` type.
- Refine `LayerProps` JSDoc annotations for more precise emitted types.
- Fix `Avivator` and `getImageLyaers` utility for `loaderSelection` that is empty array.

## 0.9.4

### Added

- Refactor JSDoc comments to properly annotate Layer classes with constructor signatures.
- `getChannelStats` in snippet to show how to use it.

### Changed

- Fix interleaved RGB image handling.
- Add test for interleaved RGB images.
- Upgrade geotiff.js to fix https://github.com/geotiffjs/geotiff.js/issues/214

## 0.9.3

### Added

- Support `Float64` (OME `double`) datatype by casting array data to `Float32`.
- `onHover` prop for `VivViewer`, `PictureInPictureViewer`, `SideBySideViewer` for deck.gl callback.
- Add `handleCoordnate` `hoverHook` for PIP.

### Changed

- Make deck.gl a peer dependency (similar to React).

## 0.9.2

### Added

### Changed

- Remove `trimPyramid` and require declaration of `tileSize` in `ZarrPixelSource`.

## 0.9.1

### Added

### Changed

- Export `defaults` from `tiff/pixel-source.ts` and `zarr/pixel-source.ts` as `TiffPixelSource` and `ZarrPixelSource`.
- Copy array-like selection for `ZarrPixelSource` rather than mutating.
- Fix scale bar bug in `View` to match new loaders.

## 0.9.0

### Added

- `onViewportLoad` prop for `ImageLayer` for handling when the data for the viewport has loaded.

### Changed

- Fix z-slider broken by transition fields.
- Upgrade deck.gl to 8.4.0-beta.1 to handle aborting tiles after selection better.
- Rewrite data loaders as `PixelSource` | `PixelSource[]`. Introduce `ZarrPixelSource` and `TiffPixelSource`
  to support other types of images. Migrate `src/loaders` to TypeScript.
- Add `loadBioforamtsZarr`, `loadOmeZarr`, and `loadOmeTiff` utilities.
- Add predictive, fully typed OME-XML response from `fast-xml-parser`.
- Upgrade Zarr.js to v0.4.
- Remove casting of Int8Array, Int16Array, and Int32Array to Uint. Support texture on shader.

## 0.8.3

### Added

- Document support for `bfconvert` as a cli tool for generating image pyramids as well as the new pyramidal tiff spec.
- Issue templates for Github.
- Add `transparentColor` to allow the layer to set a color to be "transparent" (or use the automatically calculated one when colormaps are set).

### Changed

- Adjust the zoom level for tile layer if scaled.
- Update `getDefaultInitialViewState` to return floating point zoom that fills the screen by default.
- Upgrade geotiff to fix out-of-range requests issue.
- Changed `initialViewState` to `viewState` in `PictureInPictureViewer` and to `viewStates` in the other viewers. The new properties control the deck.gl view state at any time and not just when the components are created.
- Fix `maxZoom` bug.
- Smooth transitions for global selection changes.
- GH actions allow for running on PR as well as push (so that forked repos run tests).

## 0.8.2

### Added

### Changed

- Fix opacity with photometric interpretations.
- Only show background image when opacity is 1 (and viewport id prop matches that of the current viewport).
- Fix `minZoom` calculation bug in `MultiscaleImageLayer`.

## 0.8.1

### Added

- Property `onViewStateChange` of all viewers accepts a callback for deck.gl view state changes.
- Add a click handler to the overview that centers the detail view on the click position. The handler can be turned off by setting the `PictureInPictureViewer` property `clickCenter` to `false`.
- Support interleaved RGB OME-TIFF files.

### Changed

- Fix documentation of instances where spreading is used in the arguments for a function.
- Fix link to bioformats in README

## 0.8.0

### Added

- Export a `getDefaultInitialViewState` function for getting a default initial view state given a loader and desired size of view.
- Added a README file for Avivator at `avivator/README.md`.

### Changed

- Fix default component args API.
- Change WebGL setting so that textures of non-multiple-of-4 length bind and display.
- Update preprint title in README.md
- Use `readRasters` for TIFF for fetching tiles so that we are robust to non-uniformly sized tiles - thus we no longer need to "pad tiles."
- Switch to Github Actions
- Don't show snackbar if image provided is one of our demos.

## 0.7.0

### Added

- Support arbitrary affine transformations of `MultiscaleImageLayer`.

### Changed

- Clean up docs for OME-TIFF creation.
- Remove OMETIFF_LOADING.md docs.
- Upgrade deck.gl to 8.4.0-alpha.2.
- Remove `scale` and `translate` from `ImageLayer` and its usages in favor of `modelMatrix`.

## 0.6.0

### Added

### Changed

- Fix snackbars for errors and initial image.
- Export custom zarr `HTTPStore` with abort controller signal support.
- Modularize shaders using deck.gl shader modules.
- Provide pure ESM export of Viv and use separate build for Avivator
- Downgrade react back to 16.8

## 0.5.0

### Added

- Support local tiff files.
- Support local zarr directories.
- onClick callbacks for layers.

### Changed

- Removed greedy matching of dimension order in Bio-Formats Zarr output. Just check if OME-Zarr.
- Upgrade to deck.gl 8.3.0
- Use WASM LZW decoder from `manzt/geotiff.js`
- Bundle UMD build with deps.

## 0.4.2

### Added

- Add snackbar for included images when no url provided.

### Changed

- Fix snackbar placement.
- Fix small range, float sliders.
- Clean up dependencies from migration.
- Fix small dif between sliders in shaders.

## 0.4.1

### Added

### Changed

- Fix lens and PIP.

## 0.4.0

### Added

- Lens view built into layers.
- Add avivator.

### Changed

- Update docs for avivator.

## 0.3.3

### Added

### Changed

- Upgrade geotiff.js to Ilan's branch for large string fix.

## 0.3.2

### Added

### Changed

- Updated the font family for the `ScaleBarLayer`'s internal `TextLayer`.
- Guarantee that `OverviewLayer` shows an image by forcing it to be a power of 2.

## 0.3.1

### Added

### Changed

- Pad OME-TIFF tiles using both height and width in the calculation.

## 0.3.0

### Added

- Thanks to deck.gl 8.2, we have a request scheduler which makes fetching tiles more efficient.

### Changed

- Use WebGL context to detect what shaders and textures to use, not whether WebGL2 is available on environment `document`.
- Fix link in `IMAGE_RENDERING.md` and remove `img2zarr` reference since it has been depricated.
- Upgrade deck.gl to 8.2.
- Export `XRLayer`.
- Fix OMEXML 32 bit float parse error.

## 0.2.11

### Added

### Changed

- Move back on to geotiff full releases.

## 0.2.10

### Added

### Changed

- Change geotiff fork branch to work with downstream installations.
- Fix shaders divisor for intensity.

## 0.2.9

### Added

- Support Safari in 2D raster imagery.
- Support height as primary dimension for sizing OverviewView.
- Add preliminary RGB check.
- Add doc giving an overview of our API structure.

### Changed

- Project overview boundary sizes instead of hardcoding.
- Default demo color is now magenta and not red.
- Remove Safari browser warning in docs.

## 0.2.8

### Added

- Export constants for loader type and max channels.

### Changed

## 0.2.7

### Added

- Min/max, mean, standard deviation, median, IQR calculations directly from loaders.

### Changed

## 0.2.6

### Added

### Changed

- Don't minify es bundle.
- Remove bioformats hack and update docs for container version.
- Update zarr with new decoders.
- Add tile-padding utility function for consistently sized tiles from `Loader.getTile`.
- Fix #144 by padding uneven length tiles in `StaticImageLayer`.

## 0.2.5

### Added

### Changed

- Address OMEXML discrepancy on StructuredAnnotations.

## 0.2.4

### Added

### Changed

- Clean up dependencies.

## 0.2.3

### Added

### Changed

- Add OME-TIFF to Covid-19 data description.
- Clean up the docs.
- Allow numeric indexing on OME-TIFF loader.

## 0.2.2

### Added

- Allow for headers with OME-TIFF.
- Add COVID-19 Image to public demo.
- Added `getMetadata` function to `ZarrLoader` and `OMETiffLoader` classes to enable Vitessce to obtain human-readable image layer metadata.

### Changed

- Change bioformats padding check.
- Pad based on textures and not channel props.

## 0.2.1

### Added

### Changed

- Allow for offsets in OMETiffLoader for `bioformats6` pyramids.
- Update geotiff off from Ilan's for to the official release.

## 0.2.0

### Added

- Remove threads.js and use WebWorkers for tiff decompression.
- Add a dimension builder onto the tiff loader.
- Add hover values for PictureInPictureViewer

### Changed

- Removed `loader.serializeSelection` and standardized `loaderSelection` for `getTile` and `getRaster`
- Fix loaderSelection fetching on `StaticImageLayer`

## 0.1.7

### Added

- OMETiffLoader for reading ome-tiff files directly
- Add scale bar (only for OMEXML for now)

### Changed

## 0.1.6

### Added

- New classes for views/viewers
- Zoom/pan lock buttons and linked views in demo

### Changed

- Refactored VivViewer to take in arbitrary views/layers
- Check for `loader.getRaster` in `VivViewerLayer` before rendering `StaticImageLayer` base

## 0.1.5

### Added

- Add `loaderSelection` as prop for `VivViewerLayer`. This parameter is passed to `loader.getTile` and `loader.getRaster` in addtion to `x`, `y` and `z`.
- Display warning for Safari users

### Changed

- Refactored demo to allow various channels and change selection
- Use reducer for handling channel state in Demo
- Use Material UI for demo components, and showcase all viv features
- Update the IMAGE_RENDERING doc

## 0.1.4

### Added

- Add background image for nicer loading and temporary fix for minZoom issue
- Add getRaster to TiffPyramidLoader
- Picture-in-picture overview layer

### Changed

- Generalize colormaps to multichannel maps.
- Add flags to check for loader change and rerender.
- Remove minZoom from loaders and make loaders provide `onTileError`.
- Wrap `channelData` in `StaticImageLayer` in Promise.
- Allow no `viewportId` parameter

## 0.1.3

### Added

### Changed

## 0.1.2

### Changed

- Fixed shaders' if-then
- Changed UMD build name to be valid
- Provide default args for `scale` and `isRgb` in `createZarrPyramid`.
- Remove unneeded attributes from `TiffPyramidLoader`.

## 0.1.1

### Changed

- Update deck.gl build
- Bump `zarr.js` to `v0.2.3`
- Set raster selection on data loader class

### Added

- Add `test:watch` to npm scripts.

## 0.1.0

### Changed

- Clean up shaders
- Extracted data utils to loaders and refactored demo

### Added

- StaticImageLayer added and exported for viewing non-tiled images
- Single channel colormaps for tiled and static
- Expose opacity and visibility
- Testing for layers added
- More automated build process

## 0.0.8

### Changed

- Update build process to use rollup

## 0.0.7

### Changed

- Remove sort

## 0.0.6

### Added

- New zarr API and standardize data utilities

### Changed

- Fix brightness from channel toggling
- Removed `Microscopy` from export names
- Consolidated data access logic to data-utils
- Refactored `microscopy-viewer-layer-base.js`
- Fix toggling defaults for sliders and colors when channels are off.

## 0.0.5

### Added

- Resolve linting
- Update demo switching
- Add channel-toggling
- Simplify API for TIFF by inferring metadata from file
- Clean up vertex shader

### Changed

- Fixed no-unused-expressions

## v0.0.4

### Added

- Anti-aliasing for the borders implemented.

### Changed

- Prettier on CI will now actually scan all files.

## v0.0.3

### Added

- Automate Deployment
- Add slider names corresponding to metadata in demo
- Linting and Travis integration. Apply prettier to everything. (Ignore most ESLint errors for now

### Changed

- Fix no-extraneous-dependencies
- Fix global-require
