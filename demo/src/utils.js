import { useState, useEffect } from 'react';

import { createTiffPyramid, createZarrLoader } from '../../src';
import { range } from '../../src/layers/VivViewerLayer/utils';

const DEFAULT_COLOR_PALLETE = [
  [0, 0, 255],
  [0, 255, 0],
  [255, 0, 0],
  [255, 128, 0],
  [255, 0, 255],
  [0, 255, 255]
];

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

export function channelsReducer(state, { index, value, type }) {
  switch (type) {
    case 'CHANGE_CHANNEL': {
      const names = [...state.names];
      names[index] = value;
      return { ...state, names };
    }
    case 'CHANGE_COLOR': {
      const colors = [...state.colors];
      colors[index] = value;
      return { ...state, colors };
    }
    case 'CHANGE_SLIDER': {
      const sliders = [...state.sliders];
      sliders[index] = value;
      return { ...state, sliders };
    }
    case 'TOGGLE_ON': {
      const isOn = [...state.isOn];
      isOn[index] = !isOn[index];
      return { ...state, isOn };
    }
    // case 'ADD_CHANNEL': {

    // }
    case 'RESET_CHANNELS': {
      const { names, selections = [] } = value;
      const n = names.length;
      return {
        names,
        selections,
        sliders: Array(n).fill([0, 20000]),
        colors: range(n).map(i => DEFAULT_COLOR_PALLETE[i]),
        isOn: Array(n).fill(true),
        ids: range(n).map(() => String(Math.random()))
      };
    }
    default:
      throw new Error();
  }
}
