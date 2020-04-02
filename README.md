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

This component can be used with an already existing `DeckGL` setup. It is a tiled image
layer for viewing high resolution imagery that is tiled and served from a file server

#### `StaticImageLayer`

This component can be used with an already existing `DeckGL` setup. It is meant for
small non-pyramidal, i.e that are not tiled.

## `Viewer` and `ViewerLayer` Properties

##### `loader` (Object)

A `loader` is the primary object responsible for returning tile data as well as the required metadata for Viv. We allow loaders to be generic so viv can be used with various sources. A loader must implement a `getTile` method as well as a `getRaster` method and have the property `vivMetadata`. We provide the `createZarrPyramid` and `createTiffPyramid` to which are convenience functions for creating instances of valid loaders for these data types. Those contained in this repo are experimental and subject to change with a stronger formalization being developed [here](https://github.com/hubmapconsortium/vitessce-image-loader)

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

- `z` (optional) The z coordinate of the pyramid form which data should be fetched, if needed.

###### `loader.getRasterSize` (Function, StaticImageLayer) **POTENTIAL FUTURE BREAKING CHANGES WITH NEW FEATURES**

This function returns the size of an image (optionally at a given zoom level of a pyramid)

Receives arguments:

- `z` (optional) The z coordinate of the pyramid form which data should be fetched, if needed.

This returns `{height,width}`.

###### `loader.vivMetadata` (Object)

An object containing the following properties which provide all the data-specific metadata required by Viv to render data tiles.

- `imageHeight` (Number) The height of the highest resolution image.
- `imageWidth` (Number) The width of the highest resolution image.
- `minZoom` (Number) The number of levels in the image pyramid. If the number of levels is `4`, `minZoom === -4`. This is deck.gl specific.
- `tileSize` (Number)
- `dtype` (String) This is the datatype of the incoming data. One of `<u1` (uint8), `u2` (uint16), `u4` (uint32) or `f4` (float32)

##### `viewHeight` & `viewWidth` (Number) [ONLY NECESSARY FOR `VivViewer`]

These control the size of the viewport in your app.

##### `overview` (Object) [ONLY NECESSARY FOR `VivViewer`]

This is a props for a controller for an overview (picture-in-picture).
It necessarily takes in

- `scale` (default `1`) This is a scaling parameter for how large the viewport should be relative to the detailed one.
- `offset` (default is `25`) How far from the boundary of the detailed view the overview should be.

Optionally, you can also provide:

- `overviewLocation` (deafult `'bottom-right'`) One of bottom-right, bottom-left, top-left, or top-right
- `id` (default is `'overview'`, checked within `VivViewer` as such) This is used for matching layers to veiwports.
- `boundingBoxColor` (default is `[255, 0, 0]`, red) The color of the bounding box
- `boundingBoxOutlineWidth` (default is `50`) The size of the bounding box outline
- `viewportOutlineColor` (default is `[255, 192, 204]`, pink) The color of the overview box
- `viewportOutlineWidth` (default is `400`) The size of the overview box

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

This is the map to be used for colors - one of `magma, viridis, turbidity, hot, greys, rainbow` etc.
For a complete list of currently supported options, go to the [glsl-colormap page](https://github.com/glslify/glsl-colormap). Please open an issue if you want us to implement more.

##### `opacity` (Number)

This is a number between `0` and `1` for the opacity of the layer.

##### `visible` (Boolean)

This is a boolean for whether or not to display the layer (it still "renders" but is just not visible).

##### `domain` (Array, optional)

Optionally the max/min of the data you wish to display, if different than what the data type suggests (like 65535 for `uint16`).

##### `translate` (Array, optional) [ONLY FOR `StaticImageLayer`]

This is an optional parameter for translating the static image left by `translate[0]` and top by `translate[1]`.

##### `scale` (Number, optional) [ONLY FOR `StaticImageLayer`]

This is an optional parameter for scaling up the size of an image.
