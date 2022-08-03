import type { GeoTIFF } from 'geotiff';

const VIV_PROXY_KEY = '__viv';
const OFFSETS_PROXY_KEY = `${VIV_PROXY_KEY}-offsets` as const;

/*
 * Inspect if the GeoTIFF source is wrapped in our proxies,
 * and warn if missing.
 */
export function checkProxies(tiff: GeoTIFF) {
  if (!isProxy(tiff, OFFSETS_PROXY_KEY)) {
    console.warn('GeoTIFF source is missing offsets proxy.');
  }
}

/*
 * > isProxy(tiff, POOL_PROXY_KEY) === true; // false
 * > tiff = createPoolProxy(tiff, new Pool());
 * > isProxy(tiff, POOL_PROXY_KEY) === true; // true
 */
function isProxy(tiff: GeoTIFF, proxyFlag: string) {
  return (tiff as any)[proxyFlag] as boolean;
}

/*
 * Creates an ES6 Proxy that wraps a GeoTIFF object. The proxy
 * handler intercepts calls to `tiff.getImage` and uses our custom
 * pre-computed offsets to pre-fetch the correct file directory.
 *
 * This is a bit of a hack. Internally GeoTIFF inspects `this.ifdRequests`
 * to see which fileDirectories need to be traversed. By adding the
 * ifdRequest for an 'index' manually, GeoTIFF will await that request
 * rather than traversing the file system remotely.
 */
export function createOffsetsProxy(tiff: GeoTIFF, offsets: number[]) {
  const get = (target: GeoTIFF, key: any) => {
    // Intercept `tiff.getImage`
    if (key === 'getImage') {
      return (index: number) => {
        // Manually add ifdRequest to tiff if missing and we have an offset.
        if (!(index in target.ifdRequests) && index in offsets) {
          const offset = offsets[index];
          target.ifdRequests[index] = target.parseFileDirectoryAt(offset);
        }
        return target.getImage(index);
      };
    }

    // tiff['__viv-offsets'] === true
    if (key === OFFSETS_PROXY_KEY) {
      return true;
    }

    return Reflect.get(target, key);
  };
  return new Proxy(tiff, { get });
}
