import { useState, useEffect } from 'react';
import {
  createZarrLoader,
  createOMETiffLoader,
  OMEZarrReader
} from '../../src';

import { COLOR_PALLETE, INITIAL_SLIDER_VALUE } from './constants';

export async function createLoader(type, infoObj) {
  switch (type) {
    case 'zarr': {
      const loader = await createZarrLoader(infoObj);
      return loader;
    }
    case 'static': {
      const loader = await createZarrLoader(infoObj);
      return loader;
    }
    case 'ome-zarr': {
      const reader = await OMEZarrReader.fromUrl(infoObj.url);
      const { loader } = await reader.loadOMEZarr();
      return loader;
    }
    case 'static tiff': // These all resolve to the 'tiff' case.
    case 'bf tiff':
    case 'tiff 2':
    case 'covid tiff':
    case 'rgb tiff':
    case 'tiff': {
      const { url } = infoObj;
      const res = await fetch(url.replace(/ome.tif(f?)/gi, 'offsets.json'));
      const offsets = res.status !== 404 ? await res.json() : [];
      const loader = await createOMETiffLoader({ url, offsets });
      return loader;
    }
    default:
      throw Error(`Pyramid type (${type}) is not supported`);
  }
}

export function hexToRgb(hex) {
  // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result.map(d => parseInt(d, 16)).slice(1);
}

export function range(length) {
  return [...Array(length).keys()];
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
      // Changes name and selection for channel by index
      const { name, selection } = value;
      const names = [...state.names];
      const selections = [...state.selections];
      names[index] = name;
      selections[index] = selection;
      return { ...state, names, selections };
    }
    case 'CHANGE_COLOR': {
      // Changes color for individual channel by index
      const colors = [...state.colors];
      colors[index] = value;
      return { ...state, colors };
    }
    case 'CHANGE_SLIDER': {
      // Changes slider for individual channel by index
      const sliders = [...state.sliders];
      sliders[index] = value;
      return { ...state, sliders };
    }
    case 'TOGGLE_ON': {
      // Toggles invidiual channel on and off by index
      const isOn = [...state.isOn];
      isOn[index] = !isOn[index];
      return { ...state, isOn };
    }
    case 'ADD_CHANNEL': {
      // Adds an additional channel
      const { name, selection } = value;
      const names = [...state.names, name];
      const selections = [...state.selections, selection];
      const colors = [...state.colors, [255, 255, 255]];
      const isOn = [...state.isOn, true];
      const sliders = [...state.sliders, INITIAL_SLIDER_VALUE];
      const ids = [...state.ids, String(Math.random())];
      return { names, selections, colors, isOn, sliders, ids };
    }
    case 'REMOVE_CHANNEL': {
      // Remove a single channel by index
      const names = state.names.filter((_, i) => i !== index);
      const sliders = state.sliders.filter((_, i) => i !== index);
      const colors = state.colors.filter((_, i) => i !== index);
      const isOn = state.isOn.filter((_, i) => i !== index);
      const ids = state.ids.filter((_, i) => i !== index);
      const selections = state.selections.filter((_, i) => i !== index);
      return { names, sliders, colors, isOn, ids, selections };
    }
    case 'RESET_CHANNELS': {
      // Clears current channels and sets with new defaults
      const { names, selections } = value;
      const n = names.length;
      return {
        names,
        selections,
        sliders: Array(n).fill(INITIAL_SLIDER_VALUE),
        colors:
          n === 1 ? [[255, 255, 255]] : range(n).map(i => COLOR_PALLETE[i]),
        isOn: Array(n).fill(true),
        ids: range(n).map(() => String(Math.random()))
      };
    }
    default:
      throw new Error();
  }
}
