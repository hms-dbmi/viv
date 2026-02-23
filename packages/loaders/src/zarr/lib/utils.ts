import * as zarr from 'zarrita';
import type { OmeXml } from '../../omexml';
import { getLabels, isInterleaved, prevPowerOf2 } from '../../utils';

import type { Labels } from '@vivjs/types';
import type { Axis, RootAttrs } from '../ome-zarr';

/*
 * Returns true if data shape is that expected for OME-Zarr.
 */
function isOmeZarr(dataShape: number[], Pixels: OmeXml[0]['Pixels']) {
  const { SizeT, SizeC, SizeZ, SizeY, SizeX } = Pixels;
  // OME-Zarr dim order is always ['t', 'c', 'z', 'y', 'x']
  const omeZarrShape = [SizeT, SizeC, SizeZ, SizeY, SizeX];
  return dataShape.every((size, i) => omeZarrShape[i] === size);
}

/**
 * For convenience - similar-ish interface to ZarrArray from non-zarrita zarr implementation.
 */
export type ZarrArray = zarr.Array<zarr.DataType>;

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

/*
 * Specifying different dimension orders form the METADATA.ome.xml is
 * possible and necessary for creating an OME-Zarr precursor.
 *
 * e.g. `bioformats2raw --file_type=zarr --dimension-order='XYZCT'`
 *
 * This is fragile code, and will only be executed if someone
 * tries to specify different dimension orders.
 */
export function guessBioformatsLabels(
  { shape }: ZarrArray,
  { Pixels }: OmeXml[0]
) {
  if (isOmeZarr(shape, Pixels)) {
    // It's an OME-Zarr Image,
    return getLabels('XYZCT');
  }

  // Guess labels derived from OME-XML
  const labels = getLabels(Pixels.DimensionOrder);
  labels.forEach((lower, i) => {
    const label = lower.toUpperCase();
    // @ts-expect-error - FIXME: safer type access
    const xmlSize: number = Pixels[`Size${label}`];
    if (!xmlSize) {
      throw Error(`Dimension ${label} is invalid for OME-XML.`);
    }
    if (shape[i] !== xmlSize) {
      throw Error('Dimension mismatch between zarr source and OME-XML.');
    }
  });

  return labels;
}

/*
 * Looks for the first file with root path and returns the full path prefix.
 *
 * > const files = [
 * >  { path: '/some/long/path/to/data.zarr/.zattrs' },
 * >  { path: '/some/long/path/to/data.zarr/.zgroup' },
 * >  { path: '/some/long/path/to/data.zarr/0/.zarray' },
 * >  { path: '/some/long/path/to/data.zarr/0/0.0' },
 * > ];
 * > getRootPrefix(files, 'data.zarr') === '/some/long/path/to/data.zarr'
 */
export function getRootPrefix(files: { path: string }[], rootName: string) {
  const first = files.find(f => f.path.indexOf(rootName) > 0);
  if (!first) {
    throw Error('Could not find root in store.');
  }
  const prefixLength = first.path.indexOf(rootName) + rootName.length;
  return first.path.slice(0, prefixLength);
}

function isAxis(axisOrLabel: string[] | Axis[]): axisOrLabel is Axis[] {
  return typeof axisOrLabel[0] !== 'string';
}

function castLabels(dimnames: string[]) {
  return dimnames as Labels<string[]>;
}

export async function loadMultiscales(store: ZarrArray['store'], path = '') {
  // Create a location from the store
  const location = zarr.root(store);
  const groupLocation = path ? location.resolve(path) : location;

  // Open the group
  const grp = await zarr.open(groupLocation, { kind: 'group' });
  const unknownAttrs = await grp.attrs;
  // As of OME-NGFF v0.5, attributes are located under 'ome'.
  // References:
  // - https://github.com/zarr-developers/zeps/pull/28
  // - https://github.com/ome/ngff/issues/182
  // (The NGFF v0.5 spec also ties itself to the Zarr v3 format
  // but Zarrita should handle the v2 and v3 differences transparently.)
  // Reference: https://ngff.openmicroscopy.org/0.5/index.html#metadata
  const ngff_v0_5_or_later = 'ome' in unknownAttrs;
  const rootAttrs = (
    ngff_v0_5_or_later ? unknownAttrs.ome : unknownAttrs
  ) as RootAttrs;

  let paths = ['0'];
  // Default axes used for v0.1 and v0.2.
  let labels = castLabels(['t', 'c', 'z', 'y', 'x']);
  if ('multiscales' in rootAttrs) {
    const { datasets, axes } = rootAttrs.multiscales[0];
    paths = datasets.map(d => d.path);
    if (axes) {
      if (isAxis(axes)) {
        labels = castLabels(axes.map(axis => axis.name));
      } else {
        labels = castLabels(axes);
      }
    }
  }

  // Load all arrays - nb, in older bioformats zarr `{kind: 'array'}` was wrong here
  const data = await Promise.all(
    paths.map(p => zarr.open(groupLocation.resolve(p), { kind: 'array' }))
  );

  return {
    data,
    rootAttrs,
    labels
  };
}

export function guessTileSize(arr: ZarrArray) {
  const interleaved = isInterleaved(arr.shape);
  const [yChunk, xChunk] = arr.chunks.slice(interleaved ? -3 : -2);
  const size = Math.min(yChunk, xChunk);
  // deck.gl requirement for power-of-two tile size.
  return prevPowerOf2(size);
}
