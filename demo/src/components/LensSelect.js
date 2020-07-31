import React from 'react';

import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';

import { makeStyles } from '@material-ui/core/styles';

import ChannelOptions from './ChannelOptions';
import { FILL_PIXEL_VALUE } from '../constants';

function LensSelect({
  isOn,
  handleToggle,
  handleSelection,
  channelOptions,
  lensSelection
}) {
  return (
    <Grid container direction="row" justify="flex-start" alignItems="center">
      <Grid item xs={2}>
        Lens:
      </Grid>
      <Grid item xs={2}>
        <Checkbox
          onChange={() => handleToggle()}
          checked={isOn}
          style={{
            color: [255, 255, 255],
            '&$checked': {
              color: [255, 255, 255]
            }
          }}
        />
      </Grid>
      <Grid item xs={7}>
        <Select
          native
          value={lensSelection}
          onChange={e => handleSelection(e.target.value)}
        >
          {channelOptions.map((opt, i) => (
            <option key={opt} value={i}>
              {opt}
            </option>
          ))}
        </Select>
      </Grid>
    </Grid>
  );
}

export default LensSelect;
