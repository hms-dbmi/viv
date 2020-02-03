import {fromUrl, Pool, getDecoder } from 'geotiff/dist/geotiff.bundle.min.js';

async function loadTile({image, channel, x, y, pool}) {
  var tile = await image.getTileOrStrip(x,y, 0, pool)
  var dataObj = {}
  dataObj[channel] = new Uint16Array(tile.data)
  return dataObj
}

export default function loadTiff({sourceChannels, x, y, z}){
  const pool = new Pool();
  const configListPromises = Object.keys(sourceChannels).map(async (channel) => {
    var tiff = await fromUrl(sourceChannels[channel])
    var image = await tiff.getImage(z)
    return loadTile({image, channel, x, y, pool})
  })
  return Promise.all(configListPromises).then((dataList) => {
    const orderedList = []
    const dataObj = Object.assign({}, ...dataList)
    Object.keys(dataObj).sort().forEach(function(key) {
      orderedList.push(dataObj[key]);
    })
    return orderedList;
  });
}
