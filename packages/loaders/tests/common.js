import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Minimal store implementation to read zarr from file system in Node.
 */
export class FileSystemStore {
  constructor(fp) {
    this.root = fp;
  }

  async get(key) {
    const fp = path.join(this.root, key);
    try {
      const value = await fs.readFile(fp, null);
      return value;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return undefined;
      }
      throw err;
    }
  }

}
