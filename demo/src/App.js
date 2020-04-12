import React, { useState, useEffect, useReducer } from 'react';
import {
  Button,
  Box,
  Grid,
  Select,
  InputLabel,
  FormControl
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import CircularProgress from '@material-ui/core/CircularProgress';
import LinearProgress from '@material-ui/core/LinearProgress';

import { VivViewer } from '../../src';
import sources from './source-info';
import { createLoader, channelsReducer, useWindowSize } from './utils';
import ChannelController from './components/ChannelController';
import Menu from './components/Menu';
import MenuToggle from './components/MenuToggle';

import {
  MAX_CHANNELS,
  DEFAULT_VIEW_STATE,
  DEFAULT_OVERVIEW,
  COLORMAP_OPTIONS
} from './constants';

const initSourceName = 'zarr';

const ColorSelector = ({ colormap, handleColormapChange, disabled }) => (
  <FormControl fullWidth>
    <InputLabel htmlFor="colormap-select">Colormap</InputLabel>
    <Select
      native
      onChange={e => handleColormapChange(e.target.value)}
      value={colormap}
      inputProps={{
        name: 'colormap',
        id: 'colormap-select'
      }}
      disabled={disabled}
    >
      <option aria-label="None" value="" />
      {COLORMAP_OPTIONS.map(name => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </Select>
  </FormControl>
);

const SourceSelector = ({ source, sourceOptions, handleChange, disabled }) => (
  <FormControl fullWidth>
    <InputLabel htmlFor="data-source-select">Data Source</InputLabel>
    <Select
      native
      onChange={e => handleChange(e.target.value)}
      value={source}
      inputProps={{
        name: 'data-source',
        id: 'data-source-select'
      }}
      disabled={disabled}
    >
      {sourceOptions.map(opt => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </Select>
  </FormControl>
);

function App() {
  const [channels, dispatch] = useReducer(channelsReducer, {
    sliders: [],
    colors: [],
    selections: [],
    names: [],
    ids: [],
    isOn: []
  });
  const viewSize = useWindowSize();
  const [loader, setLoader] = useState(null);
  const [sourceName, setSourceName] = useState(initSourceName);
  const [colormap, setColormap] = useState('');
  const [overviewOn, toggleOverview] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);

  useEffect(() => {
    async function changeLoader() {
      setLoader(null);
      const sourceInfo = sources[sourceName];
      const nextLoader = await createLoader(sourceName, sourceInfo);
      if (typeof nextLoader.serializeSelection === 'function') {
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
    }
    changeLoader();
  }, [sourceName, dispatch]);

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
      value: { name: channelDim.values[0], sselection: [0, 0, 0] }
    });
  };

  const sourceOptions = Object.keys(sources).filter(name =>
    // only use isPublic on the deployment
    // eslint-disable-next-line no-restricted-globals
    location.host === 'viv.vitessce.io' ? sources[name].isPublic : true
  );

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
      {loader && (
        <VivViewer
          loader={loader}
          viewHeight={viewSize.height}
          viewWidth={viewSize.width}
          sliderValues={sliders}
          colorValues={colors}
          channelIsOn={isOn}
          loaderSelection={selections}
          initialViewState={initialViewState || DEFAULT_VIEW_STATE}
          colormap={colormap.length > 0 && colormap}
          overview={overviewOn && DEFAULT_OVERVIEW}
        />
      )}
      {controllerOn && (
        <Menu maxHeight={viewSize.height}>
          <Grid container justify="space-between">
            <Grid item xs={7}>
              <SourceSelector
                sourceOptions={sourceOptions}
                source={sourceName}
                handleChange={setSourceName}
                disabled={!loader}
              />
            </Grid>
            <Grid item xs={4}>
              <ColorSelector
                colormap={colormap}
                handleColormapChange={setColormap}
                disabled={!loader}
              />
            </Grid>
          </Grid>
          {loader ? (
            channelControllers
          ) : (
            <Grid container justify="center">
              <CircularProgress />
            </Grid>
          )}
          <Button
            disabled={
              ids.length === MAX_CHANNELS || sourceName === 'tiff' || !loader
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
            disabled={!isPyramid || !loader}
            onClick={toggleOverview}
            variant="outlined"
            size="small"
            fullWidth
          >
            {overviewOn ? 'Hide' : 'Show'} Picture-In-Picture
          </Button>
        </Menu>
      )}
      <Box position="absolute" right={0} top={0} m={2}>
        <MenuToggle on={controllerOn} toggle={toggleController} />
      </Box>
    </>
  );
}
export default App;
