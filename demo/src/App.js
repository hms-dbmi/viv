import React, { useState, useEffect, memo, useReducer } from 'react';
import { Button, ButtonGroup, Slider, Checkbox } from '@material-ui/core';
import { VivViewer } from '../../src';
import sources from './source-info';
import './App.css';
import { createLoader, useWindowSize } from './utils';

const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const DEFAULT_VIEW_STATE = { zoom: -5.5, target: [30000, 10000, 0] };
const DEFAULT_COLORMAP = 'viridis';
const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];
const DEFAULT_OVERVIEW = {
  margin: 25,
  scale: 0.15,
  position: 'bottom-left'
};

const initSourceName = 'zarr';
const colorValues = [
  [0, 0, 255],
  [0, 255, 0],
  [255, 0, 0],
  [255, 128, 0],
  [255, 0, 255],
  [0, 255, 255]
];

function App() {
  const [sliderValues, setSliderValues] = useState(null);
  const [channelIsOn, setChannelIsOn] = useState(null);
  const [channelNames, setChannelNames] = useState([]);
  const [loaderSelection, setLoaderSelection] = useState(null);
  const [loader, setLoader] = useState(null);
  const [sourceName, setSourceName] = useState(initSourceName);
  const [colormapOn, toggleColormap] = useReducer(v => !v, false);
  const [overviewOn, toggleOverview] = useReducer(v => !v, false);
  const [controllerOn, toggleController] = useReducer(v => !v, true);
  const viewSize = useWindowSize();

  useEffect(() => {
    async function initLoader() {
      setLoader(null);
      const sourceInfo = sources[sourceName];
      const nextLoader = await createLoader(sourceName, sourceInfo);
      if (typeof nextLoader.serializeSelection === 'function') {
        const { selection } = sourceInfo;
        const serialized = nextLoader.serializeSelection(selection);
        setLoaderSelection(serialized);
        setSliderValues(Array(selection.length).fill([0, 20000]));
        setChannelIsOn(Array(selection.length).fill(true));
        setChannelNames(selection.map(d => (d.channel ? d.channel : d.mz)));
      } else {
        const { dimensions } = sourceInfo;
        const channels = dimensions[0].values;
        setSliderValues(Array(channels.length).fill([0, 20000]));
        setChannelIsOn(Array(channels.length).fill(true));
        setChannelNames(channels);
      }
      setLoader(nextLoader);
    }
    initLoader();
  }, [sourceName]);

  const handleSliderChange = (index, value) => {
    setSliderValues(prevSliderValues => {
      const nextSliderValues = [...prevSliderValues];
      nextSliderValues[index] = value;
      return nextSliderValues;
    });
  };

  const toggleChannel = index => {
    setChannelIsOn(prevChannelsOn => {
      const nextChannelsOn = [...prevChannelsOn];
      nextChannelsOn[index] = !nextChannelsOn[index];
      return nextChannelsOn;
    });
  };

  const handleChannelSelectionChange = (index, event) => {
    const dimIndex = Number(event.target.value);
    const [channelDim] = sources[sourceName].dimensions;
    const [selection] = loader.serializeSelection({
      [channelDim.field]: dimIndex
    });
    setLoaderSelection(prevLoaderSelection => {
      const nextLoaderSelection = [...prevLoaderSelection];
      nextLoaderSelection[index] = selection;
      return nextLoaderSelection;
    });
    setChannelNames(prevChannelNames => {
      const nextChannelNames = [...prevChannelNames];
      nextChannelNames[index] = channelDim.values[dimIndex];
      return nextChannelNames;
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

  const allChannelNames = sources[sourceName].dimensions[0].values;
  const sliders = channelNames.map((channel, i) => {
    return (
      // eslint-disable-next-line react/no-array-index-key
      <div key={`container-${channel}-${i}`}>
        <select
          defaultValue={channel}
          key={channel}
          onChange={e => handleChannelSelectionChange(i, e)}
        >
          {allChannelNames.map((name, j) => (
            <option key={name} value={j}>
              {name}
            </option>
          ))}
        </select>
        <div style={{ width: '100%', display: 'flex', position: 'relative' }}>
          <Checkbox
            onChange={() => toggleChannel(i)}
            checked={channelIsOn[i]}
            style={{
              color: `rgb(${
                colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValues[i]
              })`,
              '&$checked': {
                color: `rgb(${
                  colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValues[i]
                })`
              }
            }}
          />
          <Slider
            value={sliderValues[i]}
            onChange={(event, value) => handleSliderChange(i, value)}
            valueLabelDisplay="auto"
            getAriaLabel={() => channel}
            min={MIN_SLIDER_VALUE}
            max={MAX_SLIDER_VALUE}
            style={{
              color: `rgb(${
                colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValues[i]
              })`,
              top: '7px'
            }}
            orientation="horizontal"
          />
        </div>
      </div>
    );
  });

  const { initialViewState, isPyramid } = sources[sourceName];
  return (
    <>
      {loader && channelNames && channelIsOn && sliderValues && colorValues && (
        <VivViewer
          loader={loader}
          viewHeight={viewSize.height}
          viewWidth={viewSize.width}
          sliderValues={sliderValues}
          colorValues={colorValues.slice(0, channelNames.length)}
          channelIsOn={channelIsOn}
          loaderSelection={loaderSelection}
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
          <div>
            <input type="color" />
          </div>
          <button onClick={toggleColormap} type="button">
            {colormapOn ? 'Colors' : DEFAULT_COLORMAP}
          </button>
          {isPyramid && (
            <button onClick={toggleOverview} type="button">
              {overviewOn ? 'Hide' : 'Show'} Overview
            </button>
          )}
          {sliders}
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
