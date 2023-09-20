import type { ZarrArray } from 'zarr';
import type { Labels } from '@vivjs/types';
import AbstractZarrPixelSource from './pixel-source';
import { KeyError } from '@zarrita/core'; // TODO: is this the right error type?
import { slice } from '@zarrita/indexing';

class ZarritaPixelSource<S extends string[]> extends AbstractZarrPixelSource<S> {
  constructor(
    data: ZarrArray,
    public labels: Labels<S>,
    public tileSize: number,
  ) {
    super(data, labels, tileSize, KeyError, slice);
  }
}

export default ZarritaPixelSource;
