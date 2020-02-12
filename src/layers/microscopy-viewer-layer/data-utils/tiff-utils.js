// eslint-disable-next-line import/extensions
import { fromUrl } from 'geotiff/dist/geotiff.bundle.min.js';

async function loadTile({ image, channel, x, y, pool }) {
  const tile = await image.getTileOrStrip(x, y, 0, pool);
  const dataObj = {};
  const is8Bits = image.fileDirectory.BitsPerSample[0] === 8;
  const is16Bits = image.fileDirectory.BitsPerSample[0] === 16;
  const is32Bits = image.fileDirectory.BitsPerSample[0] === 32;
  dataObj[channel] =
    (is8Bits && new Uint8Array(tile.data)) ||
    (is16Bits && new Uint16Array(tile.data)) ||
    (is32Bits && new Uint32Array(tile.data));
  return dataObj;
}

export function loadTiff({ connections, x, y, z, pool }) {
  const configListPromises = Object.keys(connections).map(channel => {
    const image = connections[channel][z];
    return loadTile({ image, channel, x, y, pool });
  });
  return Promise.all(configListPromises).then(dataList => {
    const orderedList = [];
    const dataObj = Object.assign({}, ...dataList);
    Object.keys(dataObj)
      .sort()
      .forEach(key => {
        orderedList.push(dataObj[key]);
      });
    return orderedList;
  });
}

export function getTiffConnections({ sourceChannels, maxZoom }) {
  const tiffConnections = Object.keys(sourceChannels).map(async channel => {
    const tiff = await fromUrl(sourceChannels[channel]);
    const imageObj = {};
    const imagePromiseList = [];
    for (let i = 0; i < -maxZoom; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const imagePromise = tiff.getImage(i);
      imagePromiseList.push(imagePromise);
    }
    imageObj[channel] = await Promise.all(imagePromiseList);
    return imageObj;
  });
  return Promise.all(tiffConnections);
}
