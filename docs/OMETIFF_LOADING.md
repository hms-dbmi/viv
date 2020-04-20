### OME-TIFF Loading

Viv has the ability to load OME-TIFF files directly through a simple API:

```javascript
import { createOMETiffLoader } from '@hubmap/vitessce-image-viewer';

const url =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.ome.tif';
const loader = await createOMETiffLoader({ url, noThreads: false });
```

A bit is going on under the hood here, though. Here are some of those things:

1. First and foremost, if the `tiff` has many channels, then you will need to provide the offsets to each IFD.  
   The `createOMETiffLoader` function is very opinionated and expects to find them at the same url as the `tiff` except that `ome.tiff` is replaced by `offsets.json` i.e `https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.offsets.json`. To get this information, you may use [this docker container](https://hub.docker.com/r/hubmap/portal-container-ome-tiff-offsets) and push the output to the url.

2. Related to the above, if your `tiff` is a pyramid from `bioformats`, then there are two potential routes:

- `bioformats` recently came out with a new specification that uses the `SubIFD` to store most of the offset information. You should be good with this, but potentially may need to still use the docker contianer if there are a lot of image planes (i.e z, t, and channel stack) in the original data.
- Older `bioformats` pyramids need the above docker container to run properly.

3. We are not experts on the OMEXML format, but we make a reasonable attempt to parse the OMEXML metadata for channel names, z stack size, time stack size etc. Please open a PR against the [`OMEXML`](https://github.com/hubmapconsortium/vitessce-image-viewer/tree/master/src/loaders/omeXML.js) class if it fails for your use case.

4. If you are interested in generating your own image pyramids, we use the new `bioformats` image pyramid from [here](https://github.com/glencoesoftware/bioformats2raw) and [here](https://github.com/glencoesoftware/raw2ometiff) via something like the below. We have not deployed this yet - we will be bringing a docker container for this soon as well. Additionally, the intermediary `n5` format can be quickly ported to `zarr` for analysis locally. Please use `zlib` as `LZW` is not great on the browser, it seems. If you need `LZW` please open an issue.

```shell
bioformats2raw input.ome.tif output.n5 --resolutions $REASONABLE_RESOLUTION --tile_width 512 --tile_height 512
raw2ometiff output.n5 output.ome.tif --compression=zlib
```

A final note: Viv uses [geotiff.js](https://github.com/geotiffjs/geotiff.js) for fetching data. It a great package and is very fast, thanks to its use of web workers via [threads.js](https://github.com/andywer/threads.js). However, this means that your application needs to handle this as it entails code splitting. Anecdotally, this should work out of the box (more-or-less) with [parcel](https://github.com/parcel-bundler/parcel) and via the [threads-plugin](https://github.com/andywer/threads-plugin) for webpack (which is what the demo uses). If you don't want to use threads, use the `noThreads` uption in `createOMETiffLoader` or pass in a funtion that can parse a file directory of a tiff page and implements `.decode` for the found compression to the `OMETiffLoader` (coming soon: this hopefully will be exported from `geotiff` - we are currently on a fork).
