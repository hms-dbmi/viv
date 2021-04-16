import { useEffect } from 'react';
import {
  useChannelSetters,
  useImageSettingsStore,
  useViewerStore
} from './state';
import {
  createLoader,
  buildDefaultSelection,
  guessRgb,
  getMultiSelectionStats
} from './utils';
import { COLOR_PALLETE, FILL_PIXEL_VALUE } from './constants';
import { useDropzone } from 'react-dropzone';

export const initImage = (source, history) => {
  const {
    setViewerState,
    use3d,
    toggleUse3d,
    toggleIsOffsetsSnackbarOn
  } = useViewerStore();
  const { setLoader, addChannels, resetChannels } = useChannelSetters();
  const { isLensOn, toggleIsLensOn } = useImageSettingsStore();
  useEffect(() => {
    async function changeLoader() {
      // Placeholder
      setViewerState('isChannelLoading', [true]);
      setViewerState('isViewerLoading', true);
      resetChannels();
      const { urlOrFile } = source;
      const {
        data: nextLoader,
        metadata: nextMeta
      } = await createLoader(urlOrFile, toggleIsOffsetsSnackbarOn, message =>
        setViewerState('loaderErrorSnackbar', { on: true, message })
      );

      if (nextLoader) {
        const newSelections = buildDefaultSelection(nextLoader[0]);
        const { Channels } = nextMeta.Pixels;
        const channelOptions = Channels.map((c, i) => c.Name ?? 'Channel ' + i);
        // Default RGB.
        let newSliders = [
          [0, 255],
          [0, 255],
          [0, 255]
        ];
        let newDomains = [
          [0, 255],
          [0, 255],
          [0, 255]
        ];
        let newColors = [
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255]
        ];
        const isRgb = guessRgb(nextMeta);
        if (!isRgb) {
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
          setViewerState('useColormap', true);
          if (channelOptions.length === 1) {
            setViewerState('useLens', false);
          } else {
            setViewerState('useLens', true);
          }
        } else {
          if (isLensOn) {
            toggleIsLensOn();
          }
          setViewerState('useLens', false);
          setViewerState('useColormap', false);
        }
        addChannels(
          ['ids', 'selections', 'domains', 'sliders', 'colors'],
          [
            newDomains.map(() => String(Math.random())),
            newSelections,
            newDomains,
            newSliders,
            newColors
          ]
        );
        setLoader(nextLoader);
        setViewerState('metadata', nextMeta);
        setViewerState(
          'isChannelLoading',
          newSelections.map(i => !i)
        );
        setViewerState('isViewerLoading', false);
        setViewerState(
          'pixelValues',
          new Array(newSelections.length).fill(FILL_PIXEL_VALUE)
        );
        // Set the global selections (needed for the UI). All selections have the same global selection.
        setViewerState('globalSelection', newSelections[0]);
        setViewerState('channelOptions', channelOptions);
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

export const dropzoneHook = () => {
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
    setViewerState('source', newSource);
  };
  return useDropzone({
    onDrop: handleSubmitFile
  });
};
