# vitessce-image-viewer ("Viv") [![npm version](https://badge.fury.io/js/%40hubmap%2Fvitessce-image-viewer.svg)](https://badge.fury.io/js/%40hubmap%2Fvitessce-image-viewer)

A viewer for high bit depth, high resolution, multi-channel images using DeckGL
over the hood and WebGL under the hood. To learn more about the "theory" behind
this, look at [this](IMAGE_RENDERING.md). To really make this sing, you need to
use an http2 server in production (s3 is passable, though).

## Using this in your project

In the interest of keeping this app as lightweight and extensible as possible,
there are no dependencies except for peer dependencies, which you will need to specify in your project.
The reason for this is primarily to support export external DeckGL setups so that
you might combine our layer with your own.

## Build

To build the component, alone via `webpack` use `npm run-script build-component`.
To build the demo used for visual testing (seen on `npm start`), run
`npm run-script build-site`.

## Publish

To bump the version number, clean up/update the CHANGELOG.md, and push the tag to Github,
please run `npm version [major | minor | patch]` depending on which you want. Then run `./publish.sh` to publish the package/demo.

## Development

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html)
for your preferred editor. (Badly formatted code will fail on Travis.)

For the demo, run `npm start` and you will be able to update the component and use the
`demo/src/App.js` to visually test.

For development,
HTTP is acceptable but potentially slower than HTTP2 for `TIFF`. However, for
development with `zarr`, you should use an [HTTP2 server](https://github.com/GoogleChromeLabs/simplehttp2server)
for best performance. Our demo
uses Google Cloud Storage, which is HTTP2 by default.

Due to difficulties around compiling shaders on Travis, unit tests and layer lifecycle
tests are run locally as a pre-push hook. Travis runs a test build, linting, and prettier.

## Component Library API

There are two components being exported for use:

#### `VivViewer`

This component is for pure drop-in use without an external `DeckGL` setup.

#### `VivViewerLayer`

This component can be used with an already existing `DeckGL` setup.

## `Viewer` and `ViewerLayer` Properties

##### `useZarr` (Function)

A `useZarr` flag for using the built in zarr functionality. This is currently
experimental (see [this](IMAGE_RENDERING.md))

##### `useTiff` (Function)

A flag for using the built-in pyramidal/tiled TIFF fetching functionality.

##### `getTileData` (Function) **POTENTIAL FUTURE BREAKING CHANGES WITH NEW FEATURES**

`getTileData` given x, y, z indices of the tile, returns the tile data or a Promise that resolves to the tile data. Alternatively, pass in `useZarr` as true to use `zarr` and our functionality. Otherwise, you can use `useTiff` to make range requests directly against a pyramid/tiled tiff. Look
at [this](IMAGE_RENDERING.md) for how the zarr should be laid out.

Receives arguments:

- `x` (Number) The X coordinate of the tile index
- `y` (Number) The Y coordinate of the tile index
- `z` (Number) The Z coordinate of the tile index

Returns:

- An array of `[colorData1, ..., colorDataN]` where `colorDataI`
  is a typed array of a single channel's worth of data. The order must match.

A `loadZarr` function is provided to assist and a `loadTiff` function will be coming.  
They need to be wrapped so in a `getTileData` function that accepts the right arguments
(as stated above). For now, the `loadZarr` function also accepts:

- sourceChannels (Array) `[{name:'tilesource1.com'}, {name:'tilesource2.com'}, ... {name:'tilesourceN.com'}]``
- `tileSize`
- `x`
- `y`
- `z`
- `imageWidth` The real width of the image

Returns:
`[{name:data}, {name:data}, {name:data}]`

##### `viewHeight` & `viewWidth` (Number) [ONLY NECESSARY FOR `MicrsocopyViewer`]

These control the size of the viewport in your app.

##### `imageHeight` & `imageWidth` (Number)

The height and width of the image you wish to render. They are not necessary
if you use tiff.

##### `initialViewState` (object) [ONLY NECESSARY FOR `MicrsocopyViewer`]

An object containing two things

- `target` (Array) An `[x,y,0]` location in image coordinates of the image. The 0
  represents a hypothetical (and potentially future addition) of a third spatial dimension.
- `zoom` (Number) The initial zoom level to render the image at

##### `minZoom` & `maxZoom` (Number)

These control the max and min zoom sizes, generally the number of images `n` in your pyramid,
ranging from `-n` (`minZoom`), the lowest resolution, to `0` (`maxZoom`), the highest resolution. You don't need to
pass these in (they can be inferred from heigh/width/tile size), although
if you wish to limit zoom levels, you may.

##### `sliderValues` (Object)

An object containing slider (max/min) values for each channel:
`{channel1: [min, max], channel2: [min, max], channel3:[min, max]}`

##### `colorValues` (Object)

Again, this is an object matching the channel names and colors
that you wish to map to a full range for displaying,
`{channel1: [r,g,b], channel2: [r,g,b], channel3: [r,g,b]}`

##### `channelsOn` (Array)

Again, this is an object matching the channel names and toggles
that you wish to turn on or off.
`{channel1: false, channel2:false, channel3:true}`
