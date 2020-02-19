// eslint-disable-next-line import/extensions
import { fromUrl } from 'geotiff/dist/geotiff.bundle.min.js';
import { range } from '../utils';

async function getChannelConnections(channelUrl) {
  const tiff = await fromUrl(channelUrl);
  // Get the first image and check its size.
  const pyramid = await tiff.parseFileDirectories();
  const maxLevel = pyramid.length;
  const pyramidLevels = range(maxLevel).map(i => tiff.getImage(i));
  const resolvedConnections = await Promise.all(pyramidLevels);
  return resolvedConnections;
}

async function loadTile({ image, x, y, pool }) {
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

export async function loadTiff({ connections, x, y, z, pool }) {
  const channelPyramids = Object.values(connections);
  const tileRequests = channelPyramids.map(channelPyramid => {
    const image = channelPyramid[z];
    return loadTile({ image, x, y, pool });
  });
  const tiles = await Promise.all(tileRequests);
  return tiles;
}

export async function initTiff({ sourceChannels }) {
  const channelNames = Object.keys(sourceChannels);
  const channelUrls = Object.values(sourceChannels);

  // Open and resolve all connections asynchronously
  const tiffConnections = channelUrls.map(url => getChannelConnections(url));
  const resolvedTiffConnections = await Promise.all(tiffConnections);

  // Map connections to channel keys
  const connections = Object.fromEntries(
    resolvedTiffConnections.map((connection, i) => [
      channelNames[i],
      connection
    ])
  );

  // Get other properties for viewer
  const firstFullImage = resolvedTiffConnections[0][0].fileDirectory;

  /*
   * These are the required return objects for setting state in the imaging layer.
   * It is the responsibility of the .init<DataType> function to determine
   * the appropriate values are for:
   *
   *    connections, minZoom, imageWidth, imageHeight, and tileSize
   *
   * All logic for determining these parameters should be carried out in this util function.
   */
  const minZoom = -1 * resolvedTiffConnections[0].length;
  const imageWidth = firstFullImage.ImageWidth;
  const imageHeight = firstFullImage.ImageLength;
  const tileSize = firstFullImage.TileWidth;

  return { connections, minZoom, imageWidth, imageHeight, tileSize };
}
