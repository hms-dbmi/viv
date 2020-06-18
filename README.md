### vitessce-image-viewer ("Viv") [![npm version](https://badge.fury.io/js/%40hubmap%2Fvitessce-image-viewer.svg)](https://badge.fury.io/js/%40hubmap%2Fvitessce-image-viewer)

A viewer for high bit depth, high resolution, multi-channel images using DeckGL
over the hood and WebGL under the hood. To learn more about the "theory" behind
this, look at [this](https://github.com/hubmapconsortium/vitessce-image-viewer/blob/master/docs/IMAGE_RENDERING.md).

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
`demo/src/App.js` to visually test.

HTTP is acceptable but potentially slower than HTTP2. Our demo uses Google Cloud Storage, which is HTTP2 by default.

Due to [difficulties](https://github.com/hubmapconsortium/vitessce-image-viewer/issues/103) around compiling shaders on Travis, unit tests and layer lifecycle
tests are run locally as a pre-push hook. Travis runs a test build, linting, and prettier.

### Browser Support

We support both WebGL1 and WebGL2 contexts, which should give near universal coverage. Please file an issue if you find a browser in which we don't work.

### Documentation

Please navigate to [viv.vitessce.io/docs](http://viv.vitessce.io/docs) to see full documenation.
