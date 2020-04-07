import { useState, useEffect } from 'react';

import { createTiffPyramid, createZarrLoader } from '../../src';

export async function createLoader(type, infoObj) {
  switch (type) {
    case 'zarr': {
      const loader = await createZarrLoader(infoObj);
      return loader;
    }
    case 'tiff': {
      const { url, dimensions } = infoObj;
      const channelNames = dimensions[0].values;
      const channelUrls = channelNames.map(
        channel => `${url}/${channel}.ome.tiff`
      );
      const loader = await createTiffPyramid({ channelUrls });
      return loader;
    }
    case 'static': {
      const loader = await createZarrLoader(infoObj);
      return loader;
    }
    default:
      throw Error(`Pyramid type (${type}) is not supported`);
  }
}

export function useWindowSize(scaleWidth = 1, scaleHeight = 1) {
  function getSize() {
    return {
      width: window.innerWidth * scaleWidth,
      height: window.innerHeight * scaleHeight
    };
  }

  const [windowSize, setWindowSize] = useState(getSize());

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getSize());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  return windowSize;
}
