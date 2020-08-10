import React, { useState, useEffect, useReducer } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';

import AddIcon from '@material-ui/icons/Add';

import {
  SideBySideViewer,
  PictureInPictureViewer,
  getChannelStats
} from '../../src';
import {
  createLoader,
  channelsReducer,
  useWindowSize,
  buildDefaultSelection
} from './utils';

import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import MenuToggle from './components/MenuToggle';
import ColormapSelect from './components/ColormapSelect';
import GlobalSelectionSlider from './components/GlobalSelectionSlider';
import LensSelect from './components/LensSelect';

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
  const { history } = props;
  const [channels, dispatch] = useReducer(channelsReducer, initialChannels);
  const viewSize = useWindowSize();
  const [loader, setLoader] = useState({});
  const [lensSelection, setLensSelection] = useState(0);

  /* eslint-disable react/destructuring-assignment */
  const [source, setSource] = useState(props.source);
  /* eslint-disable react/destructuring-assignment */
  const [colormap, setColormap] = useState('');
  const [dimensions, setDimensions] = useState([]);
  const [globalSelections, setGlobalSelections] = useState({ z: 0, t: 0 });
  const [initialViewState, setInitialViewState] = useState({});
  const [useLinkedView, toggleLinkedView] = useReducer(v => !v, false);
  const [overviewOn, setOverviewOn] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);
  const [zoomLock, toggleZoomLock] = useReducer(v => !v, true);
  const [panLock, togglePanLock] = useReducer(v => !v, true);
  const [isLensOn, setIsLensOn] = useReducer(v => !v, false);

  const [isLoading, setIsLoading] = useState(true);
  const [pixelValues, setPixelValues] = useState([]);
  useEffect(() => {
    async function changeLoader() {
      setIsLoading(true);
      const nextLoader = await createLoader(source.url);
      const { dimensions: newDimensions, isRgb } = nextLoader;
      const selections = buildDefaultSelection(newDimensions);
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
      if (!isRgb) {
        const stats = await getChannelStats({
          loader: nextLoader,
          loaderSelection: selections
        });
        domains = stats.map(stat => stat.domain);
        sliders = stats.map(stat => stat.autoSliders);
        // If there is only one channel, use white.
        colors =
          stats.length === 1
            ? [[255, 255, 255]]
            : stats.map((_, i) => COLOR_PALLETE[i]);
      } else {
        // RGB should not use a lens.
        isLensOn && setIsLensOn();
      }
      const { height, width } = nextLoader.getRasterSize({
        z: 0
      });
      // Get a reasonable initial zoom level for pyramids based on screen.
      const { numLevels } = nextLoader;
      let zoom = 0;
      let size = Infinity;
      // viewSize is not in the dependencies array becuase we only want to use it when the source changes.
      while (size >= Math.max(...Object.values(viewSize)) || numLevels === 0) {
        const rasterSize = nextLoader.getRasterSize({
          z: zoom
        });
        size = Math.max(...Object.values(rasterSize));
        zoom += 1;
      }
      const loaderInitialViewState = {
        target: [height / 2, width / 2, 0],
        zoom: numLevels > 0 ? -zoom : -1.5
      };
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
      setIsLoading(false);
      setPixelValues(new Array(selections.length).fill(FILL_PIXEL_VALUE));
      setInitialViewState(loaderInitialViewState);
      // Set the global selections (needed for the UI).
      setGlobalSelections(selections[0]);
      // eslint-disable-next-line no-unused-expressions
      history?.push(`?image_url=${source.url}`);
    }
    changeLoader();
  }, [source, history]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitNewUrl = (event, url) => {
    event.preventDefault();
    const newSource = {
      url,
      description: url
        .split('?')[0]
        .split('/')
        .slice(-1)[0]
    };
    setSource(newSource);
  };

  const handleGlobalChannelsSelectionChange = async ({ selection, event }) => {
    const { selections } = channels;
    const loaderSelection = selections.map(pastSelection => ({
      ...pastSelection,
      ...selection
    }));
    // See https://github.com/hubmapconsortium/vitessce-image-viewer/issues/176 for why
    // we have to check mouseup.
    const mouseUp = event.type === 'mouseup';
    // Only update domains on a mouseup event for the same reason as above.
    if (mouseUp) {
      const stats = await getChannelStats({ loader, loaderSelection });
      const domains = stats.map(stat => stat.domain);
      const sliders = stats.map(stat => stat.autoSliders);
      const { colors } = channels;
      dispatch({
        type: 'RESET_CHANNELS',
        value: { selections: loaderSelection, domains, sliders, colors }
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
      const [channelDim] = dimensions.filter(d => d.field === 'channel');
      const { field, values } = channelDim;
      const dimIndex = values.indexOf(value);
      const selection = { ...globalSelections, [field]: dimIndex };
      const stats = await getChannelStats({
        loader,
        loaderSelection: [selection]
      });
      const [domain] = stats.map(stat => stat.domain);
      const [slider] = stats.map(stat => stat.autoSliders);
      dispatch({
        type,
        index,
        value: { selection, domain, slider }
      });
    } else {
      dispatch({ type, index, value });
    }
  };

  const handleChannelAdd = async () => {
    const selection = {};
    const { selections } = channels;

    dimensions.forEach(dimension => {
      // Set new image to default selection for non-global selections (0)
      // and use current global selection otherwise.
      selection[dimension.field] = GLOBAL_SLIDER_DIMENSION_FIELDS.includes(
        dimension.field
      )
        ? selections[0][dimension.field]
        : 0;
    });
    const stats = await getChannelStats({
      loader,
      loaderSelection: [selection]
    });
    const [domain] = stats.map(stat => stat.domain);
    const [slider] = stats.map(stat => stat.autoSliders);
    dispatch({
      type: 'ADD_CHANNEL',
      value: {
        selection,
        domain,
        slider
      }
    });
  };
  const { isPyramid, isRgb } = loader;
  const { colors, sliders, isOn, ids, selections, domains } = channels;
  const globalControlDimensions = dimensions?.filter(dimension =>
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(dimension.field)
  );
  const channelOptions = dimensions.filter(j => j.field === 'channel')[0]
    ?.values;
  const channelControllers = ids.map((id, i) => {
    const name = channelOptions[selections[i].channel];
    return (
      <Grid
        key={`channel-controller-${name}-${id}`}
        style={{ width: '100%' }}
        item
      >
        <ChannelController
          name={name}
          channelOptions={channelOptions}
          isOn={isOn[i]}
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
      {!isLoading &&
        initialViewState.target &&
        (useLinkedView && isPyramid ? (
          <SideBySideViewer
            loader={loader}
            sliderValues={sliders}
            colorValues={colors}
            channelIsOn={isOn}
            loaderSelection={selections}
            initialViewState={{
              ...initialViewState,
              height: viewSize.height,
              width: viewSize.width * 0.5
            }}
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
            initialViewState={{
              ...initialViewState,
              height: viewSize.height,
              width: viewSize.width
            }}
            colormap={colormap.length > 0 && colormap}
            overview={DEFAULT_OVERVIEW}
            overviewOn={overviewOn && isPyramid}
            hoverHooks={{ handleValue: setPixelValues }}
            lensSelection={lensSelection}
            isLensOn={isLensOn}
          />
        ))}
      {controllerOn && (
        <Menu
          maxHeight={viewSize.height}
          handleSubmitNewUrl={handleSubmitNewUrl}
          url={source.url}
        >
          {!isRgb && (
            <ColormapSelect
              value={colormap}
              handleChange={setColormap}
              disabled={isLoading}
            />
          )}
          {!isRgb && (
            <LensSelect
              handleToggle={setIsLensOn}
              handleSelection={setLensSelection}
              isOn={isLensOn}
              channelOptions={selections.map(
                sel => channelOptions[sel.channel]
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
      )}
      <Box position="absolute" right={-8} top={-8} m={2}>
        <MenuToggle on={controllerOn} toggle={toggleController} />
      </Box>
    </>
  );
}
