# @hms-dbmi/viv

> A WebGL-powered toolkit for interactive visualization of high-resolution, multiplexed bioimaging datasets.

[![npm version](https://badge.fury.io/js/%40hms-dbmi%2Fviv.svg)](https://badge.fury.io/js/%40hms-dbmi%2Fviv) [![package documenation](https://img.shields.io/badge/package-documentation-blue)](http://viv.gehlenborglab.org)

<p align="center">
<img src="https://github.com/hms-dbmi/viv/raw/main/sites/docs/src/3d-slicing.gif" alt="Interactive volumetric view in web browser; sliders control visible planes." width="400"/> <img src="https://github.com/hms-dbmi/viv/raw/master/sites/docs/src/glomerular-lens.png" alt="Multi-channel rendering of high-resolution microscopy dataset" width="400"/>
</p>

## Installation

```sh
npm install @hms-dbmi/viv
```

You will also need to install [deck.gl](https://deck.gl) and other `peerDependencies` manually.
This step prevent users from installing multiple versions of deck.gl in their projects.

```sh
npm install deck.gl @luma.gl/core
```

## Documentation

Detailed API information and example sippets can be found in our [documentation](http://viv.gehlenborglab.org).
