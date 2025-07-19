import type { Array as ZarrArray, NumberDataType, BigintDataType, Readable } from 'zarrita';

import { fromString } from '../omexml';
import {
  guessBioformatsLabels,
  guessTileSize,
  loadMultiscales
} from './lib/utils';
import ZarrPixelSource from './pixel-source';

export async function load(
  root: Readable,
  xmlSource: string | File | Response
) {
  let xmlSourceText: string;
  // If 'File' or 'Response', read as text.
  if (typeof xmlSource !== 'string') {
    xmlSourceText = await xmlSource.text();
  } else {
    xmlSourceText = xmlSource;
  }

  // Get metadata and multiscale data for _first_ image.
  const imgMeta = fromString(xmlSourceText)[0];
  const { data } = await loadMultiscales(root, '0');

  const labels = guessBioformatsLabels(data[0], imgMeta);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, { labels, tileSize }));

  return {
    data: pyramid,
    metadata: imgMeta
  };
}
