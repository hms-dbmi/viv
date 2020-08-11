### Viv [![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv)

A library for high bit depth, high resolution, multi-channel images using deck.gl
with WebGL.

### About

Viv is a library with deck.gl layers, viewers, and utility functions/classes for viewering for multi-scale and non-multi-scale image data.
The layers of our API make it easy to create UI elements with the desired level customization.

### Avivator

Also included in this repository is [`Avivator`](http://avivator.gehlenborglab.org), a lightweight "batteries-included" 
web-based tool for viewing remote microscopy data. Avivator is a purely client-side program that requires access to
Bio-Formats "raw" Zarr or OME-TIFF data over HTTP. To use Avivator with your own data, please see the data preparation 
[tutorial](tutorial/README.md). Initial load time for OME-TIFFs can be optimized by generating a special `offsets.json`
file containing byte offsets for the associated binary data. For more information, see the 
[documentation](http://viv.gehlenborglab.org/#ome-tiff-loading).

### Build

To build the component alone via `webpack` use `npm run-script build-component`.
To build the demo used for visual testing (seen on `npm start`), run
`npm run-script build-site`.

### Publish

To bump the version number, clean up/update the CHANGELOG.md, and push the tag to Github,
please run `npm version [major | minor | patch]` depending on which you want. Then run `./publish.sh` to publish the package/demo.

### Development

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html)
for your preferred editor. (Badly formatted code will fail on Travis.)

For the demo, run `npm start` and you will be able to update the component and use the
`demo/src/index.js` to visually test.

HTTP is acceptable but potentially slower than HTTP2. Our demo uses Google Cloud Storage, which is HTTP2 by default.

Due to [difficulties](https://github.com/hms-dbmi/viv/issues/103) around compiling shaders on Travis, unit tests and layer lifecycle
tests are run locally as a pre-push hook. Travis runs a test build, linting, and prettier.

### Browser Support

We support both WebGL1 and WebGL2 contexts, which should give near universal coverage. Please file an issue if you find a browser in which we don't work.

### Documentation

Please navigate to [viv.gehlenborglab.org](http://viv.gehlenborglab.org) to see full documenation.
