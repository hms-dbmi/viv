import React, { useState, useEffect, useReducer } from 'react';

import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import AddIcon from '@material-ui/icons/Add';

import { SideBySideViewer, PictureInPictureViewer } from '../../src';
import sources from './source-info';
import { createLoader, channelsReducer, useWindowSize } from './utils';

import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import MenuToggle from './components/MenuToggle';
import ColormapSelect from './components/ColormapSelect';
import SourceSelect from './components/SourceSelect';

import {
  MAX_CHANNELS,
  DEFAULT_VIEW_STATE,
  DEFAULT_OVERVIEW
} from './constants';

const initialChannels = {
  sliders: [],
  colors: [],
  selections: [],
  names: [],
  ids: [],
  isOn: []
};

function App() {
  const [channels, dispatch] = useReducer(channelsReducer, initialChannels);
  const viewSize = useWindowSize();
  const [loader, setLoader] = useState(null);
  const [sourceName, setSourceName] = useState('zarr');
  const [colormap, setColormap] = useState('');
  const [useLinkedView, toggleLinkedView] = useReducer(v => !v, false);
  const [overviewOn, toggleOverview] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);
  const [zoomLock, toggleZoomLock] = useReducer(v => !v, true);
  const [panLock, togglePanLock] = useReducer(v => !v, true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function changeLoader() {
      setIsLoading(true);
      const sourceInfo = sources[sourceName];
      const nextLoader = await createLoader(sourceName, sourceInfo);
      if (typeof nextLoader.serializeSelection === 'function') {
        // TODO: Once tiff loader is ready, we won't need this if block.
        const { selections, dimensions } = sourceInfo;
        const serialized = nextLoader.serializeSelection(selections);
        const names = selections.map(sel => sel[dimensions[0].field]);
        dispatch({
          type: 'RESET_CHANNELS',
          value: { names, selections: serialized }
        });
      } else {
        const names = sourceInfo.dimensions[0].values;
        dispatch({ type: 'RESET_CHANNELS', value: { names } });
      }
      setLoader(nextLoader);
      setIsLoading(false);
    }
    changeLoader();
  }, [sourceName]);

  /*
   * Handles updating state for each channel controller.
   * Is is too heavy weight to store each channel as an object in state,
   * so we store the individual viv props (colorValues, sliderValues, etc)
   * in separate arrays. We use the ordering of the channels in the menu to make
   * update state very responsive (but dispatching the index of the channel)
   */
  const handleControllerChange = (index, type, value) => {
    if (type === 'CHANGE_CHANNEL') {
      const [channelDim] = sources[sourceName].dimensions;
      const { field, values } = channelDim;
      const dimIndex = values.indexOf(value);
      const [serialized] = loader.serializeSelection({
        [field]: dimIndex
      });
      dispatch({
        type,
        index,
        value: { name: values[dimIndex], selection: serialized }
      });
    } else {
      dispatch({ type, index, value });
    }
  };

  const handleChannelAdd = () => {
    const [channelDim] = sources[sourceName].dimensions;
    dispatch({
      type: 'ADD_CHANNEL',
      value: { name: channelDim.values[0], selection: [0, 0, 0] }
    });
  };

  const { initialViewState, isPyramid, dimensions } = sources[sourceName];
  const { names, colors, sliders, isOn, ids, selections } = channels;
  const channelControllers = ids.map((id, i) => {
    return (
      <Grid key={`channel-controller-${names[i]}-${id}`} item>
        <ChannelController
          name={names[i]}
          channelOptions={dimensions[0].values}
          disableOptions={sourceName === 'tiff'}
          isOn={isOn[i]}
          sliderValue={sliders[i]}
          colorValue={colors[i]}
          handleChange={(type, value) => handleControllerChange(i, type, value)}
          colormapOn={colormap.length > 0}
        />
      </Grid>
    );
  });
  return (
    <>
      {!isLoading &&
        (useLinkedView && isPyramid ? (
          <SideBySideViewer
            loader={loader}
            sliderValues={sliders}
            colorValues={colors}
            channelIsOn={isOn}
            loaderSelection={selections}
            initialViewState={{
              ...(initialViewState || DEFAULT_VIEW_STATE),
              height: viewSize.height,
              width: viewSize.width * 0.5
            }}
            colormap={colormap.length > 0 && colormap}
            zoomLock={zoomLock}
            panLock={panLock}
          />
        ) : (
          <PictureInPictureViewer
            loader={loader}
            sliderValues={sliders}
            colorValues={colors}
            channelIsOn={isOn}
            loaderSelection={selections}
            initialViewState={{
              ...(initialViewState || DEFAULT_VIEW_STATE),
              height: viewSize.height,
              width: viewSize.width
            }}
            colormap={colormap.length > 0 && colormap}
            overview={DEFAULT_OVERVIEW}
            overviewOn={overviewOn && isPyramid}
          />
        ))}
      {controllerOn && (
        <Menu maxHeight={viewSize.height}>
          <Grid container justify="space-between">
            <Grid item xs={6}>
              <SourceSelect
                value={sourceName}
                handleChange={setSourceName}
                disabled={isLoading}
              />
            </Grid>
            <Grid item xs={5}>
              <ColormapSelect
                value={colormap}
                handleChange={setColormap}
                disabled={isLoading}
              />
            </Grid>
          </Grid>
          {!isLoading ? (
            channelControllers
          ) : (
            <Grid container justify="center">
              <CircularProgress />
            </Grid>
          )}
          <Button
            disabled={
              ids.length === MAX_CHANNELS || sourceName === 'tiff' || isLoading
            }
            onClick={handleChannelAdd}
            fullWidth
            variant="outlined"
            style={{ borderStyle: 'dashed' }}
            startIcon={<AddIcon />}
            size="small"
          >
            Add Channel
          </Button>
          <Button
            disabled={!isPyramid || isLoading || useLinkedView}
            onClick={toggleOverview}
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
      <Box position="absolute" right={0} top={0} m={2}>
        <MenuToggle on={controllerOn} toggle={toggleController} />
      </Box>
    </>
  );
}
export default App;
