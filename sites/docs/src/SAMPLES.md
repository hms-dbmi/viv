Start a simple web server to make your data avaiable to the browser via HTTP.

```bash
$ http-server --cors='*' --port 8000 path/to/data
```

If following the `Data Preparation` tutorial, the server provides Viv access to the OME-TIFF via URL:

- `http://localhost:8000/LuCa-7color_Scan1.ome.tif` (OME-TIFF)

```javascript
import React, { useState, useEffect } from 'react';

import {
  getChannelStats,
  loadOmeTiff,
  PictureInPictureViewer,
} from '@hms-dbmi/viv';

const url = 'http://localhost:8000/LuCa-7color_Scan1.ome.tif'; // OME-TIFF

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
  contrastLimits: [
    [0, 255],
    [0, 255],
    [0, 255],
  ],
  channelsVisible: [true, true, true],
}


function App() {
  const [loader, setLoader]= useState(null);
  const [autoProps, setAutoProps] = useState(null);
  useEffect(() => {
    loadOmeTiff(url).then(setLoader);
  }, []);

  // Viv exposes the getChannelStats to produce nice initial settings
  // so that users can have an "in focus" image immediately.

  async function computeProps(loader){
    if (!loader) return null;
    // Use lowest level of the image pyramid for calculating stats.
    const source = loader.data[loader.data.length - 1];
    const stats = await Promise.all(props.selections.map(async selection => {
      const raster = await source.getRaster({ selection });
      return getChannelStats(raster.data);
    }));
    // These are calculated bounds for the contrastLimits
    // that could be used for display purposes.
    // domains = stats.map(stat => stat.domain);

    // These are precalculated settings for the contrastLimits that
    // should render a good, "in focus" image initially.
    const contrastLimits = stats.map(stat => stat.contrastLimits);
    const newProps = { ...props, contrastLimits };
    return newProps
  }
  
  useEffect(() => {

    computeProps(loader).then(setAutoProps)
    
  }, [loader])

  if (!loader || !autoProps) return null;
  return (
    <PictureInPictureViewer
      loader={loader.data}
      contrastLimits={autoProps.contrastLimits}
      // Default extension is ColorPaletteExtension so no need to specify it if
      // that is the desired rendering, using the `colors` prop.
      colors={autoProps.colors}
      channelsVisible={autoProps.channelsVisible}
      selections={autoProps.selections}
      height={1080}
      width={1920}
    />
  );
}
export default App;

```

If you wish to use the `SideBySideViewer`, simply replace `PictureInPictureViewer` with `SideBySideViewer` and add props for `zoomLock` and `panLock` while removing `overview` and `overviewOn`.
