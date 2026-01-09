import { expect, test } from 'vitest';
import { FileStore } from '../src/zarr/lib/storage';
import { getRootPrefix } from '../src/zarr/lib/utils';

test('FileStore.get with valid keys', async () => {
  const fileMap = new Map();
  const testContent = new Uint8Array([1, 2, 3, 4, 5]);
  const testBlob = new Blob([testContent]);
  const testFile = Object.assign(testBlob, {
    name: 'test.bin',
    arrayBuffer: async () =>
      testContent.buffer.slice(
        testContent.byteOffset,
        testContent.byteOffset + testContent.byteLength
      )
  });
  fileMap.set('test.bin', testFile);

  const store = new FileStore(fileMap);
  const result = await store.get('test.bin');

  expect(result).toBeDefined();
  expect(result).toBeInstanceOf(Uint8Array);
  expect(result.length).toBe(5);
  expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
});

test('FileStore.get with missing keys returns undefined', async () => {
  const fileMap = new Map();
  const store = new FileStore(fileMap);
  const result = await store.get('nonexistent.bin');

  // zarrita stores return undefined instead of throwing KeyError
  expect(result).toBeUndefined();
});

test('FileStore with root prefix handling', async () => {
  const fileMap = new Map();
  const testContent = new Uint8Array([1, 2, 3]);
  const testBlob = new Blob([testContent]);
  const testFile = Object.assign(testBlob, {
    name: 'data.bin',
    arrayBuffer: async () =>
      testContent.buffer.slice(
        testContent.byteOffset,
        testContent.byteOffset + testContent.byteLength
      )
  });

  // File path includes root prefix
  fileMap.set('/some/path/to/data.zarr/data.bin', testFile);

  const store = new FileStore(fileMap, '/some/path/to/data.zarr');

  // Should find file when key matches relative path
  const result = await store.get('data.bin');
  expect(result).toBeDefined();
  expect(result.length).toBe(3);
});

test('FileStore root prefix with nested paths', async () => {
  const fileMap = new Map();
  const testContent = new Uint8Array([1, 2, 3]);
  const testBlob = new Blob([testContent]);
  const testFile = Object.assign(testBlob, {
    name: 'chunk',
    arrayBuffer: async () =>
      testContent.buffer.slice(
        testContent.byteOffset,
        testContent.byteOffset + testContent.byteLength
      )
  });

  fileMap.set('/root/data.zarr/0/0/chunk', testFile);

  const store = new FileStore(fileMap, '/root/data.zarr');

  const result = await store.get('0/0/chunk');
  expect(result).toBeDefined();
  expect(result.length).toBe(3);
});

test('FileStore handles URL-style paths with double slashes', async () => {
  const fileMap = new Map();
  const testContent = new Uint8Array([1, 2, 3]);
  const testBlob = new Blob([testContent]);
  const testFile = Object.assign(testBlob, {
    name: 'data.bin',
    arrayBuffer: async () =>
      testContent.buffer.slice(
        testContent.byteOffset,
        testContent.byteOffset + testContent.byteLength
      )
  });

  // Test that joinUrlParts preserves double slashes in URLs
  fileMap.set('http://example.com//data.zarr/data.bin', testFile);

  const store = new FileStore(fileMap, 'http://example.com//data.zarr');

  const result = await store.get('data.bin');
  expect(result).toBeDefined();
});

test('getRootPrefix utility function', () => {
  const files = [
    { path: '/some/long/path/to/data.zarr/.zattrs' },
    { path: '/some/long/path/to/data.zarr/.zgroup' },
    { path: '/some/long/path/to/data.zarr/0/.zarray' },
    { path: '/some/long/path/to/data.zarr/0/0.0' }
  ];

  const prefix = getRootPrefix(files, 'data.zarr');
  expect(prefix).toBe('/some/long/path/to/data.zarr');
});

test('getRootPrefix with different root name', () => {
  const files = [
    { path: '/root/other.zarr/.zattrs' },
    { path: '/root/other.zarr/0/.zarray' }
  ];

  const prefix = getRootPrefix(files, 'other.zarr');
  expect(prefix).toBe('/root/other.zarr');
});

test('getRootPrefix throws error when root not found', () => {
  const files = [{ path: '/some/path/file.txt' }];

  expect(() => getRootPrefix(files, 'data.zarr')).toThrow(
    'Could not find root in store.'
  );
});

test('getRootPrefix handles root at start of path', () => {
  const files = [
    { path: 'data.zarr/.zattrs' },
    { path: 'data.zarr/0/.zarray' }
  ];

  // getRootPrefix requires the root name to appear after index 0 in the path
  // So 'data.zarr' at the start won't match the current implementation
  // This test documents the current behavior
  expect(() => getRootPrefix(files, 'data.zarr')).toThrow(
    'Could not find root in store.'
  );
});

test('FileStore ReadOnlyStore methods', async () => {
  const fileMap = new Map();
  const store = new FileStore(fileMap);

  // keys() should return empty array
  const keys = await store.keys();
  expect(keys).toEqual([]);

  // deleteItem() should return false
  const deleted = await store.deleteItem('test');
  expect(deleted).toBe(false);

  // setItem() should return false and warn
  const set = await store.setItem('test', new Uint8Array());
  expect(set).toBe(false);
});
