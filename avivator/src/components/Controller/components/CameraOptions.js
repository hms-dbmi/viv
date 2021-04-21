import React from 'react';
import ToggleButton from '@material-ui/lab/ToggleButton';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
// eslint-disable-next-line import/no-unresolved
import { getDefaultInitialViewState } from '@hms-dbmi/viv';
import {
  useImageSettingsStore,
  useViewerStore,
  useChannelSettings
} from '../../../state';
import { useWindowSize } from '../../../utils';

const CameraOptions = () => {
  const { loader } = useChannelSettings();
  const { useFixedAxis, toggleUseFixedAxis } = useImageSettingsStore();
  const { setViewerState } = useViewerStore();
  const { height, width } = useWindowSize();
  const toggleFixedAxisButton = (
    <Grid item xs="auto" key="toggle-fixed-axis">
      <ToggleButton
        selected={useFixedAxis}
        onClick={toggleUseFixedAxis}
        style={{ padding: 0 }}
        value={useFixedAxis}
      >
        Fix Camera Axis
      </ToggleButton>
    </Grid>
  );
  const reCenterButton = (
    <Grid item xs="auto" key="recenter">
      <Button
        onClick={() =>
          setViewerState({
            viewState: getDefaultInitialViewState(
              loader,
              { height, width },
              1,
              true
            )
          })
        }
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
