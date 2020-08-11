`Viv` has the ability to load OME-TIFF files directly through a simple API:

```javascript
import { createOMETiffLoader } from '@hms-dbmi/viv';

const url =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.ome.tif';
const loader = await createOMETiffLoader({ url, offsets: [], headers: {} });
```

A bit is going on under the hood here, though. Here are some of those things:

1. First and foremost, if the `tiff` has many channels, then you will need to provide the offsets to each IFD.  
   The `createOMETiffLoader` takes in a list of offsets via `offsets` so that they can be stored anyhere i.e `https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.offsets.json`. To get this information, you may use [this docker container](https://hub.docker.com/r/hubmap/portal-container-ome-tiff-offsets) and push the output to the url.

2. Related to the above, if your `tiff` is a pyramid from `bioformats`, then there are two potential routes:

- `bioformats` recently came out with a new specification that uses the `SubIFD` to store most of the offset information. You should be good with this, but potentially may need to still use the docker contianer if there are a lot of image planes (i.e z, t, and channel stack) in the original data.
- Older `bioformats` pyramids need the above docker container to run properly.

3. We are not experts on the OMEXML format, but we make a reasonable attempt to parse the OMEXML metadata for channel names, z stack size, time stack size etc. Please open a PR against the [`OMEXML`](https://github.com/hms-dbmi/viv/tree/master/src/loaders/omeXML.js) class if it fails for your use case.

4. If you are interested in generating your own image pyramids, we use the new `bioformats` image pyramid from [here](https://github.com/glencoesoftware/bioformats2raw) and [here](https://github.com/glencoesoftware/raw2ometiff) - we have [this docker container](https://hub.docker.com/r/hubmap/portal-container-ome-tiff-tiler) for that purpose. Both `viv` and this new `bioformats` software are under development, so there will likely be tweaks and changes as time goes on, but the current implementation-pairing should be stable (it currently backs the public OME-TIFF demo as well as one of the not-public ones). Additionally, the intermediary `n5` format can be quickly ported to `zarr` for analysis locally. Please use `zlib` as `LZW` is not great on the browser, it seems. If you need `LZW` please open an issue. Here is a snippet to help get you started if you have a folder `/my/path/test-input/` containing OME-TIFF files:

```shell
# Pull docker images
docker pull hubmap/portal-container-ome-tiff-offsets:0.0.3
docker pull hubmap/portal-container-ome-tiff-tiler:0.0.3

# Run docker images
# For images that have large z/t/channel stack combinations.
docker run \
    --name offsets \
    --mount type=bind,source=/my/path/test-input/,target=/input \
    --mount type=bind,source=/my/path/test-output/,target=/output \
    hubmap/portal-container-ome-tiff-offsets:0.0.3
# For large resolution images, to be downsampled and tiled.
docker run \
    --name tiler \
    --mount type=bind,source=/my/path/test-input/,target=/input \
    --mount type=bind,source=/my/path/test-output/,target=/output \
    hubmap/portal-container-ome-tiff-tiler:0.0.3

# Push output to the cloud
gsutil -m cp -r /my/path/test-output/ gs://my/path/test-output/
```

Note that if your tiff file is large in neither channel count nor resolution, you can simply load it in `viv` directly without passing in offsets or running this pipeline.

Finally we are in the experimental stages of supporting RGB images. Right now we only support de-interleaved images.  
One of the biggest issues we have is lack of (what we know to be) properly formatted sample OME-TIFF data. Please open an issue if this is important to your use-case.
