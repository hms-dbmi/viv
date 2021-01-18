import { KeyError } from 'zarr';
import type { AsyncStore } from 'zarr/dist/types/storage/types';

// @ts-ignore
import { joinUrlParts } from 'zarr/dist/lib/util';

class ReadOnlyStore {
  async keys() {
    return [];
  }

  async deleteItem() {
    return false;
  }

  async setItem() {
    console.warn('Cannot write to read-only store.');
    return false;
  }
}

export class FileStore
  extends ReadOnlyStore
  implements AsyncStore<ArrayBuffer> {
  private _map: Map<string, File>;
  private _rootPrefix: string;

  constructor(fileMap: Map<string, File>, rootPrefix = '') {
    super();
    this._map = fileMap;
    this._rootPrefix = rootPrefix;
  }

  private _key(key: string) {
    return joinUrlParts(this._rootPrefix, key);
  }

  async getItem(key: string) {
    const file = this._map.get(this._key(key));
    if (!file) {
      throw new KeyError(key);
    }
    const buffer = await file.arrayBuffer();
    return buffer;
  }

  async containsItem(key: string) {
    return this._map.has(key);
  }
}

export class HTTPStore
  extends ReadOnlyStore
  implements AsyncStore<ArrayBuffer> {
  constructor(public url: string, public options?: RequestInit) {
    super();
  }

  async getItem(key: string, options?: RequestInit) {
    const url = joinUrlParts(this.url, key) as string;
    if (this.options || options) {
      options = { ...this.options, ...options };
    }
    const value = await fetch(url, options);
    if (value.status === 404) {
      throw new KeyError(key);
    } else if (value.status !== 200) {
      throw Error(`HTTPError: ${JSON.stringify(value.status)}.`);
    }
    return value.arrayBuffer();
  }

  async containsItem(key: string, options?: RequestInit) {
    const url = joinUrlParts(this.url, key) as string;
    if (this.options || options) {
      options = { ...this.options, ...options };
    }
    const value = await fetch(url, options);
    return value.status === 200;
  }
}
