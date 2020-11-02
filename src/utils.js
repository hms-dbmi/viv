import { loadImage } from '@loaders.gl/images';
import { baseColormapUrl } from './constants';

export async function getColormap({ url, name }) {
  if (url) {
    return loadImage(url);
  }
  return loadImage(`${baseColormapUrl + name}.png`);
}
