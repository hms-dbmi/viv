import React, { useState, useEffect, memo } from 'react';
import { Button, ButtonGroup, Slider, Checkbox } from '@material-ui/core';
import { VivViewer } from '../../src';
import { initPyramidLoader } from './initLoaders';
import sources from './source-info';
import './App.css';

const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const MIN_ZOOM = -8;
const DEFAULT_VIEW_STATE = { zoom: -5.5, target: [30000, 10000, 0] };
const COLORMAP = 'viridis';
const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];

const initSourceName = 'zarr';
const colorValues = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 128, 0],
  [255, 0, 255],
  [0, 255, 255]
];

const initSliderValues = Array(colorValues.length).fill([0, 20000]);
const initChannelIsOn = Array(colorValues.length).fill(true);
function App() {
  const [sliderValues, setSliderValues] = useState(initSliderValues);
  const [channelIsOn, setChannelIsOn] = useState(initChannelIsOn);
  const [sourceName, setSourceName] = useState(initSourceName);
  const [viewWidth, setViewWidth] = useState(window.innerWidth * 0.7);
  const [viewHeight, setViewHeight] = useState(window.innerHeight * 0.9);
  const [loader, setLoader] = useState(null);
  const [colormapOn, setColormap] = useState('');
  const [overviewOn, setOverview] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setViewWidth(window.innerWidth * 0.7);
      setViewHeight(window.innerHeight * 0.9);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  useEffect(() => {
    async function initLoader() {
      const config = {
        channelNames: sources[sourceName].channelNames,
        url: sources[sourceName].url,
        minZoom:
          typeof sources[sourceName].minZoom === 'number'
            ? sources[sourceName].minZoom
            : MIN_ZOOM
      };
      // Need to do this to clear last loader... probably a better way.
      setLoader(null);
      const newLoader = await initPyramidLoader(sourceName, config);
      setLoader(newLoader);
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

  const toggleColormap = () => {
    setColormap(prevColormap => {
      return prevColormap ? '' : COLORMAP;
    });
  };

  const toggleOverview = () => {
    setOverview(prevOverviewOn => {
      return !prevOverviewOn;
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

  const sliders = sources[sourceName].channelNames.map((channel, i) => {
    return (
      <div key={`container-${channel}`}>
        <p>{channel}</p>
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

  const initialViewState =
    sources[sourceName].initialViewState || DEFAULT_VIEW_STATE;
  return (
    <div>
      {loader ? (
        <VivViewer
          loader={loader}
          minZoom={MIN_ZOOM}
          viewHeight={viewHeight}
          viewWidth={viewWidth}
          sliderValues={sliderValues.slice(
            0,
            sources[sourceName].channelNames.length
          )}
          colorValues={colorValues.slice(
            0,
            sources[sourceName].channelNames.length
          )}
          channelIsOn={channelIsOn.slice(
            0,
            sources[initSourceName].channelNames.length
          )}
          initialViewState={initialViewState}
          colormap={colormapOn}
          overviewOn={overviewOn}
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
          <Button
            variant="contained"
            onClick={() => toggleColormap()}
            key="colormap"
          >
            {colormapOn ? 'Colors' : COLORMAP}
          </Button>
        </div>
        {loader && loader.isPyramid ? (
          <div style={{ marginTop: '15px', marginBottom: '15px' }}>
            <Button
              variant="contained"
              onClick={() => toggleOverview()}
              key="overview"
            >
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
