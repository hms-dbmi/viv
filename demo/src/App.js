import React, { useState, useEffect, memo } from 'react';
import { Button, ButtonGroup, Slider, Checkbox, withStyles }  from '@material-ui/core';
import { VivViewer, initPyramidLoader } from '../../src';
import sources from './source-info';
import './App.css';


const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const MIN_ZOOM = -8;
const DEFAULT_VIEW_CONFIG = { zoom: -5.5, target: [30000, 10000, 0] };

const initSourceName = 'zarr';
const colorValues = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 128, 0],
];
const styledSelectors = colorValues.map(color => {
  const ColoredSlider = withStyles({
    root: {
      color: `rgb(${color})`,
    }
  })(Slider);
  const ColoredCheckbox = withStyles({
    root: {
      color: `rgb(${color})`,
      '&$checked': {
        color: `rgb(${color})`
      }
    },
    checked: {}
  })(Checkbox)
  return [ColoredSlider, ColoredCheckbox]
})

const initSliderValues = Array(colorValues.length).fill([0, 20000]);
const initChannelsOn = Array(colorValues.length).fill(true);

const App = () => {
  const [sliderValues, setSliderValues] = useState(initSliderValues);
  const [channelsOn, setChannelsOn] = useState(initChannelsOn);
  const [sourceName, setSourceName] = useState(initSourceName);
  const [viewWidth, setViewWidth] = useState(window.innerWidth * 0.7);
  const [viewHeight, setViewHeight] = useState(window.innerHeight * 0.9);
  const [loader, setLoader] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setViewWidth(window.innerWidth * 0.7);
      setViewHeight(window.innerHeight * 0.9);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  useEffect(() => {
    async function initLoader() {
      const config = {
        scale: 1,
        sourceChannels: sources[sourceName].channels,
        minZoom: MIN_ZOOM,
        isRgb: false,
        dimNames: ["channel", "y", "x"]
      }
      const newLoader = await initPyramidLoader(sourceName, config);
      setLoader(newLoader)
    }
    initLoader();
  }, [sourceName])

  const handleSliderChange = (index, value) => {
    setSliderValues(prevSliderValues => {
      const nextSliderValues = [...prevSliderValues];
      nextSliderValues[index] = value;
      return nextSliderValues;
    });
  };

  const toggleChannel = (index) => {
    setChannelsOn(prevChannelsOn => {
      const nextChannelsOn = [...prevChannelsOn];
      nextChannelsOn[index] = !nextChannelsOn[index];
      return nextChannelsOn
    });
  }


  const sourceButtons = Object.keys(sources).map(name => {
    return (
      <Button
        variant="contained"
        key={name}
        disabled={name === sourceName}
        onClick={() => setSourceName(name)}
      >
        {name}
      </Button>
    );
  });

  const sliders = Object.keys(sources[sourceName].channels).map((channel, i) => {
    const [ColoredSlider, ColoredCheckbox] = styledSelectors[i];
    return (
      <div key={`container-${channel}`}>
        <p>{channel}</p>
        <div style={{ width: '100%', display: 'flex', position: 'relative' }}>
          <ColoredCheckbox
            onChange={() => toggleChannel(i)}
            checked={channelsOn[i]}
          />
          <ColoredSlider
            style={{ top: '7px' }}
            value={sliderValues[i]}
            onChange={(event, value) => handleSliderChange(i, value)}
            valueLabelDisplay="auto"
            getAriaLabel={() => channel}
            min={MIN_SLIDER_VALUE}
            max={MAX_SLIDER_VALUE}
            orientation="horizontal"
          />
        </div>
      </div>
  )});

  const source = sources[sourceName];

  const initialViewState = sources[sourceName].initialViewState || DEFAULT_VIEW_CONFIG
  return (
    <div>
      {loader ? (
        <VivViewer
          useTiff={source.isTiff}
          useZarr={source.isZarr}
          sourceChannels={source.channels}
          loader={loader}
          minZoom={MIN_ZOOM}
          viewHeight={viewHeight}
          viewWidth={viewWidth}
          sliderValues={sliderValues}
          colorValues={colorValues}
          channelsOn={channelsOn}
          initialViewState={initialViewState}
        />
) : null}
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
        {sliders}
      </div>
    </div>
  );
}

// equivalent to PureComponent
export default memo(App);