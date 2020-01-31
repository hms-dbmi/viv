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
  const { channelName } = config;
  const dataObj = {}
  dataObj[channelName] = data
  return dataObj;
}

export default function loadZarr({ sourceChannels, tileSize, x, y, z, imageWidth }) {
  const tilingWidth = Math.ceil(imageWidth / (tileSize * (2 ** z)));
  const dataNames = ['redData', 'greenData', 'blueData']; // denotes order rgb
  const configList = Object.keys(sourceChannels).map((channel, i) => ({
    channelName: channel,
    channelType: dataNames[i],
    zarrConfig: {
      store: `${sourceChannels[channel]}/`,
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
  return Promise.all(configListPromises).then((dataList) => {
    const orderedList = []
    const dataObj = Object.assign({}, ...dataList)
    Object.keys(dataObj).sort().forEach(function(key) {
      orderedList.push(dataObj[key]);
    })
    return orderedList;
  });
}
