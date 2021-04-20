import React from 'react';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import { useImageSettingsStore, useViewerStore } from '../../../state';

const CameraOptions = () => {
  const { useFixedAxis, toggleUseFixedAxis } = useImageSettingsStore();
  const { initialViewState, setViewerState } = useViewerStore();
  const toggleFixedAxisButton = (
    <Grid item xs="auto" key="toggle-fixed-axis">
      <ToggleButton
        selected={useFixedAxis}
        onClick={toggleUseFixedAxis}
        style={{ padding: 0 }}
      >
        Fix Camera Axis
      </ToggleButton>
    </Grid>
  );
  const reCenterButton = (
    <Grid item xs="auto" key="recenter">
      <Button
        onClick={() => setViewerState({ viewState: initialViewState })}
        style={{ padding: 0 }}
      >
        Re-Center
      </Button>
    </Grid>
  );
  return (
    <Grid container direction="row" justify="space-between" alignItems="center">
      {[toggleFixedAxisButton, reCenterButton]}
    </Grid>
  );
};

export default CameraOptions;
