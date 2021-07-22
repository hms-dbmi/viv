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


## Development guide

Avivator is developed alongside the Viv codebase. To develop Avivator, clone
the Viv repository and run the following commands in a `zsh` or `bash` shell:

```sh
git clone https://github.com/hms-dbmi/viv.git && cd viv
npm install # installs dependencies for both viv and avivator
npm start
```


This command starts a live development server. Navigate to `http://localhost:3000`
in your web browser to view the site. You may edit the contents of `src/` (Viv codebase) 
or `avivator/`, and the changes should be applied automatically.

## Production build

You may build a static production build of Avivator with the following:

```sh
npm run build:avivator
```

which outputs the final build in `avivator/dist`. This directory can be deployed as
static site in production.

## Instructions for use

To use Avivator to visualize your own imaging data, use the URL input in the web application to provide a URL to an OME-TIFF/Bioformats-Zarr.

To learn more about working with OME-TIFF files or Bioformats-Zarr stores, please visit the [tutorial](../tutorial/README.md).
