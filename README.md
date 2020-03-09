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

This component can be used with an already existing `DeckGL` setup. It is a tiled image
layer for viewing high resolution imagery that is tiled and served from a file server

#### `StaticImageLayer`

This component can be used with an already existing `DeckGL` setup. It is meant for
small images that can be served at once, i.e that are not tiled.

## `Viewer` and `ViewerLayer` Properties

##### `loader` (Object)

A `loader` is the primary object responsible for returning tile data as well as the required metadata for Viv. We allow loaders to be generic so viv can be used with various sources. A laoader must implement a `getTile` method and have the property `vivMetadata`. We provide the `createZarrPyramid` and `createTiffPyramid` to which are convenience functions for creating instances of valid loaders for these data types.

###### `loader.getTile` (Function, VivViewerLayer) **POTENTIAL FUTURE BREAKING CHANGES WITH NEW FEATURES**

`getTile` given x, y, z indices of the tile, returns the tile data or a Promise that resolves to the tile data. Look
at [this](IMAGE_RENDERING.md) for how the zarr should be laid out.

Receives arguments:

- `x` (Number) The X coordinate of the tile index
- `y` (Number) The Y coordinate of the tile index
- `z` (Number) The Z coordinate of the tile index

Returns:

- An array of `[colorData1, ..., colorDataN]` where `colorDataI`
  is a TypedArray of a single channel's worth of data. The order must match.

###### `loader.getRaster` (Function, StaticImageLayer) **POTENTIAL FUTURE BREAKING CHANGES WITH NEW FEATURES**

This function returns the entire image from the loader's source.

Receives arguments:

- `z` (optional) The z coordinate of the pyramid form which data should be fetched.
- `level` (optional) The location along a third channel dimension along which data should be fetched.

###### `loader.vivMetadata` (Object)

An object containing the following properties which provide all the data-specific metadata required by Viv to render data tiles.

- `imageHeight` (Number) The height of the highest resolution image.
- `imageWidth` (Number) The width of the highest resolution image.
- `minZoom` (Number) The number of levels in the image pyramid. If the number of levels is `4`, `minZoom === -4`. This is deck.gl specific.
- `tileSize` (Number)
- `dtype` (String) This is the datatype of the incoming data. One of `<u1` (uint8), `u2` (uint16), `u4` (uint32) or `f4` (float32)

##### `viewHeight` & `viewWidth` (Number) [ONLY NECESSARY FOR `VivViewer`]

These control the size of the viewport in your app.

##### `initialViewState` (object) [ONLY NECESSARY FOR `VivViewer`]

An object containing two things

- `target` (Array) An `[x,y,0]` location in image coordinates of the image. The 0
  represents a hypothetical (and potentially future addition) of a third spatial dimension.
- `zoom` (Number) The initial zoom level to render the image at

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

##### `colormap` (String)

This is the map to be used for colors - one of `magma, viridis, turbidity, hot, greys, rainbow`.
Please open an issue if you want more.

##### `opacity` (Number)

This is a number between `0` and `1` for the opacity of the layer.

##### `visible` (Boolean)

This is a boolean for whether or not to display the layer (it still "renders" but is just not visible).

##### `domain` (Array, optional)

Optionally the max/min of the data you wish to display, if different than what the data type suggests (like 65535 for `uint16`).
