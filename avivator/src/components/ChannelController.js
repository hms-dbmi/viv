import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import CircularProgress from '@material-ui/core/CircularProgress';

import { makeStyles } from '@material-ui/core/styles';

import ChannelOptions from './ChannelOptions';
import { FILL_PIXEL_VALUE } from '../constants';

export const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];

const toRgb = (on, arr) => {
  const color = on ? COLORMAP_SLIDER_CHECKBOX_COLOR : arr;
  return `rgb(${color})`;
};

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(1)
  },
  icon: {
    color: theme.palette.text.primary,
    marginTop: '4px'
  }
}));

function truncateDecimalNumber(value, maxLength) {
  if (!value && value !== 0) return '';
  const stringValue = value.toString();
  return stringValue.length > maxLength
    ? stringValue.substring(0, maxLength).replace(/\.$/, '')
    : stringValue;
}

// If the channel is not on, display nothing.
// If the channel has a not-undefined value, show it.
// Otherwise, show a circular progress animation.
const getPixelValueDisplay = (isOn, pixelValue, shouldShowPixelValue) => {
  if (!isOn || !shouldShowPixelValue) {
    return FILL_PIXEL_VALUE;
  }
  // Need to check if it's a number becaue 0 is falsy.
  if (pixelValue || typeof pixelValue === 'number') {
    return truncateDecimalNumber(pixelValue, 7);
  }
  return <CircularProgress size="50%" />;
};

function ChannelController({
  name,
  isOn,
  dtype,
  sliderValue,
  colorValue,
  colormapOn,
  channelOptions,
  handleChange,
  pixelValue,
  shouldShowPixelValue,
  disableOptions = false,
  domain
}) {
  const rgbColor = toRgb(colormapOn, colorValue);
  const classes = useStyles();
  const [min, max] = domain;
  // If the min/max range is and the dtype is float, make the step size smaller so sliders are smoother.
  const step = max - min < 500 && dtype === 'Float32' ? (max - min) / 500 : 1;
  return (
    <Grid
      container
      direction="column"
      m={2}
      justify="center"
      className={classes.root}
    >
      <Grid container direction="row" justify="space-between">
        <Grid item xs={11}>
          <Select
            native
            value={name}
            onChange={e => handleChange('CHANGE_CHANNEL', e.target.value)}
          >
            {channelOptions.map(opt => (
              <option disabled={disableOptions} key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Grid>
        <Grid item>
          <ChannelOptions handleChange={handleChange} />
        </Grid>
      </Grid>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Grid item xs={2}>
          {getPixelValueDisplay(isOn, pixelValue, shouldShowPixelValue)}
        </Grid>
        <Grid item xs={2}>
          <Checkbox
            onChange={() => handleChange('TOGGLE_ON')}
            checked={isOn}
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
            value={sliderValue}
            onChange={(e, v) => handleChange('CHANGE_SLIDER', v)}
            valueLabelDisplay="auto"
            getAriaLabel={() => `${name}-${colorValue}-${sliderValue}`}
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
