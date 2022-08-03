This guide demonstrates how to generate a pyramidal OME-TIFF [with Bio-Formats](https://www.glencoesoftware.com/blog/2019/12/09/converting-whole-slide-images-to-OME-TIFF.html) that can be viewed with
[Avivator](http://avivator.gehlenborglab.org). Viv also supports [OME-NGFF](https://github.com/ome/ngff), but tooling to generate the format remains limited as the specification matures. We will update this tutorial accordingly when a method for generating OME-NGFF is endorsed by the Open Microscopy Environment.

### Getting Started

> NOTE: If you wish to view an image located on a remote machine accessible via SSH, please see the note at the end of this document.

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

### Pyramid Generation

First use `bioformats2raw` to convert the `.qptiff` format to an intermediate "raw" format. This representation includes the multiscale binary pixel data (Zarr) and associated OME-XML metadata.

```bash
$ bioformats2raw LuCa-7color_Scan1.qptiff LuCa-7color_Scan1/
```

The next step is to convert this "raw" output to an OME-TIFF.

```bash
raw2ometiff LuCa-7color_Scan1/ LuCa-7color_Scan.ome.tif
```

> Note: `LZW` is the default if you do not specify a `--compression` option (the syntax requires an "=" sign, like `--compression=zlib`).

You may also use [`bfconvert` (Bioformats >= 6.0.0)](https://docs.openmicroscopy.org/bio-formats/6.4.0/users/comlinetools/conversion.html) to generate an OME-TIFF.

```bash
$ bfconvert -tilex 512 -tiley 512 -pyramid-resolutions 6 -pyramid-scale 2  -compression LZW LuCa-7color_Scan1.qptiff LuCa-7color_Scan1.ome.tif
```

All the above arguments are necessary except for `-compression` which is optional (default uncompressed). In order for an image to be compatible with Viv:

- `-pyramid-scale` must be 2
- `-tilex` must equal `-tiley` (ideally a power of 2)
- `-pyramid-resolutions` must be computed using the image dimensions and tile size. For example, for a `4096 x 4096` with tile size of `512`, `3 = log2(ceil(4096 / 512))` resolutions should work well.
  a power of 2), and the `-pyramid-resolutions` argument should be adjusted to match the size of your image and your choice of tile size.
  For example, if you have a `4096 x 4096` and tile size of `512`, `3 = log2(ceil(4096 / 512))` resolutions should work well.
  For the `LuCa-7color_Scan1.qptiff` image, `6 = max(log2(ceil(12480 / 512)), log2(ceil(17280 / 512)))` resolutions work best as the image is `12480 x 17280` in size.
  There is currently [no "auto" feature for inferring the number of pyramid resolutions](https://github.com/ome/bioformats/issues/3644).
  Without the compression set, i.e `-compression LZW`, the output image will be uncompressed.

There is a [2GB limit on the total amount of data](https://docs.openmicroscopy.org/bio-formats/6.4.0/about/bug-reporting.html#common-issues-to-check) that may be read into memory for the `bfconvert` cli tool.
Therefore for larger images, please use `bioformats2raw + raw2ometiff`.

> NOTE: Viv currently uses [`geotiff.js`](https://geotiffjs.github.io/) for accessing data from remote TIFFs
> over HTTP and support the three lossless compression options supported
> by `raw2ometiff` - `LZW`, `zlib`, and `Uncompressed` as well as `jpeg` compression for 8 bit data. Support
> for JPEG-2000 for >8 bit data is planned. Please open an issue if you would like this more immediately.

### Indexed OME-TIFF

The TIFF file format is not designed for the cloud, and therefore certain images are less suitable to be natively read remotely. If your OME-TIFF image contains large non-XY dimensions (e.g. Z=100, T=50), you are likely to experience latencies when switching planes in Avivator due to seeking the file over HTTP. We recommend generating an index (`offsets.json`) that contains the byte-offsets for each plane to complement OME-TIFF, solving this latency issue and enabling fast interactions.

```bash
$ pip install generate-tiff-offsets
$ generate_tiff_offsets --input_file Luca-7color_Scan1.ome.tif
```

Alternatively you may use our [web application](https://hms-dbmi.github.io/generate-tiff-offsets) for generating the offsets.

> ⚠️ IMPORTANT ⚠️
> Avivator requires the `offsets.json` file to be adjacent to the OME-TIFF on the server in order to leverage this feature. For example, if an index is generated for the dataset in this tutorial, the following directory structure is correct:

```
data
├── LuCa-7color_Scan1.offsets.json
└── LuCa-7color_Scan1.ome.tif
```

This index can be reused by other Viv-based applications and even clients in other languages to improve remote OME-TIFF performance. If using Viv, you must fetch the offsets.json directly in your application code. See [our example](http://viv.gehlenborglab.org/#getting-started) for help getting started

### Viewing in Avivator

> ⚠️ Warning ⚠️ This section only works in Chrome, Firefox, and Edge (not Safari) due to differences in how browser restrict websites hosted at `https://` URLs (Avivator) from issuing requests to `http://` (the local data server) as a security measure. The supported browsers allow requests to `http://` from `https://` under the special case of `localhost`, whereas Safari prevents all requests to `http://`. As a workaround, you can start an Avivator client at `http://`, but we suggest trying a different supported browser. Alternatively, you can drag-and-drop an image (no local server) into the viewer in any browser.

There are a few different ways to view your data in Avivator.

If you have an OME-TIFF saved locally, you may simply drag and drop
the file over the canvas or use the "Choose file" button to view your data.

Otherwise Avivator relies on access to data over HTTP, and you can serve data locally using a simple web-server.
It's easiest to use [`http-server`](https://github.com/http-party/http-server#readme) to start a web-server locally, which can be installed via `npm` or `Homebrew` if using a Mac.

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
open [Avivator] and paste `http://localhost:8000/LuCa-7color_Scan1.ome.tif`
into the input dialog to view the OME-TIFF generated in this tutorial. For convenience, you can also create a direct
link by appending an `image_url` query parameter:

- http://avivator.gehlenborglab.org/?image_url=http://localhost:8000/LuCa-7color_Scan1.ome.tif (OME-TIFF)

> Troubleshooting: Viv relies on cross-origin requests to retrieve data from servers. The `--cors='*'` flag is important to ensure
> that the appropriate `Access-Control-Allow-Origin` response is sent from your local server. In addition, web servers must allow
> [HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) to support viewing OME-TIFF images.
> Range requests are allowed by default by `http-server` but may need to be enabled explicitly for your production web server.

#### Viewing an Image via SSH

It is possible to generate the datasets in this tutorial on a remote machine and view them in Avivator via SSH and port forwarding.
For example, you can follow this tutorial on a remote machine within SHH, linking your local port `12345` to the remote's local `8000`.

```bash
$ ssh -L 12345:localhost:8000 <username>@<serverhost> # setup secure shell, link ports
# ... follow tutorial within secure shell, starting http-server on port 8000
```

Since your local port `12345` is linked to the remote `8000` via SSH, you can now view the remote dataset locally via your `localhost:12345` in Avivator: that is, you paste http://avivator.gehlenborglab.org/?image_url=http://localhost:12345/LuCa-7color_Scan1.ome.tif into your browser instead of http://avivator.gehlenborglab.org/?image_url=http://localhost:8000/LuCa-7color_Scan1.ome.tif as is written at the end of the tutorial.

### Other Examples

Other sample OME-TIFF data can be downloaded from [OME-TIFF sample data](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/data.html)
provided by OME and viewed with Viv locally (without needing to run Bio-Formats).

- [MitoCheck](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/data.html#mitocheck)
- [Artificial Datasets](https://docs.openmicroscopy.org/ome-model/5.6.3/ome-tiff/data.html#artificial-datasets)

[avivator]: http://avivator.gehlenborglab.org
