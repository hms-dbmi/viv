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
    const sliders = [];
    const colorOptions = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 128, 0]
    ];
    Object.keys(this.source.channels).forEach((channel, i) => {
      const sliderObj = {};
      sliderValues[channel] = [0, 20000];
      colorValues[channel] = colorOptions[i];
      sliderObj[channel] = withStyles({
        root: {
          color: `rgb(${colorOptions[i]})`
        }
      })(Slider);
      sliders.push(sliderObj);
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
    var channelValue = {};
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
    const source = this.source;
    const propSettings = {
      useTiff: source.isTiff,
      useZarr: source.isZarr,
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
      maxZoom: -9
    };
    const props = {
      initialViewState,
      ...propSettings,
      ...this.state
    };
    const sliders = this.sliders.map(sliderObj => {
      const Slider = Object.values(sliderObj)[0];
      const channel = Object.keys(sliderObj)[0];
      return (
        <div key={`container-${channel}`}>
          <p>{channel}</p>
          <Slider
            value={this.state.sliderValues[channel]}
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
        <MicroscopyViewer {...props} />
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
