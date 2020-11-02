import { getDecoder } from 'geotiff/src/compression';

export function getTiffDecoder(fileDirectory) {
  return getDecoder(fileDirectory);
}
