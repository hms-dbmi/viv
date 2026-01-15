import { expect, test } from 'vitest';
import { createStoreFromMapContents } from './base64-store';
import * as zarr from 'zarrita';

import ome_ngff_0_4_fixture from './fixtures/ome-zarr/v0_4_idr0076A_10501752.ome.zarr.json';
import ome_ngff_0_5_fixture from './fixtures/ome-zarr/v0_5_idr0062A_6001240_labels.ome.zarr.json';

test('Check that JSON-based store fixtures can be loaded: NGFF v0.4', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_4_fixture);
  
  const root = await zarr.root(store);
  
  const group = await zarr.open(root.resolve('/'));

  expect(group.attrs).toBeTruthy();

  expect(Object.keys(group.attrs)).toEqual(['_creator', 'multiscales', 'omero']);
});

test('Check that JSON-based store fixtures can be loaded: NGFF v0.5', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_5_fixture);
  
  const root = await zarr.root(store);
  
  const group = await zarr.open(root.resolve('/'));

  expect(group.attrs).toBeTruthy();

  expect(Object.keys(group.attrs)).toEqual(['ome']);
  expect(Object.keys(group.attrs['ome'])).toEqual(['version', '_creator', 'multiscales', 'omero']);
});

