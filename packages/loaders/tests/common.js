import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Minimal store implementation to read zarr from file system in Node.
 * Compatible with zarrita store interface.
 */
export class FileSystemStore {
  constructor(fp) {
    this.root = fp;
  }

  async get(key) {
    const fp = path.join(this.root, key);
    try {
      const value = await fs.readFile(fp, null);
      // Convert Buffer to Uint8Array for zarrita compatibility
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return undefined;
      }
      throw err;
    }
  }
}
