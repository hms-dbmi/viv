import React, { useState, useEffect, memo, useReducer } from 'react';
import { Button, ButtonGroup, Slider, Checkbox } from '@material-ui/core';
import { VivViewer } from '../../src';
import sources from './source-info';
import './App.css';
import { createLoader, useWindowSize } from './utils';

const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const DEFAULT_VIEW_STATE = { zoom: -5.5, target: [30000, 10000, 0] };
const COLORMAP = 'viridis';
const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];
const MARGIN = 25;

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
  const [channelNames, setChannelNames] = useState(null);
  const [loaderSelection, setLoaderSelection] = useState(null);
  const [loader, setLoader] = useState(null);
  const [sourceName, setSourceName] = useState(initSourceName);
  const [colormapOn, toggleColormap] = useReducer(v => !v, false);
  const [overviewOn, toggleOverview] = useReducer(v => !v, false);
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

  const sliders = channelNames
    ? channelNames.map((channel, i) => {
        return (
          <div key={`container-${channel}`}>
            <p>{channel}</p>
            <div
              style={{ width: '100%', display: 'flex', position: 'relative' }}
            >
              <Checkbox
                onChange={() => toggleChannel(i)}
                checked={channelIsOn[i]}
                style={{
                  color: `rgb(${
                    colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValues[i]
                  })`,
                  '&$checked': {
                    color: `rgb(${
                      colormapOn
                        ? COLORMAP_SLIDER_CHECKBOX_COLOR
                        : colorValues[i]
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
      })
    : null;

  const initialViewState =
    sources[sourceName].initialViewState || DEFAULT_VIEW_STATE;
  return (
    <div>
      {loader && channelNames && channelIsOn && sliderValues && colorValues ? (
        <VivViewer
          loader={loader}
          viewHeight={viewSize.height}
          viewWidth={viewSize.width}
          sliderValues={sliderValues}
          colorValues={colorValues.slice(0, channelNames.length)}
          channelIsOn={channelIsOn}
          loaderSelection={loaderSelection}
          initialViewState={initialViewState}
          colormap={colormapOn && COLORMAP}
          overview={
            overviewOn
              ? {
                  margin: MARGIN,
                  scale: 0.2,
                  position: 'bottom-left'
                }
              : null
          }
        />
      ) : null}
      <div className="slider-container">
        <p>
          <strong>vitessce-image-viewer</strong> (&ldquo;Viv&rdquo;): A viewer
          for high bit depth, high resolution, multi-channel images using DeckGL
          over the hood and WebGL under the hood.
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
        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
          <Button variant="contained" onClick={toggleColormap} key="colormap">
            {colormapOn ? 'Colors' : COLORMAP}
          </Button>
        </div>
        {loader && loader.isPyramid ? (
          <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <Button variant="contained" onClick={toggleOverview} key="overview">
              {overviewOn ? 'Remove Overview' : 'Show Overview'}
            </Button>
          </div>
        ) : (
          []
        )}
        {sliders}
      </div>
    </div>
  );
}

// equivalent to PureComponent
export default memo(App);
