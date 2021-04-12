import React from 'react';
import Grid from '@material-ui/core/Grid';

import Slider from '@material-ui/core/Slider';

import { useImageSettingsStore } from '../../../state';

const Slicer = () => {
  const { setImageSetting, xSlice, ySlice, zSlice } = useImageSettingsStore();
  const sliceValuesAndSetSliceFunctions = [
    [xSlice, v => setImageSetting('xSlice', v), 'x'],
    [ySlice, v => setImageSetting('ySlice', v), 'y'],
    [zSlice, v => setImageSetting('zSlice', v), 'z']
  ];
  return sliceValuesAndSetSliceFunctions.map(([slice, setSlice, label]) => (
    <Grid
      container
      direction="row"
      justify="flex-start"
      alignItems="center"
      key={label}
    >
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
