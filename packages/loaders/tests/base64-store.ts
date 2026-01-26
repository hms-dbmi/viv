// Copied from https://github.com/vitessce/vitessce/blob/main/packages/utils/zarr-utils/src/base64-store.ts

function base64Decode(encoded: string) {
  // We do not want to use Buffer.from(encoded, 'base64') because
  // Buffer is not available in the browser and we do not want
  // to add a dependency on a polyfill if we dont have to.
  // Reference: https://stackoverflow.com/a/41106346
  return Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
}

// This is intended to be used for unit testing purposes.
// It goes along with scripts/directory-to-memory-store.mjs
export function createStoreFromMapContents(mapContents: [string, string][]) {
  const map = new Map(mapContents);
  return new Proxy(map, {
    get: (target, prop) => {
      if (prop === 'get') {
        // Replace the get method with one that decodes the value.
        return (key: string) => {
          const encodedVal = target.get(key);
          if (encodedVal) {
            return base64Decode(encodedVal);
          }
          return undefined;
        };
      }
      return Reflect.get(target, prop);
    }
  });
}
