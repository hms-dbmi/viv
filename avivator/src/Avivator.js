import React, { useState, useEffect, useReducer } from 'react';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import AddIcon from '@material-ui/icons/Add';

import {
  SideBySideViewer,
  PictureInPictureViewer,
  VolumeViewer,
  getChannelStats
} from '../../dist';
import {
  createLoader,
  channelsReducer,
  useWindowSize,
  buildDefaultSelection,
  getNameFromUrl,
  getSingleSelectionStats,
  guessRgb,
  range
} from './utils';
import {
  useChannelSettings,
  useChannelSetters,
  useImageSettingsStore,
  useViewerStore
} from './state';

import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import ColormapSelect from './components/ColormapSelect';
import GlobalSelectionSlider from './components/GlobalSelectionSlider';
import LensSelect from './components/LensSelect';
import VolumeButton from './components/VolumeButton';
import RenderingModeSelect from './components/RenderingModeSelect';
import Slicer from './components/Slicer';
import {
  LoaderError,
  OffsetsWarning,
  NoImageUrlInfo
} from './components/SnackbarAlerts';
import { DropzoneWrapper } from './components/Dropzone';

import {
  MAX_CHANNELS,
  DEFAULT_OVERVIEW,
  FILL_PIXEL_VALUE,
  GLOBAL_SLIDER_DIMENSION_FIELDS,
  COLOR_PALLETE
} from './constants';
import './index.css';

/**
 * This component serves as batteries-included visualization for OME-compliant tiff or zarr images.
 * This includes color sliders, selectors, and more.
 * @param {Object} props
 * @param {Object} props.history A React router history object to create new urls (optional).
 * @param {Object} args.sources A list of sources for a dropdown menu, like [{ url, description }]
 * */
