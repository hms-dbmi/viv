# OME-Zarr Test Fixtures

Two tiny SpatialData-derived OME-Zarr images for CI/tests. Both contain the same 3×12×12 pixel blob image with 3 channels. These fixtures are checked into the repo and work without downloading.

## `blobs_image_v04.ome.zarr` (16KB / 8.9KB JSON)

- **Format**: Zarr v2 with OME-NGFF v0.4-dev-spatialdata
- **Source**: SpatialData v0.5.0
- **Size**: 3 channels × 12×12 pixels
- **Use case**: Testing v0.4 compatibility

## `blobs_image_v05.ome.zarr` (12KB / 5.4KB JSON)

- **Format**: Zarr v3 with OME-NGFF v0.5-dev-spatialdata  
- **Source**: SpatialData v0.6.1
- **Size**: 3 channels × 12×12 pixels
- **Use case**: Testing v0.5 compatibility

## Regenerating from Source

To regenerate these fixtures:

These were generated with [SpatialData.js fixture generation scripts](https://github.com/Taylor-CCB-Group/SpatialData.js/blob/4805243195969faa3244059e1bf2ed158d8c359e/python/v0.5.0/generate_fixtures.py) modified to output minimal data.

Note that the specific linked script has some extra work-around for avoiding error when writing in SpatialData v0.5.0.

1. Set up a Python environment with the appropriate `spatialdata` version (v0.5.0 for v04, v0.6.1 for v05)
2. Generate test data with `spatialdata.datasets.blobs(length=12, n_points=1, n_shapes=1)`
3. Write the SpatialData object to Zarr, then copy the `/images/blobs_image` subdirectory to this fixtures directory as `blobs_image_v04.ome.zarr` or `blobs_image_v05.ome.zarr`
4. Convert to JSON stores for use in tests:

```sh
node scripts/directory-to-memory-store.mjs \
  packages/loaders/tests/fixtures/ome-zarr/blobs_image_v04.ome.zarr \
  packages/loaders/tests/fixtures/ome-zarr/blobs_image_v04.ome.zarr.json

node scripts/directory-to-memory-store.mjs \
  packages/loaders/tests/fixtures/ome-zarr/blobs_image_v05.ome.zarr \
  packages/loaders/tests/fixtures/ome-zarr/blobs_image_v05.ome.zarr.json
```
