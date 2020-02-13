import { slice, openArray } from 'zarr';

async function getData({ arr, channel, x, y, stride, tilingWidth }) {
  const arrSlice = slice(
    stride * tilingWidth * y + stride * x,
    stride * tilingWidth * y + stride * (x + 1)
  );
  const dataSlice = await arr.get([arrSlice]);
  const { data } = dataSlice;
  const dataObj = {};
  dataObj[channel] = data;
  return dataObj;
}

export function loadZarr({ connections, tileSize, x, y, z, imageWidth }) {
  const tilingWidth = Math.ceil(imageWidth / (tileSize * 2 ** z));
  const stride = tileSize * tileSize;
  const channelPromises = Object.keys(connections).map(channel => {
    return getData({
      arr: connections[channel][z],
      channel,
      tileSize,
      x,
      y,
      stride,
      tilingWidth
    });
  });
  return Promise.all(channelPromises).then(dataList => {
    const orderedList = [];
    const dataObj = Object.assign({}, ...dataList);
    Object.keys(dataObj)
      .sort()
      .forEach(key => orderedList.push(dataObj[key]));
    return orderedList;
  });
}

export function getZarrConnections({ sourceChannels, maxZoom }) {
  const zarrConnections = Object.keys(sourceChannels).map(async channel => {
    const zarrObj = {};
    const zarrPromiseList = [];
    for (let i = 0; i < -minZoom; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const zarr = openArray({
        store: `${sourceChannels[channel]}/`,
        path: `pyramid_${i}.zarr`,
        mode: 'r'
      });
      zarrPromiseList.push(zarr);
    }
    zarrObj[channel] = await Promise.all(zarrPromiseList);
    return zarrObj;
  });
  return Promise.all(zarrConnections);
}
