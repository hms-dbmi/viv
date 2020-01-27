# viv
A viewer for high bit depth, high resolution, multi-channel images.

## Build
To build the component, alone via `rollup` use `npm run-script build-component`.
To build the demo used for visual testing (seen on `npm start`), run
`npm run-script build-site`.

## Development
Simply run `npm start` and you will be able to update the component and use the
`demo/src/App.js` to visually test.

## Component Library API
There are two components being exported for use:
#### MicroscopyViewer
This component is for pure drop-in use without an external `DeckGL` setup.  The
API exposed:

## Properties

##### `getTileData` (Function) **FUTURE BREAKING CHANGES WITH NEW FEATURES**

`getTileData` given x, y, z indices of the tile, returns the tile data or a Promise that resolves to the tile data.

Receives arguments:

- `x` (Number) The X coordinate of the tile index
- `y` (Number) The Y coordinate of the tile index
- `z` (Number) The Z coordinate of the tile index

Returns:

- An array of `[{redData:data}, {blueData:data}, {greenData:data}]` where `data`
is a typed array of a single channel's worth of data.

A `loadZarr` function is provided to assist and a `loadTiff` function will be coming.  
They need to be wrapped so in a  `getTileData` function that accepts the right arguments
(as stated above).  For now, the `loadZarr` function also accepts:
 - sourceChannels (Array) `[{name:'redChannel',tileSource:'tilesourceRed.com'}, {name:'blueChannel',tileSource:'tilesourceBlue.com'}, {name:'greenChannel',tileSource:'tilesourceGreen.com'}]``
 - `tileSize`
 - `x`
 - `y`
 - `z`
 - `imageWidth` The real width of the image


##### `viewHeight` & `viewWidth` (Number)

These control the size of the viewport in your app.

##### `imageHeight` & `imageWidth` (Number)

The height and width of the image you wish to render.

##### `initialViewState` (object)

An object containing two things
 - `target` (Array) An `[x,y,0]` location in image coordinates of the image.  The 0
 represents a hypothetical (and potentially future addition) of a third spatial dimension.
 - `zoom` (Number) The initial zoom level to render the image at

##### `minZoom` & `maxZoom` (Number)

These control the max and min zoom sizes, generally the number of images `n` in your pyramid,
ranging from `-n` (zoomed out) to `0`, the highest resolution.

##### `sliderValues` (Object) **FUTURE BREAKING CHANGES WITH NEW FEATURES**

An object containing multiple things
 - `redSliderValue` (Number) The cutoff for red values
 - `greenSliderValue` (Number) The cutoff for green values
 - `blueSliderValue` (Number) The cutoff for green values
