import React, { useState, useEffect, memo } from 'react';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Slider from '@material-ui/core/Slider';
import Checkbox from '@material-ui/core/Checkbox';
import { withStyles } from '@material-ui/core/styles';
import { VivViewer } from '../../src';
import sources from './source-info';
import './App.css';


const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const MIN_ZOOM = -8;
const DEFAULT_VIEW_CONFIG = { zoom: -5.5, target: [30000, 10000, 0] };
const INIT_SOURCE_NAME = 'zarr';
const INIT_COLOR_VALUES = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 128, 0],
];
const INIT_SLIDER_VALUES = Array(INIT_COLOR_VALUES.length).fill([0, 20000]);
const INIT_CHANNELS_ON = Array(INIT_COLOR_VALUES.length).fill(true);


const App = () => {
  const [colorValues] = useState(INIT_COLOR_VALUES); // We can add setter in demo later
  const [sliderValues, setSliderValues] = useState(INIT_SLIDER_VALUES);
  const [channelsOn, setChannelsOn] = useState(INIT_CHANNELS_ON);
  const [sourceName, setSourceName] = useState(INIT_SOURCE_NAME);
  const [viewWidth, setViewWidth] = useState(window.innerWidth * 0.7);
  const [viewHeight, setViewHeight] = useState(window.innerHeight * 0.9);

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

  const initialViewState = sources[sourceName].initialViewState || DEFAULT_VIEW_CONFIG
  const source = sources[sourceName];
  const channelNames = Object.keys(source.channels);

  return (
    <div>
      <VivViewer
        /* eslint-disable react/jsx-props-no-spreading */
        {...{
          useTiff: source.isTiff,
          useZarr: source.isZarr,
          sourceChannels: source.channels,
          minZoom: MIN_ZOOM,
          viewHeight,
          viewWidth,
          sliderValues,
          colorValues,
          channelsOn,
          initialViewState
        }}
        /* eslint-disable react/jsx-props-no-spreading */
      />
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
        {channelNames.map((channel, index) => {
          const ColoredSlider = withStyles({
            root: {
              color: `rgb(${colorValues[index]})`
            }
          })(Slider)
          const ColoredCheckbox = withStyles({
            root: {
              color: `rgb(${colorValues[index]})`,
              '&$checked': {
                color: colorValues[index]
              }
            },
            checked: {}
          })(checkBoxProps => (
            <Checkbox color="default" {...checkBoxProps} />
          ));
          return (
            <div key={`container-${channel}`}>
              <p>{channel}</p>
              <div style={{ width: '100%', display: 'flex', position: 'relative' }}>
                <ColoredCheckbox
                  onChange={() => toggleChannel(index)}
                  checked={channelsOn[index]}
                />
                <ColoredSlider
                  style={{ top: '7px' }}
                  value={sliderValues[index]}
                  onChange={(event, value) => handleSliderChange(index, value)}
                  valueLabelDisplay="auto"
                  getAriaLabel={() => channel}
                  min={MIN_SLIDER_VALUE}
                  max={MAX_SLIDER_VALUE}
                  orientation="horizontal"
                />
              </div>
            </div>
        )})}
      </div>
    </div>
  );
}

// equivalent to PureComponent
export default memo(App);