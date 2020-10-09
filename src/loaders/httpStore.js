import { KeyError, HTTPError } from 'zarr';

import { joinUrlParts } from './utils';

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
