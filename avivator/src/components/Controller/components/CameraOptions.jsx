import React from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import shallow from 'zustand/shallow';

// eslint-disable-next-line import/no-unresolved
import { getDefaultInitialViewState } from '@hms-dbmi/viv';
import {
  useImageSettingsStore,
  useViewerStore,
  useLoader
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
    store => [store.useFixedAxis, store.toggleUseFixedAxis],
    shallow
  );
  const [viewState, use3d] = useViewerStore(store => [
    store.viewState,
    store.use3d
  ]);
  const { height, width } = useWindowSize();
  const classes = useStyles();
  const toggleFixedAxisButton = (
    <Grid item xs="auto" key="toggle-fixed-axis">
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
    <Grid item xs="auto" key="recenter">
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
        } // eslint-disable-line react/jsx-curly-newline
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
      justify="space-between"
      alignItems="center"
      style={{ marginTop: 16 }}
    >
      {[toggleFixedAxisButton, reCenterButton]}
    </Grid>
  );
};

export default CameraOptions;
