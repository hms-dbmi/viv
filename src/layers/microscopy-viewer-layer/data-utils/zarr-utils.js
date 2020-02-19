import { openArray } from 'zarr';
import { range } from '../utils';

function decodeChannels({ data, shape }) {
  const offset = data.length / shape[0];
  const tileData = range(shape[0]).map(i =>
    data.subarray(offset * i, offset * i + offset)
  );
  return tileData;
}

export async function loadZarr({ connections, x, y, z }) {
  const tile = await connections[z].getRawChunk([0, y, x]);
  const tiles = decodeChannels(tile);
  return tiles;
}

export async function initZarr({ sourceChannels, minZoom }) {
  const rootZarrUrl = Object.values(sourceChannels)[0]; // all are the same so get first

  // Known issue with how zarr.js does string concatenation for urls
  // The prefix gets chunked off for some reason and must be repeating in the config.
  // https://github.com/gzuidhof/zarr.js/issues/36
  const prefix = rootZarrUrl.split('/').slice(-1)[0];

  // Not necessary but this is something we should be parsing from metadata
  const maxLevel = -minZoom;

  const zarrStores = range(maxLevel).map(i => {
    const config = {
      store: rootZarrUrl,
      path: `${prefix}/${String(i).padStart(2, '0')}`,
      mode: 'r'
    };
    return openArray(config);
  });
  const connections = await Promise.all(zarrStores);

  // Get other properties for image viewer

  // Somewhat hard coded for now, but good to keep all this logic in the data loaders so we can edit in the future.
  const baseLayer = connections[0]; // shape [4, 36040, 52660]
  // last two dimensions of the 3D array are width and height
  const [imageHeight, imageWidth] = baseLayer.shape.slice(1);
  // chunks are [4, 512, 512], grab last dimentsion. Maybe add check for if last two are the same?
  const tileSize = baseLayer.chunks.slice(-1)[0];

  // Ideally we will also have metadata here about the minZoom so it's not a parameter supplied in App.js
  return { connections, imageHeight, imageWidth, tileSize, minZoom };
}
