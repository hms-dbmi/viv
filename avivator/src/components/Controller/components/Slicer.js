import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import { useImageSettingsStore } from '../../../state';
import { truncateDecimalNumber } from '../../../utils';

const Slicer = () => {
  const {
    setClippingPlaneSettings,
    clippingPlaneSphericalNormals: [spherical],
    clippingPlaneDistances: [distance],
    isNormalPositive,
    toggleIsNormalPositive
  } = useImageSettingsStore();
  const sliceValuesAndSetSliceFunctions = [
    [
      spherical.phi,
      v => setClippingPlaneSettings(0, 'phi', v),
      'ϕ',
      [0, Math.PI * 2]
    ],
    [
      spherical.theta,
      v => setClippingPlaneSettings(0, 'theta', v),
      'ϴ',
      [0, Math.PI]
    ],
    [distance, v => setClippingPlaneSettings(0, 'radius', v), 'r', [0, 1]]
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
        {label === 'r' ? (
          <Grid item xs={1}>
            <ToggleButton
              selected={isNormalPositive}
              onChange={toggleIsNormalPositive}
              size="small"
              style={{
                maxWidth: '4px',
                maxHeight: '4px',
                minWidth: '4px',
                minHeight: '4px'
              }}
            >
              {isNormalPositive ? (
                <ArrowUpwardIcon fontSize="small" />
              ) : (
                <ArrowDownwardIcon fontSize="small" />
              )}
            </ToggleButton>
          </Grid>
        ) : null}
        <Grid item xs={label === 'r' ? 1 : 2}>
          {label}:
        </Grid>
        <Grid item xs={10}>
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
