import type { ZarrArray } from 'zarr';
import type { Labels } from '@vivjs/types';
import AbstractZarrPixelSource from './pixel-source';
import { BoundsCheckError, slice } from 'zarr';

class ZarrPixelSource<S extends string[]> extends AbstractZarrPixelSource<S> {
  constructor(
    data: ZarrArray,
    public labels: Labels<S>,
    public tileSize: number,
  ) {
    super(data, labels, tileSize, BoundsCheckError, slice);
  }
}

export default ZarrPixelSource;
