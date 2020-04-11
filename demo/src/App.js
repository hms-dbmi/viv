import React, { useState, useEffect, useReducer } from 'react';
import {
  Button,
  Box,
  Grid,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Tooltip
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';

import { VivViewer } from '../../src';
import sources from './source-info';
import {
  createLoader,
  hexToRgb,
  channelsReducer,
  useWindowSize
} from './utils';
import ChannelController from './components/ChannelController';
import Description from './components/Description';
import Menu from './components/Menu';

const MAX_CHANNELS = 6;
const DEFAULT_VIEW_STATE = { zoom: -5.5, target: [30000, 10000, 0] };
const DEFAULT_OVERVIEW = { margin: 25, scale: 0.15, position: 'bottom-left' };
const COLORMAP_OPTIONS = [
  'viridis',
  'greys',
  'magma',
  'jet',
  'hot',
  'bone',
  'copper',
  'summer',
  'density',
  'inferno'
];

const initSourceName = 'zarr';

const ColorSelector = ({ colormap, handleColormapChange }) => (
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

const SourceSelector = ({ source, sourceOptions, handleChange }) => (
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
  const [channelColor, setChannelColor] = useState('#ff0000');

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
    const name = channelDim.values[0];
    dispatch({
      type: 'ADD_CHANNEL',
      value: { name, selection: [0, 0, 0], color: hexToRgb(channelColor) }
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
          <Grid container>
            <Grid item xs={11}>
              <Description />
            </Grid>
          </Grid>
          <Grid container justify="space-between">
            <Grid item xs={8}>
              <SourceSelector
                sourceOptions={sourceOptions}
                source={sourceName}
                handleChange={setSourceName}
              />
            </Grid>
            <Grid item>
              <ColorSelector
                colormap={colormap}
                handleColormapChange={setColormap}
              />
            </Grid>
          </Grid>
          {channelControllers}
          <Button
            disabled={ids.length === MAX_CHANNELS || sourceName === 'tiff'}
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
            disabled={!isPyramid}
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
        {controllerOn ? (
          <Tooltip title="Hide" aria-label="hide-controls">
            <IconButton color="default" size="small" onClick={toggleController}>
              <RemoveIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="outlined"
            color="default"
            size="small"
            endIcon={<AddIcon />}
            onClick={toggleController}
            aria-label="show-controls"
          >
            Show Controls
          </Button>
        )}
      </Box>
    </>
  );
}
export default App;
