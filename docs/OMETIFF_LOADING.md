`Viv` has the ability to load OME-TIFF files directly through a simple API:

```javascript
import { createOMETiffLoader } from '@hms-dbmi/viv';

const url =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.ome.tif';
const loader = await createOMETiffLoader({ url, offsets: [], headers: {} });
```

A bit is going on under the hood here, though. Here are some of those things:

1. First and foremost, if the `tiff` has many channels, then you will need to provide the offsets to each IFD.  
   The `createOMETiffLoader` takes in a list of offsets via `offsets` so that they can be stored anyhere i.e `https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.offsets.json`. To get this information, you may use [this docker container](https://hub.docker.com/r/hubmap/portal-container-ome-tiff-offsets) and push the output to the url. This is only necessary for remote tiff viewing. If you are using a tiff file locally via local file upload, an `offsets.json` is not necessary.

2. Related to the above, if your `tiff` is a pyramid from `bioformats`, then there are two potential routes:

- `bioformats` recently came out with a new specification that uses the `SubIFD` to store most of the offset information. You should be good with this, but potentially may need to still use the docker contianer if there are a lot of image planes (i.e z, t, and channel stack) in the original data.
- Older `bioformats` pyramids need the above docker container to run properly.

3. We are not experts on the OMEXML format, but we make a reasonable attempt to parse the OMEXML metadata for channel names, z stack size, time stack size etc. Please open a PR against the [`OMEXML`](https://github.com/hms-dbmi/viv/tree/master/src/loaders/omeXML.js) class if it fails for your use case.

4. Viv's data loaders are compatible with modern BioFormats image pyramids produced via the two-step [`bioformats2raw`](https://github.com/glencoesoftware/bioformats2raw) + [`raw2ometiff`](https://github.com/glencoesoftware/raw2ometiff) conversion.
We have [dockerized a workflow](https://hub.docker.com/r/hubmap/portal-container-ome-tiff-tiler) to convert images for HuBMAP Data Portal, but we recommend following [our tutorial](http://viv.gehlenborglab.org/#data-preparation) to get started with your own images.
The tutorial requires `conda` to use the BioFormats software. 
Generating tile offsets for pyramidal OME-TIFF images, `offsets.json`, can be done via [a docker container](https://hub.docker.com/r/hubmap/portal-container-ome-tiff-offsets) or by using the python package [here](https://pypi.org/project/generate-tiff-offsets/).

For example, a dockerized workflow might look like:

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

while a python-based cli workflow might look like:

```shell
conda create --name bioformats python=3.8
conda activate bioformats
conda install -c ome bioformats2raw raw2ometiff
pip install generate-tiff-offsets

bioformats2raw my_tiff_file.tiff n5_tile_directory/
raw2ometiff n5_tile_directory/ my_tiff_file.ome.tiff
generate_tiff_offsets my_tiff_file.ome.tiff
```

Note that if your tiff file is large in neither channel count nor resolution, you can simply load it in `viv` directly without passing in offsets or running this pipeline.
And, if you have a local tiff, the main restriction is your computer's RAM/graphics card - we have not done extensive testing on large WSI local tiffs (i.e non-pyramidal) but image pyramids and large channel counts seem to perform under local usage without `offsets.json`.

Finally we are in the experimental stages of supporting RGB images. Right now we only support de-interleaved images.  
One of the biggest issues we have is lack of (what we know to be) properly formatted sample OME-TIFF data. Please open an issue if this is important to your use-case.
