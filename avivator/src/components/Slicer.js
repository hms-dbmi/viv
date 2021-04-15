import React from 'react';
import Grid from '@material-ui/core/Grid';

import Slider from '@material-ui/core/Slider';

const Slicer = props => {
  const { xSlice, ySlice, zSlice, setXSlice, setYSlice, setZSlice } = props;
  const sliceValuesAndSetSliceFunctions = [
    [xSlice, setXSlice, 'x'],
    [ySlice, setYSlice, 'y'],
    [zSlice, setZSlice, 'z']
  ];
  return sliceValuesAndSetSliceFunctions.map(([slice, setSlice, label]) => (
    <Grid container direction="row" justify="flex-start" alignItems="center">
      <Grid item xs={1} style={{ marginBottom: 8 }}>
        {label}:
      </Grid>
      <Grid item xs={11}>
        <Slider
          value={slice}
          onChange={(e, v) => setSlice(v)}
          valueLabelDisplay="auto"
          getAriaLabel={() => `${label} slider`}
          min={0}
          max={1}
          step={0.005}
          orientation="horizontal"
        />
      </Grid>
    </Grid>
  ));
};

export default Slicer;
