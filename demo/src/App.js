import React, { PureComponent, useState, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Slider from '@material-ui/core/Slider';
import Checkbox from '@material-ui/core/Checkbox';
import { makeStyles } from '@material-ui/core/styles';
import { VivViewer } from '../../src';
import sources from './source-info';
import './App.css';

const initSourceName = 'zarr';

const useStyles = makeStyles({
  slider: props => ({
    color: props.color,
  }),
  checkbox: {
    color: props => props.color,
    '&$checked': props => ({
      color: props.color,
    }),
    checked: {},
  },
});

// const FunctionApp = () => {
//   const channelNames = Object.keys(sources[initSourceName].channels);
//   const [colors, setColors] = useState([
//     [255, 0, 0],
//     [0, 255, 0],
//     [0, 0, 255],
//     [255, 128, 0]
//   ]);
//   const [sliderValues, setSliderValues] = useState(Array(channelNames.length).fill([0, 20000]));
//   const [channelsOn, setChannelsOn] = useState(Array(channelNames.length).fill(true));
// }

export default class App extends PureComponent {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
    const channelNames = Object.keys(sources[initSourceName].channels);
    const colorValues = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 128, 0]
    ];
    const sliderValues = Array(channelNames.length).fill([0, 20000]);
    const channelsOn = Array(channelNames.length).fill(true);

    this.state = {
      sliderValues,
      colorValues,
      channelsOn,
      channelNames,
      viewHeight: window.innerHeight * 0.9,
      viewWidth: window.innerWidth * 0.7,
      sourceName: initSourceName
    };
    this.max = 65535;
    window.addEventListener('resize', this.resize);
  }

  handleSliderChange(index, value) {
    this.setState(prevState => {
      const sliderValues = [...prevState.sliderValues];
      sliderValues[index] = value;
      return { sliderValues };
    });
  };

  toggleChannel(index) {
    this.setState(prevState => {
      const channelsOn = [...prevState.channelsOn];
      channelsOn[index] = !channelsOn[index];
      return { channelsOn }
    });
  }

  resize() {
    this.setState({
      viewHeight: window.innerHeight * 0.9,
      viewWidth: window.innerWidth * 0.7
    });
  }

  render() {
    const { sourceName } = this.state;
    const initialViewState = sources[sourceName].initialViewState || {
      zoom: -5.5,
      target: [30000, 10000, 0]
    };
    const {
      sliderValues,
      colorValues,
      channelNames,
      viewHeight,
      viewWidth,
      channelsOn
    } = this.state;
    console.log(colorValues)

    const sourceButtons = Object.keys(sources).map(name => {
      return (
        <Button
          variant="contained"
          key={name}
          disabled={name === sourceName}
          onClick={() => {
            this.setState({ sourceName: name });
          }}
        >
          {name}
        </Button>
      );
    });

    const source = sources[sourceName];
    return (
      <div>
        <VivViewer
          /* eslint-disable react/jsx-props-no-spreading */
          {...{
            useTiff: source.isTiff,
            useZarr: source.isZarr,
            sourceChannels: source.channels,
            minZoom: -8,
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
            // const classes  = useStyles({ color: colorValues[index] });
            return (
              <div key={`container-${channel}`}>
                <p>{channel}</p>
                <div style={{ width: '100%', display: 'flex', position: 'relative' }}>
                  <Checkbox
                    // className={classes.checkbox}
                    onChange={(event) => this.toggleChannel(index)}
                    checked={channelsOn[channel]}
                  />
                  <Slider
                    // className={classes.slider}
                    style={{ top: '7px' }}
                    value={sliderValues[index]}
                    onChange={(event, value) => this.handleSliderChange(index, value)}
                    valueLabelDisplay="auto"
                    getAriaLabel={() => channel}
                    min={0}
                    max={this.max}
                    orientation="horizontal"
                  />
                </div>
              </div>
          )})}
        </div>
      </div>
    );
  }
}
