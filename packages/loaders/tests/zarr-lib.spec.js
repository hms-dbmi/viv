import { expect, test } from 'vitest';
import { getIndexer } from '../src/zarr/lib/indexer';
import { loadMultiscales } from '../src/zarr/lib/utils';
import { FileSystemStore } from './common';

import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/bioformats-zarr');

test('Loads zarr-multiscales', async () => {
  const store = new FileSystemStore(`${FIXTURE}/data.zarr`);
  const { data } = await loadMultiscales(store, '0');
  expect(data.length).toBe(2);
});

test('Indexer creation and usage.', () => {
  const labels = ['a', 'b', 'y', 'x'];
  const indexer = getIndexer(labels);
  expect(indexer({ a: 10, b: 20 })).toEqual([10, 20, 0, 0]);
  expect(indexer([10, 20, 0, 0])).toEqual([10, 20, 0, 0]);
  expect(() => indexer({ c: 0, b: 0 })).toThrow();
  expect(() => getIndexer(['a', 'b', 'c', 'b', 'y', 'x'])).toThrow();
});
