/* eslint-disable import/no-extraneous-dependencies */
import { openArray } from 'zarr'

function decodeChannels({ data, shape }) {
  const offset = data.length / shape[0];
  const tileData = [];
  for (let i = 0; i < shape[0]; i += 1) {
    const channelData = data.subarray(offset * i, offset * i + offset);
    tileData.push(channelData);
  }
  return tileData;
}

export async function loadZarr({ connections, x, y, z }) {
  const tile = await connections[z].getRawChunk([0, y, x]);
  const tiles = decodeChannels(tile);
  console.log(tiles)
  return tiles
}

export async function initZarr({ sourceChannels }) {
  const rootZarrUrl = Object.values(sourceChannels)[0]; // all are the same so get first

  // Known issue with how zarr.js does string concatenation for urls
  // The prefix gets chunked off for some reason and must be repeating in the config.
  // https://github.com/gzuidhof/zarr.js/issues/36
  const prefix = rootZarrUrl.split('/').slice(-1)[0];
  const maxLevel = 8;

  const pyramidConn = [];
  for (let i = 0; i < maxLevel; i += 1) {
    const config = {
      store: rootZarrUrl,
      path: `${prefix}/${String(i).padStart(2, "0")}`,
      mode: 'r'
    }
    const z = openArray(config);
    pyramidConn.push(z)
  }
  const connections = await Promise.all(pyramidConn);

  // Somewhat hard coded for now, but good to keep all this logic in the data loaders so we can edit in the future.
  const baseLayer = connections[0];
  const [imageHeight, imageWidth] = baseLayer.shape.slice(1);
  const tileSize = baseLayer.chunks.slice(-1)[0];

  return { connections, imageHeight, imageWidth, tileSize, minZoom: -maxLevel }
}
