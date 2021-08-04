import { useEffect } from 'react';
import { useDropzone as useReactDropzone } from 'react-dropzone';

import {
  useChannelSetters,
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

export const useImage = (source, history) => {
  const {
    setViewerState,
    use3d,
    toggleUse3d,
    toggleIsOffsetsSnackbarOn
  } = useViewerStore();
  const { setLoader, addChannels, resetChannels } = useChannelSetters();
  const { isLensOn, toggleIsLensOn, setImageSetting } = useImageSettingsStore();
  useEffect(() => {
    async function changeLoader() {
      // Placeholder
      setViewerState({ isChannelLoading: [true] });
      setViewerState({ isViewerLoading: true });
      resetChannels();
      const { urlOrFile } = source;
      const {
        data: nextLoader,
        metadata: nextMeta
      } = await createLoader(urlOrFile, toggleIsOffsetsSnackbarOn, message =>
        setViewerState({ loaderErrorSnackbar: { on: true, message } })
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
        let newSliders = [];
        let newDomains = [];
        let newColors = [];
        const isRgb = guessRgb(nextMeta);
        if (isRgb) {
          if (isInterleaved(nextLoader[0].shape)) {
            // These don't matter because the data is interleaved.
            newSliders = [[0, 255]];
            newDomains = [[0, 255]];
            newColors = [[255, 0, 0]];
          } else {
            newSliders = [
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
          setViewerState({ useColormap: false, useLens: false });
        } else {
          const stats = await getMultiSelectionStats({
            loader: nextLoader,
            selections: newSelections,
            use3d
          });
          newDomains = stats.domains;
          newSliders = stats.sliders;
          // If there is only one channel, use white.
          newColors =
            newDomains.length === 1
              ? [[255, 255, 255]]
              : newDomains.map((_, i) => COLOR_PALLETE[i]);
          setViewerState({
            useLens: channelOptions.length !== 1,
            useColormap: true
          });
        }
        addChannels({
          ids: newDomains.map(() => String(Math.random())),
          selections: newSelections,
          domains: newDomains,
          sliders: newSliders,
          colors: newColors
        });
        setLoader(nextLoader);
        setViewerState({
          isChannelLoading: newSelections.map(i => !i),
          isViewerLoading: false,
          metadata: nextMeta,
          pixelValues: new Array(newSelections.length).fill(FILL_PIXEL_VALUE),
          // Set the global selections (needed for the UI). All selections have the same global selection.
          globalSelection: newSelections[0],
          channelOptions
        });
        const [xSlice, ySlice, zSlice] = getBoundingCube(nextLoader);
        setImageSetting({
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
  const { setViewerState } = useViewerStore();
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
    setViewerState({ source: newSource });
  };
  return useReactDropzone({
    onDrop: handleSubmitFile
  });
};
