import React, {PureComponent} from 'react';
import DeckGL from '@deck.gl/react';
import { COORDINATE_SYSTEM, OrthographicView } from 'deck.gl';
import { MicroscopyViewer } from 'microscopy-viewer'
import { slice, openArray } from 'zarr';
import Slider from '@material-ui/core/Slider';
import { withStyles } from '@material-ui/core/styles';
import './App.css';

var tilingWidth = {}
var zarrArrays = {}

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

async function getData({ config, tileSize, x, y, stride, tilingWidth }) {
  const arrSlice = slice(stride * tilingWidth * y + stride * x, stride * tilingWidth * y + stride * (x + 1));
  const zarrKey = config.zarrConfig.store + config.zarrConfig.path;
  if (!zarrArrays[zarrKey]) {
    zarrArrays[zarrKey] = await openArray(config.zarrConfig);
  }
  const arr = zarrArrays[zarrKey];
  const dataSlice = await arr.get([arrSlice]);
  const { data } = dataSlice;
  const { channelType } = config;
  const texObj = {};
  texObj[channelType] = data
  return texObj;
}

function loadZarr({ sourceChannels, tileSize, x, y, z, imageWidth }) {
  const tilingWidth = Math.ceil(imageWidth / (tileSize * (2 ** z)));
  const textureNames = ['redTexture', 'greenTexture', 'blueTexture'];
  const configList = sourceChannels.map((channel, i) => ({
    channelName: channel.name,
    channelType: textureNames[i],
    zarrConfig: {
      store: `${channel.tileSource}/`,
      path: `pyramid_${z}.zarr`,
      mode: 'r',
    },
  }));
  const stride = tileSize * tileSize;
  // eslint-disable-next-line  arrow-body-style
  const configListPromises = configList.map((config) => {
    return getData({
      config, tileSize, x, y, stride, tilingWidth,
    });
  });
  return Promise.all(configListPromises).then(list => list);
}

export default class App extends PureComponent {

  constructor(props){
    super(props)
    this.handleRedSliderChange = this.handleRedSliderChange.bind(this)
    this.handleGreenSliderChange = this.handleGreenSliderChange.bind(this)
    this.handleBlueSliderChange = this.handleBlueSliderChange.bind(this)
    this.resize = this.resize.bind(this)
    this.state = {
      sliderValues:{
        redSliderValue: 10000,
        greenSliderValue: 10000,
        blueSliderValue: 10000
      },
      screenHeight: window.innerHeight * .9,
      screenWidth: window.innerWidth * .8
    };
    this.picSize = 256;
    this.max =  65535
    window.addEventListener("resize", this.resize);

  }

  handleRedSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {redSliderValue: value})})
  }

  handleGreenSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {greenSliderValue: value})})
  }

  handleBlueSliderChange(event, value){
    this.setState({sliderValues: Object.assign({}, this.state.sliderValues, {blueSliderValue: value})})
  }

  resize(){
    console.log('here')
    this.setState({
      screenHeight: window.innerHeight * .9,
      screenWidth: window.innerWidth * .7
    });
  };

  render() {
    const initialViewState = {
      zoom: -6.5,
      target: [
        30000,
        10000,
        0
      ]
    }
    const layerType = 'tiff'
    const source = {
        height: 141,
        width: 206,
        tileSize: 256,
        channels: [
          {
            name: "0",
            tileSource: "https://vitessce-vanderbilt-data.storage.googleapis.com/test-data/vanderbilt-data/single_channel_pyramid/img_pyramid/channel_0"
          },
          {
            name: "1",
            tileSource: "https://vitessce-vanderbilt-data.storage.googleapis.com/test-data/vanderbilt-data/single_channel_pyramid/img_pyramid/channel_1"
          },
          {
            name: "2",
            tileSource: "https://vitessce-vanderbilt-data.storage.googleapis.com/test-data/vanderbilt-data/single_channel_pyramid/img_pyramid/channel_2"
          }
        ]
      };
    const propSettings = {
      imageHeight: source.height * source.tileSize,
      imageWidth: source.width * source.tileSize,
      tileSize: source.tileSize,
      sourceChannels: source.channels,
      minZoom: Math.floor(
        -1 * Math.log2(Math.max(source.height * source.tileSize, source.width * source.tileSize)),
      )
    }
    const props = {
      getTileData: ({ x, y, z }) => {
        return loadZarr({
          x, y, z: -1 * z, ...propSettings,
        });
      },
      initialViewState,
      ...propSettings,
      ...this.state
    }
    return (
      <div>
      <MicroscopyViewer {...props}>
      </MicroscopyViewer>
      <div className="slider-container-red">
      <RedSlider
        value={this.state.sliderValues.redSliderValue}
        onChange={this.handleRedSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-red"
        min={0}
        max={this.max}
        orientation="vertical"
        color="red"
      />
      </div>
      <div className="slider-container-green">
      <GreenSlider
        value={this.state.sliderValues.greenSliderValue}
        onChange={this.handleGreenSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-green"
        min={0}
        max={this.max}
        orientation="vertical"
        color="green"
      />
      </div>
      <div className="slider-container-blue">
      <BlueSlider
        value={this.state.sliderValues.blueSliderValue}
        onChange={this.handleBlueSliderChange}
        valueLabelDisplay="auto"
        aria-label="range-slider-blue"
        min={0}
        max={this.max}
        orientation="vertical"
        color="blue"
      />
      </div>
      </div>
    );
  }
}
