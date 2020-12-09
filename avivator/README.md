# Avivator

Avivator is a lightweight "batteries-included" WebGL viewer for remote imaging data, built around Viv. A hosted instance of Avivator can be accessed at  [avivator.gehlenborglab.org]( avivator.gehlenborglab.org ).

## Development system requirements

Avivator has been tested with the following dependency versions:
- Operating system: macOS 10.15.5
- NodeJS 14.0.0
- NPM 6.14.4
- Zsh 5.7.1
- one of:
    - Firefox Developer Edition 84.0b8
    - Firefox 80.0.1 (and later)
    - Safari 13.1.1 (and later)
    - Google Chrome 87.0.4280.88


## Development installation guide

To install Avivator, run the following commands in a `zsh` or `bash` shell in the `avivator/` directory.

First, install the NPM dependencies for Viv (typical time: 29.63 seconds):

```sh
cd .. && npm install && cd -
```

Install the NPM dependencies for Avivator (typical time: 22.78 seconds):

```sh
npm install
```

Build the Viv dependency (typical time: 2.84 seconds):

```sh
npm run prebuild
```

## Demo

To start the demo, run the development server (typical time: 3.53 seconds):

```sh
npm run start
```

To view the demo, navigate to `http://localhost:8080` in your web browser.
If the demo has been built successfully, the demo site will contain a visualization of a microscopy image and a controller for manipulating channel settings of the image.

## Instructions for use

To use Avivator to visualize your own imaging data, use the URL input in the web application to provide a URL to an OME-TIFF/Bioformats-Zarr.

To learn more about working with OME-TIFF files or Bioformats-Zarr stores, please visit the [tutorial](../tutorial/README.md).
