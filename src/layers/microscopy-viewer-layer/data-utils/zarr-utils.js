/* eslint-disable import/no-extraneous-dependencies */
import { openArray } from 'zarr'

const emptyTile = new Uint32Array(512 * 512);

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
  const img = connections[ "Cy3 - Synaptopodin (glomerular)"][z];
  try {
    const tile = await img.getRawChunk([0, y, x]);
    const tiles = decodeChannels(tile);
    return tiles
  } catch(error) {
    // const empty = [emptyTile, emptyTile, emptyTile, emptyTile]
    // return empty
    throw new error
  }
}

export async function getZarrConnections({ sourceChannels }) {
  const rootZarrUrl = Object.values(sourceChannels)[0]; // all are the same
  // Known issue with how zarr.js does string concatenation for urls
  // The prefix gets chunked off for some reason and must be repeating in the config.
  // https://github.com/gzuidhof/zarr.js/issues/36
  const prefix = rootZarrUrl.split('/').slice(-1)[0];
  const minZoom = -8;
  const pyramidConn = [];
  for (let i = 0; i < -minZoom; i += 1) {
    const config = {
      store: rootZarrUrl,
      path: `${prefix}/${String(i).padStart(2, "0")}`,
      mode: 'r'
    }
    const z = openArray(config);
    pyramidConn.push(z)
  }
  const imgPyramid = await Promise.all(pyramidConn);
  window.pyr = imgPyramid
  // eslint-disable-next-line no-restricted-syntax
  const output = []
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(sourceChannels)) {
    const obj = {};
    obj[key] = imgPyramid;
    output.push(obj)
  }
  return output;
}
