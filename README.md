# Viv [![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv)

A library for multiscale visualization of high-resolution multiplexed tissue data on the web. Directly renders Bio-Formats-compatible Zarr and OME-TIFF. Written in JavaScript and built on Deck.gl with modern web technologies.

## About

Viv is a JavaScript library providing utilities for rendering primary imaging data. Viv supports WebGL-based multi-channel rendering of both pyramidal and non-pyramidal images. The rendering components of Viv are provided as Deck.gl layers, making it easy to compose images with existing layers and efficiently update rendering properties within a reactive paradigm. 

## Avivator

Also included in this repository is [`Avivator`](http://avivator.gehlenborglab.org), a lightweight "batteries-included" 
WebGL viewer for remote imaging data. Avivator is a purely client-side program that only requires access to
Bio-Formats "raw" Zarr or OME-TIFF data over HTTP. To use Avivator with your own data, please see the data preparation 
[tutorial](tutorial/README.md). Initial load time for OME-TIFFs can be optimized by generating a special `offsets.json`
file containing byte offsets for the associated binary data. For more information, see the 
[documentation](http://viv.gehlenborglab.org/#ome-tiff-loading).

## Build

To build the component alone via `webpack` use `npm run-script build-component`.
To build the demo used for visual testing (seen on `npm start`), run
`npm run-script build-site`.

## Publish

To bump the version number, clean up/update the CHANGELOG.md, and push the tag to Github,
please run `npm version [major | minor | patch]` depending on which you want. Then run `./publish.sh` to publish the package/demo.

## Development

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html)
for your preferred editor. (Badly formatted code will fail on Travis.)

For the demo, run `npm start` and you will be able to update the component and use the
`avivator/src/index.js` to visually test.

HTTP is acceptable but potentially slower than HTTP2. Our demo uses Google Cloud Storage, which is HTTP2 by default.

Due to [difficulties](https://github.com/hms-dbmi/viv/issues/103) around compiling shaders on Travis, unit tests and layer lifecycle
tests are run locally as a pre-push hook. Travis runs a test build, linting, and prettier.

## Browser Support

We support both WebGL1 and WebGL2 contexts, which should give near universal coverage. Please file an issue if you find a browser in which we don't work.

## Documentation

Please navigate to [viv.gehlenborglab.org](http://viv.gehlenborglab.org) to see full documenation.
