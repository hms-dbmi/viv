/* eslint-disable camelcase */
import create from 'zustand';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import isFunction from 'lodash/isFunction';
import shallow from 'zustand/shallow';
import { _SphericalCoordinates as SphericalCoordinates } from '@math.gl/core';
import { Plane } from '@math.gl/culling';
// eslint-disable-next-line import/no-unresolved
import { RENDERING_MODES } from '@hms-dbmi/viv';

const keysAndValuesToObject = (keys, values) => {
  const merged = keys.map((k, i) => [k, values[i]]);
  return Object.fromEntries(merged);
};

const captialize = string => string.charAt(0).toUpperCase() + string.slice(1);

const generateToggles = (defaults, set) => {
  const toggles = {};
  Object.entries(defaults).forEach(([k, v]) => {
    if (typeof v === 'boolean') {
      toggles[`toggle${captialize(k)}`] = () =>
        set(state => ({
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

export const useChannelsStore = create(set => ({
  ...DEFAUlT_CHANNEL_STATE,
  ...generateToggles(DEFAUlT_CHANNEL_VALUES, set),
  toggleIsOn: index =>
    set(state => {
      const isOn = [...state.isOn];
      isOn[index] = !isOn[index];
      return { ...state, isOn };
    }),
  setLoader: loader => set(state => ({ ...state, loader })),
  setPropertyForChannel: (channel, property, value) =>
    set(state => {
      const values = [...state[property]];
      values[channel] = value;
      return { ...state, [property]: values };
    }),
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
  setPropertyForChannels: (channels, property, values) =>
    set(state => {
      const newValues = [...state[property]];
      channels.forEach((channelIndex, j) => {
        newValues[channelIndex] = values[j];
      });
      return { ...state, [property]: newValues };
    }),
  setPropertiesForChannels: (channels, properties, values) =>
    set(state => {
      const newState = { ...state };
      properties.forEach((property, propertyIndex) => {
        channels.forEach(channel => {
          newState[property][channel] = values[propertyIndex][channel];
        });
      });
      return { ...state, ...newState };
    }),
  removeChannel: channel =>
    set(state => {
      const newState = {};
      const channelKeys = Object.keys(DEFAUlT_CHANNEL_VALUES);
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
    }),
  resetChannels: () => set(state => ({ ...state, ...DEFAUlT_CHANNEL_STATE }))
}));

export const useChannelSettings = () =>
  useChannelsStore(
    state => pick(state, Object.keys(DEFAUlT_CHANNEL_STATE)),
    shallow
  );

export const useChannelSetters = () =>
  useChannelsStore(state => pickBy(state, isFunction), shallow);

const DEFAULT_IMAGE_STATE = {
  lensSelection: 0,
  colormap: '',
  renderingMode: RENDERING_MODES.MAX_INTENSITY_PROJECTION,
  clippingPlaneSphericalNormals: [new SphericalCoordinates()],
  clippingPlaneDistances: [0],
  resolution: 0,
  isLensOn: false,
  zoomLock: true,
  panLock: true,
  isOverviewOn: false,
  isNormalPositive: true
};

export const useImageSettingsStore = create(set => ({
  ...DEFAULT_IMAGE_STATE,
  ...generateToggles(DEFAULT_IMAGE_STATE, set),
  setImageSetting: (property, value) =>
    set(state => ({
      ...state,
      [property]: value
    })),
  setClippingPlaneSettings: (index, prop, val) =>
    set(state => {
      if (!['radius', 'theta', 'phi'].includes(prop)) {
        throw new Error(`prop ${prop} for setting clipping plane not found`);
      }
      const newState = {};
      newState.clippingPlaneSphericalNormals = [
        ...state.clippingPlaneSphericalNormals
      ];
      newState.clippingPlaneDistances = [...state.clippingPlaneDistances];
      const newSpherical = state.clippingPlaneSphericalNormals[index];
      let newDistance = state.clippingPlaneDistances[index];
      if (['theta', 'phi'].includes(prop)) {
        newSpherical[prop] = val;
      } else {
        newDistance = val;
      }
      newState.clippingPlaneSphericalNormals[index] = newSpherical;
      newState.clippingPlaneDistances[index] = newDistance;
      return { ...state, ...newState };
    })
}));

const DEFAULT_VIEWER_STATE = {
  isLoading: true,
  pixelValues: [],
  isOffsetsSnackbarOn: false,
  loaderErrorSnackbar: {
    on: false,
    message: null
  },
  isNoImageUrlSnackbarOn: false,
  useLinkedView: false,
  isControllerOn: true,
  use3d: false,
  useLens: false,
  useColormap: false,
  globalSelection: { z: 0, t: 0 },
  channelOptions: [],
  metadata: null,
  source: ''
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
