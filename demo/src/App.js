import React, {PureComponent} from 'react';
import { MicroscopyViewer } from '../../src'
import { source } from './source-info'
import Slider from '@material-ui/core/Slider';
import { withStyles } from '@material-ui/core/styles';
import './App.css';

const RedSlider = withStyles({
  root: {
    color: 'red',
  }
})(Slider)
const BlueSlider = withStyles({
  root: {
    color: 'blue',
  }
})(Slider)
const GreenSlider = withStyles({
  root: {
    color: 'green',
  }
})(Slider)
const OrangeSlider = withStyles({
  root: {
    color: 'orange',
  }
})(Slider)

export default class App extends PureComponent {

  constructor(props){
    super(props)
    this.handleRedSliderChange = this.handleRedSliderChange.bind(this)
    this.handleGreenSliderChange = this.handleGreenSliderChange.bind(this)
    this.handleBlueSliderChange = this.handleBlueSliderChange.bind(this)
    this.handleOrangeSliderChange = this.handleOrangeSliderChange.bind(this)
    this.resize = this.resize.bind(this)
    this.state = {
      sliderValues:{
        channel_0: 10000,
        channel_1: 10000,
        channel_2: 10000,
        channel_3: 10000
      },
      colorValues:{
        channel_0: [255, 0, 0],
        channel_1: [0, 255, 0],
        channel_2: [255, 128, 0],
        channel_3: [0, 0, 255],
      },
      viewHeight: window.innerHeight * .9,
      viewWidth: window.innerWidth * .7
    };
    this.max =  65535
    window.addEventListener("resize", this.resize);

  }

  handleRedSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {channel_0: value})})
  }

  handleGreenSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {channel_1: value})})
  }

  handleBlueSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {channel_3: value})})
  }

  handleOrangeSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {channel_2: value})})
  }

  resize(){
    this.setState({
      viewHeight: window.innerHeight * .9,
      viewWidth: window.innerWidth * .7
    });
  };

  render() {
    const initialViewState = {
      zoom: -5.5,
      target: [
        30000,
        10000,
        0
      ],
    }
    const propSettings = {
      useZarr: true,
      imageHeight: source.height * source.tileSize,
      imageWidth: source.width * source.tileSize,
      tileSize: source.tileSize,
      sourceChannels: source.channels,
      minZoom: Math.floor(
        -1 * Math.log2(Math.max(source.height * source.tileSize, source.width * source.tileSize)),
      ),
      maxZoom: -9
    }
    const props = {
      initialViewState,
      ...propSettings,
      ...this.state
    }
    return (
      <div>
      <MicroscopyViewer {...props}/>
      <div className="slider-container-orange">
      <OrangeSlider
        value={this.state.sliderValues.channel_2}
        onChange={this.handleOrangeSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-red"
        min={0}
        max={this.max}
        orientation="vertical"
      />
      </div>
      <div className="slider-container-red">
      <RedSlider
        value={this.state.sliderValues.channel_0}
        onChange={this.handleRedSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-red"
        min={0}
        max={this.max}
        orientation="vertical"
      />
      </div>
      <div className="slider-container-green">
      <GreenSlider
        value={this.state.sliderValues.channel_1}
        onChange={this.handleGreenSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-green"
        min={0}
        max={this.max}
        orientation="vertical"
      />
      </div>
      <div className="slider-container-blue">
      <BlueSlider
        value={this.state.sliderValues.channel_3}
        onChange={this.handleBlueSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-blue"
        min={0}
        max={this.max}
        orientation="vertical"
      />
      </div>
      </div>
    );
  }
}
