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

export function padTileWithZeros(tile, tileSize) {
  const { data, width, height } = tile;
  // Create new TypedArray with same constructor as source
  const padded = new data.constructor(tileSize * tileSize);
  // Take (row) strips from original tile data and fill padded tile using
  // multiples of the tileSize as the offset.
  for (let i = 0; i < height; i += 1) {
    const offset = i * width;
    const strip = data.subarray(offset, offset + width);
    padded.set(strip, i * tileSize);
  }
  return padded;
}