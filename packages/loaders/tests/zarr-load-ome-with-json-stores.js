import { expect, test } from 'vitest';
import * as zarr from 'zarrita';
import { createStoreFromMapContents } from './base64-store';
import { load as loadOme } from '../src/zarr/ome-zarr';


import ome_ngff_0_4_fixture from './fixtures/ome-zarr/blobs_image_v04.ome.zarr.json';
import ome_ngff_0_5_fixture from './fixtures/ome-zarr/blobs_image_v05.ome.zarr.json';

test('Check that JSON-based store fixtures can be loaded: NGFF v0.4', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_4_fixture);

  const root = await zarr.root(store);

  const group = await zarr.open(root.resolve('/'));

  expect(group.attrs).toBeTruthy();

  // Check for required OME-NGFF v0.4 metadata (may have additional SpatialData attrs)
  expect(Object.keys(group.attrs)).toEqual(
    expect.arrayContaining(['multiscales', 'omero'])
  );
});

test('Check that JSON-based store fixtures can be loaded: NGFF v0.5', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_5_fixture);

  const root = await zarr.root(store);

  const group = await zarr.open(root.resolve('/'));

  expect(group.attrs).toBeTruthy();

  // Check for required OME-NGFF v0.5 metadata (may have additional SpatialData attrs)
  expect(Object.keys(group.attrs)).toEqual(expect.arrayContaining(['ome']));
  expect(Object.keys(group.attrs['ome'])).toEqual(
    expect.arrayContaining(['omero', 'version', 'multiscales'])
  );
});


test('Test loadOme function with NGFF v0.4 image', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_4_fixture);
  const { data, metadata } = await loadOme(store);

  expect(data).toBeTruthy();
  expect(metadata).toBeTruthy();
  expect(metadata.multiscales[0].name).toEqual('/images/blobs_image');
  expect(data.length).toBe(1); // One resolution
  expect(data[0].labels).toEqual(['c', 'y', 'x']);
});

test('Test loadOme function with NGFF v0.5 image', async () => {
  const store = createStoreFromMapContents(ome_ngff_0_5_fixture);
  const { data, metadata } = await loadOme(store);

  expect(data).toBeTruthy();
  expect(metadata).toBeTruthy();
  expect(metadata.multiscales[0].name).toEqual('/images/blobs_image');
  expect(data.length).toBe(1); // One resolution
  expect(data[0].labels).toEqual(['c', 'y', 'x']);
});
