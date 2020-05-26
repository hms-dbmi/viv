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
 * Pads TypedArray on right and bottom with zeros out to target width
 * and target height respectively.
 * @param {Object} tile { data: TypedArray, width: number, height: number}
 * @param {Object} targetWidth number
 * @param {Object} targetHeight number
 * @returns {TypedArray} TypedArray
 */
export function padTileWithZeros(tile, targetWidth, targetHeight) {
  const { data, width, height } = tile;
  // Create new TypedArray with same constructor as source
  const padded = new data.constructor(targetWidth * targetHeight);
  // Take strips (rows) from original tile data and fill padded tile using
  // multiples of the tileSize as the offset.
  for (let i = 0; i < height; i += 1) {
    const offset = i * width;
    const strip = data.subarray(offset, offset + width);
    padded.set(strip, i * targetWidth);
  }
  return padded;
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
