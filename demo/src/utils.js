import { useState, useEffect } from 'react';
import { createTiffPyramid, createZarrLoader } from '../../src';

export const DEFAULT_COLOR_PALLETE = [
  [0, 0, 255],
  [0, 255, 0],
  [255, 0, 0],
  [255, 255, 0],
  [255, 128, 0],
  [255, 0, 255],
  [0, 255, 255],
  [255, 255, 255]
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
      const channelUrls = channelNames.map(channel => {
        // TODO : Need to fix name is source Hoechst is misspelled
        const typoFixedChannel =
          channel.slice(0, 4) === 'DAPI' ? 'DAPI - Hoescht (nuclei)' : channel;
        return `${url}/${typoFixedChannel}.ome.tiff`;
      });
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
      const { name, selection } = value;
      const names = [...state.names];
      const selections = [...state.selections];
      names[index] = name;
      selections[index] = selection;
      return { ...state, names, selections };
    }
    case 'CHANGE_COLOR': {
      const colors = [...state.colors];
      colors[index] = value;
      console.log('in colors!');
      console.log(colors);
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
    case 'ADD_CHANNEL': {
      const { name, selection, color } = value;
      const nextState = { ...state };
      nextState.names.push(name);
      nextState.selections.push(selection);
      nextState.colors.push(color);
      nextState.isOn.push(true);
      nextState.sliders.push([0, 20000]);
      nextState.ids.push(String(Math.random()));
      return nextState;
    }
    case 'REMOVE_CHANNEL': {
      const names = state.names.filter((_, i) => i !== index);
      const sliders = state.sliders.filter((_, i) => i !== index);
      const colors = state.colors.filter((_, i) => i !== index);
      const isOn = state.isOn.filter((_, i) => i !== index);
      const ids = state.ids.filter((_, i) => i !== index);
      const selections = state.selections.filter((_, i) => i !== index);
      return { names, sliders, colors, isOn, ids, selections };
    }
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
