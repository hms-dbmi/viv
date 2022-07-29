import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import shallow from 'zustand/shallow';

import { makeStyles } from '@material-ui/core/styles';

import { useImageSettingsStore, useLoader, useViewerStore } from '../state';

const useStyles = makeStyles(theme => ({
  typography: {
    fontSize: '.8rem'
  },
  paper: {
    paddingRight: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 2
  }
}));

function formatResolutionStatus(current, total, shape) {
  return `${current}/${total} [${shape.join(', ')}]`;
}

export default function Footer() {
  const classes = useStyles();
  const [use3d, pyramidResolution] = useViewerStore(
    store => [store.use3d, store.pyramidResolution],
    shallow
  );
  const loader = useLoader();
  const volumeResolution = useImageSettingsStore(store => store.resolution);

  const resolution = use3d ? volumeResolution : pyramidResolution;
  const level = loader[resolution];

  if (!level) return null;
  return (
    <Box
      style={{
        position: 'fixed',
        marginTop: 'calc(5% + 60px)',
        bottom: 0
      }}
    >
      <Paper className={classes.paper}>
        <Typography className={classes.typography}>
          {formatResolutionStatus(resolution + 1, loader.length, level.shape)}
        </Typography>
      </Paper>
    </Box>
  );
}
