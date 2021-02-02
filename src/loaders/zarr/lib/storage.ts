import { KeyError } from 'zarr';
import type { AsyncStore } from 'zarr/dist/types/storage/types';

import { SIGNAL_ABORTED } from '../../utils';

/**
 * Preserves (double) slashes earlier in the path, so this works better
 * for URLs. From https://stackoverflow.com/a/46427607/4178400
 * @param args parts of a path or URL to join.
 */
function joinUrlParts(...args: string[]) {
  return args
    .map((part, i) => {
      if (i === 0) return part.trim().replace(/[/]*$/g, '');
      return part.trim().replace(/(^[/]*|[/]*$)/g, '');
    })
    .filter(x => x.length)
    .join('/');
}

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
    const path = this._key(key);
    return this._map.has(path);
  }
}

export class HTTPStore
  extends ReadOnlyStore
  implements AsyncStore<ArrayBuffer> {
  private _signal: AbortSignal | undefined;

  constructor(public url: string, public options?: RequestInit) {
    super();
    this._signal = undefined;
  }

  async getItem(key: string) {
    const url = joinUrlParts(this.url, key);

    /*
     * If custom request options or a valid signal,
     * pass the signal to the fetch request.
     */
    let options: undefined | RequestInit;
    if (this.options || this._signal) {
      options = { ...this.options, signal: this._signal };
    }

    const value = await fetch(url, options);

    /*
     * Throw our custom abort signal value to pick up in getTileData.
     */
    if (this._signal?.aborted) {
      throw SIGNAL_ABORTED;
    }

    if (value.status === 404) {
      throw new KeyError(key);
    } else if (value.status !== 200) {
      throw Error(`HTTPError: ${JSON.stringify(value.status)}.`);
    }
    return value.arrayBuffer();
  }

  async containsItem(key: string) {
    const url = joinUrlParts(this.url, key);
    const value = await fetch(url, this.options);
    return value.status === 200;
  }

  __vivAddSignal(signal: AbortSignal) {
    this._signal = signal;
  }

  __vivClearSignal() {
    this._signal = undefined;
  }
}
