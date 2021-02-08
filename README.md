# Viv [![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv)

A library for multiscale visualization of high-resolution multiplexed bioimaging data on the web. Directly renders Bio-Formats-compatible Zarr and OME-TIFF.
Written in JavaScript and built on Deck.gl with modern web technologies.

## About

Viv is a JavaScript library providing utilities for rendering primary imaging data. Viv supports WebGL-based multi-channel rendering of both pyramidal and non-pyramidal images. The rendering components of Viv are provided as Deck.gl layers, making it easy to compose images with existing layers and efficiently update rendering properties within a reactive paradigm.

More details can be found in our preprint describing the Viv library and related work. Please cite this preprint in your research:

> Trevor Manz, Ilan Gold, Nathan Heath Patterson, Chuck McCallum, Mark S Keller, Bruce W Herr II, Katy Börner, Jeffrey M Spraggins, Nils Gehlenborg, "[Viv: Multiscale Visualization of High-resolution Multiplexed Bioimaging Data on the Web](https://osf.io/wd2gu/)." **OSF Preprints** (2020), [doi:10.31219/osf.io/wd2gu](https://doi.org/10.31219/osf.io/wd2gu)

### Related Software

- **Avivator** Included in this repository is [`Avivator`](http://avivator.gehlenborglab.org), a lightweight viewer for remote imaging data. Avivator is a purely client-side program that only requires access to [Bio-Formats-compatiable Zarr](./tutorial#option-1-create-a-bio-formats-raw-zarr) or OME-TIFF data over HTTP or on local disk.
- **Vizarr** [Vizarr](https://github.com/hms-dbmi/vizarr) is a minimal, purely client-side program for viewing Zarr-based images built with Viv. It exposes a Python API using the [imjoy-rpc](https://github.com/imjoy-team/imjoy-rpc) and can be directly embedded in Jupyter Notebooks or Google Colab Notebooks.
- **Viv benchmark** A [set of scripts](https://github.com/hms-dbmi/viv-tile-benchmark) to benchmark Viv's retrieval of image tiles from pyramidal OME-TIFF files and Zarr stores via HTTP1 and HTTP2.

### Tools Built with Viv

#### Vitessce
- http://vitessce.io

#### OME-NGFF:
- https://blog.openmicroscopy.org/file-formats/community/2020/11/04/zarr-data/
- https://blog.openmicroscopy.org/file-formats/community/2020/12/01/zarr-hcs/ 

#### ImJoy:
- https://imjoy.io/docs/#/i2k_tutorial?id=open-integration-with-imjoy  

#### Galaxy:
- The Avivator image viewer will be included as the default visualization for OME-TIFF files: https://github.com/galaxyproject/galaxy/pull/10534

#### HuBMAP CCF EUI:
- https://github.com/hubmapconsortium/ccf-ui


## Supported Data Formats

Viv supports a subset of formats that can be generated with the [`bioformats2raw` + `raw2ometiff` pipeline](https://www.glencoesoftware.com/blog/2019/12/09/converting-whole-slide-images-to-OME-TIFF.html):

- OME-TIFF files (pyramidal)
- Bioformats-compatible Zarr stores (pyramidal)

For OME-TIFF, Viv supports any pyramid that implements the [OME design spec for TIFF pyramids](https://ome.github.io/design/OME005/)(which the `bioformats2raw` + `raw2ometiff` pipeline provides).
Non-pyramidal images are also supported provided the individual texture can be uploaded to the GPU (< `4096 x 4096` in pixel size).

Please see the [tutorial](./tutorial/README.md) for more information on these formats.

### Data Preparation

Initial load time for OME-TIFFs can be optimized by generating a special `offsets.json` file containing byte offsets for the associated binary data. For more information, see the [documentation](http://viv.gehlenborglab.org/#data-preparation).

## Installation

```bash
$ npm install @hms-dbmi/viv
```

## Development

```bash
$ git clone https://github.com/hms-dbmi/viv.git
$ cd viv && npm install # install deps for viv library
$ npm run install:avivator # install deps for avivator app
$ npm start # Starts rollup build (for Viv) & dev server for Avivator
```

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html) for your preferred editor. Badly formatted code will fail on Travis.

To run unit and integration tests locally, use `npm test`. For full prodcution test (including linting and formatting checks),
use `npm run test:prod`.

## Build

- `@hms-dbmi/viv` library: `npm run build`
- `Avivator` viewer: `npm run build:avivator`

## Publish

To bump the version number, clean up/update the CHANGELOG.md, and push the tag to Github,
please run `npm version [major | minor | patch]` depending on which you want. Then run `./publish.sh` to publish the package/demo.

## Browser Support

We support both [WebGL1](https://caniuse.com/?search=webgl) and [WebGL2](https://caniuse.com/?search=webgl2) contexts, which provides near universal coverage across Safari, Firefox, Chrome, and Edge. Please [file an issue](https://github.com/hms-dbmi/viv/issues/new) if you find a browser in which Viv does not work.

## Documentation

Please navigate to [viv.gehlenborglab.org](http://viv.gehlenborglab.org) to see the full documenation.
