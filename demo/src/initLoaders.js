import { openArray } from 'zarr';
import {
  createTiffPyramid,
  createZarrPyramid,
  ZarrLoader,
  createOMETiffLoader
} from '../../src';

export async function initPyramidLoader(type, { channelNames, url, minZoom }) {
  switch (type) {
    case 'zarr': {
      const loader = await createZarrPyramid({
        minZoom,
        rootZarrUrl: url,
        dimensions: {
          channel: channelNames,
          y: null,
          x: null
        }
      });
      return loader;
    }
    case 'tiff': {
      const channelUrls = channelNames.map(
        channel => `${url}${channel}.ome.tiff`
      );
      const loader = await createTiffPyramid({ channelUrls });
      return loader;
    }
    case 'static': {
      const config = { store: url };
      const connection = await openArray(config);
      const isRgb = false;
      const scale = 1;
      const dimensions = {
        mz: null,
        y: null,
        x: null
      };
      const loader = new ZarrLoader(connection, isRgb, scale, dimensions);
      loader.setChunkIndex('mz', 1);
      return loader;
    }
    case 'static tiff': {
      const loader = await createOMETiffLoader({ url });
      loader.chunkIndex = [
        { z: 0, t: 0, c: loader.channelNames[4] },
        { z: 0, t: 0, c: loader.channelNames[5] },
        { z: 0, t: 0, c: loader.channelNames[6] },
        { z: 0, t: 0, c: loader.channelNames[7] }
      ];
      return loader;
    }
    default:
      throw Error(`Pyramid type (${type}) is not supported`);
  }
}
