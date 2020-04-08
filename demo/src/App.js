import React, { useState, useEffect, memo, useReducer } from 'react';
import { Button, ButtonGroup } from '@material-ui/core';
import { VivViewer } from '../../src';
import sources from './source-info';
import './App.css';
import { createLoader, useWindowSize, channelsReducer } from './utils';
import ChannelController from './ChannelController';

const DEFAULT_VIEW_STATE = { zoom: -5.5, target: [30000, 10000, 0] };
const DEFAULT_COLORMAP = 'viridis';
const DEFAULT_OVERVIEW = { margin: 25, scale: 0.15, position: 'bottom-left' };

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
  const [colormapOn, toggleColormap] = useReducer(v => !v, false);
  const [overviewOn, toggleOverview] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);
  const viewSize = useWindowSize();

  useEffect(() => {
    async function changeLoader() {
      setLoader(null);
      const sourceInfo = sources[sourceName];
      const nextLoader = await createLoader(sourceName, sourceInfo);
      if (typeof nextLoader.serializeSelection === 'function') {
        const { selection } = sourceInfo;
        const serialized = nextLoader.serializeSelection(selection);
        dispatch({
          type: 'RESET_CHANNELS',
          value: { names: Object.values(selection), selections: serialized }
        });
      } else {
        const names = sourceInfo.dimensions[0].values;
        dispatch({ type: 'RESET_CHANNELS', value: { names } });
      }
      setLoader(nextLoader);
    }
    changeLoader();
  }, [sourceName]);

  const handleChannelChange = (index, type, value) => {
    dispatch({ type, index, value });
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
      // eslint-disable-next-line react/no-array-index-key
      <div key={`slider-${id}`}>
        <ChannelController
          channel={names[i]}
          channelOptions={dimensions[0].values}
          channelOn={isOn[i]}
          sliderValue={sliders[i]}
          colorValue={colors[i]}
          handleChannelChange={(type, value) =>
            handleChannelChange(i, type, value)
          }
        />
      </div>
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
          colormap={colormapOn && DEFAULT_COLORMAP}
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
          <button onClick={toggleColormap} type="button">
            {colormapOn ? 'Colors' : DEFAULT_COLORMAP}
          </button>
          {isPyramid && (
            <button onClick={toggleOverview} type="button">
              {overviewOn ? 'Hide' : 'Show'} Overview
            </button>
          )}
          {channelControllers}
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
