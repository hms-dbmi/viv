Here are two snippets to help get you started with our higher-level components. For a more complete example of using these higher level components, look at the source code of the demo [here](https://github.com/hubmapconsortium/vitessce-image-viewer/blob/master/demo/src/App.js), or look at the source code of the library [here](https://github.com/hubmapconsortium/vitessce-image-viewer/tree/master/src) for building your own components with custom `VivViews` or custom `deck.gl` layers.

This snippet is the most basic view: a simple view of the data. With `overviewOn=false`, this will just be a single view of the data. Turn `overviewOn=true` for a picture-in-picture.

We also export `DTYPE_VALUES` and `MAX_CHANNELS_AND_SLIDERS` so you can get some information (array type, max) for each `dtype` of a loader (such as `uint16/<u2`) and the number of channels the current release of Viv supports, respectively.

#### `PictureInPictureViewer`

```javascript
import { createZarrLoader, PictureInPictureViewer } from '@hubmap/vitessce-image-viewer';

const channelNames = [
  'DAPI - Hoechst (nuclei)',
  'FITC - Laminin (basement membrane)',
  'Cy3 - Synaptopodin (glomerular)',
  'Cy5 - THP (thick limb)'
];

const basePyramidInfo = {
  dimensions: [
    { field: 'channel', type: 'nominal', values: channelNames },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  isPublic: true,
  isPyramid: true,
  selections: channelNames.map(name => ({ channel: name }))
};
const zarrInfo = {
  url: `https://vitessce-data.storage.googleapis.com/0.0.25/master_release/spraggins/spraggins.mxif.zarr`,
  ...basePyramidInfo,
};
const loader = await createZarrLoader(zarrInfo);
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

This snippet produces a side-by-side viewer with optional linked zoom/pan.

#### `SideBySideViewer`

```javascript
import { createZarrLoader, SideBySideViewer } from '@hubmap/vitessce-image-viewer';

const loader = await createZarrLoader({
  url: `https://vitessce-data.storage.googleapis.com/0.0.25/master_release/spraggins/spraggins.mxif.zarr`,
  dimensions: [
    { field: 'channel', type: 'nominal',  values: ['DAPI', 'FITC', 'Cy3', 'Cy5'] },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  isPyramid: true
});

const sliders = [[0,2000], [0,2000]];
const colors = [[255, 0, 0], [0, 255, 0]];
const isOn = [true, false];
const selections = [{ channel: 0 }, { channel: 1 }];
const initialViewState = {
  height: 1000,
  width: 500,
  zoom: -5,
  target: [10000, 10000, 0].
};
const colormap = '';
const panLock = true;
const zoomLock = false;
const linkedDetailViewer = (
  <SideBySideViewer
    loader={loader}
    sliderValues={sliders}
    colorValues={colors}
    channelIsOn={isOn}
    loaderSelection={selections}
    initialViewState={initialViewState}
    colormap={colormap.length > 0 && colormap}
    zoomLock={zoomLock}
    panLock={panLock}
  />
);
```
