# Viv [![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv) [![package documenation](https://img.shields.io/badge/package-documentation-blue)](http://viv.gehlenborglab.org)

A WebGL-powered toolkit for interactive visualization of high-resolution, multiplexed bioimaging datasets.

<p align="center">
<img src="https://github.com/hms-dbmi/viv/raw/main/sites/docs/src/3d-slicing.gif" alt="Interactive volumetric view in web browser; sliders control visible planes." width="400"/> <img src="https://github.com/hms-dbmi/viv/raw/main/sites/docs/src/glomerular-lens.png" alt="Multi-channel rendering of high-resolution microscopy dataset" width="400"/>
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
<img src="https://github.com/hms-dbmi/viv/raw/main/sites/docs/src/avivator-browser.png" alt="Avivator viewer running in Chrome"/> | [**Avivator**](http://avivator.gehlenborglab.org) <br> A lightweight viewer for local and remote datasets. The source code is include in this repository under `avivator/`. See our [🎥 video tutorial](https://www.youtube.com/watch?v=_GES8BTzyWc) to learn more.
<img src="https://github.com/hms-dbmi/viv/raw/main/sites/docs/src/vizarr-browser.png" alt="Vizarr viewer running in Jupyter Notebook"/> | [**Vizarr**](https://github.com/hms-dbmi/vizarr) <br> A minimal, purely client-side program for viewing OME-NGFF and other Zarr-based images. Vizarr supports a Python backend using the [imjoy-rpc](https://github.com/imjoy-team/imjoy-rpc), allowing it to not only function as a standalone application but also directly embed in Jupyter or Google Colab Notebooks.

## 💥 In Action

- [Vitessce](http://vitessce.io) visualization framework
- HuBMAP Common Coordination Framework Exploration User Interface ([CCF EUI](https://github.com/hubmapconsortium/ccf-ui))
- OME-Blog [OME-NGFF](https://blog.openmicroscopy.org/file-formats/community/2020/11/04/zarr-data/) and
[OME-NGFF HCS](https://blog.openmicroscopy.org/file-formats/community/2020/12/01/zarr-hcs/) announcements
- ImJoy [I2K Tutorial](https://imjoy.io/docs/#/i2k_tutorial?id=open-integration-with-imjoy)
- Galaxy Project includes Avivator as [default viewer for OME-TIFF files](https://docs.galaxyproject.org/en/release_21.05/releases/21.05_announce_user.html#new-datatypes)
- 10x Genomics uses Viv in their viewer for [Xenium In Situ Analysis Technology](https://www.10xgenomics.com/in-situ-technology): [demo](https://xenium.10xgenomics.com/?image=s3/10x.files/xenium/preview/hbreast/experiment.xenium&z=17&cell_f=true&cell_c=groups)

## 💾 Supported Data Formats

Viv's data loaders support **OME-NGFF** (Zarr), **OME-TIFF**, and **Indexed OME-TIFF**\*.
We recommend converting proprietrary file formats to open standard formats via the
`bioformats2raw` + `raw2ometiff` pipeline. Non-pyramidal datasets are also supported 
provided the individual texture can be uploaded to the GPU (< `4096 x 4096` in pixel size).

Please see the [tutorial](./sites/docs/tutorial/README.md) for more information.

> \*We describe **Indexed OME-TIFF** in our paper as an optional enhancement to provide
> efficient random chunk access for OME-TIFF. Our approach substantially improves chunk
> load times for OME-TIFF datasets with large Z, C, or T dimensions that otherwise may 
> incur long latencies due to seeking. More information on generating an IFD index (JSON) can
> be found in our tutorial or [documentation](http://viv.gehlenborglab.org/#data-preparation).

## 💽 Installation

```bash
$ npm install @hms-dbmi/viv
```

You will also need to install [deck.gl](https://deck.gl) and other `peerDependencies` manually.
This step prevent users from installing multiple versions of deck.gl in their projects.

```bash
$ npm install deck.gl @luma.gl/core
```

Breaking changes may happen on the minor version update.
Please see the [changelog](https://github.com/hms-dbmi/viv/blob/main/packages/main/CHANGELOG.md) for information.

## 📖 Documentation

Detailed API information and example sippets can be found in our [documentation](http://viv.gehlenborglab.org).

## 🏗️  Development

This repo is a monorepo using pnpm workspaces. The package manager used to install and link dependencies _must_ be [`pnpm`](https://pnpm.io/).

Each folder under `packages/` are a published as a separate packages on npm under the `@vivjs` scope. The top-level package `@hms-dbmi/viv` exports from these dependencies.

To develop and test the `@hms-dbmi/viv` package:

1. Run `pnpm install` in `viv` root folder
2. Run `pnpm dev` to start a development server
3. Run `pnpm test` to run all tests (or specific, e.g., `pnpm test --filter=@vivjs/layers`)

## 🛠️  Build

To build viv's documentation and the Avivator website (under `sites/`), run:

```sh
pnpm build # all packages, avivator, and documentation
pnpm -r build --filter=avivator # build a specific package or site
```

## 📄 Sending PRs and making releases

For changes to be reflected in package changelogs, run `npx changeset` and follow the prompts.

> Note not every PR requires a changeset. Since changesets are focused on releases and changelogs, changes to the repository that don't effect these won't need a changeset (e.g., documentation, tests).

The [Changesets GitHub Action](https://github.com/changesets/action) will create and update a PR that applies changesets versions of `@vivjs/` packages to NPM.

## 🌎 Browser Support

Viv supports coverage across Safari, Firefox, Chrome, and Edge. Please [file an issue](https://github.com/hms-dbmi/viv/issues/new) if you find a browser in which Viv does not work.
