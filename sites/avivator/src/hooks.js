import { useEffect } from 'react';
import { useDropzone as useReactDropzone } from 'react-dropzone';
import shallow from 'zustand/shallow';
// eslint-disable-next-line camelcase
import { unstable_batchedUpdates } from 'react-dom';

import {
  useChannelsStore,
  useImageSettingsStore,
  useLoader,
  useMetadata,
  useViewerStore
} from './state';
import {
  createLoader,
  buildDefaultSelection,
  guessRgb,
  getMultiSelectionStats,
  getBoundingCube,
  isInterleaved
} from './utils';
import { COLOR_PALLETE, FILL_PIXEL_VALUE } from './constants';

export const useImage = (source, history) => {
  const [use3d, toggleUse3d, toggleIsOffsetsSnackbarOn] = useViewerStore(
    store => [store.use3d, store.toggleUse3d, store.toggleIsOffsetsSnackbarOn],
    shallow
  );
  const [lensEnabled, toggleLensEnabled] = useImageSettingsStore(
    store => [store.lensEnabled, store.toggleLensEnabled],
    shallow
  );
  const loader = useLoader();
  const metadata = useMetadata();
  useEffect(() => {
    async function changeLoader() {
      // Placeholder
      useViewerStore.setState({ isChannelLoading: [true] });
      useViewerStore.setState({ isViewerLoading: true });
      if (use3d) toggleUse3d();
      const { urlOrFile } = source;
      const newLoader = await createLoader(
        urlOrFile,
        toggleIsOffsetsSnackbarOn,
        message =>
          useViewerStore.setState({
            loaderErrorSnackbar: { on: true, message }
          })
      );
      let nextMeta;
      let nextLoader;
      if (Array.isArray(newLoader)) {
        if (newLoader.length > 1) {
          nextMeta = newLoader.map(l => l.metadata);
          nextLoader = newLoader.map(l => l.data);
        } else {
          nextMeta = newLoader[0].metadata;
          nextLoader = newLoader[0].data;
        }
      } else {
        nextMeta = newLoader.metadata;
        nextLoader = newLoader.data;
      }
      if (nextLoader) {
        console.info(
          'Metadata (in JSON-like form) for current file being viewed: ',
          nextMeta
        );
        unstable_batchedUpdates(() => {
          useChannelsStore.setState({ loader: nextLoader });
          useViewerStore.setState({
            metadata: nextMeta
          });
        });
        if (use3d) toggleUse3d();
        // eslint-disable-next-line no-unused-expressions
        history?.push(
          typeof urlOrFile === 'string' ? `?image_url=${urlOrFile}` : ''
        );
      }
    }
    if (source) changeLoader();
  }, [source, history]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const changeSettings = async () => {
      // Placeholder
      useViewerStore.setState({ isChannelLoading: [true] });
      useViewerStore.setState({ isViewerLoading: true });
      if (use3d) toggleUse3d();
      const newSelections = buildDefaultSelection(loader[0]);
      const { Channels } = metadata.Pixels;
      const channelOptions = Channels.map((c, i) => c.Name ?? `Channel ${i}`);
      // Default RGB.
      let newContrastLimits = [];
      let newDomains = [];
      let newColors = [];
      const isRgb = guessRgb(metadata);
      if (isRgb) {
        if (isInterleaved(loader[0].shape)) {
          // These don't matter because the data is interleaved.
          newContrastLimits = [[0, 255]];
          newDomains = [[0, 255]];
          newColors = [[255, 0, 0]];
        } else {
          newContrastLimits = [
            [0, 255],
            [0, 255],
            [0, 255]
          ];
          newDomains = [
            [0, 255],
            [0, 255],
            [0, 255]
          ];
          newColors = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255]
          ];
        }
        if (lensEnabled) {
          toggleLensEnabled();
        }
        useViewerStore.setState({ useColormap: false, useLens: false });
      } else {
        const stats = await getMultiSelectionStats({
          loader,
          selections: newSelections,
          use3d: false
        });
        newDomains = stats.domains;
        newContrastLimits = stats.contrastLimits;
        // If there is only one channel, use white.
        newColors =
          newDomains.length === 1
            ? [[255, 255, 255]]
            : newDomains.map((_, i) => COLOR_PALLETE[i]);
        useViewerStore.setState({
          useLens: channelOptions.length !== 1,
          useColormap: true
        });
      }
      useChannelsStore.setState({
        ids: newDomains.map(() => String(Math.random())),
        selections: newSelections,
        domains: newDomains,
        contrastLimits: newContrastLimits,
        colors: newColors,
        channelsVisible: newColors.map(() => true)
      });
      useViewerStore.setState({
        isChannelLoading: newSelections.map(i => !i),
        isViewerLoading: false,
        pixelValues: new Array(newSelections.length).fill(FILL_PIXEL_VALUE),
        // Set the global selections (needed for the UI). All selections have the same global selection.
        globalSelection: newSelections[0],
        channelOptions
      });
      const [xSlice, ySlice, zSlice] = getBoundingCube(loader);
      useImageSettingsStore.setState({
        xSlice,
        ySlice,
        zSlice
      });
    };
    if (metadata) changeSettings();
  }, [loader, metadata]); // eslint-disable-line react-hooks/exhaustive-deps
};

export const useDropzone = () => {
  const handleSubmitFile = files => {
    let newSource;
    if (files.length === 1) {
      newSource = {
        urlOrFile: files[0],
        // Use the trailing part of the URL (file name, presumably) as the description.
        description: files[0].name
      };
    } else {
      newSource = {
        urlOrFile: files,
        description: 'data.zarr'
      };
    }
    useViewerStore.setState({ source: newSource });
  };
  return useReactDropzone({
    onDrop: handleSubmitFile
  });
};
