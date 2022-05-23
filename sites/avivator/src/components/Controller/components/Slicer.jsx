import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import { makeStyles, createStyles } from '@material-ui/core';
import shallow from 'zustand/shallow';

import {
  useImageSettingsStore,
  useViewerStore,
  useLoader
} from '../../../state';
import { getBoundingCube, truncateDecimalNumber } from '../../../utils';

const useStyles = makeStyles(theme =>
  createStyles({
    enabled: {},
    disabled: {
      color: theme.palette.text.disabled,
      // Because of the .5 opacity of the disabled color in the theme, and the fact
      // that there are multiple overlaid parts to the slider,
      // this needs to be set manually for the desired effect.
      '& .MuiSlider-thumb': {
        color: 'rgb(100, 100, 100, 1.0)'
      },
      '&  .MuiSlider-track': {
        color: 'rgb(100, 100, 100, 1.0)'
      }
    }
  })
);

const Slicer = () => {
  const [xSlice, ySlice, zSlice] = useImageSettingsStore(
    store => [store.xSlice, store.ySlice, store.zSlice],
    shallow
  );
  const loader = useLoader();
  const use3d = useViewerStore(store => store.use3d);
  const [xSliceInit, ySliceInit, zSliceInit] = getBoundingCube(loader);
  const sliceValuesAndSetSliceFunctions = [
    [
      xSlice,
      xSliceNew => useImageSettingsStore.setState({ xSlice: xSliceNew }),
      'x',
      xSliceInit
    ],
    [
      ySlice,
      ySliceNew => useImageSettingsStore.setState({ ySlice: ySliceNew }),
      'y',
      ySliceInit
    ],
    [
      zSlice,
      zSliceNew => useImageSettingsStore.setState({ zSlice: zSliceNew }),
      'z',
      zSliceInit
    ]
  ];
  const classes = useStyles();
  const Slicers = sliceValuesAndSetSliceFunctions.map(
    ([val, setVal, label, [min, max]]) => (
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        key={label}
      >
        <Grid item xs={1} style={{ marginBottom: 8 }}>
          <Typography
            className={!use3d ? classes.disabled : classes.enabled}
            style={{ marginTop: 4 }}
          >
            {label}:
          </Typography>
        </Grid>
        <Grid item xs={11}>
          <Slider
            disabled={!use3d}
            className={!use3d ? classes.disabled : classes.enabled}
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
      <Typography
        className={!use3d ? classes.disabled : classes.enabled}
        style={{ marginTop: 16 }}
      >
        Clipping Planes:{' '}
      </Typography>{' '}
      {Slicers}
    </>
  );
};

export default Slicer;
