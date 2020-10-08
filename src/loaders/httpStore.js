import { KeyError, HTTPError } from 'zarr';

/**
 * Preserves (double) slashes earlier in the path, so this works better
 * for URLs. From https://stackoverflow.com/a/46427607/4178400
 * @param args parts of a path or URL to join.
 */
export function joinUrlParts(...args) {
  return args
    .map((part, i) => {
      if (i === 0) {
        return part.trim().replace(/[\/]*$/g, '');
      } else {
        return part.trim().replace(/(^[\/]*|[\/]*$)/g, '');
      }
    })
    .filter(x => x.length)
    .join('/');
}

export default class HTTPStore {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
  }

  async getItem(key, options = {}) {
    const url = joinUrlParts(this.url, key);
    const value = await fetch(url, { ...this.options, ...options });
    if (value.status === 404) {
      throw new KeyError(key);
    } else if (value.status !== 200) {
      throw new HTTPError(String(value.status));
    }
    return value.arrayBuffer();
  }

  async containsItem(key, options = {}) {
    const url = joinUrlParts(this.url, key);
    const value = await fetch(url, { ...this.options, ...options });
    return value.status === 200;
  }
}
