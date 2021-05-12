import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import { useImageSettingsStore, useChannelSettings } from '../../../state';
import { getBoundingCube, truncateDecimalNumber } from '../../../utils';

const Slicer = () => {
  const { setImageSetting, xSlice, ySlice, zSlice } = useImageSettingsStore();
  const { loader } = useChannelSettings();
  const [xSliceInit, ySliceInit, zSliceInit] = getBoundingCube(loader);
  const sliceValuesAndSetSliceFunctions = [
    [
      xSlice,
      xSliceNew => setImageSetting({ xSlice: xSliceNew }),
      'x',
      xSliceInit
    ],
    [
      ySlice,
      ySliceNew => setImageSetting({ ySlice: ySliceNew }),
      'y',
      ySliceInit
    ],
    [
      zSlice,
      zSliceNew => setImageSetting({ zSlice: zSliceNew }),
      'z',
      zSliceInit
    ]
  ];
  return sliceValuesAndSetSliceFunctions.map(
    ([val, setVal, label, [min, max]]) => (
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
            value={val}
            onChange={(e, v) => setVal(v)}
            valueLabelDisplay="auto"
            valueLabelFormat={v => truncateDecimalNumber(v, 5)}
            getAriaLabel={() => `${label} slider`}
            min={min}
            max={max}
            step={0.005}
            orientation="horizontal"
          />
        </Grid>
      </Grid>
    )
  );
};

export default Slicer;
