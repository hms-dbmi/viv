/* eslint-disable camelcase */
import create from 'zustand';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import isFunction from 'lodash/isFunction';
import shallow from 'zustand/shallow';

import { RENDERING_MODES } from '../../dist';
import { getSingleSelectionStats } from './utils';

const keysAndValuesToObject = (keys, values) => {
  const merged = keys.map((k, i) => [k, values[i]]);
  return Object.fromEntries(merged);
};

const captialize = string => string.charAt(0).toUpperCase() + string.slice(1);

const generateToggles = (defaults, set) => {
  const toggles = {};
  Object.entries(defaults).forEach((k, v) => {
    if (typeof v === 'boolean') {
      toggles[`toggle${captialize(k)}`] = set(state => ({
        ...state,
        [k]: !state[k]
      }));
    }
  });
  return toggles;
};

const DEFAUlT_CHANNEL_STATE = {
  isOn: [],
  sliders: [],
  colors: [],
  domains: [],
  selections: [],
  ids: [],
  loader: []
};

const DEFAUlT_CHANNEL_VALUES = {
  isOn: true,
  sliders: [0, 255],
  colors: [255, 255, 255],
  domains: [0, 255],
  selections: { z: 0, c: 0, t: 0 },
  ids: ''
};

export const useChannelsStore = create((set, get) => ({
  ...DEFAUlT_CHANNEL_STATE,
  toggleIsOn: channel =>
    set(state => {
      const isOn = [...state.isOn];
      isOn[channel] = !state.isOn[channel];
      return { ...state, isOn };
    }),
  setLoader: loader => set(state => ({ ...state, loader })),
  setPropertyForChannel: async (channel, property, value) => {
    if (property === 'selections') {
      const { loader } = get();
      const { domain, slider } = await getSingleSelectionStats({
        loader: loader[loader.length - 1],
        selection: value
      });
      set(state => {
        const newState = {};
        [
          [property, value],
          ['domains', domain],
          ['sliders', slider]
        ].forEach(([prop, val]) => {
          const values = [...state[prop]];
          values[channel] = val;
          newState[prop] = values;
        });
        return { ...state, ...newState };
      });
    } else {
      set(state => {
        const values = [...state[property]];
        values[channel] = value;
        return { ...state, [property]: values };
      });
    }
  },
  setPropertiesForChannel: (channel, properties, values) =>
    set(state => {
      const oldStateValuesForProperties = properties.map(property => [
        ...state[property]
      ]);
      const newStateValuesForProperties = oldStateValuesForProperties.map(
        (v, j) => {
          const oldValues = [...v];
          oldValues[channel] = values[j];
          return oldValues;
        }
      );
      const zipped = keysAndValuesToObject(
        properties,
        newStateValuesForProperties
      );
      return { ...state, ...zipped };
    }),
  setPropertyForChannels: async (channels, property, values) => {
    if (property === 'selections') {
      const stats = await Promise.all(
        channels.map((_, j) =>
          getSingleSelectionStats({
            loader: get().loader,
            selection: values[j]
          })
        )
      );
      const domains = stats.map(stat => stat.domain);
      const sliders = stats.map(stat => stat.slider);
      set(state => {
        const newState = {};
        [
          [property, values],
          ['domains', domains],
          ['sliders', sliders]
        ].forEach(([prop, vals]) => {
          const newValues = [...state[prop]];
          channels.forEach((channelIndex, j) => {
            newValues[channelIndex] = vals[j];
          });
          newState[prop] = newValues;
        });
        return { ...state, ...newState };
      });
    }
    set(state => {
      const newValues = [...state[property]];
      channels.forEach((channelIndex, j) => {
        newValues[channelIndex] = values[j];
      });
      return { ...state, [property]: newValues };
    });
  },
  setPropertiesForChannels: (channels, properties, values) =>
    set(state => {
      const newState = { ...state };
      properties.forEach((property, propertyIndex) => {
        channels.forEach(channel => {
          newState[property][channel] = values[propertyIndex][channel];
        });
      });
      return newState;
    }),
  removeChannel: channel =>
    set(state => {
      const newState = {};
      const channelKeys = Object.keys(DEFAUlT_CHANNEL_STATE);
      Object.keys(state).forEach(key => {
        if (channelKeys.includes(key)) {
          newState[key] = state[key].filter((_, j) => j !== channel);
        }
      });
      return { ...state, ...newState };
    }),
  addChannel: (properties, values) =>
    set(state => {
      const newState = { ...state };
      properties.forEach((property, j) => {
        newState[property] = [...state[property], values[j]];
      });
      Object.entries(DEFAUlT_CHANNEL_VALUES).forEach(([k, v]) => {
        if (newState[k].length < newState[properties[0]].length) {
          newState[k] = [...state[k], v];
        }
      });
      return newState;
    }),
  addChannels: (properties, values) =>
    set(state => {
      const newState = { ...state };
      properties.forEach((property, j) => {
        newState[property] = values[j];
      });
      const numNewChannels = values[0].length;
      Object.entries(DEFAUlT_CHANNEL_VALUES).forEach(([k, v]) => {
        if (!newState[k].length) {
          newState[k] = Array.from({ length: numNewChannels }).map(() => v);
        }
      });
      return newState;
    })
}));

export const useChannelSettings = () =>
  useChannelsStore(
    state => pick(state, Object.keys(DEFAUlT_CHANNEL_VALUES)),
    shallow
  );

export const useChannelSetters = () =>
  useChannelsStore(state => pickBy(state, isFunction), shallow);

const DEFAULT_IMAGE_STATE = {
  lensSelection: 0,
  colormap: '',
  renderingMode: RENDERING_MODES.MAX_INTENSITY_PROJECTION,
  xSlice: [0, 1],
  ySlice: [0, 1],
  zSlice: [0, 1],
  resolution: 0,
  isLensOn: false
};

export const useImageSettingsStore = create(set => ({
  ...DEFAULT_IMAGE_STATE,
  ...generateToggles(DEFAULT_IMAGE_STATE, set),
  setImageSetting: (property, value) =>
    set(state => ({
      ...state,
      [property]: value
    }))
}));

const DEFAULT_VIEWER_STATE = {
  isLoading: true,
  pixelValues: [],
  offsetsSnackbarOn: false,
  loaderErrorSnackbar: {
    on: false,
    message: null
  },
  noImageUrlSnackbarIsOn: false,
  useLinkedView: false,
  overviewOn: false,
  controllerOn: true,
  zoomLock: true,
  panLock: true,
  isLensOn: false,
  use3d: false
};

export const useViewerStore = create(set => ({
  ...DEFAULT_VIEWER_STATE,
  ...generateToggles(DEFAULT_VIEWER_STATE, set),
  setViewerState: (property, value) =>
    set(state => ({
      ...state,
      [property]: value
    }))
}));
