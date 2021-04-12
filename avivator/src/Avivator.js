import React, { useEffect } from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import { getNameFromUrl, guessRgb, useWindowSize } from './utils';
import {
  useChannelSettings,
  useImageSettingsStore,
  useViewerStore
} from './state';
import { initImage, init3DSettings } from './hooks';

import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import ColormapSelect from './components/ColormapSelect';
import GlobalSelectionSlider from './components/GlobalSelectionSlider';
import LensSelect from './components/LensSelect';
import VolumeButton from './components/VolumeButton';
import RenderingModeSelect from './components/RenderingModeSelect';
import Slicer from './components/Slicer';
import AddChannel from './components/AddChannel';
import PanLock from './components/PanLock';
import ZoomLock from './components/ZoomLock';
import SideBySide from './components/SideBySide';
import PictureInPicture from './components/PictureInPicture';
import Viewer from './components/Viewer';
import {
  LoaderError,
  OffsetsWarning,
  NoImageUrlInfo
} from './components/SnackbarAlerts';
import { DropzoneWrapper } from './components/Dropzone';

import { GLOBAL_SLIDER_DIMENSION_FIELDS } from './constants';
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

  const { ids, selections, loader } = useChannelSettings();
  const { colormap } = useImageSettingsStore();
  const {
    isLoading,
    isOffsetsSnackbarOn,
    loaderErrorSnackbar,
    isNoImageUrlSnackbarOn,
    useLinkedView,
    use3d,
    toggleIsOffsetsSnackbarOn,
    toggleIsNoImageUrlSnackbarOn,
    useColormap,
    setViewerState,
    channelOptions,
    metadata,
    source,
    useLens
  } = useViewerStore();

  useEffect(() => {
    setViewerState('source', initSource);
    setViewerState('isNoImageUrlSnackbarOn', isDemoImage);
  }, []);

  initImage(source, history);
  init3DSettings();

  const handleSubmitNewUrl = (event, url) => {
    event.preventDefault();
    const newSource = {
      urlOrFile: url,
      // Use the trailing part of the URL (file name, presumably) as the description.
      description: getNameFromUrl(url)
    };
    setViewerState('source', newSource);
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
    setViewerState('source', newSource);
  };
  const isRgb = metadata && guessRgb(metadata);
  const globalControlDimensions =
    loader[0] &&
    loader[0].labels?.filter(dimension =>
      GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dimension.field)
    );
  const channelControllers = ids.map((id, i) => {
    const name = channelOptions[selections[i].c];
    return (
      <Grid
        key={`channel-controller-${name}-${id}`}
        style={{ width: '100%' }}
        item
      >
        <ChannelController
          name={name}
          index={i}
          channelOptions={channelOptions}
          shouldShowPixelValue={!useLinkedView}
        />
      </Grid>
    );
  });
  const globalControllers =
    globalControlDimensions &&
    globalControlDimensions.map(dimension => {
      // Only return a slider if there is a "stack."
      return dimension.values.length > 1 && !use3d ? (
        <GlobalSelectionSlider key={dimension.field} dimension={dimension} />
      ) : null;
    });
  return (
    <>
      {
        <DropzoneWrapper handleSubmitFile={handleSubmitFile}>
          {!isLoading && <Viewer />}
        </DropzoneWrapper>
      }
      {
        <Menu
          maxHeight={viewSize.height}
          handleSubmitNewUrl={handleSubmitNewUrl}
          urlOrFile={source.urlOrFile}
          handleSubmitFile={handleSubmitFile}
        >
          {useColormap && <ColormapSelect />}
          {use3d && <RenderingModeSelect />}
          {useLens && !colormap && (
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
          {!isRgb && <AddChannel />}
          {loader.length > 0 &&
            loader[0].shape[loader[0].labels.indexOf('z')] > 1 && (
              <VolumeButton />
            )}
          {!use3d && <PictureInPicture />}
          {!use3d && <SideBySide />}
          {useLinkedView && (
            <>
              <ZoomLock />
              <PanLock />
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
        <Alert onClose={toggleIsOffsetsSnackbarOn} severity="warning">
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
          onClose={() =>
            setViewerState('loaderErrorSnackbar', { on: false, message: null })
          }
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
        <Alert onClose={toggleIsNoImageUrlSnackbarOn} severity="info">
          <NoImageUrlInfo />
        </Alert>
      </Snackbar>
    </>
  );
}
