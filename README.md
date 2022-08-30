# Viv [![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv) [![package documenation](https://img.shields.io/badge/package-documentation-blue)](http://viv.gehlenborglab.org)

A WebGL-powered toolkit for interactive visualization of high-resolution, multiplexed bioimaging datasets.

<p align="center">
<img src="https://github.com/hms-dbmi/viv/raw/master/docs/3d-slicing.gif" alt="Interactive volumetric view in web browser; sliders control visible planes." width="400"/> <img src="https://github.com/hms-dbmi/viv/raw/master/docs/glomerular-lens.png" alt="Multi-channel rendering of high-resolution microscopy dataset" width="400"/>
</p>

## About

Viv is a JavaScript library for rendering OME-TIFF and OME-NGFF (Zarr) directly in the browser.
The rendering components of Viv are packaged as [deck.gl](https://deck.gl) layers, making it
easy to compose with [existing layers](https://deck.gl/docs/api-reference/layers)
to create rich interactive visualizations.

More details and related work can be found in our paper and original [preprint](https://osf.io/wd2gu/). Please cite our paper in your research:

> Trevor Manz, Ilan Gold, Nathan Heath Patterson, Chuck McCallum, Mark S Keller, Bruce W Herr II, Katy Börner, Jeffrey M Spraggins, Nils Gehlenborg,
> "[Viv: multiscale visualization of high-resolution multiplexed bioimaging data on the web](https://www.nature.com/articles/s41592-022-01482-7)."
> **Nature Methods** (2022), [doi:10.31219/10.1038/s41592-022-01482-7](https://doi.org/10.1038/s41592-022-01482-7)

## 💻 Related Software

| Screenshot   |     Description    |
:-------------------------:|:-------------------------:
<img src="https://github.com/hms-dbmi/viv/raw/master/docs/avivator-browser.png" alt="Avivator viewer running in Chrome"/> | [**Avivator**](http://avivator.gehlenborglab.org) <br> A lightweight viewer for local and remote datasets. The source code is include in this repository under `avivator/`. See our [🎥 video tutorial](https://www.youtube.com/watch?v=_GES8BTzyWc) to learn more.
<img src="https://github.com/hms-dbmi/viv/raw/master/docs/vizarr-browser.png" alt="Vizarr viewer running in Jupyter Notebook"/> | [**Vizarr**](https://github.com/hms-dbmi/vizarr) <br> A minimal, purely client-side program for viewing OME-NGFF and other Zarr-based images. Vizarr supports a Python backend using the [imjoy-rpc](https://github.com/imjoy-team/imjoy-rpc), allowing it to not only function as a standalone application but also directly embed in Jupyter or Google Colab Notebooks.

## 💥 In Action

- [Vitessce](http://vitessce.io) visualization framework
- HuBMAP Common Coordination Framework Exploration User Interface ([CCF EUI](https://github.com/hubmapconsortium/ccf-ui))
- OME-Blog [OME-NGFF](https://blog.openmicroscopy.org/file-formats/community/2020/11/04/zarr-data/) and
[OME-NGFF HCS](https://blog.openmicroscopy.org/file-formats/community/2020/12/01/zarr-hcs/) announcements
- ImJoy [I2K Tutorial](https://imjoy.io/docs/#/i2k_tutorial?id=open-integration-with-imjoy)
- Galaxy Project includes Avivator as [default viewer for OME-TIFF files](https://docs.galaxyproject.org/en/release_21.05/releases/21.05_announce_user.html#new-datatypes)

## 💾 Supported Data Formats

Viv's data loaders support **OME-NGFF** (Zarr), **OME-TIFF**, and **Indexed OME-TIFF**\*.
We recommend converting proprietrary file formats to open standard formats via the
`bioformats2raw` + `raw2ometiff` pipeline. Non-pyramidal datasets are also supported 
provided the individual texture can be uploaded to the GPU (< `4096 x 4096` in pixel size).

Please see the [tutorial](./tutorial/README.md) for more information.

> \*We describe **Indexed OME-TIFF** in our paper as an optional enhancement to provide
> efficient random chunk access for OME-TIFF. Our approach substantially improves chunk
> load times for OME-TIFF datasets with large Z, C, or T dimensions that otherwise may 
> incur long latencies due to seeking. More information on generating an IFD index (JSON) can
> be found in our tutorial or [documentation](http://viv.gehlenborglab.org/#data-preparation).

## 💽 Installation

```bash
$ npm install @labshare/viv
```

You will also need to install [deck.gl](https://deck.gl) and other `peerDependencies` manually.
This step prevent users from installing multiple versions of deck.gl in their projects.

```bash
$ npm install deck.gl @luma.gl/core
```

Breaking changes may happen on the minor version update.
Please see the [changelog](https://github.com/hms-dbmi/viv/blob/master/CHANGELOG.md) for information.

## 📖 Documentation

Detailed API information and example sippets can be found in our [documentation](http://viv.gehlenborglab.org).

## 🏗️  Development

```bash
$ git clone https://github.com/hms-dbmi/viv.git
$ cd viv && npm install
$ npm start
```

Please install the [Prettier plug-in](https://prettier.io/docs/en/editors.html) for your
preferred editor. Badly formatted code will fail in our CI. 

To run unit and integration tests locally, use `npm test`. Our full production test suite,
including linting and formatting, is run via `npm run test:prod`.

To our knowledge, Viv can be developed with Node version greater than 10. You can check which
current versions are tested in our CI by naviating to our
[Github Workflow](https://github.com/hms-dbmi/viv/blob/master/.github/workflows/test.yml#L31).

## 🛠️  Build

- `@labshare/viv` library: `npm run build`
- `Avivator` viewer: `npm run build:avivator`

## 📄 Publish

First checkout a new branch like `release/version`. Update the `CHANGELOG.md` and bump
the version via `npm verion [major | minor | patch]`. Commit locally and push a tag to Github. 
Next, run `./publish.sh` to release the package on npm and publish Avivator.
Finally, make a PR for `release/version` and squash + merge into `master`.

## 🌎 Browser Support

Viv supports both [WebGL1](https://caniuse.com/?search=webgl) and [WebGL2](https://caniuse.com/?search=webgl2) 
contexts, to provides coverage across Safari, Firefox, Chrome, and Edge. Please
[file an issue](https://github.com/hms-dbmi/viv/issues/new) if you find a browser
in which Viv does not work.
