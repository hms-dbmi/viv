Start a simple web server to make your data avaiable to the browser via HTTP.

```bash
$ http-server --cors='*' --port 8000 path/to/data
```

If following the `Data Preparation` tutorial, this server exposes two URLs that Viv
recognizes,

- `http://localhost:8000/LuCa-7color_Scan1.ome.tif` (OME-TIFF)
- `http://localhost:8000/LuCa-7color_Scan1/` (Bioformats-generated Zarr)

```javascript
import React, { useState, useEffect, useMemo } from 'react';

import {
  getChannelStats,
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

  // Viv exposes the getChannelStats to produce nice initial settings
  // so that users can have an "in focus" image immediately.
  const autoProps = useMemo(() => {
    if(!loader) {
      return props
    }
    // Use lowest level of the image pyramid for calculating stats.
    const source = loader.data[loader.length - 1];
    const stats = await Promise.all(props.selections.map(async selection => {
      const raster = await source.getRaster({ selection });
      return getChannelStats(raster.data);
    }));
    // These are calculated bounds for the sliders
    // that could be used for display purposes.
    // domains = stats.map(stat => stat.domain);

    // These are precalculated settings for the sliders that
    // should render a good, "in focus" image initially.
    sliders = stats.map(stat => stat.autoSliders);
    const newProps = { ...props, sliders };
  }, [loader])

  if (!loader) return null;
  return (
    <PictureInPictureViewer
      loader={loader.data}
      sliderValues={autoProps.sliders}
      colorValues={autoProps.colors}
      channelIsOn={autoProps.isOn}
      loaderSelection={autoProps.selections}
      height={1080}
      width={1920}
    />
  );
}
```

If you wish to use the `SideBySideViewer`, simply replace `PictureInPictureViewer` with `SideBySideViewer` and add props for `zoomLock` and `panLock` while removing `overview` and `overviewOn`.
