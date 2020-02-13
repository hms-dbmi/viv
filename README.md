# vitessce-image-viewer ("Viv") [![npm version](https://badge.fury.io/js/%40hubmap%2Fvitessce-image-viewer.svg)](https://badge.fury.io/js/%40hubmap%2Fvitessce-image-viewer)

A viewer for high bit depth, high resolution, multi-channel images using DeckGL
over the hood and WebGL under the hood. To learn more about the "theory" behind
this, look at [this](IMAGE_RENDERING.md). To really make this sing, you need to
use an http2 server, both in development and in production (s3 is passable, though).

## Using this in your project

In the interest of keeping this app as lightweight and extensible as possible,
there are no dependencies except for peer dependencies, which you will need to specify in your project.
The reason for this is primarily to support export external DeckGL setups so that
you might combine our layer with your own.

## Build

To build the component, alone via `webpack` use `npm run-script build-component`.
To build the demo used for visual testing (seen on `npm start`), run
`npm run-script build-site`.

## Development

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html)
for your preferred editor. (Badly formatted code will fail on Travis.)

For the demo, run `npm start` and you will be able to update the component and use the
`demo/src/App.js` to visually test.

Additionally, while developing, you may want to serve your own content locally.
For that, you should serve on an (HTTP2 server)[https://github.com/GoogleChromeLabs/simplehttp2server]

## Component Library API

There are two components being exported for use:

#### `MicroscopyViewer`

This component is for pure drop-in use without an external `DeckGL` setup.

#### `MicroscopyViewerLayer`

This component can be used with an already existing `DeckGL` setup.

## `MicroscopyViewer` and `MicroscopyViewerLayer` Properties

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

The height and width of the image you wish to render.

##### `initialViewState` (object) [ONLY NECESSARY FOR `MicrsocopyViewer`]

An object containing two things

- `target` (Array) An `[x,y,0]` location in image coordinates of the image. The 0
  represents a hypothetical (and potentially future addition) of a third spatial dimension.
- `zoom` (Number) The initial zoom level to render the image at

##### `minZoom` & `maxZoom` (Number)

These control the max and min zoom sizes, generally the number of images `n` in your pyramid,
ranging from `-n` (`minZoom`), the lowest reoslution, to `0` (`maxZoom`), the highest resolution. You don't need to
pass these in (they can be inferred from heigh/width/tile size), although
if you wish to limit zoom levels, you may.

##### `sliderValues` (Array) **POTENIAL FUTURE BREAKING CHANGES WITH NEW FEATURES**

An object containing slider (max/min) values for each channel:
`{sliderValues:{name:value}, {name:value}, {name:value}}`

##### `colors` (Array)

Again, this is an objecting matching the sliders and the data of the colors
that you wish to map to a full range for displaying,
`{colorValues:{name:[r,g,b]}, {name:[r,g,b]}, {name:[r,g,b]}}`
