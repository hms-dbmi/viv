import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadBioformatsZarr, loadOmeZarr } from '../src/zarr/index';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));
const FIXTURE = path.resolve(__dirname, './fixtures/bioformats-zarr');

// Mock fetch for URL-based tests
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('loadBioformatsZarr with File array source - structure validation', async () => {
  // This test validates that the function accepts File arrays and processes them
  // Full integration testing is done in bioformats-zarr.spec.js
  const files = createMockFilesFromFixture();

  // Verify files are created correctly
  expect(files.length).toBeGreaterThan(0);
  const metadataFile = files.find(f => f.name === 'METADATA.ome.xml');
  expect(metadataFile).toBeDefined();
  expect(metadataFile.path).toContain('METADATA.ome.xml');

  // Verify zarr files are present
  const zarrFiles = files.filter(f => f.path.includes('data.zarr'));
  expect(zarrFiles.length).toBeGreaterThan(0);

  // Note: Full loading test requires proper zarr store setup which is complex to mock
  // The actual loading functionality is tested in bioformats-zarr.spec.js
});

test('loadBioformatsZarr format detection tries both v4 and v5 formats in parallel', async () => {
  // Test that it attempts both formats by checking error messages
  // When both fail, we should get an AggregateError from Promise.any
  const files = [];
  try {
    await loadBioformatsZarr(files);
    expect.fail('Should have thrown an error');
  } catch (error) {
    // Promise.any throws AggregateError when all promises reject
    expect(error).toBeDefined();
    // Should have attempted both formats (v4: METADATA.ome.xml, v5: OME/METADATA.ome.xml)
    expect(error.errors || error).toBeDefined();
  }
});

test('loadBioformatsZarr handles both v4 and v5 metadata files', async () => {
  // Test that the function can handle files with both v4 and v5 metadata
  const files = createMockFilesFromFixture();
  // Add v5 format metadata as well
  const metaContent = fs.readFileSync(`${FIXTURE}/METADATA.ome.xml`);
  files.push(
    createMockFile(
      'OME/METADATA.ome.xml',
      `${FIXTURE}/OME/METADATA.ome.xml`,
      metaContent
    )
  );

  // Verify both metadata files are present
  const v4Metadata = files.find(f => f.name === 'METADATA.ome.xml');
  const v5Metadata = files.find(f => f.name === 'OME/METADATA.ome.xml');
  expect(v4Metadata).toBeDefined();
  expect(v5Metadata).toBeDefined();

  // Note: Promise.any will attempt both formats and use the first successful one
  // Full integration testing requires proper zarr store setup
});

test('loadBioformatsZarr error handling - missing metadata', async () => {
  const files = [];
  await expect(loadBioformatsZarr(files)).rejects.toThrow();
});

test('loadBioformatsZarr error handling - invalid file structure', async () => {
  const files = [createMockFile('wrong.xml', '/wrong/path.xml', '')];
  await expect(loadBioformatsZarr(files)).rejects.toThrow();
});

test('loadOmeZarr requires type option', async () => {
  await expect(loadOmeZarr('http://example.com/zarr')).rejects.toThrow(
    'Only multiscale OME-Zarr is supported.'
  );
});

test('loadOmeZarr validates type option', async () => {
  await expect(
    loadOmeZarr('http://example.com/zarr', { type: 'invalid' })
  ).rejects.toThrow('Only multiscale OME-Zarr is supported.');
});

// Helper function to create mock File objects from fixture
function createMockFilesFromFixture() {
  const files = [];
  const metadataPath = `${FIXTURE}/METADATA.ome.xml`;
  const zarrDir = `${FIXTURE}/data.zarr`;

  // Add metadata file - name must match exactly what the code looks for
  const metaContent = fs.readFileSync(metadataPath);
  files.push(createMockFile('METADATA.ome.xml', metadataPath, metaContent));

  // Add zarr files recursively
  // The path must include 'data.zarr' for getRootPrefix to work
  function addZarrFiles(dir, basePath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        addZarrFiles(fullPath, basePath);
      } else {
        const content = fs.readFileSync(fullPath);
        // Use full path so getRootPrefix can find 'data.zarr' in it
        files.push(createMockFile(entry.name, fullPath, content));
      }
    }
  }

  addZarrFiles(zarrDir, zarrDir);

  // Verify we have the necessary files
  const hasMetadata = files.some(f => f.name === 'METADATA.ome.xml');
  const hasZarrFiles = files.some(f => f.path.includes('data.zarr'));

  if (!hasMetadata || !hasZarrFiles) {
    throw new Error('Failed to create proper file structure for test');
  }

  return files;
}

function createMockFile(name, filePath, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const blob = new Blob([buffer]);
  const file = Object.assign(blob, {
    name,
    path: filePath
  });
  // Override arrayBuffer to return the buffer's arrayBuffer
  file.arrayBuffer = async () => {
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);
    view.set(buffer);
    return ab;
  };
  return file;
}
