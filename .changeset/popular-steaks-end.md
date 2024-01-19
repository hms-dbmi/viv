---
'@vivjs/loaders': minor
---

feat: Support multiscale multifile-OME-TIFFs

This release extends Viv's multifile OME-TIFF data-loading capabilities to multiscale TIFFs as well. The `loadOmeTiff` utility now recognizes and loads multiresolution images described in a `companion.ome` metadata file.

```js
import { loadOmeTiff } from '@vivjs/loaders';

let loader = await loadOmeTiff("http://localhost:8080/data.companion.ome");
```
