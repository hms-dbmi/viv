import { slice, openArray } from 'zarr';

var zarrArrays = {}

async function getData({ config, tileSize, x, y, stride, tilingWidth }) {
  const arrSlice = slice(stride * tilingWidth * y + stride * x, stride * tilingWidth * y + stride * (x + 1));
  const zarrKey = config.zarrConfig.store + config.zarrConfig.path;
  if (!zarrArrays[zarrKey]) {
    zarrArrays[zarrKey] = await openArray(config.zarrConfig);
  }
  const arr = zarrArrays[zarrKey];
  const dataSlice = await arr.get([arrSlice]);
  const { data } = dataSlice;
  const { channelType } = config;
  const texObj = {};
  texObj[channelType] = data
  return texObj;
}

export default function loadZarr({ sourceChannels, tileSize, x, y, z, imageWidth }) {
  const tilingWidth = Math.ceil(imageWidth / (tileSize * (2 ** z)));
  const dataNames = ['redData', 'greenData', 'blueData'];
  const configList = sourceChannels.map((channel, i) => ({
    channelName: channel.name,
    channelType: dataNames[i],
    zarrConfig: {
      store: `${channel.tileSource}/`,
      path: `pyramid_${z}.zarr`,
      mode: 'r',
    },
  }));
  const stride = tileSize * tileSize;
  const configListPromises = configList.map((config) => {
    return getData({
      config, tileSize, x, y, stride, tilingWidth,
    });
  });
  return Promise.all(configListPromises).then(list => list);
}
