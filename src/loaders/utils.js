import * as tf from '@tensorflow/tfjs';

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

// Credit to https://github.com/zbjornson/node-bswap/blob/master/bswap.js for the implementation.
// I could not get this to import, and it doesn't appear anyone else can judging by the "Used by" on github.
// We need this for handling the endianness returned by geotiff since it only returns bytes.
function flip16(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 2);
  const len = flipper.length;
  for (let i = 0; i < len; i += 2) {
    const t = flipper[i];
    flipper[i] = flipper[i + 1];
    flipper[i + 1] = t;
  }
}

function flip32(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 4);
  const len = flipper.length;
  for (let i = 0; i < len; i += 4) {
    let t = flipper[i];
    flipper[i] = flipper[i + 3];
    flipper[i + 3] = t;
    t = flipper[i + 1];
    flipper[i + 1] = flipper[i + 2];
    flipper[i + 2] = t;
  }
}

function flip64(info) {
  const flipper = new Uint8Array(info.buffer, info.byteOffset, info.length * 8);
  const len = flipper.length;
  for (let i = 0; i < len; i += 8) {
    let t = flipper[i];
    flipper[i] = flipper[i + 7];
    flipper[i + 7] = t;
    t = flipper[i + 1];
    flipper[i + 1] = flipper[i + 6];
    flipper[i + 6] = t;
    t = flipper[i + 2];
    flipper[i + 2] = flipper[i + 5];
    flipper[i + 5] = t;
    t = flipper[i + 3];
    flipper[i + 3] = flipper[i + 4];
    flipper[i + 4] = t;
  }
}

export function flipEndianness(arr) {
  switch (arr.BYTES_PER_ELEMENT) {
    case 1:
      // no op
      return;
    case 2:
      flip16(arr);
      break;
    case 4:
      flip32(arr);
      break;
    case 8:
      flip64(arr);
      break;
    default:
      throw new Error('Invalid input');
  }
}

const NO_PAD_BIOFORMATS_VERSION = [6, 2, 1];

export function isBioformatsNoPadHeightVersion(software) {
  if (!software) {
    return false;
  }
  const isBioFormats = software.includes('Bio-Formats');
  const version = software.match(/[0-9]/g).map(e => Number(e));
  // Guessing that bioformats 6.0.0 - 6.2.1 misreports bounds, we check the major version.
  if (isBioFormats && version[0] === NO_PAD_BIOFORMATS_VERSION[0]) {
    // The version is thus 6 (there is no 7).  Check if it's version 6.2 or lower.
    if (version[1] <= NO_PAD_BIOFORMATS_VERSION[1]) {
      // Version 6.2 or lower with y in 6.x.y less than or equal to 1.
      if (version[2] <= NO_PAD_BIOFORMATS_VERSION[2]) {
        return true;
      }
    }
  }
  return false;
}

export async function getChannelStats({ data }) {
  // Max/min range.
  const dataRangesTf = tf.tidy(() => {
    const dataRanges = data.map(channel => {
      const dataTensor = tf.tensor1d(new Float32Array(channel));
      const min = tf.min(dataTensor);
      const max = tf.max(dataTensor);
      return [min, max];
    });
    return dataRanges;
  });
  const dataRanges = await Promise.all(
    dataRangesTf.map(async dataRange => {
      const min = await dataRange[0].data();
      const max = await dataRange[1].data();
      return [min[0], max[0]];
    })
  );
  // Mean.
  const channelMeansTf = tf.tidy(() => {
    const channelMeans = data.map(channel => {
      const dataTensor = tf.tensor1d(new Float32Array(channel));
      const mean = tf.mean(dataTensor);
      return mean;
    });
    return channelMeans;
  });
  const means = await Promise.all(
    channelMeansTf.map(async meanTf => {
      const mean = await meanTf.data();
      return mean[0];
    })
  );
  // Standard deviation.
  const channelStandardDeviationsTf = tf.tidy(() => {
    const channelMeans = data.map(channel => {
      // tfjs doesn't have this implemented?
      const dataTensor = tf.tensor1d(new Float32Array(channel));
      const mean = tf.mean(dataTensor);
      const squaredDifferenceSum = tf.sum(
        tf.squaredDifference(dataTensor, mean)
      );
      const standardDeviation = tf.sqrt(
        tf.div(squaredDifferenceSum, dataTensor.shape)
      );
      return standardDeviation;
    });
    return channelMeans;
  });
  const standardDeviations = await Promise.all(
    channelStandardDeviationsTf.map(async standardDeviationTf => {
      const sd = await standardDeviationTf.data();
      return sd[0];
    })
  );
  tf.dispose(dataRanges);
  tf.dispose(channelMeansTf);
  tf.dispose(channelStandardDeviationsTf);
  return { dataRanges, means, standardDeviations, data };
}
