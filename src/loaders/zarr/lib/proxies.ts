import type { ZarrArray } from 'zarr';
import type { HTTPStore } from './storage';

import { VIV_PROXY_KEY } from '../../utils';
export const ABORT_SIGNAL_PROXY_KEY = `${VIV_PROXY_KEY}-abort-signal` as const;

/*
 * Creates an ES6 Proxy that wraps a Zarr Store to pass 
 * an AbortSignal to `store.getItem`. This is _very_
 * low-level and only used in ZarrPixelSource.getTile
 * 
 * Usage:
 * 
 * > let store = new HTTPStore(url);
 * > store = createAbortSignalProxy(store);
 * > const arr = await openArray({ store });
 * > 
 * > const controller = new AbortController();
 * > const signal = controller.signal;
 * > 
 * > arr.store.__vivAddSignal(signal);
 * > arr.getRawChunk([0, 0, 0, 0]); // calls store.getItem() internally
 * > arr.store.__vivClearSignal();
 */
export function createAbortSignalProxy(store: HTTPStore) {
  let signal: undefined | AbortSignal;

  const get = (target: HTTPStore, key: any) => {
    // Intercept calls to `image.readRasters`
    if (key === 'getItem') {
      return (key: string) => {
        const options = signal ? { signal } : undefined;
        return target.getItem(key, options);
      };
    }

    if (key === '__vivAddSignal') {
      return (s: AbortSignal) => {
        signal = s;
      };
    }

    if (key === '__vivClearSignal') {
      return () => {
        signal = undefined;
      };
    }

    if (key === ABORT_SIGNAL_PROXY_KEY) {
      return true;
    }

    return Reflect.get(target, key);
  };
  return new Proxy(store, { get });
}
