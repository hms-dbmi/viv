import { createTiffPyramid, createZarrPyramid } from '../../src';

export async function initPyramidLoader(type, { channelNames, url, minZoom }) {
  if (type === 'zarr' || type === 'static') {
    const loader = await createZarrPyramid({
      minZoom,
      rootZarrUrl: url,
      isRgb: false,
      scale: 1,
      dimensions: {
        channels: channelNames,
        y: null,
        x: null
      }
    });
    return loader;
  }
  if (type === 'tiff') {
    const channelUrls = channelNames.map(
      channel => `${url}${channel}.ome.tiff`
    );
    const loader = await createTiffPyramid({ channelNames, channelUrls });
    return loader;
  }
  throw Error(`Pyramid type (${type}) is not supported`);
}
