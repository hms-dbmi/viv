Viv supports a subset of the files generated from the `bioformats2raw` + `raw2ometiff` pipeline, described
[here](https://www.glencoesoftware.com/blog/2019/12/09/converting-whole-slide-images-to-OME-TIFF.html).
This guide demonstrates how to generate a pyramidal Zarr or OME-TIFF with Bio-Formats that can be viewed with
[Avivator](http://avivator.gehlenborglab.org) via HTTP.

### Getting Started

This tutorial requires Bio-Formats [`bioformats2raw`](https://github.com/glencoesoftware/bioformats2raw) and
[`raw2ometiff`](https://github.com/glencoesoftware/raw2ometiff) command-line tools. It's easiest to install
these tools using [`conda`](https://docs.conda.io/projects/conda/en/latest/user-guide/install/), but
binaries also are available for download on the corresponding github repositories.

```bash
$ conda create --name bioformats python=3.8
$ conda activate bioformats
$ conda install -c ome bioformats2raw raw2ometiff
```

### Input data

Bio-Formats is an incredibly valuable toolkit and supports reading over
[150 file formats](https://docs.openmicroscopy.org/bio-formats/6.5.1/supported-formats.html). You can choose
one of your own images, but for the purposes of this tutorial, we will use a multiplexed, high-resolution
[Perkin Elmer](https://downloads.openmicroscopy.org/images/Vectra-QPTIFF/perkinelmer/) (1.95 GB) image made available
under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) on OME.

```bash
$ wget https://downloads.openmicroscopy.org/images/Vectra-QPTIFF/perkinelmer/PKI_scans/LuCa-7color_Scan1.qptiff
```

After the image has finished downloading, there are two options for creating an Avivator/Viv-compliant image.

### Pyramid Generation

#### Option 1: Create a Bio-Formats "raw" Zarr

The first option is to use `bioformats2raw` with `--file_type=zarr`. The default "raw" file type is currently
[n5](https://github.com/saalfeldlab/n5), so the flag is required to generate the Zarr-based output. This command will
create the OME-XML metadata along with a pyramidal Zarr for high-resolution images.

```bash
$ bioformats2raw LuCa-7color_Scan1.qptiff LuCa-7color_Scan1/ --file_type=zarr
```

`bioformats2raw` creates the file directory `LuCa-7color_Scan1/` which contains the "raw" bioformats output. The root directory
contains a `METADATA.ome.xml` file along with a `data.zarr/` directory containing the Zarr
output. This output can be viewed directly with [Avivator] by serving the top-level directory (`LuCa-7color_Scan1/`)
over HTTP ([see below](#viewing-in-avivator)).

> NOTE: Alternate tile dimensions can be specified with the `--tile_width` and `--tile_height` options.
> In our experience, tile sizes of 512x512 and 1024x1024 (default) work well. Viv can only handle square tiles. For more information
> see the [docs](https://github.com/glencoesoftware/bioformats2raw#performance).

#### Option 2: Create an OME-TIFF

The second option is to run the complete Bio-Formats pipeline to generate a valid OME-TIFF.

```bash
$ bioformats2raw LuCa-7color_Scan1.qptiff n5_tile_directory/
$ raw2ometiff n5_tile_directory/ LuCa-7color_Scan1.ome.tif
```

> NOTE: Viv currently uses [`geotiff.js`](https://geotiffjs.github.io/) for accessing data from remote TIFFs
> over HTTP and support the three lossless compression options supported
> by `raw2ometiff` - `LZW`, `zlib`, and `Uncompressed`. `LZW` is the default if you
> do not specify a `--compression` option (the syntax requires an "=" sign, like `--compression=zlib`).

### Viewing in Avivator

There are a few different ways to view your data in Avivator.

If you have an OME-TIFF or Bio-Formats "raw" Zarr output saved locally, you may simply drag and drop 
the file (or directory) over the canvas or use the "Choose file" button to view your data.
Note that this action does **NOT** necessarily load the entire dataset into memory. Viv still works as normal and will retrieve data tiles based on the viewport for an image pyramid and/or a specific channel/z/time selection. 

If you followed **Option 1** above, you may drag and drop the `LuCa-7color_Scan1/` directory created via `bioformats2raw`
into Avivator. If you followed **Option 2**, simply select the `LuCa-7color_Scan1.ome.tif` to view in Avivator.

> NOTE: Large Zarr-based image pyramids may take a bit longer to load initially using this method. We recommend using a simple web 
> server (see below) if you experience issues with Zarr loading times. Additionally, support for drag-and-drop for Zarr-based 
> images is only currently supported in Chrome, Firefox, and Microsoft Edge. If using Safari, please use a web-server.

Otherwise Avivator relies on access to data over HTTP, and you can serve data locally using a simple web-server. 
It's easiest to use [`http-server`](https://github.com/http-party/http-server#readme) to start a web-server locally, which can be installed via `npm` or `Homebrew` if using a Mac.

> NOTE: If your OME-TIFF image has many [TIFF IFDs](https://en.wikipedia.org/wiki/TIFF#Multiple_subfiles), which correspond to indvidual time-z-channel sub-images, please generate an `offsets.json` file as well for remote HTTP viewing.
> This file contains the byte offsets to each IFD and allows fast interaction with remote data:
> ```bash
> $ pip install generate-tiff-offsets
> $ generate_tiff_offsets --input_file my_tiff_file.ome.tiff
> ```
> For viewing in Avivator, this file should live adjacent to the OME-TIFF file in its folder and will be automatically recognized and used.
> For use with Viv's loaders/layers, you need to fetch the `offsets.json` and pass it in as an argument to the [loader](http://viv.gehlenborglab.org/#createometiffloader).
> Please see [this sample](http://viv.gehlenborglab.org/#getting-started) for help getting started.

#### Install `http-server`

```bash
$ npm install --global http-server
# or
$ brew install http-server
```

#### Starting a Server

From within this directory, start a local server and open [Avivator] in your browser.

```bash
$ http-server --cors='*' --port 8000 .
```

This command starts a web-server and makes the content in the current directory readable over HTTP. Once the server is running,
open [Avivator] and paste `http://localhost:8000/LuCa-7color_Scan1/` (Zarr) or `http://localhost:8000/LuCa-7color_Scan1.ome.tif`
(OME-TIFF) into the input dialog to view the respective pyramids generated above. For convenience, you can also create a direct
link by appending an `image_url` query parameter:

- http://avivator.gehlenborglab.org/?image_url=http://localhost:8000/LuCa-7color_Scan1/ (Zarr)
- http://avivator.gehlenborglab.org/?image_url=http://localhost:8000/LuCa-7color_Scan1.ome.tif (OME-TIFF)

> Troubleshooting: Viv relies on cross-origin requests to retrieve data from servers. The `--cors='*'` flag is important to ensure
> that the appropriate `Access-Control-Allow-Origin` response is sent from your local server.  In addition, web servers must allow
> [HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) to support viewing OME-TIFF images.
> Range requests are allowed by default by `http-server` but may need to be enabled explicitly for your production web server.

### Final Note on File Formats and OME-Zarr

The Glencoe software and OME teams hava been clear that the "raw" N5/Zarr formats produced by `bioformats2raw` should be considered
experimental for the time being as intermediates for generating valid OME-TIFFs. Therefore `Option 1` is not as stable as `Option 2`
for generating images for Avivator/Viv.

However, there is activate community development for a next generation file format (NGFF) called
[OME-Zarr](https://github.com/ome/omero-ms-zarr/blob/master/spec.md), which can be produced in part by
running `bioformats2raw --file_type=zarr --dimension-order='XYZCT'`. This will generate a valid multiscale Zarr
which is compatible with OME-Zarr, but is missing some metadata within the Zarr hierarchy.

Aviviator can view the "raw" output as described above, and the _same_ multiscale pyramid can also be viewed
in desktop analysis tools like [`napari`](https://github.com/napari/napari).

### Other Examples

Other sample OME-TIFF data can be downloaded from [OME-TIFF sample data](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/data.html)
provided by OME and viewed with Viv locally (without needing to run Bio-Formats).

- [MitoCheck](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/data.html#mitocheck)
- [Artificial Datasets](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/data.html#artificial-datasets)

[avivator]: http://avivator.gehlenborglab.org
