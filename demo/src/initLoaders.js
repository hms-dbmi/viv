import { openArray } from 'zarr';
import {
  createTiffPyramid,
  createZarrPyramid,
  ZarrLoader,
  createTiffLoader
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
      const loader = await createTiffLoader({ url });
      loader.chunkIndex = [
        { z: 0, t: 0, c: loader.channelNames[0] },
        { z: 0, t: 0, c: loader.channelNames[1] },
        { z: 0, t: 0, c: loader.channelNames[2] },
        { z: 0, t: 0, c: loader.channelNames[3] }
      ];
      return loader;
    }
    default:
      throw Error(`Pyramid type (${type}) is not supported`);
  }
}
