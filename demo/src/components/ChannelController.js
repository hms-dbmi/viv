import React from 'react';
import { Slider, Checkbox, Grid, Select, IconButton } from '@material-ui/core';
import CloseOutlinedIcon from '@material-ui/icons/ClearOutlined';
import { makeStyles } from '@material-ui/core/styles';

const MIN_SLIDER_VALUE = 0;
const MAX_SLIDER_VALUE = 65535;
const COLORMAP_SLIDER_CHECKBOX_COLOR = [220, 220, 220];

const useStyles = makeStyles(theme => ({
  icon: {
    color: theme.palette.text.primary
  },
  root: {
    paddingTop: theme.spacing(1)
  }
}));

function ChannelController({
  name,
  isOn,
  sliderValue,
  colorValue,
  colormapOn,
  channelOptions,
  handleChange,
  disableOptions = false
}) {
  const rgb = `rgb(${
    colormapOn ? COLORMAP_SLIDER_CHECKBOX_COLOR : colorValue
  })`;
  const classes = useStyles();
  return (
    <Grid
      container
      direction="column"
      m={2}
      justify="center"
      className={classes.root}
    >
      <Grid container direction="row" justify="space-between">
        <Grid item xs={10}>
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
          <IconButton
            className={classes.icon}
            aria-label="Remove channel"
            size="small"
            onClick={() => handleChange('REMOVE_CHANNEL')}
          >
            <CloseOutlinedIcon size="small" />
          </IconButton>
        </Grid>
      </Grid>
      <Grid container direction="row" justify="space-between">
        <Grid item>
          <Checkbox
            onChange={() => handleChange('TOGGLE_ON')}
            checked={isOn}
            style={{
              color: rgb,
              '&$checked': {
                color: rgb
              }
            }}
          />
        </Grid>
        <Grid item xs={10}>
          <Slider
            value={sliderValue}
            onChange={(event, value) => handleChange('CHANGE_SLIDER', value)}
            valueLabelDisplay="auto"
            getAriaLabel={() => `${name}-${colorValue}-${sliderValue}`}
            min={MIN_SLIDER_VALUE}
            max={MAX_SLIDER_VALUE}
            style={{
              color: rgb,
              top: '7px'
            }}
            orientation="horizontal"
          />
        </Grid>
      </Grid>
    </Grid>
  );
}

export default ChannelController;
