async function getChannel({ image, x, y, pool }) {
  const tile = await image.getTileOrStrip(x, y, 0, pool);
  const is8Bits = image.fileDirectory.BitsPerSample[0] === 8;
  const is16Bits = image.fileDirectory.BitsPerSample[0] === 16;
  const is32Bits = image.fileDirectory.BitsPerSample[0] === 32;
  const data =
    (is8Bits && new Uint8Array(tile.data)) ||
    (is16Bits && new Uint16Array(tile.data)) ||
    (is32Bits && new Uint32Array(tile.data));
  return data;
}

export default class TiffPyramidLoader {
  constructor(channelPyramids, channelNames) {
    this.channelPyramids = channelPyramids;
    this.channelNames = channelNames;
  }

  get vivMetadata() {
    // Get other properties for viewer
    const firstFullImage = this.channelPyramids[0][0].fileDirectory;
    const minZoom = -1 * this.channelPyramids[0].length;
    const imageWidth = firstFullImage.ImageWidth;
    const imageHeight = firstFullImage.ImageLength;
    const tileSize = firstFullImage.TileWidth;
    return { minZoom, imageWidth, imageHeight, tileSize }
  }

  async getTile({ x, y, z, pool }) {
    const tileRequests = this.channelPyramids.map(channelPyramid => {
      const image = channelPyramid[z];
      return getChannel({ image, x, y, pool });
    });
    const tiles = await Promise.all(tileRequests);
    return tiles;
  }
}