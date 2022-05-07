import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import CircularProgress from '@material-ui/core/CircularProgress';
import shallow from 'zustand/shallow';

import ChannelOptions from './ChannelOptions';
import { FILL_PIXEL_VALUE } from '../../../constants';
import {
  useLoader,
  useImageSettingsStore,
  useViewerStore
} from '../../../state';
import { truncateDecimalNumber } from '../../../utils';

export const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];

const toRgb = (on, arr) => {
  const color = on ? COLORMAP_SLIDER_CHECKBOX_COLOR : arr;
  return `rgb(${color})`;
};

// If the channel is not on, display nothing.
// If the channel has a not-undefined value, show it.
// Otherwise, show a circular progress animation.
const getPixelValueDisplay = (pixelValue, isLoading, shouldShowPixelValue) => {
  if (isLoading) {
    return <CircularProgress size="50%" />;
  }
  if (!shouldShowPixelValue) {
    return FILL_PIXEL_VALUE;
  }
  // Need to check if it's a number becaue 0 is falsy.
  if (pixelValue || typeof pixelValue === 'number') {
    return truncateDecimalNumber(pixelValue, 7);
  }
  return FILL_PIXEL_VALUE;
};

function ChannelController({
  name,
  onSelectionChange,
  channelsVisible,
  pixelValue,
  toggleIsOn,
  handleSliderChange,
  domain,
  slider,
  color,
  handleRemoveChannel,
  handleColorSelect,
  isLoading
}) {
  const loader = useLoader();
  const colormap = useImageSettingsStore(store => store.colormap);
  const [channelOptions, useLinkedView, use3d] = useViewerStore(
    store => [store.channelOptions, store.useLinkedView, store.use3d],
    shallow
  );
  const rgbColor = toRgb(colormap, color);
  const [min, max] = domain;
  // If the min/max range is and the dtype is float, make the step size smaller so contrastLimits are smoother.
  const { dtype } = loader[0];
  const isFloat = dtype === 'Float32' || dtype === 'Float64';
  const step = max - min < 500 && isFloat ? (max - min) / 500 : 1;
  const shouldShowPixelValue = !useLinkedView && !use3d;
  return (
    <Grid container direction="column" m={2} justify="center">
      <Grid container direction="row" justify="space-between">
        <Grid item xs={11}>
          <Select native value={name} onChange={onSelectionChange}>
            {channelOptions.map(opt => (
              <option disabled={isLoading} key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Grid>
        <Grid item>
          <ChannelOptions
            handleRemoveChannel={handleRemoveChannel}
            handleColorSelect={handleColorSelect}
            disabled={isLoading}
          />
        </Grid>
      </Grid>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Grid item xs={2}>
          {getPixelValueDisplay(pixelValue, isLoading, shouldShowPixelValue)}
        </Grid>
        <Grid item xs={2}>
          <Checkbox
            onChange={toggleIsOn}
            disabled={isLoading}
            checked={channelsVisible}
            style={{
              color: rgbColor,
              '&$checked': {
                color: rgbColor
              }
            }}
          />
        </Grid>
        <Grid item xs={7}>
          <Slider
            disabled={isLoading}
            value={slider}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            getAriaLabel={() => `${name}-${color}-${slider}`}
            valueLabelFormat={v => truncateDecimalNumber(v, 5)}
            min={min}
            max={max}
            step={step}
            orientation="horizontal"
            style={{
              color: rgbColor,
              marginTop: '7px'
            }}
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default ChannelController;
