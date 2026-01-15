# Download sample OME-Zarr images to use as test fixtures

OME-NGFF v0.5 files from https://idr.github.io/ome-ngff-samples/

```sh
cd packages/loaders/tests/fixtures/ome-zarr

uv run --with awscli aws s3 sync --endpoint-url https://uk1s3.embassy.ebi.ac.uk --no-sign-request s3://idr/zarr/v0.5/idr0062A/6001240_labels.zarr/ v0_5_idr0062A_6001240_labels.ome.zarr

uv run --with awscli aws s3 sync --endpoint-url https://uk1s3.embassy.ebi.ac.uk --no-sign-request s3://idr/zarr/v0.4/idr0076A/10501752.zarr v0_4_idr0076A_10501752.ome.zarr
```

Convert to JSON stores to use via direct imports in tests

```sh
cd - # Back to root of repo
export FIXTURES_DIR='packages/loaders/tests/fixtures/ome-zarr'

node scripts/directory-to-memory-store.mjs $FIXTURES_DIR/v0_5_idr0062A_6001240_labels.ome.zarr $FIXTURES_DIR/v0_5_idr0062A_6001240_labels.ome.zarr.json
node scripts/directory-to-memory-store.mjs $FIXTURES_DIR/v0_4_idr0076A_10501752.ome.zarr $FIXTURES_DIR/v0_4_idr0076A_10501752.ome.zarr.json
```

TODO: identify smaller images and check them into the repo instead of git-ignoring them.