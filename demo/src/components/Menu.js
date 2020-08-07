import React, { useState } from 'react';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';

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
function Header(props) {
  const { handleSubmitNewUrl } = props;
  const [text, setText] = useState('');
  const classes = useStyles(props);

  return (
    <Grid container direction="column">
      <Grid item xs={12}>
        <Description />
      </Grid>
      <Grid item xs={12}>
        <form
          onSubmit={event => {
            handleSubmitNewUrl(event, text);
            setText('');
          }}
        >
          <TextField
            id="standard-basic"
            label="OME-TIFF/OME-Zarr URL"
            variant="filled"
            size="small"
            fullWidth
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </form>
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
