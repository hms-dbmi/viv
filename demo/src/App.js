import React, { PureComponent } from 'react';
import Slider from '@material-ui/core/Slider';
import Checkbox from '@material-ui/core/Checkbox';
import { withStyles } from '@material-ui/core/styles';
import { MicroscopyViewer } from '../../src';
import { source } from './source-info';
import './App.css';

export default class App extends PureComponent {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
    const sliderValues = {};
    const colorValues = {};
    const sliders = {};
    const checkboxes = {};
    const channelsOn = {};
    const colorOptions = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 128, 0]
    ];
    Object.keys(source.channels).forEach((channel, i) => {
      sliderValues[channel] = [0, 20000];
      colorValues[channel] = colorOptions[i];
      channelsOn[channel] = true;
      sliders[channel] = withStyles({
        root: {
          color: `rgb(${colorOptions[i]})`
        }
      })(Slider);
      checkboxes[channel] = withStyles({
        root: {
          color: `rgb(${colorOptions[i]})`,
          '&$checked': {
            color: colorOptions[i]
          }
        },
        checked: {}
        // eslint-disable-next-line react/jsx-props-no-spreading
      })(checkBoxProps => (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Checkbox color="default" {...checkBoxProps} />
      ));
    });
    this.state = {
      sliderValues,
      colorValues,
      channelsOn,
      viewHeight: window.innerHeight * 0.9,
      viewWidth: window.innerWidth * 0.7
    };
    this.max = 65535;
    this.sliders = sliders;
    this.checkboxes = checkboxes;
    window.addEventListener('resize', this.resize);
  }

  handleSliderChange(event, value, channel) {
    const channelValue = {};
    channelValue[channel] = value;
    this.setState(prevState => {
      return { sliderValues: { ...prevState.sliderValues, ...channelValue } };
    });
  }

  toggleChannel(channelName) {
    this.setState(prevState => {
      const newChannelsOn = {
        [channelName]: !prevState.channelsOn[channelName]
      };
      return { channelsOn: { ...prevState.channelsOn, ...newChannelsOn } };
    });
  }

  resize() {
    this.setState({
      viewHeight: window.innerHeight * 0.9,
      viewWidth: window.innerWidth * 0.7
    });
  }

  render() {
    const initialViewState = source.initialViewState || {
      zoom: -5.5,
      target: [30000, 10000, 0]
    };
    const {
      sliderValues,
      colorValues,
      viewHeight,
      viewWidth,
      channelsOn
    } = this.state;
    const sliders = Object.keys(this.sliders).map(channel => {
      const ChannelSlider = this.sliders[channel];
      const ChannelCheckbox = this.checkboxes[channel];
      const sliderValue = sliderValues[channel];
      return (
        <div key={`container-${channel}`}>
          <p>{channel}</p>
          <div style={{ width: '100%', display: 'flex', position: 'relative' }}>
            <ChannelCheckbox
              // eslint-disable-next-line no-unused-vars
              onChange={e => this.toggleChannel(channel)}
              checked={channelsOn[channel]}
            />
            <ChannelSlider
              style={{ top: '7px' }}
              value={sliderValue}
              onChange={(e, v) => this.handleSliderChange(e, v, channel)}
              valueLabelDisplay="auto"
              getAriaLabel={() => channel}
              min={0}
              max={this.max}
              orientation="horizontal"
            />
          </div>
        </div>
      );
    });
    return (
      <div>
        <MicroscopyViewer
          /* eslint-disable react/jsx-props-no-spreading */
          {...{
            useTiff: true,
            sourceChannels: source.channels,
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
