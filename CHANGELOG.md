# Changelog

## In Progress

### Added

### Changed

- Don't minify es bundle.

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
