import fs from 'node:fs/promises';
import path from 'node:path';
import { KeyError } from 'zarrita';

/*
 * Minimal store implementation to read zarr from file system in Node.
 */
export class FileSystemStore {
  constructor(fp) {
    this.root = fp;
  }

  async getItem(key) {
    const fp = path.join(this.root, key);
    try {
      const value = await fs.readFile(fp, null);
      return value;
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new KeyError(key);
      }
      throw err;
    }
  }

  containsItem(key) {
    return this.getItem(key)
      .then(() => true)
      .catch(() => false);
  }
}
