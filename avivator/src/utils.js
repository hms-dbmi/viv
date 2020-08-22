import { useState, useEffect } from 'react';
import {
  createOMETiffLoader,
  createBioformatsZarrLoader,
  getChannelStats
} from '../../src';

import { GLOBAL_SLIDER_DIMENSION_FIELDS, COLOR_PALLETE } from './constants';

const MAX_CHANNELS_FOR_SNACKBAR_WARNING = 40;

function isOMETIFF(urlOrFile) {
  if (Array.isArray(urlOrFile)) return false; // local Zarr is array of File Objects
  const name = typeof urlOrFile === 'string' ? urlOrFile : urlOrFile.name;
  return name.includes('ome.tiff') || name.includes('ome.tif');
}

class UnsupportedBrowserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedBrowserError';
  }
}

export async function createLoader(
  urlOrFile,
  handleOffsetsNotFound,
  handleLoaderError
) {
  // If the loader fails to load, handle the error (show an error snackbar).
  // Otherwise load.
  try {
    // OME-TIFF
    if (isOMETIFF(urlOrFile)) {
      if (urlOrFile instanceof File) {
        const loader = await createOMETiffLoader({ urlOrFile });
        return loader;
      }
      const url = urlOrFile;
      const res = await fetch(url.replace(/ome\.tif(f?)/gi, 'offsets.json'));
      const isOffsets404 = res.status === 404;
      const offsets = !isOffsets404 ? await res.json() : [];
      const loader = await createOMETiffLoader({ urlOrFile, offsets });
      // Show a warning if the total number of channels/images exceeds a fixed amount.
      // Non-Bioformats6 pyramids use Image tags for pyramid levels and do not have offsets
      // built in to the format for them, hence the ternary.
      const {
        omexml: { SizeZ, SizeT, SizeC },
        isBioFormats6Pyramid,
        isPyramid
      } = loader;
      const totalImageCount =
        SizeZ *
        SizeT *
        SizeC *
        (isPyramid ? (isBioFormats6Pyramid ? 1 : loader.numLevels) : 1); // eslint-disable-line no-nested-ternary
      if (isOffsets404 && totalImageCount > MAX_CHANNELS_FOR_SNACKBAR_WARNING) {
        handleOffsetsNotFound(true);
      }
      return loader;
    }
    // Bio-Formats Zarr
    if (
      Array.isArray(urlOrFile) &&
      typeof urlOrFile[0].arrayBuffer !== 'function'
    ) {
      throw new UnsupportedBrowserError(
        'Cannot upload a local Zarr with this browser. Try using Chrome, Firefox, or Microsoft Edge.'
      );
    }
    const loader = await createBioformatsZarrLoader({ source: urlOrFile });
    return loader;
  } catch (e) {
    if (e instanceof UnsupportedBrowserError) {
      handleLoaderError(e.message);
    } else {
      handleLoaderError(true);
    }
    return null;
  }
}

// Get the last part of a url (minus query parameters) to be used
// as a display name for avivator.
export function getNameFromUrl(url) {
  return url
    .split('?')[0]
    .split('/')
    .slice(-1)[0];
}

// Return the midpoint of the global dimensions as a default selection.
function getDefaultGlobalSelection(imageDims) {
  const globalIndices = imageDims.filter(dim =>
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dim.field)
  );
  const selection = {};
  globalIndices.forEach(dim => {
    selection[dim.field] = Math.floor((dim.values.length || 0) / 2);
  });
  return selection;
}

// Create a default selection using the midpoint of the available global dimensions,
// and then the first four available selections from the first selectable channel.
export function buildDefaultSelection(imageDims) {
  const selection = [];
  const globalSelection = getDefaultGlobalSelection(imageDims);
  // First non-global dimension with some sort of selectable values.
  const firstNonGlobalDimension = imageDims.filter(
    dim => !GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dim.field) && dim.values
  )[0];
  for (
    let i = 0;
    i < Math.min(4, firstNonGlobalDimension.values.length);
    i += 1
  ) {
    selection.push({
      [firstNonGlobalDimension.field]: i,
      ...globalSelection
    });
  }
  return selection;
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
      const { selection, domain, slider } = value;
      const selections = [...state.selections];
      selections[index] = selection;
      const domains = [...state.domains];
      domains[index] = domain;
      const sliders = [...state.sliders];
      sliders[index] = slider;
      return { ...state, selections, domains, sliders };
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
      const { selection, domain, slider } = value;
      const selections = [...state.selections, selection];
      const colors = [...state.colors, [255, 255, 255]];
      const isOn = [...state.isOn, true];
      const sliders = [...state.sliders, slider];
      const ids = [...state.ids, String(Math.random())];
      const domains = [...state.domains, domain];
      return { selections, domains, colors, isOn, sliders, ids };
    }
    case 'REMOVE_CHANNEL': {
      // Remove a single channel by index
      const sliders = state.sliders.filter((_, i) => i !== index);
      const colors = state.colors.filter((_, i) => i !== index);
      const isOn = state.isOn.filter((_, i) => i !== index);
      const ids = state.ids.filter((_, i) => i !== index);
      const selections = state.selections.filter((_, i) => i !== index);
      const domains = state.domains.filter((_, i) => i !== index);
      return { sliders, colors, isOn, ids, domains, selections };
    }
    case 'RESET_CHANNELS': {
      // Clears current channels and sets with new defaults
      const { selections, sliders, domains, colors, isOn } = value;
      const n = selections.length;
      return {
        selections,
        sliders,
        domains,
        colors: colors || selections.map((sel, i) => COLOR_PALLETE[i]),
        isOn: isOn || Array(n).fill(true),
        ids: range(n).map(() => String(Math.random()))
      };
    }
    default:
      throw new Error();
  }
}

export async function getSingleSelectionStats({ loader, selection }) {
  const [selectionStats] = await getChannelStats({
    loader,
    loaderSelection: [selection]
  });
  const { domain, autoSliders: slider } = selectionStats;
  return { domain, slider };
}
