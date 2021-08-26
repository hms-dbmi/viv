# Changelog

## In Progress

### Added

### Changed

- Upgrade deck.gl to 8.5
- Fix changelog check in `bash`.
- Update README to note Node version restrictions.
- Maintain the value of the channel color in HSV when applying intensity (3D + 2D)
- Fix documentation for React Components.
- Don't do RGB-HSV conversion on shaders.  Instead, scale RGB linearly.
- Consistent shader floats `n.0` -> `n.`
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
