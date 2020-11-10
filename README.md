# Viv [![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv)

A library for multiscale visualization of high-resolution multiplexed tissue data on the web. Directly renders Bio-Formats-compatible Zarr and OME-TIFF.
Written in JavaScript and built on Deck.gl with modern web technologies.

## Installation

```bash
$ npm install @hms-dbmi/viv
```

## About

Viv is a JavaScript library providing utilities for rendering primary imaging data. Viv supports WebGL-based multi-channel rendering of both pyramidal and non-pyramidal images. The rendering components of Viv are provided as Deck.gl layers, making it easy to compose images with existing layers and efficiently update rendering properties within a reactive paradigm. 

More details can be found in our preprint describing the Viv library and related work. Please cite this preprint in your research:

> Trevor Manz, Ilan Gold, Nathan Heath Patterson, Chuck McCallum, Mark S Keller, Bruce W Herr II, Katy Börner, Jeffrey M Spraggins, Nils Gehlenborg, "Viv: Multiscale Visualization of High-resolution Multiplexed Tissue Data on the Web." **OSF Preprints** (2020), [doi:10.31219/osf.io/wd2gu](https://doi.org/10.31219/osf.io/wd2gu)

## Avivator

Also included in this repository is [`Avivator`](http://avivator.gehlenborglab.org), a lightweight "batteries-included" 
WebGL viewer for remote imaging data. Avivator is a purely client-side program that only requires access to
Bio-Formats "raw" Zarr or OME-TIFF data over HTTP. To use Avivator with your own data, please see the data preparation 
[tutorial](tutorial/README.md). Initial load time for OME-TIFFs can be optimized by generating a special `offsets.json`
file containing byte offsets for the associated binary data. For more information, see the 
[documentation](http://viv.gehlenborglab.org/#data-preparation).



## Development

```bash
$ git clone https://github.com/hms-dbmi/viv.git
$ cd viv && npm install # install deps for viv library
$ npm run install:avivator # install deps for avivator app
$ npm start # Starts rollup build (for Viv) & dev server for Avivator
```

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html) for your preferred editor. 
(Badly formatted code will fail on Travis.)

To run unit and integration tests locally, use `npm test`. For full prodcution test (including linting and formatting checks), 
use `npm run test:prod`.

## Build

- `@hms-dbmi/viv` library: `npm run build`
- `Avivator` viewer: `npm run build:avivator`

## Publish

To bump the version number, clean up/update the CHANGELOG.md, and push the tag to Github,
please run `npm version [major | minor | patch]` depending on which you want. Then run `./publish.sh` to publish the package/demo.

## Browser Support

We support both WebGL1 and WebGL2 contexts, which should give near universal coverage. Please file an issue if you find a browser in which we don't work.

## Documentation

Please navigate to [viv.gehlenborglab.org](http://viv.gehlenborglab.org) to see full documenation.
