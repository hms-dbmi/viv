
export function tileToBoundingBox({
  x, y, z, imageHeight, imageWidth, tileSize,
}) {
  return {
    west: (x * tileSize) * (2 ** (-1 * z)),
    north: (y * tileSize) * (2 ** (-1 * z)),
    east: Math.min(imageWidth, ((x + 1) * tileSize) * (2 ** (-1 * z))),
    south: Math.min(imageHeight, ((y + 1) * tileSize) * (2 ** (-1 * z))),
  };
}

function getBoundingBox(viewport) {
  const corners = [
    ...viewport.unproject([0, 0]),
    ...viewport.unproject([viewport.width, viewport.height]),
  ];
  return corners;
}

function pixelsToTileIndex(pixelCount, z, tileSize) {
  return pixelCount / (tileSize * (2 ** -z));
}

/**
 * Returns all tile indices in the current viewport. If the current zoom level is smaller
 * than minZoom, return an empty array. If the current zoom level is greater than maxZoom,
 * return tiles that are on maxZoom.
 */
export function getTileIndices({
  viewport, minZoom, tileSize, imageWidth, imageHeight,
}) {
  const z = Math.min(0, Math.ceil(viewport.zoom));
  const scale = tileSize * (2 ** (-1 * z));
  const maxXTilePossible = Math.round(imageWidth / scale);
  const maxYTilePossible = Math.round(imageHeight / scale);
  if (z <= minZoom) {
    return [{ x: 0, y: 0, z: minZoom }];
  }
  const bbox = getBoundingBox(viewport);
  const [minX, minY, maxX, maxY] = bbox.map(pixels => pixelsToTileIndex(pixels, z, tileSize));
  /*
      |  TILE  |  TILE  |  TILE  |
        |(minX)                 |(maxX)
      |(roundedMinX)             |(roundedMaxX)
   */
  const roundedMinX = Math.max(0, Math.floor(minX));
  const roundedMaxX = Math.min(maxXTilePossible, Math.max(0, Math.ceil(maxX)));
  const roundedMinY = Math.max(0, Math.floor(minY));
  const roundedMaxY = Math.min(maxYTilePossible, Math.max(0, Math.ceil(maxY)));

  const indices = [];
  for (let x = roundedMinX; x < roundedMaxX; x += 1) {
    for (let y = roundedMinY; y < roundedMaxY; y += 1) {
      indices.push({ x, y, z });
    }
  }
  return indices;
}
