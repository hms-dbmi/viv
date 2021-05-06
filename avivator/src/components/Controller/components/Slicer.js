import React from 'react';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';
import { useImageSettingsStore } from '../../../state';
import { truncateDecimalNumber } from '../../../utils';
import { EPSILON } from '../../../constants';

function formatter(label) {
  const isRadius = label === 'r'; // useful variable name
  return v => {
    const val = truncateDecimalNumber(isRadius ? v : v / Math.PI, 4);
    const radians = label === 'r' ? '' : 'π';
    return `${val}${radians}`;
  };
}

const Slicer = () => {
  const {
    setClippingPlaneSettings,
    sphericals: [spherical]
  } = useImageSettingsStore();
  const sliceValuesAndSetSliceFunctions = [
    [
      spherical.phi,
      phi => setClippingPlaneSettings(0, { phi }),
      'ϕ',
      [0, Math.PI * 2]
    ],
    [
      spherical.theta,
      theta => setClippingPlaneSettings(0, { theta }),
      'ϴ',
      [-Math.PI / 2, Math.PI / 2]
    ],
    [
      spherical.radius,
      radius => setClippingPlaneSettings(0, { radius }),
      'r',
      // Since the box has diagonal length (1 + 1)^{\frac{1}{2}}
      [EPSILON, Math.sqrt(2)]
    ]
  ];
  const slicers = sliceValuesAndSetSliceFunctions.map(
    ([val, setVal, label, [min, max]]) => (
      <Grid
        container
        direction="row"
        justify="flex-start"
        alignItems="center"
        key={label}
      >
        <Grid item xs={1}>
          {label}:
        </Grid>
        <Grid item xs={11}>
          <Slider
            value={val}
            onChange={(e, v) => setVal(v)}
            valueLabelDisplay="auto"
            valueLabelFormat={formatter(label)}
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
  const presets = [
    ['X', [EPSILON, 0.5 * Math.PI, 0.5 * Math.PI]],
    ['Y', [EPSILON, -0.5 * Math.PI, 0]],
    ['Z', [EPSILON, 0, 0]]
  ].map(([label, [radius, theta, phi]]) => (
    <Grid item xs="auto" key={label}>
      <Button
        onClick={() => {
          setClippingPlaneSettings(0, { radius, phi, theta });
        }}
        style={{ padding: 0, paddingTop: 4 }}
      >
        {label} Slice
      </Button>
    </Grid>
  ));
  return (
    <>
      <Grid
        container
        direction="row"
        justify="space-between"
        alignItems="center"
      >
        {presets}
      </Grid>
      {slicers}
    </>
  );
};

export default Slicer;
