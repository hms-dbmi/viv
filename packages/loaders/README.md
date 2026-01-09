# @vivjs/loaders

> Utilities for loading multiscale imaging datasets in Viv

## Installation

```sh
npm install @vivjs/loaders
```

## OME-NGFF Format Support

The `@vivjs/loaders` package supports multiple versions of the OME-NGFF (Next-Generation File Format) specification for Zarr-based image storage.

### Supported Formats

| Format | OME-NGFF Spec | bioformats2raw | Zarr Version | Metadata Path | Zarr Directory | Function |
|--------|---------------|----------------|--------------|--------------|---------------|----------|
| **v4 bioformats** | [0.4](https://ngff.openmicroscopy.org/0.4/#bf2raw) | v4 | v2 | `METADATA.ome.xml` (root) | `data.zarr/` | `loadBioformatsZarr` |
| **v5 bioformats** | [0.5](https://ngff.openmicroscopy.org/0.5/index.html#bf2raw) | v5 | v2 | `OME/METADATA.ome.xml` | Root directory | `loadBioformatsZarr` |
| **v5 multiscales** | [0.4](https://ngff.openmicroscopy.org/0.4/#multiscale-md) / [0.5](https://ngff.openmicroscopy.org/0.5/) | N/A | v3 | `.zattrs` (nested under `ome`) | Root directory | `loadOmeZarr` |

### Format Detection

The `loadBioformatsZarr` function automatically detects and supports both v4 and v5 bioformats formats by attempting to load both formats in parallel using `Promise.any()`. This ensures backward compatibility while supporting newer formats.

### v5 Multiscales (Zarr v3)

The v5 multiscales format uses zarr v3 stores, which require the `zarrita` library for reading. Multiscales metadata is nested under the `ome` key in the `.zattrs` file:

```json
{
  "ome": {
    "multiscales": [
      {
        "datasets": [{"path": "0"}, {"path": "1"}],
        "axes": ["t", "c", "z", "y", "x"]
      }
    ]
  }
}
```

The `loadOmeZarr` function automatically detects v5 format by checking for the presence of the `ome` key in the root attributes.

### Usage Examples

#### Loading bioformats2raw output (v4 or v5)

```javascript
import { loadBioformatsZarr } from '@vivjs/loaders';

// Automatically detects v4 or v5 format
const { data, metadata } = await loadBioformatsZarr('https://example.com/bioformats-output');
```

#### Loading OME-NGFF multiscales (v5)

```javascript
import { loadOmeZarr } from '@vivjs/loaders';

// Supports v5 multiscales (zarr v3)
const { data, metadata } = await loadOmeZarr('https://example.com/ome-zarr', {
  type: 'multiscales'
});
```

#### Loading from File objects

```javascript
import { loadBioformatsZarr } from '@vivjs/loaders';

// File objects must have a 'path' property
const files = [/* File objects */];
const { data, metadata } = await loadBioformatsZarr(files);
```

## License

MIT
