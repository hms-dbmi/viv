import { KeyError } from 'zarrita';
import type { AsyncReadable } from 'zarrita';

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

export class FileStore
  implements AsyncReadable
{
  private _map: Map<string, File>;
  private _rootPrefix: string;

  constructor(fileMap: Map<string, File>, rootPrefix = '') {
    this._map = fileMap;
    this._rootPrefix = rootPrefix;
  }

  private _key(key: string) {
    return joinUrlParts(this._rootPrefix, key);
  }

  async get(key: string) {
    const file = this._map.get(this._key(key));
    if (!file) {
      throw new KeyError(key);
    }
    // Reference: https://github.com/manzt/zarrita.js/pull/161
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }
}
