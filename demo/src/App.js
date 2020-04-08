import React, { useState, useEffect, memo, useReducer } from 'react';
import { Button, ButtonGroup } from '@material-ui/core';
import { VivViewer } from '../../src';
import sources from './source-info';
import './App.css';
import {
  createLoader,
  useWindowSize,
  channelsReducer,
  hexToRgb
} from './utils';
import ChannelController from './ChannelController';

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
const initChannelState = {
  sliders: [],
  colors: [],
  selections: [],
  names: [],
  ids: [],
  isOn: []
};

function App() {
  const [channels, dispatch] = useReducer(channelsReducer, initChannelState);
  const [loader, setLoader] = useState(null);
  const [sourceName, setSourceName] = useState(initSourceName);
  const [colormap, setColormap] = useState('');
  const [overviewOn, toggleOverview] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);
  const [channelColor, setChannelColor] = useState('#ff0000');
  const viewSize = useWindowSize();

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
  }, [sourceName]);

  const handleControllerChange = (index, type, value) => {
    if (type === 'CHANGE_CHANNEL_DROPDOWN') {
      const [channelDim] = sources[sourceName].dimensions;
      const { field, values } = channelDim;
      const dimIndex = values.indexOf(value);
      const [serialized] = loader.serializeSelection({
        [field]: dimIndex
      });
      dispatch({
        type: 'CHANGE_CHANNEL',
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

  const sourceButtons = Object.keys(sources).map(name => {
    return (
      // only use isPublic on the deployment
      // eslint-disable-next-line no-restricted-globals
      (location.host === 'viv.vitessce.io' ? sources[name].isPublic : true) && (
        <Button
          variant="contained"
          key={name}
          disabled={name === sourceName}
          onClick={() => setSourceName(name)}
        >
          {name}
        </Button>
      )
    );
  });

  const { initialViewState, isPyramid, dimensions } = sources[sourceName];
  const { names, colors, sliders, isOn, ids, selections } = channels;

  const channelControllers = ids.map((id, i) => {
    return (
      <ChannelController
        name={names[i]}
        channelOptions={dimensions[0].values}
        disableOptions={sourceName === 'tiff'}
        isOn={isOn[i]}
        sliderValue={sliders[i]}
        colorValue={colors[i]}
        handleChange={(type, value) => handleControllerChange(i, type, value)}
        colormapOn={colormap.length > 0}
        key={`channel-controller-${names[i]}-${id}`}
      />
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
        <div className="slider-container">
          <p>
            <strong>vitessce-image-viewer</strong> (&ldquo;Viv&rdquo;): A viewer
            for high bit depth, high resolution, multi-channel images using
            DeckGL over the hood and WebGL under the hood.
          </p>
          <p>
            More information:{' '}
            <a href="https://github.com/hubmapconsortium/vitessce-image-viewer">
              Github
            </a>
            ,&nbsp;
            <a href="https://www.npmjs.com/package/@hubmap/vitessce-image-viewer">
              NPM
            </a>
          </p>
          <ButtonGroup color="primary" size="small">
            {sourceButtons}
          </ButtonGroup>
          <br />
          <label htmlFor="colormap-select">
            Colormap:
            <select
              onChange={e => setColormap(e.target.value)}
              value={colormap}
              id="colormap-select"
            >
              <option value="">None</option>
              {COLORMAP_OPTIONS.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {channelControllers}
          {isPyramid && (
            <button onClick={toggleOverview} type="button">
              {overviewOn ? 'Hide' : 'Show'} Overview
            </button>
          )}
          <button
            type="button"
            disabled={ids.length === MAX_CHANNELS || sourceName === 'tiff'}
            onClick={handleChannelAdd}
          >
            Add Channel
          </button>
          <input
            type="color"
            value={channelColor}
            onChange={e => setChannelColor(e.target.value)}
            disabled={sourceName === 'tiff'}
          />
        </div>
      )}
      <button className="menu-toggle" type="button" onClick={toggleController}>
        {controllerOn ? 'Hide' : 'Show'} Controller
      </button>
    </>
  );
}

// equivalent to PureComponent
export default memo(App);
