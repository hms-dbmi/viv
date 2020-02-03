import {fromUrl, Pool, getDecoder } from 'geotiff/dist/geotiff.bundle.min.js';

async function loadTile({image, channel, x, y, pool}) {
  var tile = await image.getTileOrStrip(x,y, 0, pool)
  var dataObj = {}
  dataObj[channel] = new Uint16Array(tile.data)
  return dataObj
}

export function loadTiff({sourceChannels, x, y, z}){
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

export async function getTiffConnections({sourceChannels, x, y, maxZoom}){
  const tiffConnections = await Object.assign({}, ...Object.keys(sourceChannels).map(async (channel) => {
    var tiff = await fromUrl(sourceChannels[channel])
    var imageObj = {}
    for(var i = 0; i < -maxZoom; i++) {
      var image = await tiff.getImage(i)
      if(!imageObj[channel]) {
        imageObj[channel] = [image]
      } else {
        imageObj[channel].push(image)
      }

    }
    return imageObj
  }))
  return tiffConnections
}
