import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';

import { makeStyles } from '@material-ui/core/styles';

import {
  useImageSettingsStore,
  useChannelsStore,
  useViewerStore
} from '../state';

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

export default function Footer() {
  const classes = useStyles();

  const use3d = useViewerStore(store => store.use3d);
  const loader = useChannelsStore(store => store.loader);
  const pyramidResolution = useImageSettingsStore(
    store => store.pyramidResolution
  );
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
        <Typography className={classes.typography}>{`${resolution + 1} / ${
          loader.length
        } – [${level.shape.join(', ')}]`}</Typography>
      </Paper>
    </Box>
  );
}
