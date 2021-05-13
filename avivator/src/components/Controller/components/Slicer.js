import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import {
  useImageSettingsStore,
  useChannelSettings,
  useViewerStore
} from '../../../state';
import { getBoundingCube, truncateDecimalNumber } from '../../../utils';
import { Typography } from '@material-ui/core';

const Slicer = () => {
  const { setImageSetting, xSlice, ySlice, zSlice } = useImageSettingsStore();
  const { loader } = useChannelSettings();
  const { use3d } = useViewerStore();
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
  const Slicers = sliceValuesAndSetSliceFunctions.map(
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
            disabled={!use3d}
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
  return (
    <>
      <Typography style={{ marginTop: 4 }}>Clipping Planes: </Typography>{' '}
      {Slicers}
    </>
  );
};

export default Slicer;
