import { useEffect } from 'react';
import { useDropzone as useReactDropzone } from 'react-dropzone';

import {
  useChannelsStore,
  useImageSettingsStore,
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
import shallow from 'zustand/shallow';

export const useImage = (source, history) => {
  const [use3d, toggleUse3d, toggleIsOffsetsSnackbarOn] = useViewerStore(
    store => [store.use3d, store.toggleUse3d, store.toggleIsOffsetsSnackbarOn],
    shallow
  );
  const [addChannels, resetChannels] = useChannelsStore(
    store => [store.addChannels, store.resetChannels],
    shallow
  );
  const [isLensOn, toggleIsLensOn] = useImageSettingsStore(
    store => [store.isLensOn, store.toggleIsLensOn],
    shallow
  );
  useEffect(() => {
    async function changeLoader() {
      // Placeholder
      useViewerStore.setState({ isChannelLoading: [true] });
      useViewerStore.setState({ isViewerLoading: true });
      resetChannels();
      const { urlOrFile } = source;
      const {
        data: nextLoader,
        metadata: nextMeta
      } = await createLoader(urlOrFile, toggleIsOffsetsSnackbarOn, message =>
        useViewerStore.setState({ loaderErrorSnackbar: { on: true, message } })
      );
      console.info(
        'Metadata (in JSON-like form) for current file being viewed: ',
        nextMeta
      );

      if (nextLoader) {
        const newSelections = buildDefaultSelection(nextLoader[0]);
        const { Channels } = nextMeta.Pixels;
        const channelOptions = Channels.map((c, i) => c.Name ?? `Channel ${i}`);
        // Default RGB.
        let newContrastLimits = [];
        let newDomains = [];
        let newColors = [];
        const isRgb = guessRgb(nextMeta);
        if (isRgb) {
          if (isInterleaved(nextLoader[0].shape)) {
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
          if (isLensOn) {
            toggleIsLensOn();
          }
          useViewerStore.setState({ useColormap: false, useLens: false });
        } else {
          const stats = await getMultiSelectionStats({
            loader: nextLoader,
            selections: newSelections,
            use3d
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
        addChannels({
          ids: newDomains.map(() => String(Math.random())),
          selections: newSelections,
          domains: newDomains,
          contrastLimits: newContrastLimits,
          colors: newColors
        });
        useChannelsStore.setState({ loader: nextLoader });
        useViewerStore.setState({
          isChannelLoading: newSelections.map(i => !i),
          isViewerLoading: false,
          metadata: nextMeta,
          pixelValues: new Array(newSelections.length).fill(FILL_PIXEL_VALUE),
          // Set the global selections (needed for the UI). All selections have the same global selection.
          globalSelection: newSelections[0],
          channelOptions
        });
        const [xSlice, ySlice, zSlice] = getBoundingCube(nextLoader);
        useImageSettingsStore.setState({
          xSlice,
          ySlice,
          zSlice
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
