import quickselect from 'quickselect';
import type { TypedArray } from 'zarr';

/**
 * Flips the bytes of TypedArray in place. Used to flipendianess
 * Adapted from https://github.com/zbjornson/node-bswap/blob/master/bswap.js
 * @param {TypedArray} src
 * @returns {void}
 */
export function byteSwapInplace(src: TypedArray) {
  const b = src.BYTES_PER_ELEMENT;
  const flipper = new Uint8Array(src.buffer, src.byteOffset, src.length * b);
  const numFlips = b / 2;
  const endByteIndex = b - 1;
  let t = 0;
  for (let i = 0; i < flipper.length; i += b) {
    for (let j = 0; j < numFlips; j += 1) {
      t = flipper[i + j];
      flipper[i + j] = flipper[i + endByteIndex - j];
      flipper[i + endByteIndex - j] = t;
    }
  }
}

/**
 * Computes statics from layer data.
 * This is helpful for generating histograms or scaling sliders to a reasonable range.
 * Also provided are "autoSliders" which are slider bounds that should give a good initial image.
 */
export function getChannelStats(arr: TypedArray) {
  let len = arr.length;
  let min = Infinity;
  let max = -Infinity;
  let total = 0;
  // Range (min/max).
  // eslint-disable-next-line no-plusplus
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
    if (arr[len] > max) {
      max = arr[len];
    }
    total += arr[len];
  }

  // Mean.
  const mean = total / arr.length;

  // Standard Deviation.
  len = arr.length;
  let sumSquared = 0;
  // eslint-disable-next-line no-plusplus
  while (len--) {
    sumSquared += (arr[len] - mean) ** 2;
  }
  const sd = (sumSquared / arr.length) ** 0.5;

  // Median, and quartiles via quickselect: https://en.wikipedia.org/wiki/Quickselect.
  // Odd number lengths should round down the index.
  const mid = Math.floor(arr.length / 2);
  const firstQuartileLocation = Math.floor(arr.length / 4);
  const thirdQuartileLocation = 3 * Math.floor(arr.length / 4);

  quickselect(arr, mid);
  const median = arr[mid];
  quickselect(arr, firstQuartileLocation, 0, mid);
  const q1 = arr[firstQuartileLocation];
  quickselect(arr, thirdQuartileLocation, mid, arr.length - 1);
  const q3 = arr[thirdQuartileLocation];

  // Used for "auto" settings.  This is the best parameter I've found experimentally.
  // I don't think there is a right answer and this feature is common in Fiji.
  // Also it's best to use a non-zero array for this.
  const cutoffArr = arr.filter((i: number) => i >= 1);
  const cutoffPercentile = 0.0005;
  const topCutoffLocation = Math.floor(
    cutoffArr.length * (1 - cutoffPercentile)
  );
  const bottomCutoffLocation = Math.floor(cutoffArr.length * cutoffPercentile);
  quickselect(cutoffArr, topCutoffLocation);
  quickselect(cutoffArr, bottomCutoffLocation, 0, topCutoffLocation);
  const autoSliders = [
    cutoffArr[bottomCutoffLocation],
    cutoffArr[topCutoffLocation]
  ];
  return {
    mean,
    sd,
    q1,
    q3,
    median,
    domain: [min, max],
    autoSliders
  };
}

export function ensureArray<T>(x: T | T[]) {
  return Array.isArray(x) ? x : [x];
}

type RGBA = [r: number, g: number, b: number, a: number];

// Adapted from: https://github.com/ome/ome-zarr-py/blob/db60b8272e0fe005920f8a296d4828b7a32e663e/ome_zarr/conversions.py#L16
export function intToRgba(int: number): RGBA {
  if (!Number.isInteger(int)) {
    throw Error('Not an integer.');
  }

  // Write number to int32 representation (4 bytes).
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, int, false); // offset === 0, littleEndian === false

  // Take u8 view and extract number for each byte (1 byte for R/G/B/A).
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes) as RGBA;
}
