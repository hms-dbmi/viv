Start a simple web server to make your data avaiable to the browser via HTTP.

```bash
$ http-server --cors='*' --port 8000 path/to/data
```

If following the `Data Preparation` tutorial, this server exposes two URLs that Viv
recognizes,

- `http://localhost:8000/LuCa-7color_Scan1.ome.tif` (OME-TIFF)
- `http://localhost:8000/LuCa-7color_Scan1/` (Bioformats-generated Zarr)


```javascript
import React, { useState, useEffect } from 'react';

import {
  loadOmeTiff,
  loadBioformatsZarr,
  PictureInPictureViewer,
} from '@hms-dbmi/viv';

const url = 'http://localhost:8000/LuCa-7color_Scan1.ome.tif'; // OME-TIFF
// const url = 'http://localhost:8000/LuCa-7color_Scan1/';     // Bioformats-Zarr

// Hardcoded rendering properties.
const props = {
  selections: [
    { z: 0, t: 0, c: 0 },
    { z: 0, t: 0, c: 1 },
    { z: 0, t: 0, c: 2 },
  ],
  colors: [
    [0, 0, 255],
    [0, 255, 0],
    [255, 0, 0],
  ],
  sliders: [
    [0, 255],
    [0, 255],
    [0, 255],
  ],
  isOn: [true, true, true],
}

// Simple url handler.
function load(url) {
  if (url.includes('.tif')) {
    return loadOmeTiff(url);
  }
  return loadBioformatsZarr(url);
}

function App() {
  const [loader, setLoader]= useState(null);

  useEffect(() => {
    load(url).then(setLoader);
  }, []);

  if (!loader) return null;
  return (
    <PictureInPictureViewer
      loader={loader.data}
      sliderValues={props.sliders}
      colorValues={props.colors}
      channelIsOn={props.isOn}
      loaderSelection={props.selections}
      height={1080}
      width={1920}
    />
  );
}
```

If you wish to use the `SideBySideViewer`, simply replace `PictureInPictureViewer` with `SideBySideViewer` and add props for `zoomLock` and `panLock` while removing `overview` and `overviewOn`.
