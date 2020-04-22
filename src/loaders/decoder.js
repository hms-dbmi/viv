import { getDecoder } from 'geotiff';

export function getTiffDecoder(fileDirectory) {
  return getDecoder(fileDirectory);
}
