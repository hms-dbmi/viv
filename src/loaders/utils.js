import quickselect from 'quickselect';

import { range } from '../layers/utils';

export function isInTileBounds({
  x,
  y,
  z,
  width,
  height,
  tileSize,
  numLevels
}) {
  const xInBounds = x < Math.ceil(width / (tileSize * 2 ** z)) && x >= 0;
  const yInBounds = y < Math.ceil(height / (tileSize * 2 ** z)) && y >= 0;
  const zInBounds = z >= 0 && z < numLevels;
  return xInBounds && yInBounds && zInBounds;
}

export function guessRgb(shape) {
  const lastDimSize = shape[shape.length - 1];
  return shape.length > 2 && (lastDimSize === 3 || lastDimSize === 4);
}

/**
 * Flips the bytes of TypedArray in place. Used to flipendianess
 * Adapted from https://github.com/zbjornson/node-bswap/blob/master/bswap.js
 * @param {TypedArray} src
 * @returns {void}
 */
export function byteSwapInplace(src) {
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
 * Returns actual image stats for static imagery and an estimate via a downsampled version of image pyramids.
 * This is helpful for generating histograms of your channel data, or scaling your sliders down to a reasonable range.
 * Also provided are "autoSliders" which are slider bounds that should give a good initial image.
 * @param {Object} args
 * @param {Object} args.loader A valid loader object.
 * @param {Array} args.loaderSelection Array of valid dimension selections
 * @returns {Array} List of { mean, domain, sd, data, q1, q3, autoSliders } objects.
 */
export async function getChannelStats({ loader, loaderSelection }) {
  const z = loader.isPyramid ? loader.numLevels - 1 : 0;
  const rasters = await loader.getRaster({ z, loaderSelection });
  const { data } = rasters;
  const channelStats = data.map(arr => {
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
    const cutoffArr = arr.filter(i => i >= 1);
    const cutoffPercentile = 0.0005;
    const topCutoffLocation = Math.floor(
      cutoffArr.length * (1 - cutoffPercentile)
    );
    const bottomCutoffLocation = Math.floor(
      cutoffArr.length * cutoffPercentile
    );
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
      data: arr,
      domain: [min, max],
      autoSliders
    };
  });
  return channelStats;
}

/**
 * Retrieves blob from zarr store and parses as JSON.
 * @param {Object} store Valid zarr.Store
 * @param {String} key String path to to decode from store.
 * @returns {Object}
 */
export async function getJson(store, key) {
  const bytes = new Uint8Array(await store.getItem(key));
  const decoder = new TextDecoder('utf-8');
  const json = JSON.parse(decoder.decode(bytes));
  return json;
}

/**
 * Builds a dimensions object from OMEXML
 * @param {Object} omexml OMEXML class
 * @returns {Array} Array of dimensions objects
 */
export function dimensionsFromOMEXML(omexml) {
  const { SizeZ, SizeT, DimensionOrder } = omexml;
  const dims = DimensionOrder.toLowerCase()
    .split('')
    .slice()
    .reverse();
  const dimensions = dims.map(field => {
    if (field === 'x' || field === 'y') {
      return { field, type: 'quantitative', values: null };
    }
    if (field === 'c') {
      return {
        field: 'channel',
        type: 'nominal',
        values: omexml.getChannelNames()
      };
    }
    const type = 'ordinal';
    if (field === 't') {
      return { field: 'time', type, values: range(SizeT) };
    }
    return { field, type, values: range(SizeZ) };
  });
  return dimensions;
}

/**
 * Preserves (double) slashes earlier in the path, so this works better
 * for URLs. From https://stackoverflow.com/a/46427607/4178400
 * @param args parts of a path or URL to join.
 */
export function joinUrlParts(...args) {
  return args
    .map((part, i) => {
      if (i === 0) return part.trim().replace(/[/]*$/g, '');
      return part.trim().replace(/(^[/]*|[/]*$)/g, '');
    })
    .filter(x => x.length)
    .join('/');
}
