import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import React from 'react';
import { useShallow } from 'zustand/shallow';

import { getDefaultInitialViewState } from '@hms-dbmi/viv';
import {
  useImageSettingsStore,
  useLoader,
  useViewerStore
} from '../../../state';
import { useWindowSize } from '../../../utils';

const useStyles = makeStyles(theme =>
  createStyles({
    enabled: {
      marginLeft: '4px'
    },
    disabled: {
      color: theme.palette.text.disabled,
      marginLeft: '4px'
    }
  })
);

const CameraOptions = () => {
  const loader = useLoader();
  const [useFixedAxis, toggleUseFixedAxis] = useImageSettingsStore(
    useShallow(store => [store.useFixedAxis, store.toggleUseFixedAxis])
  );
  const [viewState, use3d] = useViewerStore(
    useShallow(store => [store.viewState, store.use3d])
  );
  const { height, width } = useWindowSize();
  const classes = useStyles();
  const toggleFixedAxisButton = (
    <Grid item size="auto" key="toggle-fixed-axis">
      <Grid container direction="row">
        <Checkbox
          onClick={toggleUseFixedAxis}
          style={{ padding: 0 }}
          disabled={!use3d}
          checked={useFixedAxis}
        />
        <Typography className={!use3d ? classes.disabled : classes.enabled}>
          Fix Camera Axis
        </Typography>
      </Grid>
    </Grid>
  );
  const reCenterButton = (
    <Grid item size="auto" key="recenter">
      <Button
        onClick={() =>
          useViewerStore.setState({
            viewState: {
              ...viewState,
              ...getDefaultInitialViewState(loader, { height, width }, 1, true),
              rotationX: 0,
              rotationOrbit: 0
            }
          })
        }
        disabled={!use3d}
        style={{ padding: 0 }}
      >
        Re-Center
      </Button>
    </Grid>
  );
  return (
    <Grid
      container
      direction="row"
      style={{ marginTop: 16 }}
      sx={{
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {[toggleFixedAxisButton, reCenterButton]}
    </Grid>
  );
};

export default CameraOptions;
