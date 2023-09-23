import { describe, test, expect } from 'vitest';
import { FileSystemStore } from './common';
import { loadMultiscales } from '../src/zarr/lib/utils';
import { getIndexer } from '../src/zarr/lib/indexer';

import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/bioformats-zarr');

test('loadMultiscales', async () => {
  const store = new FileSystemStore(`${FIXTURE}/data.zarr`);
  const { data } = await loadMultiscales(store, '0');
  expect(data.length).toBe(2);
});

describe('getIndexer', async () => {
  test.each([
    [{ a: 10, b: 20 }, [10, 20, 0, 0]],
    [
      [10, 20, 0, 0],
      [10, 20, 0, 0]
    ]
  ])(`indexer(%j)`, (input, expected) => {
    const indexer = getIndexer(['a', 'b', 'y', 'x']);
    expect(indexer(input)).toStrictEqual(expected);
  });

  test('throws with invalid dim name', () => {
    const indexer = getIndexer(['a', 'b', 'y', 'x']);
    expect(() => indexer({ c: 0, b: 0 })).toThrowError();
  });

  test('throws with duplicate dim name', () => {
    expect(() => getIndexer(['a', 'b', 'c', 'b', 'y', 'x'])).toThrowError();
  });
});
