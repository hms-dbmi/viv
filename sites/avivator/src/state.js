import { createContext, useContext, useRef, createElement } from 'react';
import { RENDERING_MODES } from '@hms-dbmi/viv';
import { createStore, useStore } from 'zustand';

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
  channelsVisible: [],
  contrastLimits: [],
  colors: [],
  domains: [],
  selections: [],
  ids: [],
  loader: [{ labels: [], shape: [] }],
  image: 0
};

const DEFAUlT_CHANNEL_VALUES = {
  channelsVisible: true,
  contrastLimits: [0, 65535],
  colors: [255, 255, 255],
  domains: [0, 65535],
  selections: { z: 0, c: 0, t: 0 },
  ids: ''
};

const createChannelsStore = () => createStore(set => ({
  ...DEFAUlT_CHANNEL_STATE,
  ...generateToggles(DEFAUlT_CHANNEL_VALUES, set),
  toggleIsOn: index =>
    set(state => {
      const channelsVisible = [...state.channelsVisible];
      channelsVisible[index] = !channelsVisible[index];
      return { ...state, channelsVisible };
    }),
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
    })
}));

const DEFAULT_IMAGE_STATE = {
  lensSelection: 0,
  colormap: '',
  renderingMode: RENDERING_MODES.MAX_INTENSITY_PROJECTION,
  resolution: 0,
  lensEnabled: false,
  zoomLock: true,
  panLock: true,
  isOverviewOn: false,
  useFixedAxis: true,
  xSlice: null,
  ySlice: null,
  zSlice: null,
  onViewportLoad: () => {}
};

const createImageSettingsStore = () => createStore(set => ({
  ...DEFAULT_IMAGE_STATE,
  ...generateToggles(DEFAULT_IMAGE_STATE, set)
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
  source: '',
  pyramidResolution: 0
};

const createViewerStore = () => createStore(set => ({
  ...DEFAULT_VIEWER_STATE,
  ...generateToggles(DEFAULT_VIEWER_STATE, set),
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

export const AvivatorContext = createContext(null);

export const AvivatorProvider = ({ children }) => {
  const storesRef = useRef(null);
  if (!storesRef.current) {
    storesRef.current = {
      channels: createChannelsStore(),
      imageSettings: createImageSettingsStore(),
      viewer: createViewerStore()
    };
  }
  return createElement(AvivatorContext.Provider, {value: storesRef.current}, children);
};

function useStoreApi(storeName) {
  const store = useContext(AvivatorContext);
  if (!store) throw 'useStore must be used within a AvivatorProvider';
  return store[storeName];
}
export const useChannelsStoreApi = () => useStoreApi('channels');
export const useImageSettingsStoreApi = () => useStoreApi('imageSettings');
export const useViewerStoreApi = () => useStoreApi('viewer');
export const useChannelsStore = selector => useStore(useChannelsStoreApi(), selector);
export const useImageSettingsStore = selector => useStore(useImageSettingsStoreApi(), selector);
export const useViewerStore = selector => useStore(useViewerStoreApi(), selector);

export const useLoader = () => {
  const [fullLoader, image] = useChannelsStore(store => [
    store.loader,
    store.image
  ]);
  return Array.isArray(fullLoader[0]) ? fullLoader[image] : fullLoader;
};

export const useMetadata = () => {
  const image = useChannelsStore(store => store.image);
  const metadata = useViewerStore(store => store.metadata);
  return Array.isArray(metadata) ? metadata[image] : metadata;
};
