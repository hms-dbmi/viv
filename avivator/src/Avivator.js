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

import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import ColormapSelect from './components/ColormapSelect';
import GlobalSelectionSlider from './components/GlobalSelectionSlider';
import LensSelect from './components/LensSelect';
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

const initialChannels = {
  sliders: [],
  colors: [],
  selections: [],
  ids: [],
  isOn: []
};

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

  const [loader, setLoader] = useState({});
  const [metadata, setMetadata] = useState(null);
  const [lensSelection, setLensSelection] = useState(0);
  const [source, setSource] = useState(initSource);
  const [colormap, setColormap] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pixelValues, setPixelValues] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [globalSelections, setGlobalSelections] = useState({ z: 0, t: 0 });
  const [offsetsSnackbarOn, toggleOffsetsSnackbar] = useState(false);
  const [loaderErrorSnackbar, setLoaderErrorSnackbar] = useState({
    on: false,
    message: null
  });
  const [noImageUrlSnackbarIsOn, toggleNoImageUrlSnackbar] = useState(
    isDemoImage
  );

  const [useLinkedView, toggleLinkedView] = useReducer(v => !v, false);
  const [overviewOn, setOverviewOn] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);
  const [zoomLock, toggleZoomLock] = useReducer(v => !v, true);
  const [panLock, togglePanLock] = useReducer(v => !v, true);
  const [isLensOn, toggleIsLensOn] = useReducer(v => !v, false);
  const [channels, dispatch] = useReducer(channelsReducer, initialChannels);

  useEffect(() => {
    async function changeLoader() {
      setIsLoading(true);
      const { urlOrFile } = source;
      const { data: nextLoader, metadata: nextMeta } = await createLoader(
        urlOrFile,
        toggleOffsetsSnackbar,
        message => setLoaderErrorSnackbar({ on: true, message })
      );
      
      if (nextLoader) {
        const selections = buildDefaultSelection(nextLoader[0]);
        const { Channels } = nextMeta.Pixels;
        const channelOptions = Channels.map((c, i) => c.Name ?? 'Channel ' + i);
        // Default RGB.
        let sliders = [
          [0, 255],
          [0, 255],
          [0, 255]
        ];
        let domains = [
          [0, 255],
          [0, 255],
          [0, 255]
        ];
        let colors = [
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255]
        ];

        const source = nextLoader[nextLoader.length - 1];
        const isRgb = guessRgb(nextMeta);
        if (!isRgb) {
          
          const stats = await Promise.all(selections.map(async selection => {
            const raster = await source.getRaster({ selection });
            return getChannelStats(raster.data);
          }));

          domains = stats.map(stat => stat.domain);
          sliders = stats.map(stat => stat.autoSliders);
          // If there is only one channel, use white.
          colors =
            stats.length === 1
              ? [[255, 255, 255]]
              : stats.map((_, i) => COLOR_PALLETE[i]);
        } else if (isRgb || channelOptions.length === 1) {
          // RGB should not use a lens.
          isLensOn && toggleIsLensOn(); // eslint-disable-line no-unused-expressions
        }

        const { labels, shape } = source;
        const newDimensions = labels.map((l, i) => {
          return {
            field: l, 
            values: l === 'c' ? channelOptions : range(shape[i]),
          }
        })
        setDimensions(newDimensions);
        dispatch({
          type: 'RESET_CHANNELS',
          value: {
            selections,
            domains,
            sliders,
            colors
          }
        });
        setLoader(nextLoader);
        setMetadata(nextMeta);
        setIsLoading(false);
        setPixelValues(new Array(selections.length).fill(FILL_PIXEL_VALUE));
        // Set the global selections (needed for the UI). All selections have the same global selection.
        setGlobalSelections(selections[0]);
        // eslint-disable-next-line no-unused-expressions
        history?.push(
          typeof urlOrFile === 'string' ? `?image_url=${urlOrFile}` : ''
        );
      }
    }
    changeLoader();
  }, [source, history]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitNewUrl = (event, url) => {
    event.preventDefault();
    const newSource = {
      urlOrFile: url,
      // Use the trailing part of the URL (file name, presumably) as the description.
      description: getNameFromUrl(url)
    };
    setSource(newSource);
  };

  const handleGlobalChannelsSelectionChange = async ({ selection, event }) => {
    const { selections } = channels;
    const loaderSelection = selections.map(pastSelection => ({
      ...pastSelection,
      ...selection
    }));
    // See https://github.com/hms-dbmi/viv/issues/176 for why
    // we have to check mouseup.
    const mouseUp = event.type === 'mouseup';
    // Only update image on screen on a mouseup event for the same reason as above.
    if (mouseUp) {
      const stats = await Promise.all(
        loaderSelection.map(selection => getSingleSelectionStats({ loader, selection }))
      );
      const domains = stats.map(stat => stat.domain);
      const sliders = stats.map(stat => stat.slider);
      const { colors, isOn } = channels;
      dispatch({
        type: 'RESET_CHANNELS',
        value: { selections: loaderSelection, domains, sliders, colors, isOn }
      });
      setGlobalSelections(prev => ({ ...prev, ...selection }));
    } else {
      setGlobalSelections(prev => ({ ...prev, ...selection }));
    }
  };

  /*
   * Handles updating state for each channel controller.
   * Is is too heavy weight to store each channel as an object in state,
   * so we store the individual viv props (colorValues, sliderValues, etc)
   * in separate arrays. We use the ordering of the channels in the menu to make
   * update state very responsive (but dispatching the index of the channel)
   */
  const handleControllerChange = async (index, type, value) => {
    if (type === 'CHANGE_CHANNEL') {
      const [channelDim] = dimensions.filter(d => d.field === 'c');
      const { field, values } = channelDim;
      const dimIndex = values.indexOf(value);
      const selection = { ...globalSelections, [field]: dimIndex };
      const { domain, slider } = await getSingleSelectionStats({
        loader,
        selection
      });
      dispatch({
        type,
        index,
        value: { selection, domain, slider }
      });
    } else {
      dispatch({ type, index, value });
    }
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
    const { selections } = channels;

    dimensions.forEach(({ field }) => {
      // Set new image to default selection for non-global selections (0)
      // and use current global selection otherwise.
      selection[field] = GLOBAL_SLIDER_DIMENSION_FIELDS.includes(field)
        ? globalSelections[field]
        : 0;
    });
    const { domain, slider } = await getSingleSelectionStats({
      loader,
      selection
    });
    dispatch({
      type: 'ADD_CHANNEL',
      value: {
        selection,
        domain,
        slider
      }
    });
  };

  const isPyramid = loader.length > 0;
  const isRgb = metadata && guessRgb(metadata);
  const dtype = loader[0];


  const { colors, sliders, isOn, ids, selections, domains } = channels;
  const globalControlDimensions = dimensions?.filter(dimension =>
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dimension.field)
  );
  const channelOptions = dimensions.filter(j => j.field === 'c')[0]
    ?.values;
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
          channelOptions={channelOptions}
          isOn={isOn[i]}
          dtype={dtype}
          sliderValue={sliders[i]}
          colorValue={colors[i]}
          domain={domains[i]}
          handleChange={(type, value) => handleControllerChange(i, type, value)}
          colormapOn={colormap.length > 0}
          pixelValue={pixelValues[i]}
          shouldShowPixelValue={!useLinkedView}
        />
      </Grid>
    );
  });
  const globalControllers = globalControlDimensions.map(dimension => {
    // Only return a slider if there is a "stack."
    return dimension.values.length > 1 ? (
      <GlobalSelectionSlider
        key={dimension.field}
        dimension={dimension}
        globalSelections={globalSelections}
        handleGlobalChannelsSelectionChange={
          handleGlobalChannelsSelectionChange
        }
      />
    ) : null;
  });
  return (
    <>
      {
        <DropzoneWrapper handleSubmitFile={handleSubmitFile}>
          {!isLoading &&
            (useLinkedView && isPyramid ? (
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
                hoverHooks={{ handleValue: setPixelValues }}
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
                overviewOn={overviewOn && isPyramid}
                hoverHooks={{ handleValue: setPixelValues }}
                lensSelection={lensSelection}
                isLensOn={isLensOn}
              />
            ))}
        </DropzoneWrapper>
      }
      {
        <Menu
          maxHeight={viewSize.height}
          handleSubmitNewUrl={handleSubmitNewUrl}
          urlOrFile={source.urlOrFile}
          on={controllerOn}
          toggle={toggleController}
          handleSubmitFile={handleSubmitFile}
        >
          {!isRgb && (
            <ColormapSelect
              value={colormap}
              handleChange={setColormap}
              disabled={isLoading}
            />
          )}
          {!isRgb && channelOptions?.length > 1 && !colormap && (
            <LensSelect
              handleToggle={toggleIsLensOn}
              handleSelection={setLensSelection}
              isOn={isLensOn}
              channelOptions={selections.map(
                sel => channelOptions[sel.c]
              )}
              lensSelection={lensSelection}
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
          <Button
            disabled={!isPyramid || isLoading || useLinkedView}
            onClick={() => setOverviewOn(prev => !prev)}
            variant="outlined"
            size="small"
            fullWidth
          >
            {overviewOn ? 'Hide' : 'Show'} Picture-In-Picture
          </Button>
          <Button
            disabled={!isPyramid || isLoading || overviewOn}
            onClick={toggleLinkedView}
            variant="outlined"
            size="small"
            fullWidth
          >
            {useLinkedView ? 'Hide' : 'Show'} Side-by-Side
          </Button>
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
        </Menu>
      }
      <Snackbar
        open={offsetsSnackbarOn}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        elevation={6}
        variant="filled"
      >
        <Alert onClose={() => toggleOffsetsSnackbar(false)} severity="warning">
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
        open={noImageUrlSnackbarIsOn}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        elevation={6}
        variant="filled"
      >
        <Alert onClose={() => toggleNoImageUrlSnackbar(false)} severity="info">
          <NoImageUrlInfo />
        </Alert>
      </Snackbar>
    </>
  );
}
