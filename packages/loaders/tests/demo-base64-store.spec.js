import { expect, test } from 'vitest';
import { createStoreFromMapContents } from './base64-store';
import * as zarr from 'zarrita';

import ome_ngff_0_4_fixture from './fixtures/ome-zarr/blobs_image_v04.ome.zarr.json';
import ome_ngff_0_5_fixture from './fixtures/ome-zarr/blobs_image_v05.ome.zarr.json';

test('Check that JSON-based store fixtures can be loaded: NGFF v0.4', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_4_fixture);
  
  const root = await zarr.root(store);
  
  const group = await zarr.open(root.resolve('/'));

  expect(group.attrs).toBeTruthy();

  // Check for required OME-NGFF v0.4 metadata (may have additional SpatialData attrs)
  expect(Object.keys(group.attrs)).toEqual(expect.arrayContaining(['multiscales', 'omero']));
});

test('Check that JSON-based store fixtures can be loaded: NGFF v0.5', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_5_fixture);
  
  const root = await zarr.root(store);
  
  const group = await zarr.open(root.resolve('/'));

  expect(group.attrs).toBeTruthy();

  // Check for required OME-NGFF v0.5 metadata (may have additional SpatialData attrs)
  expect(Object.keys(group.attrs)).toEqual(expect.arrayContaining(['ome']));
  expect(Object.keys(group.attrs['ome'])).toEqual(expect.arrayContaining(['omero', 'version', 'multiscales']));
});

