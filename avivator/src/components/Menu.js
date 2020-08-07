import React, { useState } from 'react';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import InfoIcon from '@material-ui/icons/Info';
import Tooltip from '@material-ui/core/Tooltip';

import { makeStyles } from '@material-ui/core/styles';
import Description from './Description';

const useStyles = makeStyles(theme => ({
  root: {
    maxHeight: props => `${props.maxHeight - theme.spacing(4)}px`,
    width: '350px',
    overflowY: 'auto'
  },
  paper: {
    padding: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 2
  },
  item: {
    width: '100%'
  },
  divider: {
    paddingBottom: theme.spacing(1),
    paddingTop: theme.spacing(2)
  }
}));

const INFOTEXT =
  'To learn more about the supported Bioformats/OME file formats, please visit the docs by clicking on the GitHub icon.  Generally speaking, the zarr output of bioformats2raw and the tiff output of raw2ometiff can be visualized easily by uplaoding them to your favorite cloud storage provider, and passing in the url in the text field above.';

function Header(props) {
  const { handleSubmitNewUrl, url } = props;
  const [text, setText] = useState(url);
  const classes = useStyles(props);

  return (
    <Grid container direction="column">
      <Grid item xs={12}>
        <Description />
      </Grid>
      <Grid
        container
        direction="row"
        justify="space-between"
        alignItems="center"
      >
        <Grid item xs={1}>
          <Tooltip title={INFOTEXT}>
            <InfoIcon />
          </Tooltip>
        </Grid>
        <Grid item xs={11}>
          <form
            onSubmit={event => {
              handleSubmitNewUrl(event, text);
              setText('');
            }}
          >
            <TextField
              id="standard-basic"
              label="OME-TIFF/Bioformats-Zarr URL"
              variant="filled"
              size="small"
              fullWidth
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </form>
        </Grid>
      </Grid>
      <Grid item xs={12} className={classes.divider}>
        <Divider />
      </Grid>
    </Grid>
  );
}

function Menu({ children, ...props }) {
  const classes = useStyles(props);
  return (
    <Box position="absolute" right={0} top={0} m={1} className={classes.root}>
      <Paper className={classes.paper}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <Header {...props} />
        <Grid
          container
          direction="column"
          spacing={1}
          justify="center"
          alignItems="center"
        >
          {children.map((child, i) => {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <Grid item key={i} className={classes.item}>
                {child}
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}

export default Menu;
