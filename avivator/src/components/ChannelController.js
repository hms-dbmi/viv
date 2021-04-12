import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import CircularProgress from '@material-ui/core/CircularProgress';

import { makeStyles } from '@material-ui/core/styles';

import ChannelOptions from './ChannelOptions';
import { FILL_PIXEL_VALUE } from '../constants';
import {
  useChannelSettings,
  useChannelSetters,
  useImageSettingsStore,
  useViewerStore
} from '../state';

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
  channelOptions,
  shouldShowPixelValue,
  disableOptions = false,
  index
}) {
  const {
    isOn,
    sliders,
    colors,
    domains,
    selections,
    loader
  } = useChannelSettings();
  const { setPropertyForChannel, toggleIsOn } = useChannelSetters();
  const { colormap } = useImageSettingsStore();
  const { pixelValues } = useViewerStore();
  const rgbColor = toRgb(colormap, colors[index]);
  const classes = useStyles();
  const [min, max] = domains[index];
  // If the min/max range is and the dtype is float, make the step size smaller so sliders are smoother.
  const step =
    max - min < 500 && loader[0]?.dtype === 'Float32' ? (max - min) / 500 : 1;
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
            onChange={e =>
              setPropertyForChannel(index, 'selections', {
                ...selections[index],
                c: channelOptions.indexOf(e.target.value)
              })
            }
          >
            {channelOptions.map(opt => (
              <option disabled={disableOptions} key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Grid>
        <Grid item>
          <ChannelOptions index={index} />
        </Grid>
      </Grid>
      <Grid container direction="row" justify="flex-start" alignItems="center">
        <Grid item xs={2}>
          {getPixelValueDisplay(
            isOn[index],
            pixelValues[index],
            shouldShowPixelValue
          )}
        </Grid>
        <Grid item xs={2}>
          <Checkbox
            onChange={() => toggleIsOn(index)}
            checked={isOn[index]}
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
            value={sliders[index]}
            onChange={(e, v) => setPropertyForChannel(index, 'sliders', v)}
            valueLabelDisplay="auto"
            getAriaLabel={() => `${name}-${colors[index]}-${sliders[index]}`}
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
