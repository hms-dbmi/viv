import React, { PureComponent } from 'react';
import Slider from '@material-ui/core/Slider';
import { withStyles } from '@material-ui/core/styles';
import { MicroscopyViewer } from '../../src';
import './App.css';
import sources from './sources';

export default class App extends PureComponent {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
    this.source = props.source;
    const sliderValues = {};
    const colorValues = {};
    const sliders = {};
    const colorOptions = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 128, 0]
    ];

    Object.keys(source.channels).forEach((channel, i) => {
      sliderValues[channel] = [0, 20000];
      colorValues[channel] = colorOptions[i];
      sliders[channel] = withStyles({
        root: {
          color: `rgb(${colorOptions[i]})`
        }
      })(Slider);
    });
    this.state = {
      sliderValues,
      colorValues,
      viewHeight: window.innerHeight * 0.9,
      viewWidth: window.innerWidth * 0.7
    };
    this.max = 65535;
    this.sliders = sliders;
    window.addEventListener('resize', this.resize);
  }

  handleSliderChange(event, value, channel) {
    const channelValue = {};
    channelValue[channel] = value;
    this.setState(prevState => {
      return { sliderValues: { ...prevState.sliderValues, ...channelValue } };
    });
  }

  resize() {
    this.setState({
      viewHeight: window.innerHeight * 0.9,
      viewWidth: window.innerWidth * 0.7
    });
  }

  render() {
    const initialViewState = {
      zoom: -5.5,
      target: [30000, 10000, 0]
    };

    const { sliderValues, colorValues, viewHeight, viewWidth } = this.state;
    const sliders = Object.keys(this.sliders).map(channel => {
      const ChannelSlider = this.sliders[channel];
      const sliderValue = sliderValues[channel];
      return (
        <div key={`container-${channel}`}>
          <p>{channel}</p>
          <ChannelSlider
            value={sliderValue}
            onChange={(e, v) => this.handleSliderChange(e, v, channel)}
            valueLabelDisplay="auto"
            getAriaLabel={() => channel}
            min={0}
            max={this.max}
            orientation="horizontal"
          />
        </div>
      );
    });
    const demos = Object.keys(sources)
      .map(source => (
        <a href={`?demo=${source}`} key={source}>
          {source}
        </a>
      ))
      .reduce((prev, curr) => [prev, ' / ', curr]);
    return (
      <div>
        <MicroscopyViewer
          /* eslint-disable react/jsx-props-no-spreading */
          {...{
            useTiff: true,
            imageHeight: source.height * source.tileSize,
            imageWidth: source.width * source.tileSize,
            tileSize: source.tileSize,
            sourceChannels: source.channels,
            minZoom: Math.floor(
              -1 *
                Math.log2(
                  Math.max(
                    source.height * source.tileSize,
                    source.width * source.tileSize
                  )
                )
            ),
            maxZoom: -9,
            viewHeight,
            viewWidth,
            sliderValues,
            colorValues,
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
          <p>Demos: {demos}</p>
          <p>
            More info:{' '}
            <a href="https://github.com/hubmapconsortium/vitessce-image-viewer">
              Github
            </a>{' '}
            /{' '}
            <a href="https://www.npmjs.com/package/@hubmap/vitessce-image-viewer">
              NPM
            </a>
          </p>
          <br />
          {sliders}
        </div>
      </div>
    );
  }
}
