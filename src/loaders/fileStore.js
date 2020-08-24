import { KeyError } from 'zarr';

/**
 * A valid zarr.Store that maps keys to local a zarr.DirectoryStore.
 * @param {Map} fileMapping, keys are zarr keys and values are File objects.
 * */
export default class FileStore {
  constructor(fileMapping) {
    this._store = fileMapping;
  }

  async getItem(key) {
    const file = this._store.get(key);
    if (!file) {
      throw new KeyError(key);
    }
    const buffer = await file.arrayBuffer();
    return buffer;
  }

  async containsItem(key) {
    return this._store.has(key);
  }
}
