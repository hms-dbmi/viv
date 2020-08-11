Here are two snippets to help get you started with our higher-level viewer components. More comprehensive usage of the higher-level components can be found in the `Avivator` [source](https://github.com/hms-dbmi/viv/blob/master/avivator/src/Avivator.js). Otherwise please look at Viv's [source](https://github.com/hms-dbmi/viv/tree/master/src) for building your own components with custom `VivViews` or custom `Deck.gl` layers.

This snippet is the most basic view: a simple view of the data. With `overviewOn=false`, this will just be a single view of the data. Turn `overviewOn=true` for a picture-in-picture.

We also export `DTYPE_VALUES` and `MAX_CHANNELS_AND_SLIDERS` so you can get some information (array type, max) for each `dtype` of a loader (such as `uint16/<u2`) and the number of channels the current release of Viv supports, respectively.

```javascript
import { createZarrLoader, PictureInPictureViewer, createOMETiffLoader } from '@hms-dbmi/viv';

/* Zarr Loader */
const zarrInfo = {
  url: `https://vitessce-data.storage.googleapis.com/0.0.25/master_release/spraggins/spraggins.mxif.zarr`,
  dimensions: [
    { field: 'channel', type: 'nominal', values: [
        'DAPI - Hoechst (nuclei)',
        'FITC - Laminin (basement membrane)',
        'Cy3 - Synaptopodin (glomerular)',
        'Cy5 - THP (thick limb)'
      ]
    },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  isPublic: true,
  isPyramid: true,
};
const loader = await createZarrLoader(zarrInfo);
/* Zarr loader */
// OR
/* Tiff Loader */
const url =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/deflate_no_legacy/spraggins.bioformats.raw2ometiff.ome.tif';
const loader = await createOMETiffLoader({ url, offsets: [], headers: {} });
/* Tiff Loader */

const sliders = [[0,2000], [0,2000]];
const colors = [[255, 0, 0], [0, 255, 0]];
const isOn = [true, false];
const selections = [{ channel: 1 }, { channel: 2 }];
const initialViewState = {
  height: 1000,
  width: 500,
  zoom: -5,
  target: [10000, 10000, 0].
};
const colormap = '';
const overview = {
  boundingBoxColor: [0, 0, 255]
};
const overviewOn = false;
const PictureInPictureViewer = (
  <PictureInPictureViewer
    loader={loader}
    sliderValues={sliders}
    colorValues={colors}
    channelIsOn={isOn}
    loaderSelection={selections}
    initialViewState={initialViewState}
    colormap={colormap.length > 0 && colormap}
    overview={overview}
    overviewOn={overviewOn}
  />
);
```

If you wish to use the `SideBySideViewer`, simply replace `PictureInPictureViewer` with `SideBySideViewer` and add props for `zoomLock` and `panLock` while removing `overview` and `overviewOn`.
