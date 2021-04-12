import { useEffect } from 'react';
import {
  useChannelSettings,
  useChannelSetters,
  useImageSettingsStore,
  useViewerStore
} from './state';
import { createLoader, buildDefaultSelection, guessRgb, range } from './utils';
import { COLOR_PALLETE, FILL_PIXEL_VALUE } from './constants';
import { getChannelStats } from '../../dist';
import { useDropzone } from 'react-dropzone';

export const initImage = (source, history) => {
  const {
    setViewerState,
    use3d,
    toggleUse3d,
    toggleIsOffsetsSnackbarOn,
    toggleUseLens
  } = useViewerStore();
  const { setLoader, addChannels } = useChannelSetters();
  const { isLensOn, toggleIsLensOn } = useImageSettingsStore();
  useEffect(() => {
    async function changeLoader() {
      setViewerState('isLoading', true);
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
        const lowResSource = nextLoader[nextLoader.length - 1];
        const isRgb = guessRgb(nextMeta);
        if (!isRgb) {
          const stats = await Promise.all(
            newSelections.map(async selection => {
              const raster = await lowResSource.getRaster({ selection });
              return getChannelStats(raster.data);
            })
          );

          newDomains = stats.map(stat => stat.domain);
          newSliders = stats.map(stat => stat.autoSliders);
          // If there is only one channel, use white.
          newColors =
            stats.length === 1
              ? [[255, 255, 255]]
              : stats.map((_, i) => COLOR_PALLETE[i]);
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
        setViewerState('isLoading', false);
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

export const init3DSettings = () => {
  const { loader, selections } = useChannelSettings();
  const { setPropertiesForChannels } = useChannelSetters();
  const { use3d, setViewerState, metadata } = useViewerStore();
  useEffect(() => {
    async function updateStatsFor3D() {
      if (!use3d) {
        const lowResSource = loader[loader.length - 1];
        const stats = await Promise.all(
          selections.map(async selection => {
            const raster = await lowResSource.getRaster({ selection });
            return getChannelStats(raster.data);
          })
        );
        const domains = stats.map(stat => stat.domain);
        const sliders = stats.map(stat => stat.autoSliders);
        setPropertiesForChannels(
          range(selections.length),
          ['domains', 'sliders'],
          [domains, sliders]
        );
        const isRgb = metadata && guessRgb(metadata);
        if (!isRgb && metadata) {
          setViewerState('useLens', true);
        }
      } else {
        const lowResSource = loader[loader.length - 1];
        const { labels, shape } = lowResSource;
        const sizeZ = shape[labels.indexOf('z')] >> (loader.length - 1);
        const stats = await Promise.all(
          selections.map(async selection => {
            const raster0 = await lowResSource.getRaster({
              selection: { ...selection, z: 0 }
            });
            const rasterMid = await lowResSource.getRaster({
              selection: { ...selection, z: Math.floor(sizeZ / 2) }
            });
            const rasterTop = await lowResSource.getRaster({
              selection: { ...selection, z: sizeZ - 1 }
            });
            const stats0 = getChannelStats(raster0.data);
            const statsMid = getChannelStats(rasterMid.data);
            const statsTop = getChannelStats(rasterTop.data);
            return {
              domain: [
                Math.min(
                  stats0.domain[0],
                  statsMid.domain[0],
                  statsTop.domain[0]
                ),
                Math.max(
                  stats0.domain[1],
                  statsMid.domain[1],
                  statsTop.domain[1]
                )
              ],
              autoSliders: [
                Math.min(
                  stats0.autoSliders[0],
                  statsMid.autoSliders[0],
                  statsTop.autoSliders[0]
                ),
                Math.max(
                  stats0.autoSliders[1],
                  statsMid.autoSliders[1],
                  statsTop.autoSliders[1]
                )
              ]
            };
          })
        );
        const domains = stats.map(stat => stat.domain);
        const sliders = stats.map(stat => stat.autoSliders);

        setPropertiesForChannels(
          range(selections.length),
          ['domains', 'sliders'],
          [domains, sliders]
        );
        setViewerState('useLens', false);
      }
    }
    updateStatsFor3D();
  }, [use3d]); // eslint-disable-line react-hooks/exhaustive-deps
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
