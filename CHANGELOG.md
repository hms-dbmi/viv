# Changelog

## 0.0.9 - In Progress

### Changed

- Clean up shaders
- Extracted data utils to loaders and refactored demo

### Added

- Expose opacity and visibility
- Testing for layers added
- More automated build process

## 0.0.8

### Changed

- Update build process to use rolllup

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