export default function Avivator(props) {
  const { history, source: initSource, isDemoImage } = props;

  const viewSize = useWindowSize();

  const [metadata, setMetadata] = useState(null);
  const [source, setSource] = useState(initSource);
  const [dimensions, setDimensions] = useState([]);
  const {
    colors,
    sliders,
    isOn,
    ids,
    selections,
    loader
  } = useChannelSettings();
  const {
    setPropertiesForChannels,
    setPropertiesForChannel,
    addChannels,
    addChannel,
    setLoader
  } = useChannelSetters();
  const {
    lensSelection,
    colormap,
    renderingMode,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    isLensOn
  } = useImageSettingsStore();
  const {
    isLoading,
    isOffsetsSnackbarOn,
    loaderErrorSnackbar,
    isNoImageUrlSnackbarOn,
    useLinkedView,
    isOverviewOn,
    isControllerOn,
    zoomLock,
    panLock,
    use3d,
    toggleIsOffsetsSnackbarOn,
    toggleIsNoImageUrlSnackbarOn,
    toggleIsControllerOn,
    toggleUseLinkedView,
    toggleIsOverviewOn,
    toggleZoomLock,
    togglePanLock,
    toggleUse3d,
    setViewerState
  } = useViewerStore();

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
        } else if (isRgb || channelOptions.length === 1) {
          // RGB should not use a lens.
          isLensOn && toggleIsLensOn(); // eslint-disable-line no-unused-expressions
        }

        const { labels, shape } = lowResSource;
        const newDimensions = labels.map((l, i) => {
          return {
            field: l,
            values: l === 'c' ? channelOptions : range(shape[i])
          };
        });
        setDimensions(newDimensions);
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
        setMetadata(nextMeta);
        setViewerState('isLoading', false);
        setViewerState(
          'pixelValues',
          new Array(newSelections.length).fill(FILL_PIXEL_VALUE)
        );
        // Set the global selections (needed for the UI). All selections have the same global selection.
        setViewerState('globalSelection', newSelections[0]);
        if (use3d) toggleUse3d();
        // eslint-disable-next-line no-unused-expressions
        history?.push(
          typeof urlOrFile === 'string' ? `?image_url=${urlOrFile}` : ''
        );
      }
    }
    changeLoader();
  }, [source, history]); // eslint-disable-line react-hooks/exhaustive-deps

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

        domains.forEach((domain, index) =>
          dispatch({
            type: 'CHANGE_DOMAIN',
            value: domain,
            index
          })
        );
        sliders.forEach((slider, index) =>
          dispatch({
            type: 'CHANGE_SLIDER',
            value: slider,
            index
          })
        );
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

        domains.forEach((domain, index) =>
          dispatch({
            type: 'CHANGE_DOMAIN',
            value: domain,
            index
          })
        );
        sliders.forEach((slider, index) =>
          dispatch({
            type: 'CHANGE_SLIDER',
            value: slider,
            index
          })
        );
      }
    }
    updateStatsFor3D();
  }, [use3d, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitNewUrl = (event, url) => {
    event.preventDefault();
    const newSource = {
      urlOrFile: url,
      // Use the trailing part of the URL (file name, presumably) as the description.
      description: getNameFromUrl(url)
    };
    setSource(newSource);
  };
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
    setSource(newSource);
  };

  const handleChannelAdd = async () => {
    const selection = {};

    dimensions.forEach(({ field }) => {
      // Set new image to default selection for non-global selections (0)
      // and use current global selection otherwise.
      selection[field] = GLOBAL_SLIDER_DIMENSION_FIELDS.includes(field)
        ? selections[0][field]
        : 0;
    });
    addChannel(['selections'], [selection]);
  };
  const isPyramid = loader.length > 0;
  const isRgb = metadata && guessRgb(metadata);
  const globalControlDimensions = dimensions?.filter(dimension =>
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dimension.field)
  );
  const channelOptions = dimensions.filter(j => j.field === 'c')[0]?.values;
  const channelControllers = ids.map((id, i) => {
    const name = channelOptions[selections[i].c];
    return (
      <Grid
        key={`channel-controller-${name}-${id}`}
        style={{ width: '100%' }}
        item
      >
        <ChannelController
          key={`channel-controller-${name}-${id}-${i}`}
          name={name}
          index={i}
          channelOptions={channelOptions}
          shouldShowPixelValue={!useLinkedView}
        />
      </Grid>
    );
  });
  const globalControllers = globalControlDimensions.map(dimension => {
    // Only return a slider if there is a "stack."
    return dimension.values.length > 1 && !use3d ? (
      <GlobalSelectionSlider key={dimension.field} dimension={dimension} />
    ) : null;
  });
  return (
    <>
      {
        <DropzoneWrapper handleSubmitFile={handleSubmitFile}>
          {!isLoading &&
            !use3d &&
            (useLinkedView ? (
              <SideBySideViewer
                loader={loader}
                sliderValues={sliders}
                colorValues={colors}
                channelIsOn={isOn}
                loaderSelection={selections}
                height={viewSize.height}
                width={viewSize.width}
                colormap={colormap.length > 0 && colormap}
                zoomLock={zoomLock}
                panLock={panLock}
                hoverHooks={{
                  handleValue: v => setViewerState('pixelValues', v)
                }}
                lensSelection={lensSelection}
                isLensOn={isLensOn}
              />
            ) : (
              <PictureInPictureViewer
                loader={loader}
                sliderValues={sliders}
                colorValues={colors}
                channelIsOn={isOn}
                loaderSelection={selections}
                height={viewSize.height}
                width={viewSize.width}
                colormap={colormap.length > 0 && colormap}
                overview={DEFAULT_OVERVIEW}
                overviewOn={isOverviewOn}
                hoverHooks={{
                  handleValue: v => setViewerState('pixelValues', v)
                }}
                lensSelection={lensSelection}
                isLensOn={isLensOn}
              />
            ))}
          {use3d && !isLoading && (
            <VolumeViewer
              loader={loader}
              sliderValues={sliders}
              colorValues={colors}
              channelIsOn={isOn}
              loaderSelection={selections}
              colormap={colormap.length > 0 && colormap}
              xSlice={xSlice}
              ySlice={ySlice}
              zSlice={zSlice}
              resolution={resolution}
              renderingMode={renderingMode}
            />
          )}
        </DropzoneWrapper>
      }
      {
        <Menu
          maxHeight={viewSize.height}
          handleSubmitNewUrl={handleSubmitNewUrl}
          urlOrFile={source.urlOrFile}
          handleSubmitFile={handleSubmitFile}
        >
          {!isRgb && <ColormapSelect />}
          {use3d && <RenderingModeSelect />}
          {!isRgb && channelOptions?.length > 1 && !colormap && !use3d && (
            <LensSelect
              channelOptions={selections.map(sel => channelOptions[sel.c])}
            />
          )}
          {globalControllers}
          {!isLoading && !isRgb ? (
            <Grid container>{channelControllers}</Grid>
          ) : (
            <Grid container justify="center">
              {!isRgb && <CircularProgress />}
            </Grid>
          )}
          {!isRgb && (
            <Button
              disabled={ids.length === MAX_CHANNELS || isLoading}
              onClick={handleChannelAdd}
              fullWidth
              variant="outlined"
              style={{ borderStyle: 'dashed' }}
              startIcon={<AddIcon />}
              size="small"
            >
              Add Channel
            </Button>
          )}
          {loader.length > 0 &&
            loader[0].shape[loader[0].labels.indexOf('z')] > 1 && (
              <VolumeButton />
            )}
          {!use3d && (
            <Button
              disabled={!isPyramid || isLoading || useLinkedView}
              onClick={toggleIsOverviewOn}
              variant="outlined"
              size="small"
              fullWidth
            >
              {isOverviewOn ? 'Hide' : 'Show'} Picture-In-Picture
            </Button>
          )}
          {!use3d && (
            <Button
              disabled={!isPyramid || isLoading || isOverviewOn}
              onClick={toggleUseLinkedView}
              variant="outlined"
              size="small"
              fullWidth
            >
              {useLinkedView ? 'Hide' : 'Show'} Side-by-Side
            </Button>
          )}
          {useLinkedView && (
            <>
              <Button
                disabled={!isPyramid || isLoading}
                onClick={toggleZoomLock}
                variant="outlined"
                size="small"
                fullWidth
              >
                {zoomLock ? 'Unlock' : 'Lock'} Zoom
              </Button>
              <Button
                disabled={!isPyramid || isLoading}
                onClick={togglePanLock}
                variant="outlined"
                size="small"
                fullWidth
              >
                {panLock ? 'Unlock' : 'Lock'} Pan
              </Button>
            </>
          )}
          {use3d && <Slicer />}
        </Menu>
      }
      <Snackbar
        open={isOffsetsSnackbarOn}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        elevation={6}
        variant="filled"
      >
        <Alert
          onClose={() => toggleIsOffsetsSnackbarOn(false)}
          severity="warning"
        >
          <OffsetsWarning />
        </Alert>
      </Snackbar>
      <Snackbar
        open={loaderErrorSnackbar.on}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        elevation={6}
        variant="filled"
      >
        <Alert
          onClose={() => setLoaderErrorSnackbar({ on: false, message: null })}
          severity="error"
        >
          <LoaderError message={loaderErrorSnackbar.message} />
        </Alert>
      </Snackbar>

      <Snackbar
        open={isNoImageUrlSnackbarOn}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        elevation={6}
        variant="filled"
      >
        <Alert
          onClose={() => toggleIsNoImageUrlSnackbarOn(false)}
          severity="info"
        >
          <NoImageUrlInfo />
        </Alert>
      </Snackbar>
    </>
  );
}
