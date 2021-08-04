/* eslint-disable camelcase */
import create from 'zustand';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import isFunction from 'lodash/isFunction';
import shallow from 'zustand/shallow';
// eslint-disable-next-line import/no-unresolved
import { RENDERING_MODES } from '@hms-dbmi/viv';

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
  loader: [{ labels: [], shape: [] }]
};

const DEFAUlT_CHANNEL_VALUES = {
  isOn: true,
  sliders: [0, 65535],
  colors: [255, 255, 255],
  domains: [0, 65535],
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
  setPropertiesForChannel: (channel, newProperties) =>
    set(state => {
      const entries = Object.entries(newProperties);
      const newState = {};
      entries.forEach(([property, value]) => {
        newState[property] = [...state[property]];
        newState[property][channel] = value;
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
  addChannel: newProperties =>
    set(state => {
      const entries = Object.entries(newProperties);
      const newState = { ...state };
      entries.forEach(([property, value]) => {
        newState[property] = [...state[property], value];
      });
      Object.entries(DEFAUlT_CHANNEL_VALUES).forEach(([k, v]) => {
        if (newState[k].length < newState[entries[0][0]].length) {
          newState[k] = [...state[k], v];
        }
      });
      return newState;
    }),
  addChannels: newProperties =>
    set(state => {
      const entries = Object.entries(newProperties);
      const newState = { ...state };
      entries.forEach(([property, values]) => {
        newState[property] = [...state[property], ...values];
      });
      const numNewChannels = entries[0][1].length;
      Object.entries(DEFAUlT_CHANNEL_VALUES).forEach(([k, v]) => {
        if (!newState[k].length) {
          newState[k] = [
            ...state[k],
            ...Array.from({ length: numNewChannels }).map(() => v)
          ];
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
  resolution: 0,
  isLensOn: false,
  zoomLock: true,
  panLock: true,
  isOverviewOn: false,
  useFixedAxis: true,
  xSlice: null,
  ySlice: null,
  zSlice: null,
  onViewportLoad: () => {}
};

export const useImageSettingsStore = create(set => ({
  ...DEFAULT_IMAGE_STATE,
  ...generateToggles(DEFAULT_IMAGE_STATE, set),
  setImageSetting: newState =>
    set(state => ({
      ...state,
      ...newState
    }))
}));

const DEFAULT_VIEWER_STATE = {
  isChannelLoading: [],
  isViewerLoading: true,
  pixelValues: [],
  isOffsetsSnackbarOn: false,
  loaderErrorSnackbar: {
    on: false,
    message: null
  },
  isNoImageUrlSnackbarOn: false,
  isVolumeRenderingWarningOn: false,
  useLinkedView: false,
  isControllerOn: true,
  use3d: false,
  useLens: false,
  useColormap: false,
  globalSelection: { z: 0, t: 0 },
  channelOptions: [],
  metadata: null,
  viewState: null,
  source: ''
};

export const useViewerStore = create(set => ({
  ...DEFAULT_VIEWER_STATE,
  ...generateToggles(DEFAULT_VIEWER_STATE, set),
  setViewerState: newState =>
    set(state => ({
      ...state,
      ...newState
    })),
  setIsChannelLoading: (index, val) =>
    set(state => {
      const newIsChannelLoading = [...state.isChannelLoading];
      newIsChannelLoading[index] = val;
      return { ...state, isChannelLoading: newIsChannelLoading };
    }),
  addIsChannelLoading: val =>
    set(state => {
      const newIsChannelLoading = [...state.isChannelLoading, val];
      return { ...state, isChannelLoading: newIsChannelLoading };
    }),
  removeIsChannelLoading: index =>
    set(state => {
      const newIsChannelLoading = [...state.isChannelLoading];
      newIsChannelLoading.splice(index, 1);
      return { ...state, isChannelLoading: newIsChannelLoading };
    })
}));
