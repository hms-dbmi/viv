import React, { PureComponent } from "react";
import Slider from "@material-ui/core/Slider";
import { withStyles } from "@material-ui/core/styles";
import { MicroscopyViewer } from "../../src";
import { source } from "./source-info";
import "./App.css";

export default class App extends PureComponent {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
    var sliderValues = {};
    var colorValues = {};
    var sliders = [];
    const colorOptions = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 128, 0]
    ];
    Object.keys(source.channels).forEach((channel, i) => {
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
    window.addEventListener("resize", this.resize);
  }

  handleSliderChange(event, value, channel) {
    var channelValue = {};
    channelValue[channel] = value;
    this.setState({
      sliderValues: { ...this.state.sliderValues, ...channelValue }
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
    const propSettings = {
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
          <p key={`name-${channel}`}>{channel}</p>
          <Slider
            key={`slider-${channel}`}
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
    return (
      <div>
        <MicroscopyViewer {...props} />
        <div className="slider-container">
          <p>
            <strong>vitessce-image-viewer</strong> (&ldquo;Viv&rdquo;): A viewer
            for high bit depth, high resolution, multi-channel images using
            DeckGL over the hood and WebGL under the hood.
          </p>
          <p>
            <a href="https://github.com/hubmapconsortium/vitessce-image-viewer">
              Github
            </a>
            &nbsp; / &nbsp;
            <a href="https://www.npmjs.com/package/@hubmap/vitessce-image-viewer">
              NPM
            </a>
          </p>
          {sliders}
        </div>
      </div>
    );
  }
}
