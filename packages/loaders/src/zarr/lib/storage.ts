// zarrita stores supposedly return undefined instead of throwing KeyError
// (pending verification - I'm not sure I believe that in practice)

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

export class FileStore extends ReadOnlyStore {
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

  async get(key: string) {
    const file = this._map.get(this._key(key));
    if (!file) {
      return undefined;
    }
    const buffer = await file.arrayBuffer();
    return buffer;
  }
}
